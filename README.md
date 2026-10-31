# Sinopia

An infinite-canvas sketching app that runs in the browser. No install, no account. Built for fast, clean sketching with a pen tablet.

**Try it:** https://YOUR-USERNAME.github.io/sinopia/

## Features

- **Infinite canvas.** Pan and zoom forever; the paper only stores the areas you draw on.
- **Layers.** Add, duplicate, merge down, reorder, hide, rename, and set opacity per layer.
- **Groups with hotkeys.** Collect layers into groups (collapse, hide, rename). Drag layers in the layers panel to reorder them or drop them into a group, and drag a group's header to move the whole group. Give up to 9 groups a Ctrl+1–9 hotkey to jump straight to that group's drawing, however far apart they are on the canvas.
- **Notes.** Press T (or the note button) and click to pin a text note to the canvas. Notes pan and zoom with the drawing; drag the top strip to move one. They aren't included in PNG export.
- **Find a layer's drawing.** Ctrl+click a layer or group in the layers panel to flash its contents on the canvas.
- **Color picker preview.** Hold Alt to see the color under the cursor next to your current one, then click or drag to pick it.
- **Mirror and radial symmetry.** Left/right, top/bottom, both, or 2–32 radial segments with an optional kaleidoscope mode. Drag the center handle to move the axis.
- **Custom alpha brushes.** Import any PNG or JPG as a brush tip (white paints, black is empty, or use the PNG's transparency). Drop images straight onto the canvas.
- **Clean anti-aliasing.** Round tips are drawn as continuous strokes using exact distance to the stroke path, and image tips use max blending, so edges stay smooth at every angle and size.
- **Independent brush and eraser.** Each keeps its own tip, size, opacity, spacing, smoothing, pressure and rotation settings.
- **Straight lines.** Hold Shift (or Shift+click) and drag a line out from that point. It follows your pen, snapping to 10° steps, with faint guide lines at 0°, 45°, 90° and 135°, and it's drawn with your real brush and pen pressure. Release Shift to go back to freehand from the end of the line.
- **Pen pressure** for size and/or opacity, plus stroke smoothing.
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
| Place a note | T, then click |
| Delete layer | X |
| Flash a layer's drawing | Ctrl + click it in the layers panel |
| Smaller / larger brush | [ / ] |
| Cycle mirror mode | M |
| Undo / redo | Ctrl + Z / Ctrl + Shift + Z |
| New layer | Ctrl + Shift + N |
| Hide panels | Tab |
| Reset zoom | 0 |

## Notes

- Drawings are saved in your browser's local storage on that device. Clearing site data erases them, so export anything you want to keep.
- Everything is in a single `index.html` file with no build step.

## License

MIT
