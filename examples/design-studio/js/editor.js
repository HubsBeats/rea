// Editor bootstrap: wires the store, canvas, panels, toolbar, top bar,
// bottom bar, keyboard shortcuts, autosave, grid view and present mode.

import { Actions } from "./actions.js";
import { CanvasView } from "./canvas.js";
import { exportDesign, thumbnail } from "./exporter.js";
import { gridView, present } from "./presenter.js";
import { icon } from "./icons.js";
import { Interactions } from "./interact.js";
import { DESIGN_PRESETS, createDesign, createImage, uid } from "./model.js";
import { Panels } from "./panels.js";
import { closePopover, contextMenu, h, openPopover, toast } from "./popover.js";
import {
  Store,
  deleteDesign,
  editorParams,
  loadDesign,
  openEditor,
  openHome,
  rememberDesign,
  saveDesign,
  trackEditorLinks,
} from "./store.js";
import { Toolbar } from "./toolbar.js";
import { bindKeyboard } from "./keyboard.js";
import { TEMPLATES, buildTemplate } from "./library.js";

const $ = (sel) => document.querySelector(sel);

function initialDesign() {
  const params = editorParams();
  const saved = params.get("id") && loadDesign(params.get("id"));
  if (saved) return saved;
  const preset = DESIGN_PRESETS.find((p) => p.id === params.get("preset"));
  const width = Number(params.get("w")) || preset?.width || 1080;
  const height = Number(params.get("h")) || preset?.height || 1080;
  const design = createDesign({
    width,
    height,
    title: preset ? `Untitled - ${preset.label}` : "Untitled design",
  });
  const template = TEMPLATES.find((t) => t.name === params.get("template"));
  if (template) Object.assign(design.pages[0], buildTemplate(template, design));
  return design;
}

const store = new Store(initialDesign());
rememberDesign(store.design.id);
const actions = new Actions(store);
const workspace = $("#workspace");
const view = new CanvasView(store, $("#pages"));
const interactions = new Interactions(store, view, workspace);
const panels = new Panels(store, actions, interactions, {
  rail: $("#rail"),
  panel: $("#panel"),
  workspace,
});
const toolbar = new Toolbar(store, actions, $("#toolbar"), {
  imageToBackground(el) {
    const page = store.find(el.id).page;
    store.update(() => {
      page.elements = page.elements.filter((e) => e.id !== el.id);
      page.elements.unshift(
        createImage(el.src, {
          ...el,
          x: 0,
          y: 0,
          w: store.design.width,
          h: store.design.height,
          rotation: 0,
          locked: true,
        }),
      );
    });
    store.select([]);
  },
});

/* ---------- top bar ---------- */

const titleInput = $("#title");
titleInput.addEventListener("change", () => {
  store.update(
    (d) => (d.title = titleInput.value.trim() || "Untitled design"),
    { reason: "title" },
  );
});

function fileMenu() {
  const importInput = h("input", {
    type: "file",
    accept: ".json,application/json",
    hidden: true,
  });
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const design = JSON.parse(await file.text());
      if (!Array.isArray(design.pages) || !design.width)
        throw new Error("not a design");
      store.replace({ ...design, id: store.design.id });
      toast("Design imported");
    } catch {
      toast("That file is not a Pixelpad design.");
    }
  });
  document.body.append(importInput);
  const item = (label, run, shortcut) =>
    h(
      "button.menu-item",
      { onclick: () => (closePopover(), run()) },
      h("span", {}, label),
      shortcut ? h("kbd", {}, shortcut) : null,
    );
  const { width, height, pages } = store.design;
  return h(
    "div.menu.file-menu",
    {},
    h(
      "div.menu-head",
      {},
      h("strong", {}, store.design.title),
      h(
        "small",
        {},
        `${width} × ${height}px · ${pages.length} page${pages.length > 1 ? "s" : ""}`,
      ),
    ),
    h("hr"),
    item("Create new design", () => openHome()),
    item("Make a copy", () => {
      const copy = {
        ...structuredClone(store.design),
        id: uid("design"),
        title: `Copy of ${store.design.title}`,
      };
      saveDesign(copy);
      openEditor(`?id=${copy.id}`);
    }),
    item("Save", () => save(true), "Ctrl+S"),
    item("Download", () => openDownload($("#share"))),
    item("Import design file (.json)", () => importInput.click()),
    item("Export design file (.json)", () =>
      exportDesign(store.design, { format: "json" }),
    ),
    h("hr"),
    item("Delete design", () => confirmDelete()),
  );
}

