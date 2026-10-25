// Pointer interactions on the canvas: select, move, resize, rotate,
// marquee selection, smart guides, text editing and freehand drawing.

import { createPath } from "./model.js";

const SNAP_PX = 6;
const MIN_SIZE = 8;

function rotatePoint(x, y, deg) {
  const a = (deg * Math.PI) / 180;
  return {
    x: x * Math.cos(a) - y * Math.sin(a),
    y: x * Math.sin(a) + y * Math.cos(a),
  };
}

/** Axis-aligned bounds of a (possibly rotated) element. */
export function bounds(el) {
  if (!el.rotation) return { x: el.x, y: el.y, w: el.w, h: el.h };
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) =>
    rotatePoint((sx * el.w) / 2, (sy * el.h) / 2, el.rotation),
  );
  const xs = corners.map((c) => cx + c.x);
  const ys = corners.map((c) => cy + c.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

function unionBounds(elements) {
  const all = elements.map(bounds);
  const x = Math.min(...all.map((b) => b.x));
  const y = Math.min(...all.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...all.map((b) => b.x + b.w)) - x,
    h: Math.max(...all.map((b) => b.y + b.h)) - y,
  };
}

function closest(values, targets, threshold) {
  let best = null;
  for (const v of values) {
    for (const t of targets) {
      const d = t.pos - v;
      if (
        Math.abs(d) <= threshold &&
        (!best || Math.abs(d) < Math.abs(best.delta))
      )
        best = { delta: d, target: t };
    }
  }
  return best;
}

/** Wires pointer interactions for a canvas view. */
export class Interactions {
  constructor(store, view, workspace) {
    this.store = store;
    this.view = view;
    this.workspace = workspace;
    this.drawTool = null;
    this.op = null;
    workspace.addEventListener("pointerdown", (e) => this.onDown(e));
    window.addEventListener("pointermove", (e) => this.onMove(e));
    window.addEventListener("pointerup", (e) => this.onUp(e));
    workspace.addEventListener("dblclick", (e) => this.onDoubleClick(e));
  }

  onDown(e) {
    if (e.button !== 0) return;
    if (
      e.target.closest(
        ".page-header, .add-page, .text-content[contenteditable='plaintext-only']",
      )
    )
      return;
    const pageId = this.view.pageAt(e.clientX, e.clientY);
    if (this.drawTool && pageId) return this.startDraw(e, pageId);
    const handle = e.target.closest("[data-handle]");
    if (handle) return this.startTransform(e, handle.dataset.handle);
    const node = e.target.closest(".el");
    if (node) return this.startMove(e, node.dataset.id);
    if (e.target.closest(".group-box") || e.target.closest(".sel-box")) {
      return this.startMove(e, this.store.selection[0]);
    }
    if (pageId) return this.startMarquee(e, pageId);
    if (!e.target.closest(".context-toolbar, .popover")) this.store.select([]);
  }

  startMove(e, id) {
    const hit = this.store.find(id);
    if (!hit) return;
    const { selection } = this.store;
    if (e.shiftKey) {
      const next = selection.includes(id)
        ? selection.filter((s) => s !== id)
        : [...selection, id];
      this.store.select(next, hit.page.id);
      return;
    }
    if (!selection.includes(id)) this.store.select([id], hit.page.id);
    const movable = this.store.selected.filter((el) => !el.locked);
    if (!movable.length) return;
    e.preventDefault();
    this.op = {
      kind: "move",
      pageId: hit.page.id,
      start: this.view.toPage(hit.page.id, e.clientX, e.clientY),
      origins: movable.map((el) => ({ id: el.id, x: el.x, y: el.y })),
      box: unionBounds(movable),
      moved: false,
    };
  }

  startTransform(e, handle) {
    const el = this.store.selected[0];
    const hit = el && this.store.find(el.id);
    if (!hit || el.locked) return;
    e.preventDefault();
    e.stopPropagation();
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    this.op = {
      kind: handle === "rotate" ? "rotate" : "resize",
      handle,
      pageId: hit.page.id,
      origin: { ...el },
      center: { x: cx, y: cy },
      moved: false,
    };
  }

  startMarquee(e, pageId) {
    if (!e.shiftKey) this.store.select([], pageId);
    this.store.setActivePage(pageId);
    const start = this.view.toPage(pageId, e.clientX, e.clientY);
    this.op = {
      kind: "marquee",
      pageId,
      start,
      base: e.shiftKey ? [...this.store.selection] : [],
    };
  }

  startDraw(e, pageId) {
    e.preventDefault();
    const p = this.view.toPage(pageId, e.clientX, e.clientY);
    this.op = { kind: "draw", pageId, points: [[p.x, p.y]] };
    this.store.setActivePage(pageId);
  }

