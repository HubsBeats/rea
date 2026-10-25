// Page grid view and full-screen present mode.

import { renderPage } from "./exporter.js";
import { icon } from "./icons.js";
import { h } from "./popover.js";

/** Shows every page as a thumbnail; click to jump, drag to reorder. */
export async function gridView(store, view) {
  const overlay = h("div.grid-view", {
    role: "dialog",
    "aria-label": "Page grid",
  });
  const close = () => overlay.remove();
  const grid = h("div.grid-pages");
  overlay.append(
    h(
      "header",
      {},
      h("h2", {}, "All pages"),
      h("button.icon-btn", {
        title: "Close",
        html: icon("close"),
        onclick: close,
      }),
    ),
    grid,
  );
  document.body.append(overlay);
  let dragId = null;
  for (const [i, page] of store.design.pages.entries()) {
    const canvas = await renderPage(
      store.design,
      page,
      220 / Math.max(store.design.width, store.design.height),
    );
    const card = h(
      "button.grid-card",
      { draggable: "true" },
      canvas,
      h("span", {}, `${i + 1}${page.title ? ` · ${page.title}` : ""}`),
    );
    card.addEventListener("click", () => {
      close();
      store.setActivePage(page.id);
      view.pageFrame(page.id)?.scrollIntoView({ block: "center" });
    });
    card.addEventListener("dragstart", () => (dragId = page.id));
    card.addEventListener("dragover", (e) => e.preventDefault());
    card.addEventListener("drop", () => {
      if (!dragId || dragId === page.id) return;
      store.update((d) => {
        const from = d.pages.findIndex((p) => p.id === dragId);
        const [moved] = d.pages.splice(from, 1);
        d.pages.splice(
          d.pages.findIndex((p) => p.id === page.id) + (from <= i ? 1 : 0),
          0,
          moved,
        );
      });
      close();
      gridView(store, view);
    });
    grid.append(card);
  }
}

/** Full-screen presentation of the pages. */
export async function present(store) {
  let index = Math.max(0, store.design.pages.indexOf(store.activePage));
  const stage = h("div.present", {
    role: "dialog",
    "aria-label": "Presentation",
  });
  const slot = h("div.present-slot");
  const counter = h("div.present-counter");
  const notes = h("div.present-notes");
  stage.append(slot, notes, counter);
  document.body.append(stage);
  const show = async () => {
    const { width, height } = store.design;
    const scale =
      Math.min(window.innerWidth / width, window.innerHeight / height) *
      (window.devicePixelRatio || 1);
    const canvas = await renderPage(
      store.design,
      store.design.pages[index],
      scale,
    );
    canvas.style.maxWidth = "100vw";
    canvas.style.maxHeight = "100vh";
    slot.replaceChildren(canvas);
    counter.textContent = `${index + 1} / ${store.design.pages.length}`;
    notes.textContent = store.design.pages[index].notes ?? "";
  };
  const onKey = (e) => {
    if (e.key === "Escape") return exit();
    if (["ArrowRight", " ", "PageDown"].includes(e.key))
      index = Math.min(store.design.pages.length - 1, index + 1);
    else if (["ArrowLeft", "PageUp"].includes(e.key))
      index = Math.max(0, index - 1);
    else return;
    e.preventDefault();
    e.stopPropagation();
    show();
  };
  const exit = () => {
    window.removeEventListener("keydown", onKey, true);
    stage.remove();
    if (document.fullscreenElement) document.exitFullscreen?.();
  };
  stage.addEventListener("click", () => {
    index = (index + 1) % store.design.pages.length;
    show();
  });
  window.addEventListener("keydown", onKey, true);
  stage.requestFullscreen?.().catch(() => {});
  await show();
}
