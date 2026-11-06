# Sinopia

An infinite-canvas sketching app that runs in the browser. No install, no account. Built for fast, clean sketching with a pen tablet.

**Try it:** https://YOUR-USERNAME.github.io/sinopia/

## Features

- **Infinite canvas.** Pan and zoom forever; the paper only stores the areas you draw on.
- **Layers.** Add, duplicate, merge down, reorder, hide, rename, and set opacity per layer.
- **Groups with hotkeys.** New group puts the active layer into a fresh group. Collapse, hide and rename groups. Drag layers in the layers panel to reorder them or drop them into a group, and drag a group's header to move the whole group. Give up to 9 groups a Ctrl+1–9 hotkey to jump straight to that group's drawing, however far apart they are on the canvas.
- **Selections, Photoshop-style.** Rectangle and ellipse (S), lasso (L) and magic wand (W, with tolerance and contiguous options). Shift adds, Alt subtracts, Shift+Alt intersects. The brush and eraser only paint inside the selection. Delete clears it, Ctrl+drag moves the selected pixels, Ctrl+C / X / V copy, cut and paste in place on a new layer. Ctrl+Shift+I inverts and Ctrl+D deselects.
- **Free transform (Ctrl+T), Photoshop-style.** Scale from corners (Shift for free proportions, Alt from the center), rotate by dragging outside (Shift for 15° steps), Ctrl+drag a corner to distort or add perspective, Ctrl+drag an edge to skew, flip, or switch to **Warp** to bend the image with a 4×4 mesh. Works on the selection, or the whole layer. Enter applies, Esc cancels, and it's one undo step.
- **Modifier stack, Blender-style.** In the layers panel, **+ Array** repeats the layer. **Linear** sets the count, X/Y offset, rotation and scale per copy; **Radial** spreads the copies evenly around a pivot. Everything is on sliders, and you can drag the pivot ring and the offset arrow right on the canvas. Stack two arrays for a grid. The copies are live: they follow whatever you paint. **Apply** bakes them into pixels. Export, merge and documents use the result.
- **Documents with blend modes.** Press **New doc** (its ▾ menu has presets: HD, 4K, square, 4:5, A4, iPad) (or **Open as document** with a selection) and that area of the canvas, or what’s on screen with no selection, is copied into its own tab. Change the page size afterwards with **Doc size**, which keeps the drawing centered. Each document is a fixed-size page, Photoshop-style, where each layer can use Normal, Multiply, Screen, Overlay, Darken, Lighten, Add or Soft light. Open several at once and switch with the tabs. The canvas is never changed. Documents aren’t saved yet, so export anything you want to keep.
- **Fill (G).** Click an area to fill it with the brush color. By default it looks at all visible layers, so line art on its own layer works, and it grows a pixel under soft edges. Alt+Backspace fills a selection.
- **Ellipse guide (O)**, like Leonardo's. Strokes that start on the ellipse follow it exactly, with your own pressure. Drag its handles to move it, size it, squash it into perspective and turn it.
- **Rotate the canvas.** Hold R and drag, or twist two fingers on a touch screen. It snaps straight near 0°, and the ° readout beside the zoom resets it.
- **Liquify (Ctrl+Shift+X).** Push, twirl, bloat and restore the selection (or the layer) with a brush, then Enter to apply.
- **Your layout.** Drag the dotted grip to move the toolbar, the panels or the touch dock anywhere. Press ? for a searchable list of every shortcut.
- **Notes.** Press T (or the note button) and click to pin a text note to the canvas. Notes are see-through, with a dark ink that multiplies into the drawing. Notes pan and zoom with the drawing; drag the top strip to move one. They aren't included in PNG export.
- **Find a layer's drawing.** Ctrl+click a layer or group in the layers panel to flash its contents on the canvas.
- **Color picker preview.** Hold Alt to see the color under the cursor next to your current one, then click or drag to pick it.
- **Mirror and radial symmetry.** Left/right, top/bottom, both, or 2–32 radial segments with an optional kaleidoscope mode. Drag the center handle to move the axis.
- **Custom alpha brushes.** Import any PNG or JPG as a brush tip (white paints, black is empty, or use the PNG's transparency). Drop images straight onto the canvas.
- **Clean anti-aliasing.** Round tips are drawn as continuous strokes using exact distance to the stroke path, and image tips use max blending, so edges stay smooth at every angle and size.
- **Independent brush and eraser.** Each keeps its own tip, size, opacity, spacing, smoothing, pressure and rotation settings.
- **Straight lines.** Hold Shift (or Shift+click) and drag a line out from that point. It follows your pen, snapping to 10° steps and onto the faint guide lines at 0°, 45°, 90° and 135°, and it's drawn with your real brush at one steady weight. It works with the eraser too. Release Shift to go back to freehand from the end of the line.
- **Pen pressure** for size and/or opacity, plus stroke smoothing. The pressure button in the toolbar turns it on and off; long-press or right-click it for the settings.
- **Color menu.** Press V (or click the color swatch) for a color square, hue bar, hex box, swatches and your recent colors. Your color and recent colors are kept between sessions.
- **iPad and Apple Pencil.** Open the site in Safari, tap Share → Add to Home Screen, and it runs full screen and offline like an app. Pencil pressure works. Two-finger tap undoes, three-finger tap redoes, and a resting hand never interrupts the Pencil. The dock on the left gives you **Line** (hold, or tap to keep on: straight lines like Shift) and **Pick** (eyedropper, like Alt) without a keyboard.
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
| Smaller / larger brush | [ / ] (or type a size in the px box) |
| Color menu | V |
| Undo / redo on iPad | Two-finger tap / three-finger tap |
| Fill / fill selection | G / Alt + Backspace |
| Ellipse guide | O |
| Rotate canvas | Hold R + drag (R + click straightens) |
| Liquify | Ctrl + Shift + X |
| All shortcuts | ? |
| Cycle mirror mode | M |
| Undo / redo | Ctrl + Z / Ctrl + Shift + Z |
| New layer | Ctrl + Shift + N |
| Hide panels | Tab |
| Reset zoom | 0 |

## Notes

- Drawings are saved in your browser's local storage on that device. Clearing site data erases them, so export anything you want to keep.
- Everything is in a single `index.html` file with no build step. `manifest.webmanifest`, `sw.js` and `icons/` only make it installable.
- See [ROADMAP.md](ROADMAP.md) for what's planned (the web and App editions).

## License

MIT
