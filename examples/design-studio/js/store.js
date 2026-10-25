// Editor state: the design, selection, undo history and local persistence.

import { clone, createDesign } from "./model.js";

const INDEX_KEY = "pixelpad:designs";
const designKey = (id) => `pixelpad:design:${id}`;
const HISTORY_LIMIT = 100;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Lists saved designs, newest first. */
export function listDesigns() {
  const index = readJson(INDEX_KEY, []);
  return Array.isArray(index)
    ? index.sort((a, b) => b.updatedAt - a.updatedAt)
    : [];
}

/** Loads a saved design by id, or null. */
export function loadDesign(id) {
  return readJson(designKey(id), null);
}

/** Saves a design and its index entry (with an optional thumbnail). */
export function saveDesign(design, thumb) {
  const ok = writeJson(designKey(design.id), design);
  const index = listDesigns().filter((d) => d.id !== design.id);
  const previous = listDesigns().find((d) => d.id === design.id);
  index.push({
    id: design.id,
    title: design.title,
    width: design.width,
    height: design.height,
    pages: design.pages.length,
    updatedAt: design.updatedAt,
    thumb: thumb ?? previous?.thumb ?? null,
  });
  writeJson(INDEX_KEY, index);
  return ok;
}

/** Deletes a saved design. */
export function deleteDesign(id) {
  try {
    localStorage.removeItem(designKey(id));
  } catch {
    // Storage unavailable: nothing to delete.
  }
  writeJson(
    INDEX_KEY,
    listDesigns().filter((d) => d.id !== id),
  );
}

/** Observable editor store. */
export class Store {
  constructor(design) {
    this.design = design ?? createDesign({ width: 1080, height: 1080 });
    this.selection = [];
    this.activePageId = this.design.pages[0].id;
    this.zoom = 0.5;
    this.past = [];
    this.future = [];
    this.listeners = new Set();
    this.saved = true;
    this.clipboard = null;
  }

  /** Subscribes to changes; returns an unsubscribe function. */
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(reason) {
    for (const fn of this.listeners) fn(reason);
  }

  get activePage() {
    return this.page(this.activePageId) ?? this.design.pages[0];
  }

  page(id) {
    return this.design.pages.find((p) => p.id === id);
  }

  /** Finds an element and its page. */
  find(id) {
    for (const page of this.design.pages) {
      const el = page.elements.find((e) => e.id === id);
      if (el) return { el, page };
    }
    return null;
  }

  get selected() {
    return this.selection.map((id) => this.find(id)?.el).filter(Boolean);
  }

  /** Records the current design for undo before a change. */
  checkpoint() {
    this.past.push(JSON.stringify(this.design));
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }

  /** Applies a change. History is recorded unless `transient` is set. */
  update(fn, { transient = false, reason = "design" } = {}) {
    if (!transient) this.checkpoint();
    fn(this.design);
    this.touch();
    this.emit(reason);
  }

  touch() {
    this.design.updatedAt = Date.now();
    this.saved = false;
  }

  /** Updates props on the given elements. */
  patch(ids, props, opts) {
    this.update(() => {
      for (const id of ids) {
        const hit = this.find(id);
        if (hit)
          Object.assign(
            hit.el,
            typeof props === "function" ? props(hit.el) : props,
          );
      }
    }, opts);
  }

  select(ids, pageId) {
    this.selection = [...new Set(ids)];
    if (pageId) this.activePageId = pageId;
    else if (ids.length)
      this.activePageId = this.find(ids[0])?.page.id ?? this.activePageId;
    this.emit("selection");
  }

  setActivePage(id) {
    if (this.activePageId === id) return;
    this.activePageId = id;
    this.emit("selection");
  }

  setZoom(zoom) {
    this.zoom = Math.min(4, Math.max(0.1, zoom));
    this.emit("zoom");
  }

  undo() {
    if (!this.past.length) return;
    this.future.push(JSON.stringify(this.design));
    this.restore(this.past.pop());
  }

  redo() {
    if (!this.future.length) return;
    this.past.push(JSON.stringify(this.design));
    this.restore(this.future.pop());
  }

  restore(json) {
    this.design = JSON.parse(json);
    this.selection = this.selection.filter((id) => this.find(id));
    if (!this.page(this.activePageId))
      this.activePageId = this.design.pages[0].id;
    this.touch();
    this.emit("design");
  }

  /** Replaces the whole design (import / resize), keeping history. */
  replace(design) {
    this.checkpoint();
    this.design = clone(design);
    this.selection = [];
    this.activePageId = this.design.pages[0].id;
    this.touch();
    this.emit("design");
  }

  persist(thumb) {
    const ok = saveDesign(this.design, thumb);
    this.saved = ok;
    this.emit("saved");
    return ok;
  }
}

const NAV_KEY = "pixelpad:nav";

function rememberNav(search) {
  try {
    sessionStorage.setItem(NAV_KEY, search);
  } catch {
    // Storage unavailable: the query string alone has to do.
  }
}

/** True when home and editor share one document (the hosted build). */
export function isSinglePage() {
  return document.body.dataset.single === "1";
}

/**
 * Query parameters for the editor. Some hosts drop the query string when
 * navigating between pages, so the last requested one is also kept in
 * sessionStorage.
 */
export function editorParams() {
  let search = isSinglePage() ? "" : location.search;
  if (!search) {
    try {
      search = sessionStorage.getItem(NAV_KEY) ?? "";
    } catch {
      search = "";
    }
  }
  return new URLSearchParams(search);
}

/** Records the open design so a reload reopens it. */
export function rememberDesign(id) {
  rememberNav(`?id=${id}`);
  if (!isSinglePage()) history.replaceState(null, "", `editor.html?id=${id}`);
}

/** Opens the editor with the given query string, e.g. "?id=…". */
export function openEditor(search) {
  rememberNav(search);
  if (isSinglePage()) location.reload();
  else location.href = `editor.html${search}`;
}

/** Goes back to the home screen. */
export function openHome() {
  rememberNav("");
  if (isSinglePage()) location.reload();
  else location.href = "index.html";
}

/** Routes clicks on home and editor links through openHome/openEditor. */
export function trackEditorLinks() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest?.(
      'a[href^="editor.html"], a[href="index.html"]',
    );
    if (!link || e.defaultPrevented || e.button !== 0) return;
    e.preventDefault();
    if (link.getAttribute("href") === "index.html") openHome();
    else openEditor(new URL(link.href).search);
  });
}