function confirmDelete() {
  openPopover(
    $("#file-menu"),
    h(
      "div.panel-pop",
      {},
      h("h4", {}, "Delete this design?"),
      h("p.muted", {}, "It will be removed from this browser for good."),
      h(
        "div.grid-2",
        {},
        h("button.btn-secondary", { onclick: () => closePopover() }, "Cancel"),
        h(
          "button.btn-primary",
          {
            onclick: () => {
              deleteDesign(store.design.id);
              openHome();
            },
          },
          "Delete",
        ),
      ),
    ),
  );
}

$("#file-menu").addEventListener("click", (e) =>
  openPopover(e.currentTarget, fileMenu()),
);

function resizeMenu() {
  const w = h("input", { value: store.design.width, "aria-label": "Width" });
  const hh = h("input", { value: store.design.height, "aria-label": "Height" });
  const scaleBox = h("input", { type: "checkbox", checked: true });
  const apply = () => {
    const width = Math.round(Number(w.value));
    const height = Math.round(Number(hh.value));
    if (width < 40 || height < 40 || width > 8000 || height > 8000)
      return toast("Use a size between 40 and 8000px.");
    actions.resize(width, height, scaleBox.checked);
    closePopover();
    fitZoom();
  };
  return h(
    "div.panel-pop.resize-pop",
    {},
    h("h4", {}, "Resize design"),
    h(
      "div.preset-list",
      {},
      DESIGN_PRESETS.map((p) =>
        h(
          "button.menu-item",
          { onclick: () => ((w.value = p.width), (hh.value = p.height)) },
          h("span", {}, p.label),
          h("small", {}, `${p.width} × ${p.height}`),
        ),
      ),
    ),
    h("h4", {}, "Custom size"),
    h(
      "div.grid-2",
      {},
      h("label.geo-field", {}, h("span", {}, "Width"), w),
      h("label.geo-field", {}, h("span", {}, "Height"), hh),
    ),
    h("label.check-row", {}, scaleBox, "Scale content to fit"),
    h("button.btn-primary.wide", { onclick: apply }, "Resize"),
  );
}

$("#resize-btn").addEventListener("click", (e) =>
  openPopover(e.currentTarget, resizeMenu()),
);
$("#undo").addEventListener("click", () => store.undo());
$("#redo").addEventListener("click", () => store.redo());

function openDownload(anchor) {
  const format = h(
    "select",
    { "aria-label": "File type" },
    h("option", { value: "png" }, "PNG (recommended)"),
    h("option", { value: "jpg" }, "JPG"),
    h("option", { value: "json" }, "Design file (JSON)"),
  );
  const which = h(
    "select",
    { "aria-label": "Pages" },
    h("option", { value: "all" }, `All pages (${store.design.pages.length})`),
    h("option", { value: "current" }, "Current page"),
  );
  const size = h(
    "select",
    { "aria-label": "Size" },
    h("option", { value: "1" }, "1×"),
    h("option", { value: "2" }, "2×"),
    h("option", { value: "0.5" }, "0.5×"),
  );
  const run = async () => {
    closePopover();
    const pages =
      which.value === "all" ? store.design.pages : [store.activePage];
    toast("Preparing your download…");
    await exportDesign(store.design, {
      format: format.value,
      pages,
      scale: Number(size.value),
    });
  };
  openPopover(
    anchor,
    h(
      "div.panel-pop.download-pop",
      {},
      h("h4", {}, "Download"),
      h("label.field", {}, h("span", {}, "File type"), format),
      h("label.field", {}, h("span", {}, "Pages"), which),
      h("label.field", {}, h("span", {}, "Size"), size),
      h(
        "button.btn-primary.wide",
        { onclick: run, "data-testid": "download-go" },
        "Download",
      ),
    ),
  );
}

