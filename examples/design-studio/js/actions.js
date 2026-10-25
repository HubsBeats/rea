// Editing commands shared by the toolbar, keyboard shortcuts, menus and panels.

import { clone, createPage, uid } from "./model.js";
import { bounds } from "./interact.js";

/** Editing commands bound to a store. */
export class Actions {
  constructor(store) {
    this.store = store;
  }

  /** Adds elements to the active page, centred unless positioned. */
  add(elements, { at, keepPosition = false } = {}) {
    const { store } = this;
    const list = Array.isArray(elements) ? elements : [elements];
    const page = store.activePage;
    const { width, height } = store.design;
    if (!keepPosition) {
      const minX = Math.min(...list.map((e) => e.x));
      const minY = Math.min(...list.map((e) => e.y));
      const w = Math.max(...list.map((e) => e.x + e.w)) - minX;
      const h = Math.max(...list.map((e) => e.y + e.h)) - minY;
      const cx = at?.x ?? width / 2;
      const cy = at?.y ?? height / 2;
      for (const el of list) {
        el.x = Math.round(el.x - minX + cx - w / 2);
        el.y = Math.round(el.y - minY + cy - h / 2);
      }
    }
    store.update(() => page.elements.push(...list));
    store.select(
      list.map((e) => e.id),
      page.id,
    );
  }

  remove() {
    const { store } = this;
    const ids = new Set(
      store.selected.filter((e) => !e.locked).map((e) => e.id),
    );
    if (!ids.size) return;
    store.update(() => {
      for (const page of store.design.pages)
        page.elements = page.elements.filter((e) => !ids.has(e.id));
    });
    store.select([]);
  }

  duplicate() {
    const { store } = this;
    const sel = store.selected;
    if (!sel.length) return;
    const page = store.find(sel[0].id).page;
    const copies = sel.map((el) => ({
      ...clone(el),
      id: uid(),
      x: el.x + 20,
      y: el.y + 20,
      locked: false,
    }));
    store.update(() => page.elements.push(...copies));
    store.select(
      copies.map((c) => c.id),
      page.id,
    );
  }

  copy() {
    if (this.store.selected.length)
      this.store.clipboard = clone(this.store.selected);
  }

  cut() {
    this.copy();
    this.remove();
  }

  paste() {
    const items = this.store.clipboard;
    if (!items?.length) return;
    const copies = items.map((el) => ({
      ...clone(el),
      id: uid(),
      x: el.x + 20,
      y: el.y + 20,
    }));
    this.store.clipboard = copies.map((c) => clone(c));
    this.add(copies, { keepPosition: true });
  }

  selectAll() {
    const page = this.store.activePage;
    this.store.select(
      page.elements.map((e) => e.id),
      page.id,
    );
  }

  /** Moves selected elements in the stacking order. */
  arrange(direction) {
    const { store } = this;
    const sel = store.selected;
    if (!sel.length) return;
    const page = store.find(sel[0].id).page;
    const ids = new Set(sel.map((e) => e.id));
    store.update(() => {
      const els = page.elements;
      if (direction === "front" || direction === "back") {
        const picked = els.filter((e) => ids.has(e.id));
        const rest = els.filter((e) => !ids.has(e.id));
        page.elements =
          direction === "front" ? [...rest, ...picked] : [...picked, ...rest];
        return;
      }
      const step = direction === "forward" ? 1 : -1;
      const order = step > 0 ? [...els.keys()].reverse() : [...els.keys()];
      for (const i of order) {
        const j = i + step;
        if (
          ids.has(els[i].id) &&
          j >= 0 &&
          j < els.length &&
          !ids.has(els[j].id)
        )
          [els[i], els[j]] = [els[j], els[i]];
      }
    });
  }

