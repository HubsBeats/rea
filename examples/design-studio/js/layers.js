// Layers and Projects tabs of the object panel.

import { icon } from "./icons.js";
import { h } from "./popover.js";
import { listDesigns } from "./store.js";

/** Layers tab: the active page's elements, front first. */
export function layersTab(panel) {
  const page = panel.store.activePage;
  const items = [...page.elements].reverse();
  if (!items.length)
    return panel.section("Layers", h("p.muted", {}, "This page is empty."));
  const label = (el) =>
    el.type === "text"
      ? el.text.slice(0, 28) || "Text"
      : el.type === "shape"
        ? `Shape · ${el.shape}`
        : el.type === "image"
          ? "Image"
          : el.type === "line"
            ? "Line"
            : "Drawing";
  const list = h(
    "ol.layer-list",
    {},
    items.map((el) => {
      const row = h(
        "li.layer",
        {
          class: `layer${panel.store.selection.includes(el.id) ? " selected" : ""}`,
          draggable: "true",
          "data-id": el.id,
        },
        h("span.layer-grip", { html: icon("grip", 16) }),
        h("span.layer-name", {}, label(el)),
        h("button.layer-lock", {
          title: el.locked ? "Unlock" : "Lock",
          html: icon(el.locked ? "lock" : "unlock", 16),
          onclick: (e) => (
            e.stopPropagation(),
            panel.store.patch([el.id], { locked: !el.locked })
          ),
        }),
      );
      row.addEventListener("click", (e) =>
        panel.store.select(
          e.shiftKey ? [...panel.store.selection, el.id] : [el.id],
          page.id,
        ),
      );
      row.addEventListener("dragstart", () => (panel.dragLayer = el.id));
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        moveLayer(panel, panel.dragLayer, el.id);
      });
      row.addEventListener("dragend", () => (panel.dragLayer = null));
      return row;
    }),
  );
  return panel.section(
    "Layers",
    h("p.muted", {}, "Top of the list is in front. Drag to reorder."),
    list,
  );
}

function moveLayer(panel, fromId, toId) {
  if (!fromId || fromId === toId) return;
  const page = panel.store.activePage;
  panel.store.update(() => {
    const from = page.elements.findIndex((e) => e.id === fromId);
    const [moved] = page.elements.splice(from, 1);
    const to = page.elements.findIndex((e) => e.id === toId);
    page.elements.splice(from > to ? to + 1 : to, 0, moved);
  });
  panel.dragLayer = null;
  panel.renderPanel();
}

/** Projects tab: designs saved in this browser. */
export function projectsTab(panel) {
  const designs = listDesigns();
  return panel.section(
    "Your designs",
    h(
      "div.project-list",
      {},
      designs.map((d) =>
        h(
          "a.project",
          {
            href: `editor.html?id=${d.id}`,
            class: `project${d.id === panel.store.design.id ? " current" : ""}`,
          },
          d.thumb ? h("img", { src: d.thumb, alt: "" }) : h("div.thumb-empty"),
          h("span", {}, d.title),
          h("small", {}, `${d.width} × ${d.height}px`),
        ),
      ),
    ),
  );
}