$("#share").addEventListener("click", (e) => {
  const anchor = e.currentTarget;
  const link = h("input", { readonly: true, value: location.href });
  openPopover(
    anchor,
    h(
      "div.panel-pop.share-pop",
      {},
      h("h4", {}, "Share this design"),
      h(
        "p.muted",
        {},
        "Designs are saved in this browser. Copy the link to reopen it here, or download it to share.",
      ),
      h(
        "div.picker-row",
        {},
        link,
        h(
          "button.btn-secondary",
          {
            onclick: () => (
              navigator.clipboard?.writeText(location.href),
              toast("Link copied")
            ),
          },
          "Copy",
        ),
      ),
      h(
        "button.btn-primary.wide",
        { onclick: () => (closePopover(), openDownload(anchor)) },
        h("span", { html: icon("download", 18) }),
        "Download",
      ),
      h(
        "button.btn-secondary.wide",
        { onclick: () => (closePopover(), present(store)) },
        h("span", { html: icon("play", 18) }),
        "Present",
      ),
    ),
  );
});

$("#present").addEventListener("click", () => present(store));

/* ---------- workspace & bottom bar ---------- */

$("#pages").addEventListener("click", (e) => {
  const button = e.target.closest("[data-page-action]");
  if (button)
    actions.pageAction(
      button.dataset.pageAction,
      button.closest(".page-wrap").dataset.page,
    );
});
$("#pages").addEventListener("change", (e) => {
  if (!e.target.matches(".page-title")) return;
  const page = store.page(e.target.closest(".page-wrap").dataset.page);
  store.update(() => (page.title = e.target.value));
});
$("#add-page").addEventListener("click", () => {
  const page = actions.addPage();
  requestAnimationFrame(() =>
    view
      .pageFrame(page.id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" }),
  );
});

const zoomRange = $("#zoom-range");
zoomRange.addEventListener("input", () =>
  store.setZoom(Number(zoomRange.value) / 100),
);
$("#zoom-fit").addEventListener("click", () => fitZoom());
$("#zoom-label").addEventListener("click", (e) =>
  openPopover(
    e.currentTarget,
    h(
      "div.menu",
      {},
      [300, 200, 125, 100, 75, 50, 25, 10].map((z) =>
        h(
          "button.menu-item",
          { onclick: () => (store.setZoom(z / 100), closePopover()) },
          `${z}%`,
        ),
      ),
      h("hr"),
      h(
        "button.menu-item",
        { onclick: () => (fitZoom(), closePopover()) },
        "Fit",
      ),
    ),
  ),
);

/** Zooms so the whole page fits in the workspace. */
function fitZoom() {
  const { width, height } = store.design;
  const availW = workspace.clientWidth - 96;
  const availH = workspace.clientHeight - 110;
  store.setZoom(Math.max(0.1, Math.min(availW / width, availH / height, 2)));
}

workspace.addEventListener(
  "wheel",
  (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    store.setZoom(store.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  },
  { passive: false },
);

workspace.addEventListener("contextmenu", (e) => {
  const node = e.target.closest(".el, .sel-box");
  if (node && !store.selection.includes(node.dataset.id))
    store.select([node.dataset.id]);
  if (!e.target.closest(".page-frame")) return;
  e.preventDefault();
  const has = store.selection.length > 0;
  const locked = store.selected.every((el) => el.locked);
  contextMenu({ x: e.clientX, y: e.clientY }, [
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      run: () => actions.copy(),
      disabled: !has,
    },
    {
      label: "Paste",
      shortcut: "Ctrl+V",
      run: () => actions.paste(),
      disabled: !store.clipboard,
    },
    {
      label: "Duplicate",
      shortcut: "Ctrl+D",
      run: () => actions.duplicate(),
      disabled: !has,
    },
    {
      label: "Delete",
      shortcut: "Del",
      run: () => actions.remove(),
      disabled: !has,
    },
    "-",
    {
      label: "Bring to front",
      shortcut: "Ctrl+Alt+]",
      run: () => actions.arrange("front"),
      disabled: !has,
    },
    {
      label: "Send to back",
      shortcut: "Ctrl+Alt+[",
      run: () => actions.arrange("back"),
      disabled: !has,
    },
    {
      label: locked && has ? "Unlock" : "Lock",
      run: () => actions.toggleLock(),
      disabled: !has,
    },
    "-",
    { label: "Select all", shortcut: "Ctrl+A", run: () => actions.selectAll() },
  ]);
});

const notes = $("#notes-text");
$("#notes-btn").addEventListener("click", () => {
  document.body.classList.toggle("notes-open");
  notes.value = store.activePage.notes;
  if (document.body.classList.contains("notes-open")) notes.focus();
});
notes.addEventListener("change", () =>
  store.update(() => (store.activePage.notes = notes.value)),
);

function updatePageIndicator() {
  const wraps = [...document.querySelectorAll(".page-wrap")];
  const mid =
    workspace.getBoundingClientRect().top + workspace.clientHeight / 2;
  let index = wraps.findIndex((w) => w.getBoundingClientRect().bottom > mid);
  if (index < 0) index = wraps.length - 1;
  $("#page-indicator").textContent =
    `Page ${index + 1} / ${store.design.pages.length}`;
}
workspace.addEventListener("scroll", updatePageIndicator);

$("#grid-btn").addEventListener("click", () => gridView(store, view));

/* ---------- rendering & autosave ---------- */

let saveTimer = null;
let thumbTimer = null;

async function save(withThumb = false) {
  clearTimeout(saveTimer);
  const thumb = withThumb ? await thumbnail(store.design) : undefined;
  store.persist(thumb);
}

function scheduleSave() {
  $("#save-status").innerHTML = `${icon("cloud", 18)}<span>Saving…</span>`;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(false), 600);
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => save(true), 2500);
}

