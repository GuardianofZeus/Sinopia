# Sinopia roadmap

Ben's list from 2026-11-06, grouped into phases. One codebase serves two editions:

- **Sinopia Web**: the lightweight version at the GitHub Pages URL. A single `index.html` that opens instantly and installs from the browser.
- **Sinopia App**: the full version, a downloadable app with a File / Edit / Image menu bar, custom shortcuts, filters, grading, noise and Cryptomatte.

## How the "app" gets made

| Platform | Route | Why |
|---|---|---|
| iPad | **PWA** (Safari → Share → Add to Home Screen) | Apple only lets native iPad apps be built on a Mac with Xcode. A PWA runs full screen, works offline, and gets Apple Pencil pressure through the same pointer events the browser uses. |
| Windows | PWA first (Edge or Chrome → Install), then **Tauri** later if needed | Tauri is a small native wrapper (about 10 MB, not Electron's 150 MB). It adds real file dialogs, file associations and an .exe installer. It's only worth it once File → Save / Open needs more than the browser's file access gives. |

Both editions are the same code. The App's extra features load only when the app is installed or the `?app` flag is set, so the web version stays light and the drawing path never changes.

## Phase 1: iPad and quick wins (done)

- [x] iPad / Apple Pencil:
  - installable PWA (manifest, offline service worker, icon)
  - no page zoom, text selection or callouts while drawing
  - Procreate gestures: two-finger tap undoes, three-finger tap redoes
  - a touch modifier dock (Line, Pick, Erase) for when there's no keyboard
- [x] **V** opens the color menu
- [x] Brush size in px next to the shortcuts button (type a number)
- [x] Pen pressure button in the toolbar (click toggles, long-press or right-click opens the settings)
- [x] Color menu matches the app's theme (no OS color dialog); the color and recent colors are kept on exit
- [x] Shift line: steady weight along the whole line; works with the eraser

## Phase 2: drawing tools (done)

- [x] **Rotate canvas** (hold R and drag, or a two-finger twist on iPad)
- [x] **Fill bucket** (G) and **Fill selection** (Shift+Backspace, as in Photoshop)
- [x] **Circle / ellipse guide** like Leonardo: place a guide ellipse, and strokes near it snap onto it
- [x] **Liquify inside a selection**: push, twirl, pinch and bloat brushes on the lifted pixels, reusing the transform's mesh renderer
- [x] **Document size presets** straight from New doc (1920×1080, 4K, square, A4, iPad screen)
- [x] **Hotkey menu**: a searchable cheat sheet on `?`
- [x] **Movable panels**: drag the toolbar groups and panels anywhere, and the layout is remembered

## Phase 3: App edition, workspace (done)

- [x] Menu bar like Photoshop: File (New, Open, Save .sinopia, Place, Export), Edit, Image, Layer, Select, View, Help (Filter arrives with Phase 4). Shows when installed, with `?app`, or via App menus in the ? sheet
- [x] Project file save and load (all layers, groups, documents, notes)
- [x] Keyboard shortcut editor
- [x] Copy and paste images from other apps (the clipboard pastes as a new layer)

## Phase 4: App edition, image work ("go a little crazy") (done)

- [x] **Filters**: Gaussian blur, sharpen (unsharp mask), RGB split / chromatic aberration, levels, hue/saturation, add noise. All on the GPU, all live-previewed, clipped to the selection, optionally on a merged copy. (Curves is still to come.)
- [x] **Layer masks**: non-destructive; the brush hides and the eraser reveals while painting on the mask (\). Add, from selection, invert, feather (blur), turn off, apply, delete.
- [x] **Lightroom-style develop panel**: exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, vibrance
- [x] **Color wheels like DaVinci Resolve**: lift, gamma, gain and offset wheels, each with a brightness slider. Use Merged copy for a final grade over everything
- [x] **Noise generator**: gaussian film grain (midtone-weighted or flat), grain size, mono or color, as a filter or a new noise layer (an Overlay layer in documents). Value and Perlin noise are still to come.
- [x] **Cryptomatte**: File → Open EXR (or drop one) makes a document with the beauty pass and a false-color ID layer. The Cryptomatte pick tool selects an object with anti-aliased edges; Shift adds, Alt subtracts. Scanline EXRs with ZIP, ZIPS, RLE or no compression (not PIZ / DWA yet).

## Phase 5: files and drawing together (done, 2026-11-07)

- [x] **Home page**: every drawing in this browser as a card with a thumbnail; new, open, rename, duplicate, delete. Optional "show at start" (on by default in the App edition)
- [x] **Multiple drawings**: each has its own layers, notes, view and paper. Opening a .sinopia file adds it as a new drawing
- [x] **Draw together on a local network**: `Start collab server.bat` (no dependencies, Node.js) serves the app and relays live strokes, tiles, layers and notes between everyone connected
- [ ] Later: share documents too; per-user undo that doesn't take back the other person's strokes on the same tiles; internet sessions without a VPN (needs a hosted relay)

## Phase 6: color correction (2026-11-07)

- [x] Filters no longer flip the layer upside down (the GPU read-back was turned over twice)
- [x] **Image → Adjustments**, Photoshop-style: Brightness/Contrast, Levels, Curves, Hue/Saturation, Color Balance, Black & White, Photo Filter, Channel Mixer, Invert, Posterize, Threshold, Desaturate. Levels, Curves and Threshold show a histogram
- [x] **Develop like DaVinci Resolve's primaries**: scrub fields (drag left / right) for temp, tint, exposure, contrast, pivot, mid/detail, color boost, shadows, highlights, saturation and hue; the wheels' master values scrub too
- [x] The filter panel can be dragged anywhere
- [x] **Smudge tool** (F): finger-paint smearing with its own size, strength and pressure
- [x] Fill sampling is a clear toolbar option: All layers or This layer (Shift+G)
- [x] Smudge **Blend** mode (default) for blending two colors; the old pull is **Smear**
- [x] **Documents are saved** and live on the canvas as boards: double-click to open, drag to move, right-click to delete
- [x] **Document groups:** each document is a locked, colored row in the canvas Layers panel (go to, open, hide, delete; its layers stay private to the document)
- [x] **iPad speed pass:** pinch commits to zoom *or* rotate, fewer full-screen layers, smaller per-frame uploads, `?perf` readout
- [x] Hover tooltips on every control; Shift+M mirror on/off; uniform-scale handle on the ellipse guide
- [x] **Gradient Map** (Image → Adjustments): presets plus an editable gradient (add, move, recolor and remove stops)
- [x] **Rectangle guide** (U): like the ellipse guide, with sharp corners
- [x] iPad: numbered group-jump buttons on the touch dock; Procreate-style multi-layer selection (swipe right) with Group / Merge / Delete
- [ ] Later: adjustment *layers* (non-destructive), Selective Color, Match Color; transform and move several selected layers at once

## From Leonardo, worth borrowing

I couldn't open Leonardo itself: this session has no desktop-control tools, only the browser. These come from its store listing and reviews, plus what it's known for:

- Circle / ellipse guides, including circles in perspective
- Perspective guides (1, 2 and 3 point) that strokes snap to
- Canvas rotation and flip-view (a quick mirror of the *view* to check proportions)
- Custom swatches
- Ruler and French-curve guides

If desktop control is turned on in a later session, I can look at Leonardo directly and fill this list in properly.
