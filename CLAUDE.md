# Sinopia — project context for Claude Code

Sinopia is an infinite-canvas sketching app for pen tablets, built as a lighter alternative to the Leonardo drawing app. It runs entirely in the browser from a single `index.html` (no build step, no dependencies besides a Google Fonts link) and is published with GitHub Pages.

Owner: Ben Franz (3D/VFX artist, Windows PC with a pen tablet). He prefers concise answers, GUI workflows over command-line-only ones, explicit step-by-step instructions, and a short "why this works" alongside each fix. UI font preference: Franklin Gothic (the app uses Libre Franklin with Franklin Gothic fallbacks).

## Non-negotiables

- **Stroke smoothness and latency.** Ben's top praise was how smooth drawing feels. Never put framework or DOM work on the drawing hot path. No React for the canvas.
- **Clean anti-aliasing at every angle and size.** Verify with `tools/stroke-sim.js` after any change to the engine.
- **Single file, no build step**, unless Ben explicitly asks to change that. The app itself is all in `index.html`. `manifest.webmanifest`, `sw.js` and `icons/` only make it installable (iPad Home Screen, desktop install); it runs without them.
- **Two editions, one codebase** (Ben, 2026-11-06): a light web version and a full downloadable "App" version. iPad comes first, as a PWA (Apple only allows native iPad builds on a Mac). See `ROADMAP.md` for the phases. App-only features must not touch the drawing hot path.

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

**Selection** (added 2026-10-31; Ben asked for "the basic setup from Photoshop").
- `sel` is a coverage mask on the layers' tile grid: `m` maps a tile key to a `Uint8Array` (0–255) or one number for a uniform tile, and tiles not in `m` have the value `out`. `out` is 255 after Invert or Select all, so a selection can include the endless empty paper. `putNorm` collapses uniform tiles; selections are never mutated, so undo entries (`{kind:'sel', sel}`) just hold the old object.
- Shapes: `rectSel` (pixel-aligned, hard edge), `pathSel` (canvas-filled and anti-aliased; ellipse and lasso, with a "tile wholly inside" shortcut for the ellipse). `combine` does add / subtract / intersect, plus `invertSel` and `shiftSel` (whole-pixel offsets).
- `wandSel`: the magic wand compares premultiplied RGBA within `S.tol` on the active layer only, contiguous (`S.contig`) or everywhere. Empty tiles are handled a whole tile at a time. If the flood reaches the empty ring of tiles around the drawing, `out` becomes 255.
- **Painting is clipped** by `clipStroke()` at the top of `uploadStroke` / `flushStroke`: buffer = min(buffer, mask) over each frame's dirty rects only, so it costs nothing without a selection. This is exact with MAX blending, because min(max(a,b),m) = max(min(a,m),min(b,m)).
- Marching ants (`selPath`): the 50% outline as merged pixel-edge runs in a cached `Path2D`, drawn into a screen-sized cache canvas (`drawAnts`), so strokes over a busy selection pay for one blit a frame. They animate every 150 ms, but not during a stroke or a drag, or above 150k segments.
- Pixels: `lift` takes the selected part of a layer as tile canvases (with a history map, it also removes it). `placeFloat` draws them back at an offset. These drive Delete (`clearSelected`), Ctrl+drag move (`startMove` / `endMove`; one undo step, with the old selection in `extra`), and Ctrl+C / X / V (`copySel` / `pasteClip`; paste goes in place on a new layer). Selection isn't saved between sessions.

**Free transform** (Ctrl+T or the toolbar button; added 2026-10-31, Ben asked for "Photoshop's transform, with warps and all").
- `startTransform` lifts the selected pixels of the active layer (the whole layer with no selection) into one source image. The box is the selection ∩ layer bounds plus a 2 px clear border, which keeps rotated edges smooth. A selection is also made into a mask image (`maskCanvas`).
- `xf.pts` is either 4 corners (a homography, so scale, rotate, skew and distort/perspective) or 16 bicubic Bézier control points (Warp). The Warp button converts between them.
- Both preview and commit render through a 32×32 triangle grid (`xfGrid`) on a separate small WebGL 2 canvas (`meshGL` / `meshDraw`) with mipmapped sampling, so it works the same under `?gl=0`.
  - The preview renders only the on-screen part, and is cached on the points and view.
  - Commit (`xfEnd(true)`) draws into the layer tiles in 2048 px chunks. It runs the mask through the same mesh to make the new selection (via `readPixels`, flipped).
  - It's one undo step: tile befores, plus the old selection in `extra`.
- Handles (`xfHit` / `xfDown` / `xfMove`): corners scale proportionally (Shift for free, Alt from the center); edges scale one axis. Inside moves; outside rotates (Shift for 15° steps). Ctrl+corner distorts, Ctrl+edge skews. In Warp, dragging a corner point also moves its handles.
- While a transform is open, only Enter, Esc and Ctrl+Z (which cancels) work, plus pan and zoom. Switching tabs applies it.

**Modifiers** (`L.mods`, Blender-style stack; added 2026-10-31, Array only for now).
- An Array is `{type:'array', on, mode, count, dx, dy, rot, scale, cx, cy}`. **Radial** mode (`mode:'radial'`) ignores the offset and rotation and turns each copy 360/count about the pivot. Switching to it puts the pivot below the drawing, so you get a ring right away. Each copy is the previous one rotated and scaled about the pivot (cx, cy), then offset. Stacked arrays multiply (two make a grid). `copiesOf(L)` returns one world matrix per copy (cached on a JSON key, capped at 512).
- **Non-destructive and live:** pixels never change. WebGL draws each tile once per copy through a `uX` matrix in the vertex shader (device space V·M·V⁻¹), culling tiles per copy. Canvas 2D does the same with `setTransform`, and `dirtyWorld` redraws everything during a stroke on a layer with modifiers. So copies follow the stroke as it's drawn.
- `bakeCopies(L)` renders the copies into tile canvases. Apply (one undo step: tiles plus a `{kind:'mods'}` entry), export, merge-down and Open as document all use it. The picker samples each copy at its inverse-mapped point. Selection, wand, lift and transform work on the source pixels.
- UI is in the layers panel: + Array, Apply, and per-modifier cards. Each card has an eye, move up/down, remove, a Linear/Radial switch, and **sliders**, each with a number box that can type past the slider's range. Offset sliders span ±3× the drawing's size. There's also Center pivot.
- **On-canvas handles** (`modHandles` / `modHit` / `dragModHandle`), shown while the layers panel is open: a pivot ring (both modes) and, for Linear, a dashed arrow from the pivot whose square end sets the offset (Shift snaps it to 45°). They take priority over drawing within 11 px, like the mirror center handle. Adding, removing and reordering are undoable; editing the numbers isn't (like opacity). Modifiers are saved with the layer metadata.

