// Keyboard shortcuts for the editor.

import { createLine, createShape, createText } from "./model.js";
import { closePopover } from "./popover.js";

function isTyping(target) {
  return target.closest?.("input, textarea, select, [contenteditable]") != null;
}

/** Binds editor shortcuts. */
export function bindKeyboard({
  store,
  actions,
  interactions,
  save,
  fitZoom,
  panels,
}) {
  const s = () => Math.min(store.design.width, store.design.height) / 1080;
  const quickAdd = {
    t: () =>
      createText({ text: "Your text here", fontSize: 48 * s(), w: 600 * s() }),
    r: () => createShape("rect", { w: 300 * s(), h: 300 * s() }),
    c: () => createShape("circle", { w: 300 * s(), h: 300 * s() }),
    l: () => createLine({ w: 500 * s(), h: 30 * s(), strokeWidth: 8 * s() }),
  };

  const withMod = {
    z: (e) => (e.shiftKey ? store.redo() : store.undo()),
    y: () => store.redo(),
    c: () => actions.copy(),
    x: () => actions.cut(),
    v: () => actions.paste(),
    d: () => actions.duplicate(),
    a: () => actions.selectAll(),
    s: () => save(true),
    b: () => actions.toggleText("bold"),
    i: () => actions.toggleText("italic"),
    u: () => actions.toggleText("underline"),
    "]": (e) => actions.arrange(e.altKey ? "front" : "forward"),
    "[": (e) => actions.arrange(e.altKey ? "back" : "backward"),
    "=": () => store.setZoom(store.zoom * 1.25),
    "+": () => store.setZoom(store.zoom * 1.25),
    "-": () => store.setZoom(store.zoom / 1.25),
    0: () => fitZoom(),
    enter: () => actions.addPage(store.activePageId),
  };

  window.addEventListener("keydown", (e) => {
    if (isTyping(e.target)) {
      if (e.key === "Escape") e.target.blur?.();
      return;
    }
    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (mod && withMod[key]) {
      e.preventDefault();
      withMod[key](e);
      return;
    }
    if (mod) return;
    if (key === "escape") {
      closePopover();
      if (interactions.drawTool) panels.open("draw");
      else store.select([]);
      return;
    }
    if (key === "delete" || key === "backspace") {
      e.preventDefault();
      actions.remove();
      return;
    }
    if (key.startsWith("arrow")) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dir = {
        arrowleft: [-step, 0],
        arrowright: [step, 0],
        arrowup: [0, -step],
        arrowdown: [0, step],
      }[key];
      actions.nudge(...dir);
      return;
    }
    if (key === "enter") {
      const [el] = store.selected;
      if (store.selection.length === 1 && el.type === "text") {
        e.preventDefault();
        interactions.editText(el.id);
      }
      return;
    }
    if (quickAdd[key] && !e.altKey) {
      e.preventDefault();
      actions.add(quickAdd[key]());
    }
  });
}
