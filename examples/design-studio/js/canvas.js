// Renders pages and elements as DOM, and the unscaled selection overlay.

import { backgroundCss } from "./model.js";
import { dashArray, lineHeadPath, linePath, shapePath } from "./shapes.js";
import { icon } from "./icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(w, h, viewBox) {
  const node = document.createElementNS(SVG_NS, "svg");
  node.setAttribute("width", "100%");
  node.setAttribute("height", "100%");
  node.setAttribute("viewBox", viewBox ?? `0 0 ${w} ${h}`);
  node.setAttribute("preserveAspectRatio", "none");
  node.style.overflow = "visible";
  return node;
}

function pathNode(d, attrs) {
  const node = document.createElementNS(SVG_NS, "path");
  node.setAttribute("d", d);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** CSS filter string for an image element. */
export function imageFilter(el) {
  return `brightness(${el.brightness ?? 100}%) contrast(${el.contrast ?? 100}%) saturate(${el.saturation ?? 100}%) blur(${el.blur ?? 0}px)`;
}

function textStyle(node, el) {
  Object.assign(node.style, {
    fontFamily: `"${el.fontFamily}", sans-serif`,
    fontSize: `${el.fontSize}px`,
    color: el.color,
    fontWeight: el.bold ? "700" : "400",
    fontStyle: el.italic ? "italic" : "normal",
    textDecoration: el.underline ? "underline" : "none",
    textTransform: el.uppercase ? "uppercase" : "none",
    textAlign: el.align,
    letterSpacing: `${el.letterSpacing / 1000}em`,
    lineHeight: String(el.lineHeight),
  });
}

function buildContent(el) {
  const flip = `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`;
  if (el.type === "text") {
    const node = document.createElement("div");
    node.className = "text-content";
    node.textContent = el.text;
    textStyle(node, el);
    return node;
  }
  if (el.type === "image") {
    const img = document.createElement("img");
    img.src = el.src;
    img.alt = "";
    img.draggable = false;
    img.crossOrigin = "anonymous";
    img.style.filter = imageFilter(el);
    img.style.transform = flip;
    return img;
  }
  const box = el.type === "path" ? svg(el.ow, el.oh) : svg(el.w, el.h);
  box.style.transform = flip;
  if (el.type === "shape") {
    box.append(
      pathNode(shapePath(el), {
        fill: el.fill,
        stroke: el.strokeWidth ? el.stroke : "none",
        "stroke-width": el.strokeWidth,
      }),
    );
  } else if (el.type === "line") {
    const dash = dashArray(el);
    box.append(
      pathNode(linePath(el), {
        fill: "none",
        stroke: el.stroke,
        "stroke-width": el.strokeWidth,
        "stroke-linecap": el.dash === "dotted" ? "round" : "butt",
        "stroke-dasharray": dash.length ? dash.join(" ") : "none",
      }),
    );
    const head = lineHeadPath(el);
    if (head) box.append(pathNode(head, { fill: el.stroke }));
  } else if (el.type === "path") {
    box.append(
      pathNode(el.d, {
        fill: "none",
        stroke: el.stroke,
        "stroke-width": el.strokeWidth,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke",
        opacity: el.highlighter ? 0.45 : 1,
      }),
    );
  }
  return box;
}

/** DOM view of the design pages. */
export class CanvasView {
  constructor(store, root) {
    this.store = store;
    this.root = root;
    this.guides = [];
    this.editingId = null;
    this.hint = null;
  }

  /** Re-renders every page. Cheap enough to run on every change. */
  render() {
    const { design, zoom } = this.store;
    this.root.style.setProperty("--zoom", String(zoom));
    const existing = new Map(
      [...this.root.querySelectorAll(":scope > .page-wrap")].map((n) => [
        n.dataset.page,
        n,
      ]),
    );
    design.pages.forEach((page, index) => {
      let wrap = existing.get(page.id);
      if (!wrap) wrap = this.createPageWrap(page.id);
      existing.delete(page.id);
      this.root.insertBefore(wrap, this.root.children[index] ?? null);
      this.renderPage(wrap, page, index);
    });
    for (const stale of existing.values()) stale.remove();
    this.renderOverlay();
  }

  createPageWrap(pageId) {
    const wrap = document.createElement("section");
    wrap.className = "page-wrap";
    wrap.dataset.page = pageId;
    wrap.innerHTML = `
      <header class="page-header">
        <span class="page-label"></span>
        <input class="page-title" placeholder="Add page title" aria-label="Page title" />
        <div class="page-actions">
          <button data-page-action="up" title="Move page up">${icon("chevronUp")}</button>
          <button data-page-action="down" title="Move page down">${icon("chevronDown")}</button>
          <button data-page-action="duplicate" title="Duplicate page">${icon("copy")}</button>
          <button data-page-action="delete" title="Delete page">${icon("trash")}</button>
          <button data-page-action="add" title="Add page after">${icon("plusSquare")}</button>
        </div>
      </header>
      <div class="page-frame"><div class="page"></div><div class="page-overlay"></div></div>`;
    return wrap;
  }

  renderPage(wrap, page, index) {
    const { design, zoom, activePageId } = this.store;
    wrap.classList.toggle("active", page.id === activePageId);
    wrap.querySelector(".page-label").textContent =
      `Page ${index + 1}${page.title ? " -" : ""}`;
    const title = wrap.querySelector(".page-title");
    if (document.activeElement !== title) title.value = page.title;
    const frame = wrap.querySelector(".page-frame");
    frame.style.width = `${design.width * zoom}px`;
    frame.style.height = `${design.height * zoom}px`;
    const node = wrap.querySelector(".page");
    Object.assign(node.style, {
      width: `${design.width}px`,
      height: `${design.height}px`,
      transform: `scale(${zoom})`,
      background: backgroundCss(page.background),
    });
    this.renderElements(node, page);
  }

  renderElements(pageNode, page) {
    const existing = new Map(
      [...pageNode.children].map((n) => [n.dataset.id, n]),
    );
    page.elements.forEach((el, index) => {
      let node = existing.get(el.id);
      existing.delete(el.id);
      const signature = this.signature(el);
      if (!node) {
        node = document.createElement("div");
        node.className = "el";
        node.dataset.id = el.id;
      }
      if (node.dataset.sig !== signature && el.id !== this.editingId) {
        node.replaceChildren(buildContent(el));
        node.dataset.sig = signature;
      }
      node.dataset.type = el.type;
      node.classList.toggle("locked", el.locked);
      Object.assign(node.style, {
        left: `${el.x}px`,
        top: `${el.y}px`,
        width: `${el.w}px`,
        height: el.type === "text" ? "auto" : `${el.h}px`,
        transform: `rotate(${el.rotation}deg)`,
        opacity: String(el.opacity),
        zIndex: String(index + 1),
      });
      if (pageNode.children[index] !== node)
        pageNode.insertBefore(node, pageNode.children[index] ?? null);
      if (el.type === "text") this.syncTextHeight(node, el);
    });
    for (const stale of existing.values()) stale.remove();
  }

  /** Content signature: geometry that needs a content rebuild when changed. */
  signature(el) {
    const rest = { ...el };
    for (const key of ["x", "y", "rotation", "opacity", "locked"])
      delete rest[key];
    if (el.type === "text") delete rest.h;
    return JSON.stringify(rest);
  }

  /** Text boxes grow with their content; keep the model height in sync. */
  syncTextHeight(node, el) {
    const h = node.offsetHeight;
    if (h > 0 && Math.abs(h - el.h) > 0.5) el.h = h;
  }

  elementNode(id) {
    return this.root.querySelector(`.el[data-id="${id}"]`);
  }

  pageFrame(pageId) {
    return this.root.querySelector(
      `.page-wrap[data-page="${pageId}"] .page-frame`,
    );
  }

  /** Converts a client point to design coordinates on a page. */
  toPage(pageId, clientX, clientY) {
    const rect = this.pageFrame(pageId).getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.store.zoom,
      y: (clientY - rect.top) / this.store.zoom,
    };
  }

  /** Finds the page under a client point. */
  pageAt(clientX, clientY) {
    for (const frame of this.root.querySelectorAll(".page-frame")) {
      const r = frame.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        return frame.closest(".page-wrap").dataset.page;
      }
    }
    return null;
  }

  setGuides(guides) {
    this.guides = guides;
    this.renderOverlay();
  }

  setHint(hint) {
    this.hint = hint;
    this.renderOverlay();
  }

  renderOverlay() {
    const { zoom, selection } = this.store;
    for (const overlay of this.root.querySelectorAll(".page-overlay"))
      overlay.replaceChildren();
    const selected = this.store.selected;
    const pageId = selected.length
      ? this.store.find(selected[0].id).page.id
      : this.store.activePageId;
    const overlay = this.pageFrame(pageId)?.querySelector(".page-overlay");
    if (!overlay) return;
    for (const el of selected) {
      overlay.append(this.selectionBox(el, zoom, selection.length === 1));
    }
    if (selected.length > 1) overlay.append(this.groupBox(selected, zoom));
    for (const g of this.guides) overlay.append(this.guideNode(g, zoom));
    if (this.marquee) overlay.append(this.marqueeNode(this.marquee, zoom));
    if (this.hint) overlay.append(this.hintNode(this.hint, zoom));
  }

  selectionBox(el, zoom, withHandles) {
    const box = document.createElement("div");
    box.className = "sel-box";
    box.dataset.id = el.id;
    const h =
      el.type === "text"
        ? (this.elementNode(el.id)?.offsetHeight ?? el.h)
        : el.h;
    Object.assign(box.style, {
      left: `${el.x * zoom}px`,
      top: `${el.y * zoom}px`,
      width: `${el.w * zoom}px`,
      height: `${h * zoom}px`,
      transform: `rotate(${el.rotation}deg)`,
    });
    if (!withHandles || el.locked || el.id === this.editingId) {
      if (el.locked) box.classList.add("is-locked");
      return box;
    }
    const dirs =
      el.type === "text"
        ? ["nw", "ne", "sw", "se", "w", "e"]
        : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    for (const dir of dirs) {
      const handle = document.createElement("span");
      handle.className = `handle handle-${dir}`;
      handle.dataset.handle = dir;
      box.append(handle);
    }
    const rotate = document.createElement("span");
    rotate.className = "handle-rotate";
    rotate.dataset.handle = "rotate";
    rotate.innerHTML = icon("rotate");
    box.append(rotate);
    return box;
  }

  groupBox(elements, zoom) {
    const minX = Math.min(...elements.map((e) => e.x));
    const minY = Math.min(...elements.map((e) => e.y));
    const maxX = Math.max(...elements.map((e) => e.x + e.w));
    const maxY = Math.max(...elements.map((e) => e.y + e.h));
    const box = document.createElement("div");
    box.className = "group-box";
    Object.assign(box.style, {
      left: `${minX * zoom}px`,
      top: `${minY * zoom}px`,
      width: `${(maxX - minX) * zoom}px`,
      height: `${(maxY - minY) * zoom}px`,
    });
    return box;
  }

  guideNode(g, zoom) {
    const line = document.createElement("div");
    line.className = `guide guide-${g.axis}`;
    if (g.axis === "x")
      Object.assign(line.style, {
        left: `${g.pos * zoom}px`,
        top: `${g.from * zoom}px`,
        height: `${(g.to - g.from) * zoom}px`,
      });
    else
      Object.assign(line.style, {
        top: `${g.pos * zoom}px`,
        left: `${g.from * zoom}px`,
        width: `${(g.to - g.from) * zoom}px`,
      });
    return line;
  }

  marqueeNode(m, zoom) {
    const node = document.createElement("div");
    node.className = "marquee";
    Object.assign(node.style, {
      left: `${m.x * zoom}px`,
      top: `${m.y * zoom}px`,
      width: `${m.w * zoom}px`,
      height: `${m.h * zoom}px`,
    });
    return node;
  }

  hintNode(hint, zoom) {
    const node = document.createElement("div");
    node.className = "canvas-hint";
    node.textContent = hint.text;
    Object.assign(node.style, {
      left: `${hint.x * zoom}px`,
      top: `${hint.y * zoom}px`,
    });
    return node;
  }
}