  onMove(e) {
    const op = this.op;
    if (!op) return;
    const p = this.view.toPage(op.pageId, e.clientX, e.clientY);
    if (op.kind === "move") this.move(op, p, e);
    else if (op.kind === "resize") this.resize(op, p, e);
    else if (op.kind === "rotate") this.rotate(op, p, e);
    else if (op.kind === "marquee") this.marquee(op, p);
    else if (op.kind === "draw") this.drawTo(op, p);
  }

  move(op, p, e) {
    let dx = p.x - op.start.x;
    let dy = p.y - op.start.y;
    if (!op.moved && Math.hypot(dx, dy) * this.store.zoom < 3) return;
    if (!op.moved) this.store.checkpoint();
    op.moved = true;
    const guides = [];
    if (!e.altKey) {
      const snapped = this.snap(
        { ...op.box, x: op.box.x + dx, y: op.box.y + dy },
        op,
      );
      dx += snapped.dx;
      dy += snapped.dy;
      guides.push(...snapped.guides);
    }
    for (const o of op.origins) {
      const hit = this.store.find(o.id);
      if (hit)
        Object.assign(hit.el, {
          x: Math.round(o.x + dx),
          y: Math.round(o.y + dy),
        });
    }
    this.view.guides = guides;
    this.store.touch();
    this.store.emit("drag");
  }

  /** Smart guides: snaps a moving box to page and sibling edges/centres. */
  snap(box, op) {
    const { design } = this.store;
    const page = this.store.page(op.pageId);
    const moving = new Set(op.origins.map((o) => o.id));
    const xs = [
      { pos: 0 },
      { pos: design.width / 2 },
      { pos: design.width },
    ].map((t) => ({ ...t, from: 0, to: design.height }));
    const ys = [
      { pos: 0 },
      { pos: design.height / 2 },
      { pos: design.height },
    ].map((t) => ({ ...t, from: 0, to: design.width }));
    for (const el of page.elements) {
      if (moving.has(el.id)) continue;
      const b = bounds(el);
      for (const pos of [b.x, b.x + b.w / 2, b.x + b.w])
        xs.push({ pos, from: b.y, to: b.y + b.h });
      for (const pos of [b.y, b.y + b.h / 2, b.y + b.h])
        ys.push({ pos, from: b.x, to: b.x + b.w });
    }
    const threshold = SNAP_PX / this.store.zoom;
    const sx = closest(
      [box.x, box.x + box.w / 2, box.x + box.w],
      xs,
      threshold,
    );
    const sy = closest(
      [box.y, box.y + box.h / 2, box.y + box.h],
      ys,
      threshold,
    );
    const guides = [];
    const dx = sx?.delta ?? 0;
    const dy = sy?.delta ?? 0;
    if (sx)
      guides.push({
        axis: "x",
        pos: sx.target.pos,
        from: Math.min(sx.target.from, box.y + dy),
        to: Math.max(sx.target.to, box.y + dy + box.h),
      });
    if (sy)
      guides.push({
        axis: "y",
        pos: sy.target.pos,
        from: Math.min(sy.target.from, box.x + dx),
        to: Math.max(sy.target.to, box.x + dx + box.w),
      });
    return { dx, dy, guides };
  }

  resize(op, p, e) {
    const o = op.origin;
    const hit = this.store.find(o.id);
    if (!hit) return;
    if (!op.moved) this.store.checkpoint();
    op.moved = true;
    const hx = op.handle.includes("e") ? 1 : op.handle.includes("w") ? -1 : 0;
    const hy = op.handle.includes("s") ? 1 : op.handle.includes("n") ? -1 : 0;
    const anchorLocal = { x: (-hx * o.w) / 2, y: (-hy * o.h) / 2 };
    const a = rotatePoint(anchorLocal.x, anchorLocal.y, o.rotation);
    const anchor = { x: op.center.x + a.x, y: op.center.y + a.y };
    const v = rotatePoint(p.x - anchor.x, p.y - anchor.y, -o.rotation);
    let w = hx ? Math.max(MIN_SIZE, hx * v.x) : o.w;
    let h = hy ? Math.max(MIN_SIZE, hy * v.y) : o.h;
    const corner = hx && hy;
    const keepRatio =
      corner &&
      (o.type !== "shape" && o.type !== "line" ? !e.shiftKey : e.shiftKey);
    if (keepRatio) {
      const scale = Math.max(w / o.w, h / o.h);
      w = o.w * scale;
      h = o.h * scale;
    }
    const patch = { w: Math.round(w), h: Math.round(h) };
    if (o.type === "text") {
      if (corner)
        patch.fontSize = Math.max(
          4,
          Math.round(o.fontSize * (w / o.w) * 10) / 10,
        );
      else patch.h = o.h;
    }
    const c = rotatePoint((hx * patch.w) / 2, (hy * patch.h) / 2, o.rotation);
    const center = { x: anchor.x + c.x, y: anchor.y + c.y };
    patch.x = Math.round(center.x - patch.w / 2);
    patch.y = Math.round(center.y - patch.h / 2);
    Object.assign(hit.el, patch);
    this.view.hint = {
      text: `w: ${patch.w} h: ${Math.round(hit.el.h)}`,
      x: patch.x + patch.w / 2,
      y: patch.y + patch.h + 16,
    };
    this.store.touch();
    this.store.emit("drag");
  }