**Workspaces and documents** (added 2026-10-31; Ben’s spec: copy, not a live link; core blend modes; several open at once. Saved with the drawing since 2026-11-07, see Document boards).
- `ws` is the active workspace: `canvasWS` or one of `docs`. The globals (`layers`, `cur`, `groups`, the undo stacks, `view`, `sel`) always hold the active one; `switchWS` stashes them on the old workspace and loads the new one. Everything else (engine, worker, tools, selection) works unchanged on either.
- **New doc** (toolbar, beside Export) and **Open as document** (with a selection) create the document right away (`newDoc`), from the selection’s bounds, or from what’s on screen with no selection. Ben wants sizing to happen afterwards, not in a dialog first.
- **Doc size** (the same toolbar button inside a document, `docSizeDialog`), like Photoshop’s Canvas Size. You type a width and height, or use the presets (HD, 4K, Square, A4 300 dpi) and the swap button. The new page is previewed on the overlay, centered on the old one (`docArea`, `drawDocArea`), with everything outside dimmed. The dialog is a transparent sheet at the bottom, so the preview stays visible.
  - Applying (`applyResize`) shifts every layer and the selection so the page starts at (0,0) again, and moves the view so the content doesn’t jump. The board's `D.at` moves by the same amount, so it stays put on the canvas. Pixels outside the page are kept.
  - It’s one undo step (`{kind:'resize', w, h, dx, dy}`, which returns its own inverse).
- `openDoc(area)` copies that rectangle of every visible canvas layer (`copyRegion`) into a document whose page is world (0,0)–(w,h). Groups are flattened, the paper color is copied, and the view fits the page (at most 100%).
- Document layers have `L.doc`: they save like any layer (tiles in IndexedDB under their own ids), but collab never sends them. `saveLayers` inside a document calls `saveDocs` instead, and `saveSettings` stores the canvas view.
- **Document boards** (2026-11-07; Ben: documents were "having a hard time saving" and should be "integrated into the infinite canvas … double clicking to open it").
  - `writeDocs` stores every document in `fkey('docs')`: `{nextId, seq, list: [{id, name, w, h, paper, at, view, active, groups, layers}]}`. `initDocs` runs before `loadTiles`, registering doc layers in `allLayers` so their tiles load, and bumps `nextId` past them. Flushed with settings (`flushDocs`). Files duplicate and delete the key with the others.
  - Each document sits on the canvas at `D.at` (world px, 1:1). `openDoc` puts it beside the source area (`freeSpot` slides it right past other boards). `makeThumb` composites the page (≤1536 px, blend modes, masks, modifiers) when you leave its tab and after boot.
  - `#boards` is its own canvas between `#stage` and `#ov` (rotated with them). `drawBoards` runs after a scene render but returns at once unless `boardKey` (view, `boardGen`, hover) changed, so strokes don't pay for it.
  - Input (`boardHit` in the `#ov` pointerdown, before tools, canvas tab only, not with Alt/Ctrl): drag moves (`boardMove`, saved on release), two clicks within 450 ms open (`openBoard`, which fits the view the first time), right-click shows Open / Delete (`deleteBoard`: asks, then queues its tiles for deletion). Hovering hides the brush ring (`overBoard`).
  - Tabs list only open documents (`D.open`); the tab × (and File → Close document) just closes the tab. Project files store `at` per space; loading one places boards right of the drawing.
  - **Document groups (2026-11-09, Ben: pop-outs as "groups that can only be accessed inside the pop-up", with nothing inside identifiable).** On the canvas, `renderLayers` lists each document first as a locked row (`docRow`, `.dgrp`) in its own color (`D.color` from `DOC_COLORS`, unique, assigned by `docColor`, saved in `writeDocs`; also the board frame and label). No expand arrow, no layer names. Click glides to the board, double-click opens it, the eye hides the board (`D.hide`, skipped by `drawBoards` / `boardHit`), × deletes it via `deleteBoard` (asks first).
- **Blend modes** (`L.blend`, `BLENDS`), documents only. In WebGL, a document renders into screen-sized buffers (`screenBuf`), scissored to the page. Normal layers draw straight in; a blended layer draws into its own buffer, then `FS_BLEND` mixes it with the buffers below (W3C separable formulas, premultiplied). The page is then copied onto the `PASTEBOARD`. Canvas 2D uses the same modes as `globalCompositeOperation` (`blend2D`). The picker (`blendCh`), export and merge-down also blend. Live strokes on a blended layer blend as you draw.
- `texClear` keeps the bound framebuffer and turns off the scissor while it clears, because it can run mid-render.

