# Sinopia — project context for Claude Code

Sinopia is an infinite-canvas sketching app for pen tablets, built as a lighter alternative to the Leonardo drawing app. It runs entirely in the browser from a single `index.html` (no build step, no dependencies besides a Google Fonts link) and is published with GitHub Pages.

Owner: Ben Franz (3D/VFX artist, Windows PC with a pen tablet). He prefers concise answers, GUI workflows over command-line-only ones, explicit step-by-step instructions, and a short "why this works" alongside each fix. UI font preference: Franklin Gothic (the app uses Libre Franklin with Franklin Gothic fallbacks).

## Non-negotiables

- **Stroke smoothness and latency.** Ben's top praise was how smooth drawing feels. Never put framework or DOM work on the drawing hot path. No React for the canvas.
- **Clean anti-aliasing at every angle and size.** Verify with `tools/stroke-sim.js` after any change to the engine.
- **Single file, no build step**, unless Ben explicitly asks to change that.

## Architecture (all in `index.html`)

**Stroke engine** — between `/*ENGINE-START*/` and `/*ENGINE-END*/`. Pure math, no DOM, so Node can test it.
- Each stroke rasterizes into a per-tile `Uint8Array` alpha buffer using **MAX blending**: a pixel keeps the strongest coverage any part of the stroke gave it. This replaced dab stacking, which crushed anti-aliased edges into stair-steps.
- **Round tips** (`rasterCapsule`) draw continuous tapered capsules between input points, using exact distance-to-segment and a 1px box-filter edge. Hardness widens the edge, and `grain` multiplies by a world-anchored 256² paper texture (`GRAIN`).
- **Image tips** (`rasterImageDab`), used for imported alphas, Charcoal and Flat chisel, are spaced dabs. Each pixel is inverse-mapped through the mirror matrix and the rotation, then bilinear-sampled from a mip level close to the on-canvas size (`buildMip`).
- `Stroke` drives both. It takes smoothed input points, interpolates pressure, and applies every symmetry matrix in `opts.mats`.

**Live stroke → layer.** `strokeTarget` lazily creates one entry per touched tile, holding the stroke buffer and dirty rects (per frame `x0..y1`, whole stroke `ex0..ey1`).
- **WebGL path:** the entry hangs on the tile as `t.ov`. Each frame `uploadStroke` sends only the dirty rows of the buffer to a one-channel texture, and the shader blends `tile + color×stroke` (or erases). Nothing is composited on the CPU while drawing, and the tile canvas isn't touched.
- **After pen-up** (`finishStroke`), entries go to `bakeQ`. `bake` composites each tile once, in place, over just `ex0..ey1`, then `putImageData`s and patches that rect into the tile texture. `bakeSome` does about 3 ms of this per frame. A new stroke entering a tile that's still pending bakes it first.
- The undo copy of an existing tile is taken lazily (`PENDING` placeholder, filled in `bake`). **Call `settle()` before anything that reads or replaces tile canvases** (undo/redo, layer ops, merge, clear, export, save).
- **Canvas 2D fallback:** as before, the entry keeps `orig` and an undo clone, and `flushStroke` composites `orig + color×buf` into the tile every frame.

**Notes.** `#notes` holds DOM cards above `#ov`. Each note is `{id, x, y, text}` in world units, saved to localStorage `sinopia.notes`.
- `layoutNotes()` runs after a scene render only when the view has changed, so notes add no work during strokes. A card is a `translate` + `scale(view.z × dpr)`, so it's 220 px wide at 100% zoom.
- An empty note is removed on blur.
- Notes aren't in undo or in the PNG export.
- While Space is held, notes ignore the pointer so panning works over them. Wheel events over a note go to the same `onWheel` as the canvas.