  rotate(op, p, e) {
    const hit = this.store.find(op.origin.id);
    if (!hit) return;
    if (!op.moved) this.store.checkpoint();
    op.moved = true;
    let deg =
      (Math.atan2(p.y - op.center.y, p.x - op.center.x) * 180) / Math.PI + 90;
    deg = ((deg % 360) + 360) % 360;
    const step = e.shiftKey ? 15 : 45;
    const nearest = Math.round(deg / step) * step;
    if (e.shiftKey || Math.abs(nearest - deg) < 4) deg = nearest % 360;
    hit.el.rotation = Math.round(deg);
    this.view.hint = {
      text: `${hit.el.rotation}°`,
      x: op.center.x,
      y: op.origin.y + op.origin.h + 24,
    };
    this.store.touch();
    this.store.emit("drag");
  }

  marquee(op, p) {
    const m = {
      x: Math.min(op.start.x, p.x),
      y: Math.min(op.start.y, p.y),
      w: Math.abs(p.x - op.start.x),
      h: Math.abs(p.y - op.start.y),
    };
    this.view.marquee = m;
    const page = this.store.page(op.pageId);
    const hits = page.elements.filter((el) => {
      const b = bounds(el);
      return (
        b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y
      );
    });
    this.store.select([...op.base, ...hits.map((el) => el.id)], op.pageId);
  }

  drawTo(op, p) {
    op.points.push([p.x, p.y]);
    const t = this.drawTool;
    const overlay = this.view
      .pageFrame(op.pageId)
      .querySelector(".page-overlay");
    let preview = overlay.querySelector(".draw-preview");
    if (!preview) {
      preview = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      preview.classList.add("draw-preview");
      preview.innerHTML =
        "<path fill='none' stroke-linecap='round' stroke-linejoin='round'/>";
      overlay.append(preview);
    }
    const z = this.store.zoom;
    const path = preview.firstChild;
    path.setAttribute(
      "d",
      op.points
        .map(([x, y], i) => `${i ? "L" : "M"}${x * z} ${y * z}`)
        .join(" "),
    );
    path.setAttribute("stroke", t.color);
    path.setAttribute("stroke-width", String(t.size * z));
    path.setAttribute("opacity", t.highlighter ? "0.45" : "1");
  }

  onUp() {
    const op = this.op;
    this.op = null;
    if (!op) return;
    this.view.marquee = null;
    this.view.guides = [];
    this.view.hint = null;
    if (op.kind === "draw") return this.finishDraw(op);
    if (op.moved) this.store.emit("design");
    else this.view.renderOverlay();
  }

  finishDraw(op) {
    if (op.points.length < 2) {
      this.view.renderOverlay();
      return;
    }
    const t = this.drawTool;
    const el = createPath(op.points, {
      stroke: t.color,
      strokeWidth: t.size,
      highlighter: t.highlighter,
    });
    this.store.update(() => this.store.page(op.pageId).elements.push(el));
  }

  onDoubleClick(e) {
    const node = e.target.closest(".el[data-type='text']");
    const id = node?.dataset.id ?? e.target.closest(".sel-box")?.dataset.id;
    const hit = id && this.store.find(id);
    if (hit?.el.type === "text" && !hit.el.locked) this.editText(id);
  }

  /** Enters in-place text editing for a text element. */
  editText(id) {
    const node = this.view.elementNode(id);
    const content = node?.querySelector(".text-content");
    const hit = this.store.find(id);
    if (!content || !hit) return;
    const before = hit.el.text;
    this.store.checkpoint();
    this.view.editingId = id;
    this.store.select([id]);
    content.contentEditable = "plaintext-only";
    content.focus();
    document.getSelection().selectAllChildren(content);
    const onInput = () => {
      hit.el.text = content.innerText;
      this.view.syncTextHeight(node, hit.el);
      this.view.renderOverlay();
    };
    const finish = () => {
      content.removeEventListener("input", onInput);
      content.removeAttribute("contenteditable");
      this.view.editingId = null;
      const text = content.innerText.replace(/\n$/, "");
      if (text === before) this.store.past.pop();
      this.store.find(id).el.text = text;
      if (!text.trim()) {
        const page = this.store.find(id).page;
        page.elements = page.elements.filter((el) => el.id !== id);
        this.store.selection = [];
      }
      this.store.touch();
      this.store.emit("design");
    };
    content.addEventListener("input", onInput);
    content.addEventListener("blur", finish, { once: true });
  }
}