**Notes.** `#notes` holds DOM cards above `#ov`. Each note is `{id, x, y, text}` in world units plus optional `w`, `h` (card px at 100%), `bg` (hex; none = clear), `a` (opacity), `fs` (text px), always read and written through `noteIn` / `noteOut` (storage, projects, collab). Saved to localStorage `sinopia.notes`.
- **Style (2026-11-07, Ben: "Houdini notes, minus the ugly yellow").** The ● button opens `#notePop` (`openNotePop`): clear + `NOTE_COLORS`, opacity, text size, Use for new notes (`S.noteStyle`), Reset size. The corner `.nrs` resizes. `styleNote(n)` applies it: a filled note moves to `#notes2` (normal blend, auto light/dark text); a clear one stays in the multiply layer `#notes`. Both layers are handled together for rotation, `patchEv`, Space pass-through and documents.
- `layoutNotes()` runs after a scene render only when the view has changed, so notes add no work during strokes. A card is a `translate` + `scale(view.z × dpr)`, so it's 220 px wide at 100% zoom.
- An empty note is removed on blur.
- Look (Ben's request): transparent cards with a dark #2a3442 border and text. The whole `#notes` layer has `mix-blend-mode: multiply`, so the ink multiplies into the drawing. `position: fixed` makes the container its own stacking context, so the blend has to sit on the container, not on the cards.
- Notes aren't in undo or in the PNG export.
- While Space is held, notes ignore the pointer so panning works over them. Wheel events over a note go to the same `onWheel` as the canvas.

**iPad / touch** (added 2026-11-06).
- PWA: the manifest, Apple meta tags and `sw.js` (cache-first, refreshed in the background). The service worker registers only over https, so local testing never serves a stale copy. `IOS` detects iPadOS, which reports itself as a Mac, and halves the WebGL texture budget to 160 MB.
- `touch-action: manipulation` on controls and `gesturestart` prevented, so there's no page zoom. There's no callout or text selection.
- **Gestures**: `gest` tracks a touch sequence; a two-finger tap (no movement over 14 px, under 400 ms) undoes, and a three-finger tap redoes. A two-finger drag always pans; each gesture then commits to **one** of zoom (spread changes 6%, `PINCH_ZOOM`) or rotate (twist 15° first, `PINCH_TWIST`) until the fingers lift (Ben, 2026-11-09: it kept zooming and rotating at once).
- **iPad speed (2026-11-09):** the multiply notes layer is `display:none` while empty (a full-screen blend costs Safari every frame), `#boards` is hidden without boards, and texture uploads get 2 ms a frame on iOS (4 elsewhere). `?perf` shows fps, the worst frame, canvas size, dpr and texture MB (`PERF`, `perfTick`; `frame` wraps `frameBody`). While a pen stroke is down (`act.pen`), touches are ignored entirely, so a resting palm can't cancel it (before, a second touch cancelled the stroke to start a pinch).
- **Touch dock** (`#dock`, shown on coarse pointers or iOS; Tab hides it with the rest of the UI). Under Undo/Redo, `#dGroups` has one numbered button per group with a hotkey (`renderDockGroups`, from `renderLayers`; two columns past 5), each calling `jumpGroup` (Ben, 2026-11-10).
  - Line stands in for Shift via `virt.line`. Holding it works like holding Shift; a quick tap latches it on or off.
  - Pick stands in for Alt via `virt.pick`, for one pick.
  - Undo and Redo.
- Settings are flushed on `pagehide` / `visibilitychange` (`flushSettings`, `flushSave`), since iPad may kill a backgrounded app.

**Color menu** (`#cpop`, `openCP` / `closeCP`, added 2026-11-06). It replaces the OS color dialog so it matches the theme.
- An HSV square, a hue bar, a hex box, before/now swatches, presets (`PRESETS`) and recent colors (`S.recent`, 12, saved).
- Used for the brush (V, or the color button; V opens it at the cursor when over the canvas) and for the paper.
- A recent color is added when the menu closes after a change, and after an Alt pick.
- A pointerdown on the canvas while it's open only closes it.

**Toolbar extras (2026-11-06).**
- `#pressBtn`: a click toggles pen pressure for the current tool (remembering which of size and opacity were on, in `S.pPrev`). A long-press or right-click opens the brush panel at Dynamics.
- `#sizePx`: brush diameter in px beside the ? button, and you can type in it.

**Smudge** (F; added 2026-11-07, Ben asked for "a GOOD smudge tool"). A third tool profile beside brush and eraser (`setTool('brush'|'erase'|'smudge')`, `toolName()`, `S.smudge`; `setErase` wraps `setTool`), so size, opacity (shown as **Strength**, `#flowLab`), smoothing and pressure are its own. Not on the stroke engine: `startSmudge` / `smudgeTo` / `smDab` / `smFlush` / `endSmudge` work straight on the layer tiles' ImageData (`SM.tiles`, read once per tile per stroke, written back per frame as dirty rects, `t.v++`).
- **Modes** (`S.smMode`, toolbar `#smOpts` Blend | Smear, shown with the smudge tool). Ben found the first version (now Smear) pulled paint far too strongly and wanted "a method to blend between two colors", so **Blend** is the default. In Blend, each dab moves pixels toward the carry leaned 60% toward the previous dab's falloff-weighted average color (`SM.mean`). The per-dab share `dep = 1 − (1−T)^(step/2r)`, with T = 0.15 + 0.82·strength, makes one pass move a pixel about T of the way whatever the speed or size. The carry refreshes with `1 − exp(−step / (Rm·(0.15 + 0.35·strength)))`, so paint travels a fraction of the radius. On a red|blue edge at 100%, one back-and-forth gives an even 0.73 → 0.20 gradient; Smear carries solid red about 90 px.
- Smear: the brush carries a premultiplied float patch (`SM.C`, brush-local). Each dab: canvas → carry by weight (smoothstep falloff × pressure × selection), then carry picks up `0.015 + 0.6·(1−strength)²` of the result. Dabs sit on whole pixels (step ≤ 6 px), so the carried patch is never resampled and smears stay sharp.
- Pen-down only picks up. Empty tiles are created only when carried paint lands there. One tiles undo step; `markSave` sends it to collab. The pen's eraser end still erases. No mirror symmetry. About 2 ms per move at 400 px.

**Fill** (G; added 2026-11-06). `fillAt` takes a contiguous `wandSel` and then grows it under anti-aliased edges (`growMask`, 4-neighbour dilation, `S.fillGrow` px, default 1). The selection is intersected in, and `fillBound()` clips it to the page, or to the screen on the canvas, because an open area would be endless. `fillMask` paints the brush color at brush opacity; it's one tiles undo step.
- The wand takes options (`{tol, contig, all}`). `all` samples the composite of all visible layers, drawn per tile into a scratch canvas (`S.fillAll`, default on), so line art on another layer bounds the fill. The toolbar shows it as **Sample: All layers | This layer** (`setFillAll`, Shift+G toggles; Ben wanted it to be clearly an option).
- Fill selection: Alt+Backspace, Shift+Backspace, or the Fill button.

**Ellipse guide** (O; `guide`, saved in `S.guide`; added 2026-11-06, Ben asked for "a circle guide tool like in Leonardo").
- A stroke that starts within `GUIDE_GRAB` (22 screen px) of the ellipse has `stroke.snap` set, and every input point is projected radially onto the ellipse (`guideSnap`, in the ellipse's own frame) before smoothing. Strokes that start elsewhere are free.
- Handles sit `GUIDE_OUT` px outside the curve, so they don't block drawing on it:
  - center: move
  - square: size and turn (Shift: 15° steps)
  - round: squash (Shift: back to a circle)
  - diamond (45°, lower right): uniform scale about the center, keeping the ratio and the angle (Ben, 2026-11-07)
- **Rectangle guide** (U, `tRect`; 2026-11-10): `guide.shape = 'rect'` (saved), rx/ry are half the width and height. `guideSnap` projects along the ray from the center (max-norm), handles are the same (the diamond sits on the corner). `strokeTo` re-projects the smoothed point and inserts the exact corner (`rectEdge` / `rectCorner`) when the stroke turns onto an adjacent side, so smoothing never rounds corners. `guideKey(shape)` switches shape if the other guide is on; `syncGuideBtns`. Its button is `tRGuide` (`tRect` is Rectangle select; sharing that id crossed the two buttons, fixed 2026-11-11).
- **Perspective guide** (P, `tPersp`, options `#pOpts`: 1-pt / 2-pt / 3-pt, Snap, Reset; 2026-11-11). `persp = {on, n, snap, vp}` saved as `S.persp`; `vp[0]` is the 1-point VP, `vp[1]`/`vp[2]` the horizon pair (dragging one keeps the other level), `vp[3]` the third. `drawPersp` caches rays (every 5°, tinted per VP) and the horizon in `perspC`, keyed on view and points, then draws the handles. With Snap, `beginStroke` sets `stroke.persp` (not when the stroke starts on the ellipse/rect guide); `strokeTo` waits for 10 screen px, `perspDir` picks the line through the start point that best matches the movement (towards a VP, or horizontal in 1-pt, vertical in 1- and 2-pt), then projects every point onto it. Handles via `perspHit` / `dragPersp` (`act.type === 'persph'`), before the ellipse guide's.

**Canvas rotation** (hold R and drag, two-finger twist, `#rotOut` pill to reset; added 2026-11-06).
- **CSS rotation, not renderer math:** `#stage`, `#ov` and `#notes` are rotated about the screen center (`rotLayout`). While rotated, they're squares the size of the screen's diagonal (`rotD`). `keepRot` holds that layout through a drag, so crossing 0° doesn't reallocate the canvases.
- A capture listener (`patchEv`) rewrites clientX/Y on pointer and wheel events aimed at those elements into the unrotated frame, keeping `rawX`/`rawY`. So every tool, handle and renderer is untouched.
- Views are stored *normalized*, as if not rotated (`normV`), in settings and in `switchWS`. `rotLayout(true)` re-applies the layout offset.
- `snapRot` makes 0° sticky within 3°; Shift gives 15° steps. A twist only starts turning the canvas past 8°.
- The Alt picker's preview box turns with the canvas.

**Liquify** (Ctrl+Shift+X or the toolbar button; added 2026-11-06). It's a mode of free transform: `startTransform(true)` sets `xf.liq`, a fine grid of up to 160×160 cells, about 10 px each.
- The brush (`liqStep`, falloff (1−t²)², size = brush size, strength = brush opacity) moves grid points with Push, Twirl, Bloat or Restore; Alt reverses twirl and bloat.
- Twirl, bloat and restore keep going while the pen is held still (a 30 ms timer).
- Preview, commit, selection follow and undo are the transform's. `meshFor(N)` keeps an index buffer per grid size, and `xf.gen` invalidates the preview cache.
- In liquify, [ and ] resize the brush.

**Panels and menus (2026-11-06).**
- **Name clash (fixed 2026-11-11):** the docking code once declared its own `placeFloat`, which replaced the selection one and broke Doc size (and Ctrl+drag moves). It is now `placePane`. Check for duplicate function names and ids after big patches.
- **Workspace (2026-11-07, Ben: "the file–help bar needs to be permanent along with the home button; the rest should be dockable and movable, with a Window menu to remove any").** `#menubar` is a fixed full-width bar (Home `#tHome`, brand, menus incl. **Window**), always shown, outside `#ui` so Tab doesn't hide it. `#ui` is a grid of dock zones: `#zTop` (row, wraps), `#tabs`, `#zLeft` / `#zRight` (columns; toolbar groups turn vertical there), `#zBottom`, plus `#zFloat` (fixed-position floaters). Panes (`PANES`: the toolbar groups `#tbTools` `#tbSize` `#tbColor` `#tbMirror` `#tbActions`, `#brushPanel`, `#layerPanel`, `#dock`) each have `data-pane` and a grip; `makeDockable` drags them, `dropZone` picks a zone within 64 px of an edge (or over the top row), `dockPane` inserts by pointer position. State: `S.ws2 = {zones, float, off}`, applied by `applyWorkspace()`. Window items toggle panes (`winToggle` / `winOn`; brush and layers still go through `showPanel`, the touch dock through `S.touchDock`); `resetWorkspace()`. CMDS entries may carry a 7th field, an `on()` checkmark.
- `makeMovable` is now only used for the filter sheet (`S.layout.flt`). Double-clicking a grip resets it, and so does Reset panel positions in the shortcut sheet.
- `showMenu(anchor, items)` is a small pop-up menu, used by the New doc ▾ presets (`DOC_PRESETS`, shared with the Doc size dialog; `presetDoc` centers on the selection or screen; `S.docBlank` makes blank pages), and meant for the App edition's menu bar.
- **Shortcut sheet** (`?`, `#keysDlg`): searchable, built from `KEYS`. **That array is now the source for the in-app shortcut list**, and the welcome card only lists the basics.

**App edition** (Phase 3, 2026-11-06). The menu bar is now always shown (2026-11-07); `isApp()` (installed, `?app`, or `S.app`) only decides Home-at-start and image drops.
- `CMDS` is the command list: `[menu, id, label, default key, run, only:'doc'|'canvas']`. Menus, the shortcut editor and custom keys are all built from it.
- **Custom shortcuts** (`S.keys`, id → combo such as `Ctrl+Shift+N`, from `comboOf`):
  - `customKey(e)` runs first in keydown (after the transform guard). A custom combo runs its command, and the old default of a rebound command does nothing.
  - Unchanged defaults still go through the main keydown code.
  - The editor (`#kbDlg`) moves a clashing combo off the other command.
- **Project files** (`.sinopia`, `buildProject` / `loadProject`):
  - Layout: `SINOPIA1`, a uint32 LE header length, the JSON header (spaces = canvas + every open document, with layers, groups, paper and normalized view; tiles as `[space, layerId, key, offset, len]`; notes; guide; sym), then the tile PNGs back to back.
  - Save uses the File System Access API when available and not in an iframe (Ctrl+S re-saves to the same file); otherwise it downloads.
  - Open asks first (`ask()`, a themed confirm), replaces the canvas and documents, gives every layer and group new ids, and queues the old IndexedDB tiles for deletion through `saveSet`. Dropping a .sinopia file opens it too.
- **Place / paste images** (`placeImage`): a new layer at 1:1, centered on the screen or the page, then free transform starts.
  - Ctrl+V lets the browser's `paste` event decide: an image from another app is placed, unless Sinopia's own copy is newer. `ownClipFresh` is cleared on window blur. A 120 ms fallback covers the case where no paste event comes.
  - In the App edition, dropping an image places it; on the web, Shift+drop places it and a plain drop imports a brush alpha, as before.
- **Flip view** (Shift+H, `view.flip`): an extra `scaleX(-1)` in the rotation layout, mirrored in `unrot`. The pixels never change.
- Fit (Ctrl+0, `fitView`), zoom in and out (Ctrl+= / Ctrl+−).

**Filters and adjustments** (Phase 4, 2026-11-06). `FILTERS` lists each one's sliders; `fltStart(kind)` opens the sheet (`#fltDlg`).
- The target (the active layer, or the mask while painting on it, or a new **Merged copy** layer of everything visible) is read over its content bounds, clipped to the selection's bounds, into one region image. Spatial filters pad it by 96 px.
- `filterGL()` is a separate small WebGL 2 canvas. `fpass` runs one fragment shader (`FS_HEAD` + `FS_SRC`): `blur` (separable Gaussian, two passes), `usm`, `split`, `color` (modes 3–17: hue/sat, levels, develop, color wheels, noise, brightness/contrast, color balance, black & white, photo filter, channel mixer, invert, posterize, threshold, curves, desaturate) and `mixm` (mixes with the original through the selection mask).
- Every slider change re-renders from the untouched original and writes straight into the layer tiles, so the preview is in place in the stack. Cancel restores the tiles (and removes a merged copy); Apply is one tiles undo step and remembers the sliders in `S.flt`.
- While a filter is open, only pan and zoom reach the canvas, Enter/Esc apply/cancel, and Ctrl+Z cancels. Up to 8192 px a side.
- **No row flip on read-back** (fixed 2026-11-07; filters used to turn the layer upside down). The source canvas is uploaded with its top row as texture row 0, the passes keep that order, and `readPixels` returns row 0 first. So `fltRun` and `featherSel` copy rows straight, and the noise `org` is `(x0, y0)`.
- `FILTERS` params are `[key, label, min, max, default, step, heading?]`. A 0–1 param with step 1 shows as a checkbox. `spec.scrub` shows the params as **Resolve-style scrub fields** (`scrubField`: drag left/right, Shift fine, click to type, double-click resets, arrows step). `spec.instant` (Invert, Desaturate) applies at once. `spec.store` renames the `S.flt` key when a filter's params changed meaning (Develop → `develop2`, wheels → `grade2`).
- **Develop** follows Resolve's primaries: temp (±4000), tint, exposure, contrast about a pivot (1.000 / 0.435), mid/detail (local contrast against a 12 px blur, passed as `s2`), color boost, shadows, highlights, saturation and hue (50 = neutral; hue rotates about the gray axis).
- **Image → Adjustments** is a submenu: a CMDS menu of `'Image/Adjustments'` is grouped by `buildMenubar`, and `showMenu` items with `items` open a child menu on hover. Curves (`curvesUI`, `curveEval` monotone cubic, `curveLut` → a 256×1 LUT on texture unit 3; channel curve first, then the RGB master; points saved as `S.flt.curves.pts`). Levels, Curves and Threshold show a histogram (`histOf`, from a ≤384 px copy).
- The panel card is movable (`makeMovable` on `#fltCard`, key `flt`). `.dialog.flt` has `pointer-events: none`, so the canvas around the card still pans and zooms.
- Color wheels (`wheelVec`): the puck's hue becomes a balanced RGB offset (no brightness change), plus each wheel's brightness slider. Lift = c + lift·(1−c), gain = c·(1+gain), gamma = pow(c, e^−gamma), then offset.
- `noiseLayer()`: a 50% grey Overlay layer of the page in documents, or clear black-and-white grain over the screen on the canvas.
- **Gradient Map** (`gmap`, color mode 18, 2026-11-10): luma (optionally reversed) indexes a 256×1 LUT on unit 3 (`gradLut`, from `flt.grad` stops `{p, c}`), mixed by Amount. `gradUI`: `GRADS` presets, a bar (click adds a stop), stops (drag moves, drag 28 px below removes, tap opens the color menu). `openCP` takes `{get, set}` for any target (`CP.on = 'custom'`); `fltEnd` closes it. Stops are saved as `S.flt.gmap.stops`.
- **Feather** (Shift+F6, `featherSel`): blurs the selection mask with the same blur shader. `askNum` is a themed number prompt (`#numDlg`).

**Layer masks** (Phase 4). `L.mask` is a layer-like object (`mkMask`, its own id, registered in `allLayers`) whose **alpha means hidden**.
- So strokes, undo, autosave (IndexedDB under the mask's id; `saveLayers` stores `mask: {id, on}`) and filters work on it unchanged. `paintL()` is what strokes, fills and filters change: the mask while `maskEdit` (\ or the row's mask chip), otherwise the layer. The brush hides, the eraser reveals.
- WebGL: a masked layer draws into screen buffer 2, then the mask tiles draw over it with `blendFunc(ZERO, ONE_MINUS_SRC_ALPHA)` (× (1 − hidden)), then it's copied (or blended, in documents) onto the target. A live stroke on the mask goes through the normal stroke shader, so the reveal or hide shows as you paint. Canvas 2D does the same with a screen-sized scratch canvas and `destination-out`.
- `maskedLayer(L)` is a stand-in with the mask applied, used by export, merge down, Open as document and filter Merged copy. The mask follows the layer's modifiers (its `mods` is a getter onto the owner's).
- Mask from selection covers the layer's tiles and the selection's own; painting outside those later isn't hidden. Undo kind `{kind:'mask', layer, mask}`; Apply mask is a tiles entry with a mask entry as `extra`.

**Cryptomatte / EXR** (Phase 4). `readEXR`: scanline, single-part OpenEXR with no compression, RLE, ZIPS or ZIP (`DecompressionStream('deflate')`, then `unPredict`). Channels are kept as raw bits, so float ids stay exact.
- `cryptoLayers` reads the `cryptomatte/<key>/name` and `manifest` metadata and the `<name>NN.RGBA` rank channels (matching with or without the view-layer prefix). `exrBeauty` picks the plain RGB(A) or Combined pass, linear → sRGB, un-premultiplied.
- `openEXR` makes a document of the EXR's size: the beauty layer, plus a hidden false-color ID layer (`cryptoPreview`). `ws.crypto` holds the mattes (not saved in projects).
- The pick tool (`selTool === 'crypto'`, `cryptoSel`) takes the clicked pixel's highest-coverage id and sums every rank's coverage for it into an anti-aliased selection. `cryptoNext` switches between Object, Material and Asset mattes.
- Tested with a synthetic ZIP EXR (two objects, half and float channels). Not yet with a real Blender file.

**Files and Home** (2026-11-07, Ben asked for "a home page that displays your files" and different files).
- `files` (localStorage `sinopia.files`: `{id, name, created, modified, shared?}`) and `fileId` (`sinopia.file`). Per-file keys come from `fkey(k)`: `sinopia.layers.<id>`, `sinopia.notes.<id>`, `sinopia.fv.<id>` (view and paper). Tiles are under `<id>/<layerId>:<tx>,<ty>` in IndexedDB (`TPRE`, `rangeOf`).
- The first file, `'main'`, keeps the old unprefixed keys (`sinopia.layers`, tile keys starting with a digit or `-`; its range is everything below `'f'`), so older drawings just appear. New ids start with `f`. Thumbnails are `thumb/<id>` (JPEG, `saveThumb`, 5 s after a save), Ctrl+S file handles `handle/<id>`, pending imports `import/<id>`.
- **Switching files reloads the page** (`switchFile`: `saveNow`, `saveThumb`, set `sinopia.file`, reload). That way no state leaks between drawings. `canLeave` asks first if documents are open or a session is on.
- Opening a .sinopia (Ctrl+O, drop, Home → Open file) now makes a new file: `importProject` stores the blob as `import/<id>`, reloads, and `bootFile` runs `loadProject` there.
- Deleting the open file sets `fileGone`, which stops every writer (`saveLayers`, `flushSave`, `writeNotes`, `writeSettings`' fv), then reloads into the newest file.
- `#home` is a full-screen page (z-index 4, under dialogs). A capture keydown listener keeps keys from the canvas while it's open; Esc closes it. `S.homeStart` (default: on in the App edition) shows it at launch.
- `updFiles(fn)` re-reads the list before writing, because another tab may have changed it.

**Drawing together** (2026-11-07, Ben asked for peer-to-peer through a local host). `tools/collab-server.cjs` (no dependencies; `Start collab server.bat` runs it) serves only index.html, the manifest, `sw.js` and `icons/`, and relays WebSocket messages at `/collab`. It keeps no drawing. The client is `C` (null when off).
- **Join:** the first peer shares its open file. A later one gets `welcome` with ready peers, asks, creates a new file (`shared: true`), stores the address in sessionStorage `sinopia.join`, reloads, reconnects with `join`, and sends `snapreq`. The longest-connected ready peer waits until it's idle with an empty queue, then sends a `snap` (meta, tile PNGs cloned synchronously, notes, `nextId`/`nextGid`/`noteSeq`, and `seen` = the last op number it applied from each sender). The joiner drops buffered ops the snapshot already has.
- **Ops** are binary frames `[u32 to][u32 header length][JSON header][parts]`, numbered per sender (`seq`). They go out in order through one promise chain (`sendOp`), because PNG encoding and deflate are async.
  - `stroke`: at pen-up, `finishStroke` calls `collabStroke`, which sends each tile's stroke buffer cropped to `ex0..ey1`, deflated, with rgb and erase. The receiver composites it with the real `bake()`, so concurrent strokes on one tile both survive. Its own tiles are saved with `markSave(..., quiet)`.
  - `tiles`: any other `markSave` (fill, filters, transform, undo, paste…) queues whole tiles (`collabTiles`, 120 ms). They're cloned at flush time, held back while `xf`, `flt` or a selection move is active.
  - `meta`: `saveLayers` (and the paper color) call `collabMetaSoon`. `applyMeta` keeps local layers the sender didn't know yet (`C.known`). A layer id that's new to the peers also sends its tiles. Tiles for an unknown layer wait in `C.orphans`.
  - `notes`: `writeNotes` diffs against `C.noteSnap` and sends upserts and deletes. A note being typed in keeps its local text.
- Incoming ops are decoded right away (`collabPrep`), then applied in order by `collabPump` only when `canApply()` (idle, no filter, Canvas tab), with `C.applying` set so nothing echoes back.
- **Ids:** during a session `allocId` / `allocGid` / note ids take the next number ≡ `C.slot` (peer id mod 64), so two people never pick the same id. Remote ids bump `nextId` and `nextGid`.
- **Presence:** `collabPtr` (passive listeners on `#ov`, added only while connected) sends `cur` at most every 33 ms, plus on pen down and up. `drawPeers` draws each peer's ring, name tag and in-progress trail (cleared when their stroke arrives).
- Documents aren't shared. An https page can only reach `ws://localhost`, so other machines use the `http://<LAN IP>:<port>` page the server prints (an insecure context: no service worker or save picker, which is fine).

**Paper color.** The default paper (background) is neutral gray `#808080` (Ben's request). Saved papers still on an old default (`#f7f9fb`, `#fbfaf6`) move to it; a paper color he picked himself is kept. The brush color persists between sessions as before.

**View resolution.** The `#resOut` pill beside the zoom shows how many canvas pixels the screen covers (`updateZoomLabel`; its tooltip adds the display size and the page size in documents).

**Hover tooltips (2026-11-07, Ben's request).** One themed `#hovertip` element (class `.hovertip`; `.tip` is taken by the brush-tip buttons), driven by a capture `pointerover` listener at the end of the script. Any `[title]` is moved into `data-tip` on first hover, so the browser's own tooltip never doubles up, and titles set later are picked up the same way. It shows after 500 ms, or 60 ms when another tooltip just closed (sliding along a toolbar). It sits below the element, or above it if there's no room, clamped to the screen. A bracketed shortcut such as "(Ctrl+T)" becomes a `kbd` chip (`KEYISH`). Mouse and pen only, never on touch or over `#ov`. It hides on pointerdown, keydown, wheel, scroll and blur. Write new controls with a plain `title` and they get it for free.

**Array number boxes (2026-11-07).** The native spinners were too small and stepped 1 px. Each field is now ‹ box › (`.nudge`): the buttons repeat while held and Shift is ×10, ↑/↓ and the wheel (when focused) nudge, and Offset steps by 10. Typed values can go past the slider.

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
  - **Drag and drop in the panel** (`startRowDrag` / `dropTarget` / `applyDrop`). Pointer events (works with a pen), with a 5 px threshold. The list captures the pointer only once a drag starts: capturing on press made the browser send the click to the list, so clicking a row stopped selecting the layer (a reported bug). The release is listened for on the window. Also auto-scroll at the list edges, and the click after a drop swallowed.
    - The middle of a group header drops a layer into the group at the top.
    - A line between rows takes the group of the layer below it.
    - Just under a group's bottom layer, the pointer's x decides: more than 30 px from the left edge joins the group; less leaves the layer outside. The drop line's indent shows which.
    - Dragging a group header moves the whole block, and it can't land inside another group (groups don't nest).
  - **Multi-select (Procreate style, 2026-11-10):** swipe a layer row right (26 px, in `startRowDrag`) or Shift+click toggles it in `picked` (a Set beside the active `cur`; a plain click clears it). `#pickBar` under the list: Group (`groupPicked`: one new group at the top layer's spot, never splitting another group), Merge (`mergePicked`: into the lowest, one undo with `extra` tiles), Delete (`deletePicked`; X too). Moving or transforming several at once isn't in yet.
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

**Undo.** Entries are `{kind:'tiles', layer, map: key→canvas-before|null}`, `{kind:'layers', list, active}` or `{kind:'sel', sel}`. Any of them can carry an `extra` entry (merge-down, and a selection move's old selection). Redo stores the inverse.

**Persistence.**
- Tiles go to IndexedDB `sinopia/tiles`, keyed `"<layerId>:<tx>,<ty>"` (prefixed `<fileId>/` for every file but `main`), with debounced saves.
- Settings and imported alphas are global in localStorage (`sinopia.settings`, `sinopia.alphas`). Layer metadata, notes and view/paper are per file (see Files and Home).
- `pagehide` and `visibilitychange` flush settings, notes and tiles. (These were accidentally inside `mountNote` until 2026-11-07, so they only ran once a note existed; also, a window blur used to delete empty notes.)
- Old v1 keys without a layer id migrate into the first layer.

**Brush / eraser.**
- These are independent profiles in `S.tools`. Each one remembers `TOOL_KEYS`: tip, size, opacity, spacing, smoothing, pressure→size, pressure→opacity, rotation.
- `setErase()` swaps the profiles. The pen's eraser end (`button 5` / `buttons & 32`) uses the eraser profile even while the brush is active.

## Controls (keep the UI hints, welcome card and README in sync when changing these)

| Action | Input |
|---|---|
| Straight line | Hold Shift while drawing, or Shift+press. It's a rubber band from the anchor (the stroke's current point) to the pen, always snapped to 10° steps (`LINE_STEP`) and also onto the 45° diagonals, because the guides show 45° and a 10° grid can't reach it (that mismatch was a reported bug), . Four faint guides (0/45/90/135°) are drawn through the anchor, white on gray or dark paper and graphite on light paper. Main-thread strokes preview with the real brush: `previewLine` restores the last preview's area from a buffer snapshot and re-rasterizes. Worker strokes preview as an overlay line. Releasing Shift or the pen commits through the real `Stroke` (`commitLine`), and freehand resumes from the line's end. Ben's spec (2026-10-31). | **Steady weight (2026-11-06, Ben's request):** the whole line uses one pressure, the highest smoothed (EMA 0.25) pen pressure seen so far (`L.pw`), reached 1 px from the anchor. So it doesn't taper at either end. With the eraser, worker-stroke previews draw in the paper color, not the brush color.
| Resize brush | Ctrl + drag. Same speed at every zoom: 1 screen px = 2 px of diameter, which is what 100% zoom gave before. Ben asked for this; he does *not* want brush size to follow zoom. |
| Pan | Space + drag, middle mouse, two fingers (or one finger once a pen has been seen) |
| Zoom | Ctrl + Space + drag (right/up = in), wheel, pinch |
| Pick color | Hold Alt: a preview box shows the color under the cursor over the current color, with its hex. Click or drag to pick. Sampling reads the tile canvases (`sampleAt`), averaging one screen pixel's footprint. |
| Jump to group | Ctrl + 1–9: selects the group and glides to frame its drawing (`jumpGroup` / `animateView`). |
| Brush / eraser | B / E |
| Free transform | Ctrl+T (toolbar button too). Corner = scale, keeping proportions (Shift for free, Alt from the center). Edge = one axis. Inside = move. Outside = rotate (Shift for 15° steps). Ctrl+corner = distort, Ctrl+edge = skew. The Warp, Flip H, Flip V, Cancel and Apply buttons show in the toolbar. Enter applies, Esc or Ctrl+Z cancels. |
| Select | S rectangle (S again: ellipse), L lasso, W magic wand (tolerance and Contiguous show in the toolbar). Mode comes from the modifiers held at press: Shift adds, Alt subtracts, Shift+Alt intersects. Shift or Alt pressed *during* a drag makes a square/circle or draws from the center. Dragging inside a selection moves the outline, and a click without a drag deselects. M stays mirror, so select isn't on M as it is in Photoshop. |
| Selection actions | Ctrl+drag (with a select tool) moves the selected pixels, or the whole layer with no selection. Delete/Backspace clears them. Ctrl+D or Esc deselects, Ctrl+Shift+I inverts, Ctrl+A selects all. Ctrl+C / Ctrl+X / Ctrl+V copy, cut and paste in place on a new layer. Invert and Deselect buttons appear in the toolbar while there's a selection. |
| Note | T (or toolbar button) then click: places a text note. Esc cancels. |
| Delete layer | X |
| Solo a layer | Ctrl + click a layer's (or group's) eye: hides every other layer; Ctrl+click it again restores the old visibility (`soloToggle`, `solo` holds the snapshot; a plain eye click clears it). Ben's request, 2026-11-07 |
| Flash a layer's drawing | Ctrl + click a layer or group row: accent-tinted silhouette plus dashed bounds, fading over 1.6 s (`highlight`). It doesn't change the active layer. |
| Size | [ / ], or type it in the px box beside ? |
| Color menu | V (at the cursor), or click the color swatch |
| Smudge | F (Blend or Smear in the toolbar; opacity slider = Strength) |
| Fill | G (Tolerance, Sample: All layers / This layer, and Grow show in the toolbar; Shift+G switches sampling). Alt+Backspace or Shift+Backspace fills the selection |
| Ellipse guide | O. Strokes that start on it follow it; drag the center, the square (size and turn), the round handle (squash; Shift for a circle) and the diamond (uniform scale) |
| Rectangle guide | U. Same handles; corners stay sharp |
| Perspective guide | P. 1-pt / 2-pt / 3-pt, Snap and Reset in the toolbar; drag the vanishing points. With Snap on, strokes lock to the grid's lines |
| Select several layers | Swipe a row right, or Shift+click; Group / Merge / Delete in the bar under the list |
| Rotate canvas | Hold R + drag (Shift: 15°; it snaps straight near 0°), R + click straightens, two-finger twist on touch, click the ° pill to reset |
| Liquify | Ctrl+Shift+X: Push / Twirl / Bloat / Restore, Alt reverses, brush size and opacity set size and strength, Enter applies |
| Move / dock panels | Drag any pane's dotted grip: near an edge docks it (left, right, top, bottom), elsewhere floats it. Double-click the grip to send it home. Window menu shows/hides panes and resets the workspace |
| Shortcut sheet | ? (searchable). App edition: Edit → Keyboard shortcuts to rebind |
| Home / files | House button at the left of the toolbar, or File → Home. Cards: click opens, ⋯ renames, duplicates, deletes. Esc goes back |
| Draw together | Start collab server.bat on one PC, then File → Draw together → Connect (the ● pill at the bottom shows who's in) |
| Project | Ctrl+S save (.sinopia), Ctrl+Shift+S save as, Ctrl+O open (as a new drawing), Ctrl+Shift+P place image, Ctrl+Shift+E export, Ctrl+V pastes images from other apps |
| View | Ctrl+0 fit, Ctrl+= / Ctrl+− zoom, Shift+H flip view |
| Filters | Ctrl+Shift+A develop (Resolve scrub fields), Ctrl+Shift+G color wheels. Image → Adjustments: Ctrl+L levels, Ctrl+M curves, Ctrl+U hue/saturation, Ctrl+B color balance, Ctrl+Alt+Shift+B black & white, Ctrl+I invert, Ctrl+Shift+U desaturate, plus brightness/contrast, photo filter, channel mixer, posterize, threshold. Filter menu: blur, sharpen, RGB split, noise, noise layer. Enter applies, Esc cancels |
| Layer mask | ◐ button in the layers panel (Shift+click toggles). \ paints on the mask: brush hides, eraser reveals |
| Feather | Shift+F6 |
| Cryptomatte | File → Open EXR (or drop an .exr), then click objects; Shift adds, Alt subtracts |
| iPad | Two-finger tap = undo, three-finger tap = redo. Dock on the left: Line (hold, or tap to latch) = Shift, Pick = Alt, Undo, Redo, then one numbered button per group (jump) |
| Mirror cycle | M (off, vertical, horizontal, both, radial; Kaleido option; drag the center handle). Shift+M toggles it off and back on in the last mode (`toggleSym`, `sym.last`, saved with `sym`; also View → Mirror on/off). Ben, 2026-11-07 |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y |
| New layer | Ctrl+Shift+N |
| Hide UI | Tab |
| Reset zoom | 0 |

## UI layout

- **Tabs row** (only when a document is open): Canvas, then each open document with its size, and a × that closes it (it stays saved, as a board on the canvas).
- **Menu bar** (fixed, top): Home, then File · Edit · Image · Layer · Select · Filter · View · Window · Help.
- **Toolbar groups** (dockable panes, default order in the top zone): brush, eraser, smudge, fill, guide, note, the four select tools, free transform (with its Warp / Flip / Cancel / Apply bar while active; wand options, Invert and Deselect when relevant) and the brush-settings toggle · size and opacity · color and swatches · mirror · undo, redo, export, clear layer, layers toggle and help.
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
- **Documents (checked 2026-10-31):** Multiply over orange and gray paper gives exact values in WebGL (picker) and `?gl=0` (stage pixels): #2a461a and #183868. Live strokes blend as drawn. Tab switching keeps each workspace’s undo, selection and view, and storage holds only canvas layers afterwards.
- **Files and drawing together (checked 2026-11-07)** with the collab server on port 8091 (the `collab` entry in `.claude/launch.json`):
  - Two files keep separate strokes across switches. Rename, duplicate (tiles copied under the new prefix) and delete (only that file's keys removed) all work, and the thumbnails render.
  - Sessions were tested between a `?gl=0&worker=0` tab and a WebGL tab. Join made a new file with the host's drawing. Strokes went both ways, along with a new layer (id 65, from the host's residue), its tiles, an undo and a note.
  - Simultaneous strokes on one tile gave identical export hashes in both tabs. Leave works, and a fake peer's cursor and trail render.
- **Selection (checked 2026-10-31)** with synthetic pointer events in `?gl=0&worker=0` (reading `#stage` pixels) and in WebGL with `?worker=1` (reading through the Alt picker). Covered: clipped painting, Delete, Ctrl+drag move, undo of each, the wand (contiguous, on empty paper, with invert), ellipse, lasso, and copy/paste.

## Known gaps / candidate next steps

1. **Blend modes** (Multiply etc.): WebGL compositing is in. Blend modes need each layer rendered to its own framebuffer first, instead of tiles going straight to the screen.
2. **Worker threshold tuning:** `useWorker`'s 400 is an estimate. Tune it on Ben's PC if very large brushes feel laggy (worker) or stall (main thread).
3. **Canvas rotation** (Leonardo has it). This is now easy in the WebGL vertex shader.
4. Optional "build-up" mode for soft brushes (MAX blending means a single stroke never darkens over itself).
5. More modifiers (radial array as its own type, mirror, offset/jitter), transform options typed as numbers, polygonal lasso, and layer thumbnails. Selection basics and feather are in.
9. **Phase 4 follow-ups:** Perlin/value noise, adjustment *layers* (filters are destructive today, with live preview), PIZ/DWA EXR compression, and checking Cryptomatte against a real Blender EXR.
6. **Documents next:** (saving is done, as boards) rename and duplicate from the board menu, “Place back” onto the canvas, new blank documents of a chosen size, layer thumbnails, and more blend modes. Ben wants many documents open at once in the full app.
7. Save and load a project file (currently it lives only in browser storage plus PNG export).
8. **Straight lines:** now a rubber band with a hard 10° snap and a 4-line guide, per Ben. Tune `LINE_STEP` or the guide alpha if he asks.
