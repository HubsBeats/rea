// Popovers, the color picker, context menus and toasts.

import { GRADIENTS, PALETTE } from "./model.js";

let current = null;

/** Closes the open popover, if any. */
export function closePopover() {
  if (!current) return;
  current.node.remove();
  document.removeEventListener("pointerdown", current.outside, true);
  current.anchor?.classList.remove("open");
  current = null;
}

/** Opens a popover under an anchor (or at a point). Returns the node. */
export function openPopover(anchor, content, { at, className = "" } = {}) {
  const sameAnchor = current && anchor && current.anchor === anchor;
  closePopover();
  if (sameAnchor) return null;
  const node = document.createElement("div");
  node.className = `popover ${className}`;
  node.append(content);
  document.body.append(node);
  const rect = at
    ? { left: at.x, bottom: at.y, top: at.y }
    : anchor.getBoundingClientRect();
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  let left = Math.min(rect.left, window.innerWidth - width - 8);
  let top = rect.bottom + 6;
  if (top + height > window.innerHeight - 8)
    top = Math.max(8, rect.top - height - 6);
  left = Math.max(8, left);
  Object.assign(node.style, { left: `${left}px`, top: `${top}px` });
  const outside = (e) => {
    if (!node.contains(e.target) && !(anchor && anchor.contains(e.target)))
      closePopover();
  };
  document.addEventListener("pointerdown", outside, true);
  anchor?.classList.add("open");
  current = { node, anchor, outside };
  return node;
}

/** Small DOM helper: h("div.cls", {attrs}, ...children). */
export function h(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split(".");
  const node = document.createElement(name || "div");
  if (classes.length) node.className = classes.join(" ");
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else if (k === "style" && typeof v === "object")
      Object.assign(node.style, v);
    else if (v !== false && v != null)
      node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const child of children.flat()) {
    if (child != null && child !== false)
      node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

function swatch(color, onPick, title = color) {
  return h("button.swatch", {
    title,
    style: { background: color },
    onclick: () => onPick(color),
  });
}

/**
 * Builds color picker content: document colors, a custom color input and
 * default swatches. Gradients are offered when `onGradient` is passed.
 */
export function colorPicker({
  value,
  documentColors = [],
  onPick,
  onGradient,
}) {
  const custom = h("input", {
    type: "color",
    value: /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#000000",
    title: "Custom color",
  });
  custom.addEventListener("input", () => onPick(custom.value));
  const hex = h("input.hex-input", {
    value: value ?? "",
    "aria-label": "Hex color",
    spellcheck: "false",
  });
  hex.addEventListener("change", () => {
    const v = hex.value.trim();
    if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v))
      onPick(v.startsWith("#") ? v : `#${v}`);
  });
  const sections = [
    h(
      "div.picker-row",
      {},
      h(
        "label.custom-color",
        { title: "Add a new color" },
        custom,
        h("span", { html: "+" }),
      ),
      hex,
    ),
  ];
  if (documentColors.length) {
    sections.push(
      h("h4", {}, "Document colors"),
      h(
        "div.swatches",
        {},
        documentColors.map((c) => swatch(c, onPick)),
      ),
    );
  }
  sections.push(
    h("h4", {}, "Default colors"),
    h(
      "div.swatches",
      {},
      PALETTE.map((c) => swatch(c, onPick)),
    ),
  );
  if (onGradient) {
    sections.push(
      h("h4", {}, "Gradients"),
      h(
        "div.swatches",
        {},
        GRADIENTS.map((g) =>
          h("button.swatch", {
            title: `${g[0]} → ${g[1]}`,
            style: { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` },
            onclick: () => onGradient(g),
          }),
        ),
      ),
    );
  }
  return h("div.color-picker", {}, sections);
}

/** Shows a right-click style menu at a point. */
export function contextMenu(point, items) {
  const menu = h(
    "div.menu",
    { role: "menu" },
    items.map((item) =>
      item === "-"
        ? h("hr")
        : h(
            "button.menu-item",
            {
              role: "menuitem",
              disabled: item.disabled,
              onclick: () => (closePopover(), item.run()),
            },
            h("span", {}, item.label),
            item.shortcut ? h("kbd", {}, item.shortcut) : null,
          ),
    ),
  );
  openPopover(null, menu, { at: point, className: "menu-popover" });
}

/** Shows a short message at the bottom of the screen. */
export function toast(message) {
  const node = h("div.toast", { role: "status" }, message);
  document.body.append(node);
  setTimeout(() => node.classList.add("hide"), 1800);
  setTimeout(() => node.remove(), 2200);
}
