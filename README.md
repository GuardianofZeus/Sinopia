# Sinopia

An infinite-canvas sketching app that runs in the browser. No install, no account. Built for fast, clean sketching with a pen tablet.

**Try it:** https://guardianofzeus.github.io/Sinopia/

## Features

- **Infinite canvas.** Pan and zoom forever; the paper only stores the areas you draw on.
- **Hover tooltips.** Rest the pointer (mouse or pen) on any button or control for a moment to see what it does and its shortcut. Slide along a toolbar and the next one appears straight away.
- **Layers.** Add, duplicate, merge down, reorder, hide, rename, and set opacity per layer.
- **Groups with hotkeys.** New group puts the active layer into a fresh group. Collapse, hide and rename groups. Drag layers in the layers panel to reorder them or drop them into a group, and drag a group's header to move the whole group. Give up to 9 groups a Ctrl+1–9 hotkey to jump straight to that group's drawing, however far apart they are on the canvas.
- **Selections, Photoshop-style.** Rectangle and ellipse (S), lasso (L) and magic wand (W, with tolerance and contiguous options). Shift adds, Alt subtracts, Shift+Alt intersects. The brush and eraser only paint inside the selection. Delete clears it, Ctrl+drag moves the selected pixels, Ctrl+C / X / V copy, cut and paste in place on a new layer. Ctrl+Shift+I inverts and Ctrl+D deselects.
- **Free transform (Ctrl+T), Photoshop-style.** Scale from corners (Shift for free proportions, Alt from the center), rotate by dragging outside (Shift for 15° steps), Ctrl+drag a corner to distort or add perspective, Ctrl+drag an edge to skew, flip, or switch to **Warp** to bend the image with a 4×4 mesh. Works on the selection, or the whole layer. Enter applies, Esc cancels, and it's one undo step.
- **Modifier stack, Blender-style.** In the layers panel, **+ Array** repeats the layer. **Linear** sets the count, X/Y offset, rotation and scale per copy; **Radial** spreads the copies evenly around a pivot. Everything is on sliders, and you can drag the pivot ring and the offset arrow right on the canvas. Stack two arrays for a grid. The copies are live: they follow whatever you paint. **Apply** bakes them into pixels. Export, merge and documents use the result.
- **Documents with blend modes.** Press **New doc** (its ▾ menu has presets: HD, 4K, square, 4:5, A4, iPad) (or **Open as document** with a selection) and that area of the canvas, or what’s on screen with no selection, is copied into its own tab. Change the page size afterwards with **Doc size**, which keeps the drawing centered. Each document is a fixed-size page, Photoshop-style, where each layer can use Normal, Multiply, Screen, Overlay, Darken, Lighten, Add or Soft light. Open several at once and switch with the tabs. The canvas is never changed. Documents are saved with your drawing and sit on the canvas as **boards**, beside the area they came from: **double-click** a board to open it, drag it to move it, right-click for Open and Delete. Closing a tab just puts it away. In the canvas Layers panel each document has its own **colored, locked row** (the same color as its board): click it to go to the board, double-click to open it, the eye hides the board, and × deletes the document. Its layers stay inside the document. To compare versions, **duplicate** a document (right-click its board → Duplicate beside it, the ⧉ button on its row, or File → Duplicate document): the copy is named v2, v3… and sits right beside the original. On iPad, tap a document's row or board to select it (then the panel's Duplicate and Delete buttons act on it), or long-press the board for its menu. A document made while the perspective guide is on keeps the grid, lined up with the copied drawing.
- **Smudge (F).** Two modes in the toolbar. **Blend** (the default) softens where colors meet into a smooth gradient, for blending two colors together; go back and forth to blend further. **Smear** drags paint along like a finger, with crisp smears. It has its own size, strength and pressure settings; Strength (the opacity slider) sets how much it blends or how far it drags. It stays inside a selection and works on layer masks.
- **Fill (G).** Click an area to fill it with the brush color. **Sample** in the toolbar picks what bounds the fill: **All layers** (line art on its own layer works) or **This layer**; Shift+G switches. It grows a pixel under soft edges. Alt+Backspace fills a selection.
- **Perspective guide (P)**: a 1, 2 or 3-point grid. Drag the vanishing points to set it up. With **Snap** on, every stroke locks to the grid: start drawing and it picks the line that matches your direction, towards a vanishing point or straight across or up, and stays dead straight with your own pressure.
- **Rectangle guide (U)**: the same idea as the ellipse guide, for boxes and panels. Strokes that start on it follow it, and the corners stay sharp. Same handles.
- **Ellipse guide (O)**, like Leonardo's. Strokes that start on the ellipse follow it exactly, with your own pressure. Drag its handles to move it, size and turn it (square), squash it into perspective (round), or scale it evenly without changing its shape (diamond).
- **Rotate the canvas.** Hold R and drag, or twist two fingers on a touch screen. It snaps straight near 0°, and the ° readout beside the zoom resets it.
- **Liquify (Ctrl+Shift+X).** Push, twirl, bloat and restore the selection (or the layer) with a brush, then Enter to apply.
- **App edition.** Installed (or with `?app` in the address), Sinopia gets a File / Edit / Image / Layer / Select / Filter / View / Help menu bar, and you can change any shortcut (Edit → Keyboard shortcuts). You can also turn the menus on from the ? sheet.
- **Project files.** Ctrl+S saves everything (every layer, group, open document and note) to one `.sinopia` file; Ctrl+O or dropping the file opens it again, as a new drawing.
- **Home page and multiple drawings.** The house button (or File → Home) lists every drawing in this browser with a thumbnail. Make a new one, open, rename, duplicate or delete. Each drawing keeps its own layers, notes, view and paper.
- **Draw together on your network.** One PC double-clicks `Start collab server.bat`. Everyone on the same Wi-Fi opens the address it prints, then File → Draw together → Connect. You see each other's strokes, cursors, layers and notes live. See below.
- **Images.** Ctrl+V pastes an image from any app, and File → Place image (Ctrl+Shift+P) adds one from disk. Either way it lands on its own layer with the transform handles ready.
- **Filters and grading (App edition).** Develop works like DaVinci Resolve's primaries (temp, tint, exposure, contrast, pivot, mid/detail, color boost, shadows, highlights, saturation, hue; Ctrl+Shift+A): drag a field left or right to change it, Shift for fine control, click to type, double-click to reset. Resolve-style lift / gamma / gain / offset color wheels (Ctrl+Shift+G). **Image → Adjustments** has Brightness/Contrast, Levels (Ctrl+L), Curves (Ctrl+M), Hue/Saturation (Ctrl+U), Color Balance (Ctrl+B), Black & White (Ctrl+Alt+Shift+B), Photo Filter, Channel Mixer, Gradient Map (presets or your own stops), Invert (Ctrl+I), Posterize, Threshold and Desaturate (Ctrl+Shift+U). The Filter menu has Gaussian blur, sharpen, RGB split and noise. Everything previews live, stays inside the selection, and can run on a merged copy of everything visible. Drag the panel's dotted grip to move it out of the way.
- **Layer masks.** The ◐ button in the layers panel adds a mask (from the selection, if there is one). Press \ to paint on it: the brush hides, the eraser reveals. Shift+F6 feathers a selection.
- **Cryptomatte.** File → Open EXR (or drop an .exr) opens a render with its Cryptomatte. Click an object to select it with clean edges, ready to mask, grade or paint over.
- **Flip view (Shift+H)** mirrors the view to check proportions, without changing the drawing.
- **Your layout.** The menu bar (File … Window, Help) and the Home button are always at the top. Every toolbar and panel has a dotted grip: drag it to the left, right, top or bottom edge to dock it there, or let go anywhere else to float it. The **Window** menu shows or hides each one, and Window → Reset workspace puts everything back. Press ? for a searchable list of every shortcut.
- **Notes.** Press T (or the note button) and click to pin a text note to the canvas. By default notes are see-through, with a dark ink that multiplies into the drawing. The ● button on a note gives it a color (Houdini-style), an opacity and a text size; **Use for new notes** makes that the default. Drag the bottom-right corner to resize it (double-click the corner for the standard size). Notes pan and zoom with the drawing; drag the top strip to move one. They aren't included in PNG export.
- **Find a layer's drawing.** Ctrl+click a layer or group in the layers panel to flash its contents on the canvas.
- **Color picker preview.** Hold Alt to see the color under the cursor next to your current one, then click or drag to pick it.
- **Mirror and radial symmetry.** Left/right, top/bottom, both, or 2–32 radial segments with an optional kaleidoscope mode. Drag the center handle to move the axis. M cycles the modes; Shift+M turns mirror off and back on in the mode you last used.
- **Custom alpha brushes.** Import any PNG or JPG as a brush tip (white paints, black is empty, or use the PNG's transparency). Drop images straight onto the canvas.
- **Clean anti-aliasing.** Round tips are drawn as continuous strokes using exact distance to the stroke path, and image tips use max blending, so edges stay smooth at every angle and size.
- **Independent brush and eraser.** Each keeps its own tip, size, opacity, spacing, smoothing, pressure and rotation settings.
- **Straight lines.** Hold Shift (or Shift+click) and drag a line out from that point. It follows your pen, snapping to 10° steps and onto the faint guide lines at 0°, 45°, 90° and 135° (click the **∠** pill at the bottom to pick another step: free, 1°, 5°, 15°, 22.5°, 30° or 45°), and it's drawn with your real brush at one even weight that follows your pressure: press harder to thicken it, ease off to thin it. It works with the eraser too. Release Shift to go back to freehand from the end of the line.
- **Pen pressure** for size and/or opacity, plus stroke smoothing. The pressure button in the toolbar turns it on and off; long-press or right-click it for the settings.
- **Color menu.** Press V (or click the color swatch) for a color square, hue bar, hex box, swatches and your recent colors. Your color and recent colors are kept between sessions.
- **iPad and Apple Pencil.** Open the site in Safari, tap Share → Add to Home Screen, and it runs full screen and offline like an app. Pencil pressure works. Two-finger tap undoes, three-finger tap redoes, and a resting hand never interrupts the Pencil. On the touch dock, numbered buttons jump to your groups (the same as Ctrl+1–9). Swipe a layer right to select several, as in Procreate. Two fingers always pan; each pinch then either zooms or rotates, whichever you start with, never both. Add `?perf` to the address for a speed readout. The dock on the left gives you **Line** (hold, or tap to keep on: straight lines like Shift) and **Pick** (eyedropper, like Alt) without a keyboard.
- **Autosave** in your browser, and PNG export trimmed to your drawing.

## Shortcuts

| Action | Shortcut |
|---|---|
| Straight line | Hold Shift while drawing |
| Resize brush | Ctrl + drag (same speed at any zoom) |
| Pan | Space + drag, middle mouse, or two fingers |
| Zoom | Ctrl + Space + drag, mouse wheel, or pinch |
| Pick color | Hold Alt to preview, then click or drag |
| Jump to group | Ctrl + 1–9 |
| Brush / eraser | B / E |
| Rectangle / ellipse select | S (press again for ellipse) |
| Lasso / magic wand | L / W |
| Add / subtract / intersect | Shift / Alt / Shift + Alt while selecting |
| Move selected pixels | Ctrl + drag with a select tool |
| Clear selected pixels | Delete |
| Deselect / invert / select all | Ctrl + D / Ctrl + Shift + I / Ctrl + A |
| Copy / cut / paste | Ctrl + C / Ctrl + X / Ctrl + V |
| Free transform | Ctrl + T (Enter applies, Esc cancels) |
| Place a note | T, then click |
| Delete layer | X |
| Flash a layer's drawing | Ctrl + click it in the layers panel |
| Show only one layer | Ctrl + click its eye (again to show the rest) |
| Smaller / larger brush | [ / ] (or type a size in the px box) |
| Color menu | V |
| Undo / redo on iPad | Two-finger tap / three-finger tap |
| Smudge | F |
| Fill / fill selection | G / Alt + Backspace (Shift + G: sample all layers or this layer) |
| Ellipse guide | O |
| Rectangle guide | U |
| Perspective guide | P (1, 2 or 3 points, Snap, Reset in the toolbar) |
| Select several layers | Swipe a layer right (or Shift+click it), then Group / Merge / Delete under the list |
| Rotate canvas | Hold R + drag (R + click straightens) |
| Liquify | Ctrl + Shift + X |
| All shortcuts | ? |
| Save / open project | Ctrl + S / Ctrl + O |
| Place image | Ctrl + Shift + P (or paste with Ctrl + V) |
| Fit / flip view | Ctrl + 0 / Shift + H |
| Develop / color wheels | Ctrl + Shift + A / Ctrl + Shift + G |
| Hue/Saturation / Levels / Curves | Ctrl + U / Ctrl + L / Ctrl + M |
| Color Balance / Black & White | Ctrl + B / Ctrl + Alt + Shift + B |
| Invert / Desaturate | Ctrl + I / Ctrl + Shift + U |
| Paint on the layer mask | \ |
| Feather selection | Shift + F6 |
| Cycle mirror mode | M |
| Mirror on/off (back in the last mode) | Shift+M |
| Undo / redo | Ctrl + Z / Ctrl + Shift + Z |
| New layer | Ctrl + Shift + N |
| Hide panels | Tab |
| Reset zoom | 0 |

## Drawing together

1. On one PC, double-click **Start collab server.bat** in the Sinopia folder (it needs [Node.js](https://nodejs.org)). If Windows asks about the firewall, allow **Private networks**. Leave the window open.
2. The window shows two addresses. On that PC open `http://localhost:8080`; on the other PC or iPad open the `http://192.168.…:8080` one.
3. In Sinopia: File → Draw together (or Draw together on the Home page), type your name, press **Connect**. The first person in shares the drawing they have open. Whoever joins gets it as a new drawing on their Home page.

Each finished stroke is sent as soon as you lift the pen, and both people's strokes on the same spot are kept. Fills, filters, transforms and undo send the tiles they changed. Undo only undoes your own steps, but because it restores whole tiles it can also take back what the other person drew on those tiles in the meantime. Documents (the tabs) aren't shared. Over the internet it needs a VPN such as Tailscale, so both PCs look like they're on one network.

## Notes

- Drawings are saved in your browser's local storage on that device. Clearing site data erases them, so export anything you want to keep.
- Everything is in a single `index.html` file with no build step. `manifest.webmanifest`, `sw.js` and `icons/` only make it installable.
- See [ROADMAP.md](ROADMAP.md) for what's planned (the web and App editions).

## License

MIT