**Paper color.** The default paper (background) is neutral gray `#808080` (Ben's request). Saved papers still on an old default (`#f7f9fb`, `#fbfaf6`) move to it; a paper color he picked himself is kept. The brush color persists between sessions as before.

**Resize readout.** Ctrl+drag shows only the ring. The px label and the toast were removed at Ben's request.

**Pen-down with zero pressure.** Firefox and Zen on Windows report `pressure: 0` at pen-down. A pen pointerdown with 0 pressure waits (`act.wait`) and starts the stroke at the pen-down point on the first event with real pressure. A tap that never reports pressure draws a dot at 0.5. Before this fix, taps made invisible dots in Firefox.

**Raster worker.** Built at startup from the engine block (`SCRIPT` split on the markers) plus `workerMain`, as a Blob URL.
- `useWorker` sends a stroke there when radius × symmetry copies (weighted for image tips by spacing) is at least 400. The worker posts back dirty-rect patches, which are copied into the main-thread buffers, so everything downstream is the same.
- Small strokes stay on the main thread on purpose: a worker round trip can add a frame of latency.
- Pen-downs that arrive while a worker stroke is finishing are recorded in `queued` and replayed in order (`replayQueued`). **Draw test strokes** always runs on the main thread.

**Tiles and layers.**
- Each layer is a `Map` of `"tx,ty"` → `{c: 512² canvas, v: version, lod mip canvases}`. Tiles exist only where something has been drawn.
- Layer properties: id, name, visible, opacity, `g` (group id or null). Layers draw in array order, bottom to top.
- **Groups** (`groups`: id, name, visible, open, key 1–9 or null, last active layer). A group's layers are always contiguous in `layers`: `tidyGroups()` enforces this and drops empty groups after every `layerOp`.
  - Moving a layer past a group's edge enters or leaves the group, as in Photoshop. Moving a group's last layer out (by arrow or drag) removes the now-empty group, with a toast saying so; undo restores it. The panel can't show empty groups. This used to be blocked, which made "drag my only layer into a fresh group" fail silently.
  - **Drag and drop in the panel** (`startRowDrag` / `dropTarget` / `applyDrop`). Pointer events (works with a pen), capturing on the list, with a 5 px threshold, auto-scroll at the list edges, and the click after a drop swallowed.
    - The middle of a group header drops a layer into the group at the top.
    - A line between rows takes the group of the layer below it.
    - Just under a group's bottom layer, the pointer's x decides: more than 30 px from the left edge joins the group; less leaves the layer outside. The drop line's indent shows which.
    - Dragging a group header moves the whole block, and it can't land inside another group (groups don't nest).
  - **New group** takes the next free hotkey. If the active layer isn't in a group, the new group wraps it, as in Photoshop. Ben expects this: making a group over an inked layer and pressing Ctrl+N should frame that ink. If the active layer is already in a group, it makes a new group with a fresh empty layer above that group, since groups don't nest.
  - Visibility goes through `shown(L)`, which includes group visibility. There is no group opacity yet (it needs per-layer framebuffers).
  - Undo `layers` entries snapshot the group list and each layer's `g` (`layerSnap`).

**Rendering.** `R` is the backend: `makeGL()` (WebGL 2), or `make2D()` if WebGL 2 is missing or `?gl=0` is in the URL.
- **WebGL:** redraws the whole scene each frame on the GPU. Each tile gets a texture sized to its on-screen size (`needS`, from `lodOf` canvases when small) with a full mip chain, drawn with premultiplied blending at the layer's opacity (tiles in a layer never overlap, so this equals layer opacity).
  - Texture uploads are capped at about 4 ms a frame. Out-of-date textures and tiles under a stroke always upload.
  - LRU eviction keeps textures under about 320 MB.
  - Magnification uses nearest at 300% and up, as in 2D.
  - Handles context loss and restore.
- **Canvas 2D:** `#stage` is redrawn only in dirty rects, using cached mip levels (`lodOf`) when zoomed out.
- `#ov` is the overlay (cursor ring, mirror guides, resize readout) and also receives all pointer input.
- **Debug URL flags:** `?gl=0` forces canvas 2D; `?worker=0` / `?worker=1` turns the raster worker off / always on.
- World units: 1 world px = 1 device px at 100% zoom (`view.z` is CSS px per world px, so 100% = `1/dpr`).

**Undo.** Entries are either `{kind:'tiles', layer, map: key→canvas-before|null}` or `{kind:'layers', list, active}`, and either can carry an `extra` entry (used by merge-down). Redo stores the inverse.

**Persistence.**
- Tiles go to IndexedDB `sinopia/tiles`, keyed `"<layerId>:<tx>,<ty>"`, with debounced saves.
- Settings, layer metadata and imported alphas go to localStorage (`sinopia.settings`, `sinopia.layers`, `sinopia.alphas`).
- Old v1 keys without a layer id migrate into the first layer.

**Brush / eraser.**
- These are independent profiles in `S.tools`. Each one remembers `TOOL_KEYS`: tip, size, opacity, spacing, smoothing, pressure→size, pressure→opacity, rotation.
- `setErase()` swaps the profiles. The pen's eraser end (`button 5` / `buttons & 32`) uses the eraser profile even while the brush is active.

## Controls (keep the UI hints, welcome card and README in sync when changing these)

