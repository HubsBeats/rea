// Home screen: design presets, custom size, recent designs and templates.

import { DESIGN_PRESETS, createDesign } from "./model.js";
import { TEMPLATES, buildTemplate } from "./library.js";
import { renderPage } from "./exporter.js";
import { contextMenu, h, openPopover, closePopover, toast } from "./popover.js";
import { deleteDesign, listDesigns, loadDesign, saveDesign } from "./store.js";

const $ = (sel) => document.querySelector(sel);
let query = "";

function presetIcon(p) {
  const ratio = p.height / p.width;
  const w = ratio > 1 ? 18 / ratio : 22;
  const hgt = ratio > 1 ? 18 : 22 * ratio;
  return `<svg viewBox="0 0 28 28" width="28" height="28"><rect x="${14 - w / 2}" y="${14 - hgt / 2}" width="${w}" height="${hgt}" rx="3" fill="none" stroke="#fff" stroke-width="2.2"/></svg>`;
}

function renderCategories() {
  $("#categories").replaceChildren(
    ...DESIGN_PRESETS.map((p) =>
      h(
        "a.category",
        {
          href: `editor.html?preset=${p.id}`,
          title: `${p.label} · ${p.width} × ${p.height}px`,
        },
        h("span.category-icon", {
          style: { background: p.color },
          html: presetIcon(p),
        }),
        h("span", {}, p.label),
      ),
    ),
  );
}

function renderRecent() {
  const designs = listDesigns().filter((d) =>
    d.title.toLowerCase().includes(query),
  );
  const grid = $("#recent-grid");
  if (!designs.length) {
    grid.replaceChildren(
      h(
        "p.muted",
        {},
        query
          ? "No designs match your search."
          : "Designs you create will show up here.",
      ),
    );
    return;
  }
  grid.replaceChildren(
    ...designs.map((d) => {
      const more = h(
        "button.card-more",
        { title: "More", "aria-label": `More actions for ${d.title}` },
        "•••",
      );
      more.addEventListener("click", (e) => {
        e.preventDefault();
        const r = more.getBoundingClientRect();
        contextMenu({ x: r.left, y: r.bottom }, [
          {
            label: "Open",
            run: () => (location.href = `editor.html?id=${d.id}`),
          },
          {
            label: "Rename",
            run: () => {
              const title = prompt("Rename design", d.title);
              const design = loadDesign(d.id);
              if (title && design) {
                design.title = title;
                saveDesign(design, d.thumb);
                renderRecent();
              }
            },
          },
          {
            label: "Delete",
            run: () => {
              deleteDesign(d.id);
              renderRecent();
              toast("Design deleted");
            },
          },
        ]);
      });
      return h(
        "a.design-card",
        { href: `editor.html?id=${d.id}` },
        h(
          "div.card-thumb",
          {},
          d.thumb
            ? h("img", { src: d.thumb, alt: "" })
            : h("span.thumb-placeholder", {}, "No preview yet"),
        ),
        h(
          "div.card-meta",
          {},
          h("strong", {}, d.title),
          h(
            "small",
            {},
            `${d.width} × ${d.height}px · ${new Date(d.updatedAt).toLocaleDateString()}`,
          ),
        ),
        more,
      );
    }),
  );
}

async function renderTemplates() {
  const grid = $("#template-grid");
  const preset = DESIGN_PRESETS[0];
  const sample = createDesign({ width: preset.width, height: preset.height });
  const matches = TEMPLATES.filter((t) => t.name.toLowerCase().includes(query));
  grid.replaceChildren(
    ...matches.map((t) => {
      const thumb = h("div.card-thumb");
      renderPage(sample, buildTemplate(t, sample), 280 / sample.width).then(
        (c) => thumb.append(c),
      );
      return h(
        "a.design-card",
        {
          href: `editor.html?preset=${preset.id}&template=${encodeURIComponent(t.name)}`,
        },
        thumb,
        h(
          "div.card-meta",
          {},
          h("strong", {}, t.name),
          h("small", {}, "Instagram post"),
        ),
      );
    }),
  );
}

function customSize(anchor) {
  const w = h("input", { value: 1200, "aria-label": "Width" });
  const hh = h("input", { value: 800, "aria-label": "Height" });
  const go = () => {
    const width = Math.round(Number(w.value));
    const height = Math.round(Number(hh.value));
    if (!(width >= 40 && height >= 40 && width <= 8000 && height <= 8000))
      return toast("Use a size between 40 and 8000px.");
    closePopover();
    location.href = `editor.html?w=${width}&h=${height}`;
  };
  openPopover(
    anchor,
    h(
      "div.panel-pop",
      {},
      h("h4", {}, "Custom size"),
      h(
        "div.grid-2",
        {},
        h("label.geo-field", {}, h("span", {}, "Width (px)"), w),
        h("label.geo-field", {}, h("span", {}, "Height (px)"), hh),
      ),
      h(
        "button.btn-primary.wide",
        { onclick: go, style: { marginTop: "12px" } },
        "Create new design",
      ),
    ),
  );
}

$("#custom-size").addEventListener("click", (e) => customSize(e.currentTarget));
$("#create-btn").addEventListener("click", (e) =>
  openPopover(
    e.currentTarget,
    h(
      "div.menu",
      {},
      DESIGN_PRESETS.map((p) =>
        h(
          "a.menu-item",
          { href: `editor.html?preset=${p.id}` },
          h("span", {}, p.label),
          h("small", {}, `${p.width} × ${p.height}`),
        ),
      ),
    ),
  ),
);
$("#hero-search").addEventListener("input", (e) => {
  query = e.target.value.toLowerCase();
  renderRecent();
  renderTemplates();
});

renderCategories();
renderRecent();
renderTemplates();