function renderChrome() {
  if (document.activeElement !== titleInput)
    titleInput.value = store.design.title;
  document.title = `${store.design.title} - Pixelpad`;
  $("#undo").disabled = !store.past.length;
  $("#redo").disabled = !store.future.length;
  const pct = Math.round(store.zoom * 100);
  zoomRange.value = String(pct);
  $("#zoom-label").textContent = `${pct}%`;
  updatePageIndicator();
}

store.on((reason) => {
  view.render();
  if (reason !== "drag" && reason !== "zoom") {
    toolbar.render();
    panels.refresh();
  }
  renderChrome();
  if (reason === "saved") {
    $("#save-status").innerHTML = store.saved
      ? `${icon("check", 18)}<span>All changes saved</span>`
      : `${icon("cloud", 18)}<span>Couldn't save (storage full)</span>`;
  } else if (reason !== "selection" && reason !== "zoom" && reason !== "drag") {
    scheduleSave();
  }
});

trackEditorLinks();
bindKeyboard({ store, actions, interactions, save, fitZoom, panels });
window.addEventListener("beforeunload", () => store.saved || store.persist());
document.fonts?.addEventListener?.("loadingdone", () => view.render());

view.render();
toolbar.render();
renderChrome();
requestAnimationFrame(() => {
  fitZoom();
  if (!loadDesign(store.design.id)) save(true);
});

// Exposed for debugging and the smoke test.
window.pixelpad = { store, actions, view };
