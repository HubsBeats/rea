// Left side rail and the object panel (templates, elements, text,
// uploads, draw, layers and projects).

import {
  FONT_COMBOS,
  GRAPHICS,
  STICKERS,
  TEMPLATES,
  buildTemplate,
  textPreset,
} from "./library.js";
import {
  PALETTE,
  createImage,
  createLine,
  createShape,
  createText,
} from "./model.js";
import { SHAPE_KINDS, shapePath } from "./shapes.js";
import { icon } from "./icons.js";
import { h, toast } from "./popover.js";
import { layersTab, projectsTab } from "./layers.js";

const TABS = [
  { id: "design", label: "Design", icon: "design" },
  { id: "elements", label: "Elements", icon: "elements" },
  { id: "text", label: "Text", icon: "text" },
  { id: "uploads", label: "Uploads", icon: "upload" },
  { id: "draw", label: "Draw", icon: "draw" },
  { id: "layers", label: "Layers", icon: "layers" },
  { id: "projects", label: "Projects", icon: "folder" },
];

const UPLOADS_KEY = "pixelpad:uploads";

function readUploads() {
  try {
    return JSON.parse(localStorage.getItem(UPLOADS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function shapeThumb(kind) {
  const d = shapePath({ shape: kind, w: 48, h: kind === "arrow" ? 30 : 48 });
  return `<svg viewBox="0 0 48 48" width="48" height="48"><g transform="translate(0 ${kind === "arrow" ? 9 : 0})"><path d="${d}" fill="#8b8b8b"/></g></svg>`;
}

/** Side rail and object panel. */
export class Panels {
  constructor(store, actions, interactions, { rail, panel, workspace }) {
    this.store = store;
    this.actions = actions;
    this.interactions = interactions;
    this.rail = rail;
    this.panel = panel;
    this.tab = "design";
    this.dragFactory = null;
    this.drawTool = {
      pen: "pen",
      color: "#000000",
      size: 8,
      highlighter: false,
    };
    this.renderRail();
    this.renderPanel();
    workspace.addEventListener("dragover", (e) => {
      if (this.dragFactory || e.dataTransfer.types.includes("Files"))
        e.preventDefault();
    });
    workspace.addEventListener("drop", (e) => this.onDrop(e));
  }

  scale() {
    return Math.min(this.store.design.width, this.store.design.height) / 1080;
  }

  renderRail() {
    this.rail.replaceChildren(
      ...TABS.map((t) =>
        h(
          "button.rail-btn",
          {
            class: `rail-btn${t.id === this.tab && !this.collapsed ? " active" : ""}`,
            "data-tab": t.id,
            onclick: () => this.open(t.id),
          },
          h("span", { html: icon(t.icon, 22) }),
          h("span.rail-label", {}, t.label),
        ),
      ),
    );
  }

  /** Opens a tab; clicking the active tab collapses the panel. */
  open(tab) {
    this.collapsed = this.tab === tab ? !this.collapsed : false;
    this.tab = tab;
    document.body.classList.toggle("panel-collapsed", this.collapsed);
    this.setDrawMode(tab === "draw" && !this.collapsed);
    this.renderRail();
    this.renderPanel();
  }

  setDrawMode(on) {
    this.interactions.drawTool = on ? this.drawTool : null;
    document.body.classList.toggle("drawing", on);
  }

  /** Re-renders the panel when it shows design-dependent content. */
  refresh() {
    if (this.tab === "layers" && !this.dragLayer) this.renderPanel();
  }

  renderPanel() {
    const builders = {
      design: () => this.designTab(),
      elements: () => this.elementsTab(),
      text: () => this.textTab(),
      uploads: () => this.uploadsTab(),
      draw: () => this.drawTab(),
      layers: () => layersTab(this),
      projects: () => projectsTab(this),
    };
    const scroll = this.panel.querySelector(".panel-scroll")?.scrollTop ?? 0;
    this.panel.replaceChildren(
      h("div.panel-scroll", {}, builders[this.tab]()),
      h("button.panel-collapse", {
        title: "Hide panel",
        "aria-label": "Hide panel",
        onclick: () => this.open(this.tab),
        html: icon("chevronLeft", 16),
      }),
    );
    this.panel.querySelector(".panel-scroll").scrollTop = scroll;
  }

  /** A clickable, draggable tile that inserts elements. */
  tile(content, factory, { title, className = "tile" } = {}) {
    const node = h(`button.${className}`, {
      title,
      draggable: "true",
      onclick: () => this.actions.add(factory()),
    });
    if (typeof content === "string") node.innerHTML = content;
    else node.append(content);
    node.addEventListener("dragstart", (e) => {
      this.dragFactory = factory;
      e.dataTransfer.setData("text/plain", title ?? "element");
      e.dataTransfer.effectAllowed = "copy";
    });
    node.addEventListener("dragend", () => (this.dragFactory = null));
    return node;
  }

  onDrop(e) {
    const pageId = this.interactionsView().pageAt(e.clientX, e.clientY);
    if (!pageId) return;
    e.preventDefault();
    this.store.setActivePage(pageId);
    const at = this.interactionsView().toPage(pageId, e.clientX, e.clientY);
    if (e.dataTransfer.files.length) {
      this.readFiles(e.dataTransfer.files, at);
      return;
    }
    if (this.dragFactory) this.actions.add(this.dragFactory(), { at });
    this.dragFactory = null;
  }

  interactionsView() {
    return this.interactions.view;
  }

  section(title, ...children) {
    return h("section.panel-section", {}, h("h3", {}, title), ...children);
  }

  search(placeholder, onInput) {
    const input = h("input.search", { placeholder, "aria-label": placeholder });
    input.addEventListener("input", () => onInput(input.value.toLowerCase()));
    return h("div.search-wrap", { html: icon("search", 18) }, input);
  }

  designTab() {
    const grid = h("div.template-grid");
    const ratio = this.store.design.height / this.store.design.width;
    const fill = (q = "") => {
      grid.replaceChildren(
        ...TEMPLATES.filter((t) => t.name.toLowerCase().includes(q)).map(
          (t) => {
            const preview = h("div.template-preview", {
              style: { aspectRatio: `1 / ${ratio}` },
            });
            this.previewTemplate(t, preview);
            const card = h(
              "button.template-card",
              { title: `Apply "${t.name}" to this page` },
              preview,
              h("span", {}, t.name),
            );
            card.addEventListener("click", () => this.applyTemplate(t));
            return card;
          },
        ),
      );
    };
    fill();
    return h(
      "div",
      {},
      this.search("Search templates", fill),
      this.section(
        "Templates",
        h("p.muted", {}, "Click a template to apply it to the current page."),
        grid,
      ),
    );
  }

  async previewTemplate(template, node) {
    const { renderPage } = await import("./exporter.js");
    const { design } = this.store;
    const page = { ...buildTemplate(template, design) };
    const canvas = await renderPage(design, page, 240 / design.width);
    node.append(canvas);
  }

  applyTemplate(template) {
    const page = this.store.activePage;
    const built = buildTemplate(template, this.store.design);
    this.store.update(() => Object.assign(page, built));
    this.store.select([], page.id);
    toast(`Applied "${template.name}"`);
  }

  elementsTab() {
    const s = this.scale();
    const shapes = SHAPE_KINDS.map((kind) =>
      this.tile(
        shapeThumb(kind),
        () =>
          createShape(kind, {
            w: 300 * s,
            h: (kind === "arrow" ? 160 : 300) * s,
          }),
        { title: kind },
      ),
    );
    const lines = [
      ["Line", {}],
      ["Dashed", { dash: "dashed" }],
      ["Dotted", { dash: "dotted" }],
      ["Arrow", { arrowEnd: true }],
    ].map(([name, props]) => {
      const el = createLine({ w: 48, h: 12, strokeWidth: 3, ...props });
      const dash =
        props.dash === "dashed"
          ? "9 6"
          : props.dash === "dotted"
            ? "0.1 6"
            : "";
      const svg = `<svg viewBox="0 0 48 12" width="48" height="12"><path d="M0 6H${el.arrowEnd ? 40 : 48}" stroke="#555" stroke-width="3" stroke-linecap="round" stroke-dasharray="${dash}"/>${el.arrowEnd ? '<path d="M38 0 48 6 38 12z" fill="#555"/>' : ""}</svg>`;
      return this.tile(
        svg,
        () =>
          createLine({ w: 500 * s, h: 30 * s, strokeWidth: 8 * s, ...props }),
        { title: name },
      );
    });
    const graphics = GRAPHICS.map((g) =>
      this.tile(
        `<img src="${g.src}" alt="${g.name}">`,
        () => createImage(g.src, { w: 400 * s, h: 400 * s }),
        { title: g.name },
      ),
    );
    const stickers = STICKERS.map((e) =>
      this.tile(
        `<span class="sticker">${e}</span>`,
        () =>
          createText({
            text: e,
            fontSize: 200 * s,
            w: 260 * s,
            lineHeight: 1.2,
          }),
        { title: "Sticker" },
      ),
    );
    const frames = this.tile(
      `<div class="frame-thumb">${icon("image", 28)}</div>`,
      () =>
        createShape("rounded", {
          w: 500 * s,
          h: 500 * s,
          fill: "#e6e6e6",
          radius: 24 * s,
        }),
      { title: "Placeholder frame" },
    );
    return h(
      "div",
      {},
      this.section("Shapes", h("div.tile-grid", {}, shapes)),
      this.section("Lines", h("div.tile-grid", {}, lines)),
      this.section("Graphics", h("div.tile-grid.big", {}, graphics)),
      this.section("Stickers", h("div.tile-grid", {}, stickers)),
      this.section("Frames", h("div.tile-grid", {}, frames)),
    );
  }

  textTab() {
    const { design } = this.store;
    const s = this.scale();
    const add = (kind) =>
      this.tile(
        h(
          "span",
          {},
          {
            heading: "Add a heading",
            subheading: "Add a subheading",
            body: "Add a little bit of body text",
          }[kind],
        ),
        () => textPreset(kind, design),
        {
          className: `text-preset.${kind}`,
          title: kind,
        },
      );
    const combos = FONT_COMBOS.map((combo) => {
      const preview = h("div.combo-preview");
      const els = combo.build(0.22);
      for (const el of els) {
        preview.append(
          h(
            "div",
            {
              style: {
                fontFamily: `"${el.fontFamily}"`,
                fontSize: `${Math.max(10, el.fontSize)}px`,
                color: el.color,
                fontWeight: el.bold ? 700 : 400,
                fontStyle: el.italic ? "italic" : "normal",
                lineHeight: String(el.lineHeight),
                letterSpacing: `${el.letterSpacing / 1000}em`,
              },
            },
            el.text,
          ),
        );
      }
      return this.tile(preview, () => combo.build(s), {
        title: combo.name,
        className: "combo-tile",
      });
    });
    return h(
      "div",
      {},
      h(
        "button.btn-primary.wide",
        {
          onclick: () =>
            this.actions.add(
              createText({
                text: "Your text here",
                fontSize: 48 * s,
                w: 600 * s,
              }),
            ),
        },
        h("span", { html: icon("text", 18) }),
        "Add a text box",
      ),
      this.section(
        "Default text styles",
        h(
          "div.text-presets",
          {},
          add("heading"),
          add("subheading"),
          add("body"),
        ),
      ),
      this.section("Font combinations", h("div.combo-grid", {}, combos)),
    );
  }

  uploadsTab() {
    const input = h("input", {
      type: "file",
      accept: "image/*",
      multiple: true,
      hidden: true,
    });
    input.addEventListener("change", () => this.readFiles(input.files));
    const uploads = readUploads();
    const s = this.scale();
    const grid = h(
      "div.tile-grid.big",
      {},
      uploads.map((u) =>
        this.tile(
          `<img src="${u.src}" alt="${u.name}">`,
          () =>
            createImage(u.src, { w: (u.w ?? 400) * s, h: (u.h ?? 400) * s }),
          { title: u.name },
        ),
      ),
    );
    return h(
      "div",
      {},
      h(
        "button.btn-primary.wide",
        { onclick: () => input.click() },
        h("span", { html: icon("upload", 18) }),
        "Upload files",
      ),
      input,
      h(
        "p.muted",
        {},
        "Images stay in this browser. You can also drop files onto a page.",
      ),
      this.section(
        "Images",
        uploads.length ? grid : h("p.muted", {}, "No uploads yet."),
      ),
    );
  }

  /** Reads image files to data URLs, saves them, and adds them to the page. */
  readFiles(files, at) {
    for (const file of [...files].filter((f) => f.type.startsWith("image/"))) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const fit = Math.min(
            1,
            (Math.min(this.store.design.width, this.store.design.height) *
              0.6) /
              Math.max(img.width, img.height),
          );
          const w = Math.round(img.width * fit);
          const hgt = Math.round(img.height * fit);
          const uploads = readUploads();
          uploads.unshift({ name: file.name, src: reader.result, w, h: hgt });
          try {
            localStorage.setItem(
              UPLOADS_KEY,
              JSON.stringify(uploads.slice(0, 30)),
            );
          } catch {
            toast(
              "Browser storage is full; the upload is only in this design.",
            );
          }
          this.actions.add(
            createImage(reader.result, { w, h: hgt }),
            at ? { at } : {},
          );
          if (this.tab === "uploads") this.renderPanel();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  drawTab() {
    const t = this.drawTool;
    const pens = [
      ["pen", "Pen", 8, false],
      ["marker", "Marker", 24, false],
      ["highlighter", "Highlighter", 40, true],
    ].map(([id, label, size, highlighter]) =>
      h(
        "button.pen",
        {
          class: `pen${t.pen === id ? " active" : ""}`,
          onclick: () => {
            Object.assign(t, { pen: id, size, highlighter });
            this.renderPanel();
          },
        },
        h("span.pen-tip", {
          style: { background: t.color, height: `${Math.max(4, size / 2)}px` },
        }),
        label,
      ),
    );
    const colors = PALETTE.slice(0, 18).map((c) =>
      h("button.swatch", {
        class: `swatch${c === t.color ? " active" : ""}`,
        style: { background: c },
        title: c,
        onclick: () => ((t.color = c), this.renderPanel()),
      }),
    );
    const size = h("input", {
      type: "range",
      min: 1,
      max: 80,
      value: t.size,
      "aria-label": "Brush size",
    });
    size.addEventListener("input", () => (t.size = Number(size.value)));
    return h(
      "div",
      {},
      this.section(
        "Draw",
        h(
          "p.muted",
          {},
          "Drag on a page to draw. Close this tab to stop drawing.",
        ),
        h("div.pens", {}, pens),
      ),
      this.section("Color", h("div.swatches", {}, colors)),
      this.section("Size", size),
    );
  }
}
