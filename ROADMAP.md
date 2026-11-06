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

## Phase 3: App edition, workspace

- [ ] Menu bar like Photoshop: File (New, Open, Save .sinopia, Export, Place), Edit, Image, Layer, Select, Filter, View, Help
- [ ] Project file save and load (all layers, groups, documents, notes)
- [ ] Keyboard shortcut editor
- [ ] Copy and paste images from other apps (the clipboard pastes as a new layer)

## Phase 4: App edition, image work ("go a little crazy")

- [ ] **Filters**: blur, sharpen, RGB split / chromatic aberration, levels, curves, hue/saturation. All on the GPU, all live-previewed.
- [ ] **Layer masks** (paint black/white on a mask, non-destructive)
- [ ] **Lightroom-style develop panel**: exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, vibrance
- [ ] **Color wheels like DaVinci Resolve**: lift, gamma, gain and offset wheels as a final grade over the whole document
- [ ] **Noise generator**: film grain, gaussian, value and Perlin noise, as its own layer or a filter (size, amount, mono or color)
- [ ] **Cryptomatte**: open an EXR with Cryptomatte layers (from Blender, Nuke and others), click an object to get a selection mask of it. Needs an EXR reader in the app edition only.

## From Leonardo, worth borrowing

I couldn't open Leonardo itself: this session has no desktop-control tools, only the browser. These come from its store listing and reviews, plus what it's known for:

- Circle / ellipse guides, including circles in perspective
- Perspective guides (1, 2 and 3 point) that strokes snap to
- Canvas rotation and flip-view (a quick mirror of the *view* to check proportions)
- Custom swatches
- Ruler and French-curve guides

If desktop control is turned on in a later session, I can look at Leonardo directly and fill this list in properly.