  /** Aligns the selection to the page (one element) or to each other. */
  align(edge) {
    const { store } = this;
    const sel = store.selected.filter((e) => !e.locked);
    if (!sel.length) return;
    const frame =
      sel.length === 1
        ? { x: 0, y: 0, w: store.design.width, h: store.design.height }
        : (() => {
            const all = sel.map(bounds);
            const x = Math.min(...all.map((b) => b.x));
            const y = Math.min(...all.map((b) => b.y));
            return {
              x,
              y,
              w: Math.max(...all.map((b) => b.x + b.w)) - x,
              h: Math.max(...all.map((b) => b.y + b.h)) - y,
            };
          })();
    store.patch(
      sel.map((e) => e.id),
      (el) => {
        const b = bounds(el);
        const offX = el.x - b.x;
        const offY = el.y - b.y;
        const pos = {
          left: { x: frame.x + offX },
          center: { x: frame.x + (frame.w - b.w) / 2 + offX },
          right: { x: frame.x + frame.w - b.w + offX },
          top: { y: frame.y + offY },
          middle: { y: frame.y + (frame.h - b.h) / 2 + offY },
          bottom: { y: frame.y + frame.h - b.h + offY },
        }[edge];
        return Object.fromEntries(
          Object.entries(pos).map(([k, v]) => [k, Math.round(v)]),
        );
      },
    );
  }

  toggleLock() {
    const sel = this.store.selected;
    if (!sel.length) return;
    const locked = !sel.every((e) => e.locked);
    this.store.patch(
      sel.map((e) => e.id),
      { locked },
    );
  }

  nudge(dx, dy) {
    const sel = this.store.selected.filter((e) => !e.locked);
    if (!sel.length) return;
    this.store.patch(
      sel.map((e) => e.id),
      (el) => ({ x: el.x + dx, y: el.y + dy }),
    );
  }

  /** Toggles a boolean text style on selected text elements. */
  toggleText(prop) {
    const texts = this.store.selected.filter((e) => e.type === "text");
    if (!texts.length) return;
    const value = !texts.every((e) => e[prop]);
    this.store.patch(
      texts.map((e) => e.id),
      { [prop]: value },
    );
  }

  addPage(afterId) {
    const { store } = this;
    const page = createPage();
    store.update((d) => {
      const index = afterId
        ? d.pages.findIndex((p) => p.id === afterId) + 1
        : d.pages.length;
      d.pages.splice(index, 0, page);
    });
    store.select([], page.id);
    return page;
  }

  pageAction(action, pageId) {
    const { store } = this;
    const pages = store.design.pages;
    const index = pages.findIndex((p) => p.id === pageId);
    if (index < 0) return;
    if (action === "add") return this.addPage(pageId);
    if (action === "duplicate") {
      const copy = clone(pages[index]);
      copy.id = uid("page");
      copy.elements = copy.elements.map((e) => ({ ...e, id: uid() }));
      store.update((d) => d.pages.splice(index + 1, 0, copy));
      return store.select([], copy.id);
    }
    if (action === "delete") {
      if (pages.length === 1)
        return store.update((d) =>
          Object.assign(d.pages[0], {
            elements: [],
            background: { color: "#ffffff" },
          }),
        );
      store.update((d) => d.pages.splice(index, 1));
      return store.select([], store.design.pages[Math.max(0, index - 1)].id);
    }
    const to = action === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= pages.length) return;
    store.update((d) => {
      const [moved] = d.pages.splice(index, 1);
      d.pages.splice(to, 0, moved);
    });
  }

  /** Changes the design size, scaling content to fit the new page. */
  resize(width, height, scaleContent = true) {
    const { store } = this;
    const design = clone(store.design);
    const s = Math.min(width / design.width, height / design.height);
    const ox = (width - design.width * s) / 2;
    const oy = (height - design.height * s) / 2;
    if (scaleContent) {
      for (const page of design.pages) {
        for (const el of page.elements) {
          Object.assign(el, {
            x: el.x * s + ox,
            y: el.y * s + oy,
            w: el.w * s,
            h: el.h * s,
          });
          if (el.type === "text") el.fontSize *= s;
          if (el.strokeWidth && el.type !== "path") el.strokeWidth *= s;
        }
      }
    }
    Object.assign(design, { width, height });
    store.replace(design);
  }
}
