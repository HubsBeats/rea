# Pixelpad: a Canva-style design editor

Pixelpad is an original, dependency-free web app that recreates the look, feel
and core editing behaviour of an online graphic design editor in the style of
Canva. It was built as an REA case study: study a product's public UI and
behaviour, then rebuild the feature set with your own code.

Pixelpad uses no Canva source code, logos, trademarks, templates or stock
assets. The branding is a placeholder, every icon, illustration and template
is drawn in code in this folder, and fonts come from Google Fonts (SIL Open
Font License).

## Run it

Any static file server works. From the repository root:

```bash
python3 -m http.server 8080 --directory examples/design-studio
# then open http://localhost:8080
```

There is no build step and nothing to install. Designs, uploads and
thumbnails are saved in the browser's `localStorage`.

## What it does

**Home screen**

- Gradient hero with search, and one-click design types (Instagram post,
  story, presentation, poster, A4, YouTube thumbnail, logo, whiteboard).
- Custom size, recent designs with thumbnails (open, rename, delete), and
  templates you can start from.

**Editor layout**

- Gradient top bar: Home, File menu (new, copy, save, download, import/export
  design JSON, delete), Resize (presets or custom, with content scaling),
  undo/redo, save status, editable title, Present and Share.
- Left rail with a collapsible object panel: Design (templates), Elements
  (15 shapes, lines and arrows, illustrations, stickers, frames), Text
  (heading/subheading/body and font combinations), Uploads (file picker or
  drag-and-drop), Draw (pen, marker, highlighter), Layers and Projects.
- Contextual toolbar that changes with the selection: font picker with
  search, size stepper, text color, bold/italic/underline/uppercase,
  alignment, letter and line spacing; shape fill and border; line weight,
  style and arrow head; image adjustments (brightness, contrast, saturation,
  blur), flip and "fill page"; plus Position (arrange, align, exact
  geometry), Transparency, Lock, Duplicate and Delete. With nothing
  selected, it edits the page background (colors and gradients).
- Pages stacked in a scrolling workspace, each with title, move, duplicate,
  delete and add-page controls; bottom bar with notes, page indicator, zoom
  slider/presets, fit and a page grid view with drag-to-reorder.

**Canvas interactions**

- Click, shift-click and marquee selection; drag to move with smart
  alignment guides that snap to page and element edges and centres (hold
  Alt to skip snapping).
- Eight resize handles (corners keep aspect ratio for images and text; text
  corners scale the font, side handles change the wrap width), and a rotate
  handle that snaps to 45° (or 15° steps with Shift).
- Double-click or Enter to edit text in place; drag items from the side
  panel onto a page; right-click context menu.
- Undo/redo history, autosave, PNG/JPG export per page or for all pages at
  0.5×/1×/2×, and a full-screen Present mode with speaker notes.

**Keyboard shortcuts**

| Keys                       | Action                            |
| -------------------------- | --------------------------------- |
| Ctrl/Cmd + Z, Shift + Z, Y | Undo / redo                       |
| Ctrl/Cmd + C, X, V, D      | Copy, cut, paste, duplicate       |
| Ctrl/Cmd + A               | Select all on the page            |
| Ctrl/Cmd + B, I, U         | Bold, italic, underline           |
| Ctrl/Cmd + ] / [ (+ Alt)   | Forward / backward (front / back) |
| Ctrl/Cmd + = / - / 0       | Zoom in / out / fit               |
| Ctrl/Cmd + Enter           | Add a page                        |
| T, R, C, L                 | Add text, rectangle, circle, line |
| Arrows (+ Shift)           | Nudge 1px (10px)                  |
| Delete / Backspace, Escape | Delete, deselect                  |

## Code map

| File                           | Responsibility                                                  |
| ------------------------------ | --------------------------------------------------------------- |
| `js/model.js`                  | Design/page/element model, presets, fonts, palette              |
| `js/store.js`                  | State, selection, undo history, `localStorage` saves            |
| `js/shapes.js`                 | Shape geometry as SVG paths (shared with the exporter)          |
| `js/canvas.js`                 | DOM rendering of pages, elements and selection overlay          |
| `js/interact.js`               | Move, resize, rotate, marquee, smart guides, text edit, drawing |
| `js/actions.js`                | Editing commands (arrange, align, clipboard, pages, resize)     |
| `js/toolbar.js`                | Contextual toolbar and its popovers                             |
| `js/panels.js`, `js/layers.js` | Side rail and object panel tabs                                 |
| `js/library.js`                | Original illustrations, text presets and templates              |
| `js/exporter.js`               | Canvas rasteriser for PNG/JPG, thumbnails and Present           |
| `js/presenter.js`              | Page grid view and Present mode                                 |
| `js/editor.js`, `js/home.js`   | Page bootstraps                                                 |

## Tests

`tests/smoke.mjs` serves the app, drives it with Playwright's Chromium and
checks 20 end-to-end flows (adding, moving with guides, resizing, rotating,
text editing, toolbar changes, layers, drawing, templates, pages, resize,
PNG download, Present and autosave):

```bash
node examples/design-studio/tests/smoke.mjs --shots /tmp/pixelpad-shots
```

## How REA fits in

The editor's behaviour was taken from public descriptions of Canva's editor
(menu bar, object panel tabs, floating toolbar, page controls, scroll and
grid views, zoom and notes). To go further against the live product, point
REA's passive browser tools at your own signed-in Chrome session. Start
Chrome with a debugging port and open a design:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.rea-chrome"
rea list-browser-targets http://127.0.0.1:9222
rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --include-accessibility-text
rea capture-web-screenshot http://127.0.0.1:9222 TARGET_ID
rea inspect-web-event-listeners http://127.0.0.1:9222 TARGET_ID '[aria-label="Undo"]'
rea observe-web-execution http://127.0.0.1:9222 TARGET_ID --observation-ms 10000
```

`inspect-web-page` gives the DOM and accessibility structure (useful for
layout and control inventory), `observe-web-execution` shows which code runs
while you perform an action such as dragging an element, and the
screenshot tools let you compare your rebuild against the original with
`compare-web-screenshots`. The same commands were run against Pixelpad
itself to check the workflow end to end. Use what you learn to understand
behaviour, and keep the implementation, branding and assets your own.

## One-link hosting

`python3 examples/design-studio/build-single.py OUT_DIR` builds a version
where the home screen and editor share one document, for hosts that serve a
single page (such as a claude.ai artifact). There, downloads go through the
host's save prompt when it offers one.