| Action | Input |
|---|---|
| Straight line | Hold Shift while drawing, or Shift+press. It's a rubber band from the anchor (the stroke's current point) to the pen, always snapped to 10° steps (`LINE_STEP`), with pressure going from the anchor's to the pen's. Four faint guides (0/45/90/135°) are drawn through the anchor, white on gray or dark paper and graphite on light paper. Main-thread strokes preview with the real brush: `previewLine` restores the last preview's area from a buffer snapshot and re-rasterizes. Worker strokes preview as an overlay line. Releasing Shift or the pen commits through the real `Stroke` (`commitLine`), and freehand resumes from the line's end. Ben's spec (2026-10-31). |
| Resize brush | Ctrl + drag. Same speed at every zoom: 1 screen px = 2 px of diameter, which is what 100% zoom gave before. Ben asked for this; he does *not* want brush size to follow zoom. |
| Pan | Space + drag, middle mouse, two fingers (or one finger once a pen has been seen) |
| Zoom | Ctrl + Space + drag (right/up = in), wheel, pinch |
| Pick color | Hold Alt: a preview box shows the color under the cursor over the current color, with its hex. Click or drag to pick. Sampling reads the tile canvases (`sampleAt`), averaging one screen pixel's footprint. |
| Jump to group | Ctrl + 1–9: selects the group and glides to frame its drawing (`jumpGroup` / `animateView`). |
| Brush / eraser | B / E |
| Note | T (or toolbar button) then click: places a text note. Esc cancels. |
| Delete layer | X |
| Flash a layer's drawing | Ctrl + click a layer or group row: accent-tinted silhouette plus dashed bounds, fading over 1.6 s (`highlight`). It doesn't change the active layer. |
| Size | [ / ] |
| Mirror cycle | M (off, vertical, horizontal, both, radial; Kaleido option; drag the center handle) |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y |
| New layer | Ctrl+Shift+N |
| Hide UI | Tab |
| Reset zoom | 0 |

## UI layout

- **Toolbar groups** (in order): brush, eraser, note and the brush-settings toggle · size and opacity · color and swatches · mirror · undo, redo, export, clear layer, layers toggle and help.
- **Brush panel** opens on the left: tips, import alpha, dynamics, stroke test.
- **Layers panel** opens on the right: layer list and actions, then paper color.
- **Theme:** cool blue-greys with a blueprint-blue accent, tight corner radii (2–6px). It follows the system light or dark setting through CSS tokens on `:root`.
- **Export:** trims to the drawing and shows the result in a dialog. A Download PNG button appears only when running standalone (not inside an iframe).

## Testing

- `node tools/stroke-sim.js` pulls the engine out of `index.html` and compares strokes against a supersampled ideal at 13 angles and 7 sizes.
- It also checks a pressure taper and times one stroke.
- Current baseline: about 2% mean and 6–10% worst edge error at every size, 0 taper reversals, and about 10 ms for a 400px stroke with an 80px brush.
- In the app, **Draw test strokes** (brush panel) draws the same cases on a new layer.
- There is no automated UI test. Check UI changes by opening `index.html` in a browser.
- **WebGL / worker equivalence (checked 2026-10-31):**
  - Exports are pixel-identical between `?gl=0` and WebGL, and between `?worker=0` and `?worker=1`. This covered round and image tips, radial and both-axis symmetry, the pen eraser end, back-to-back strokes and undo.
  - Live screen output is within 2/255 during and after strokes. Zoomed far out, thin lines differ slightly, because the GPU's trilinear mips blend levels where 2D's `lodOf` picks one.
  - To re-check, load both variants in same-origin iframes and diff the export images.

## Known gaps / candidate next steps

1. **Blend modes** (Multiply etc.): WebGL compositing is in. Blend modes need each layer rendered to its own framebuffer first, instead of tiles going straight to the screen.
2. **Worker threshold tuning:** `useWorker`'s 400 is an estimate. Tune it on Ben's PC if very large brushes feel laggy (worker) or stall (main thread).
3. **Canvas rotation** (Leonardo has it). This is now easy in the WebGL vertex shader.
4. Optional "build-up" mode for soft brushes (MAX blending means a single stroke never darkens over itself).
5. Selection / transform tools, layer thumbnails, blend modes.
6. Save and load a project file (currently it lives only in browser storage plus PNG export).
7. **Straight lines:** now a rubber band with a hard 10° snap and a 4-line guide, per Ben. Tune `LINE_STEP` or the guide alpha if he asks.
