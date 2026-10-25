// Contextual toolbar above the canvas: shows controls for the selection.

import { FONTS, documentColors } from "./model.js";
import { icon } from "./icons.js";
import { closePopover, colorPicker, h, openPopover } from "./popover.js";

function btn(label, iconName, onClick, { active = false, text, title } = {}) {
  return h(
    "button.tb-btn",
    {
      title: title ?? label,
      "aria-label": label,
      "aria-pressed": active ? "true" : null,
      class: `tb-btn${active ? " active" : ""}`,
      onclick: onClick,
    },
    iconName ? h("span", { html: icon(iconName) }) : null,
    text ? h("span.tb-text", {}, text) : null,
  );
}

const divider = () => h("span.tb-divider");

/** Builds the contextual toolbar for the current selection. */
export class Toolbar {
  constructor(store, actions, root, hooks) {
    this.store = store;
    this.actions = actions;
    this.root = root;
    this.hooks = hooks;
  }

  ids() {
    return this.store.selected.map((e) => e.id);
  }

  set(props) {
    this.store.patch(this.ids(), props);
  }

  /** Range input that records a single undo step per drag. */
  slider(label, value, [min, max, step], apply) {
    let started = false;
    const out = h("output", {}, String(value));
    const input = h("input", {
      type: "range",
      min,
      max,
      step,
      value,
      "aria-label": label,
    });
    input.addEventListener("input", () => {
      if (!started) this.store.checkpoint();
      started = true;
      out.textContent = input.value;
      this.store.patch(this.ids(), apply(Number(input.value)), {
        transient: true,
      });
    });
    input.addEventListener("change", () => (started = false));
    return h("label.slider-row", {}, h("span", {}, label), input, out);
  }

  colorButton(label, value, apply, { textStyle = false, gradient } = {}) {
    const face = textStyle
      ? h(
          "span.color-a",
          {},
          "A",
          h("span.color-bar", { style: { background: value } }),
        )
      : h("span.color-chip", { style: { background: value } });
    const button = h(
      "button.tb-btn",
      { title: label, "aria-label": label },
      face,
    );
    button.addEventListener("click", () =>
      openPopover(
        button,
        colorPicker({
          value,
          documentColors: documentColors(this.store.design),
          onPick: apply,
          onGradient: gradient,
        }),
      ),
    );
    return button;
  }

  render() {
    const sel = this.store.selected;
    const types = new Set(sel.map((e) => e.type));
    const type = types.size === 1 ? [...types][0] : null;
    const left = [];
    if (!sel.length) left.push(...this.pageControls());
    else if (type === "text") left.push(...this.textControls(sel[0]));
    else if (type === "shape") left.push(...this.shapeControls(sel[0]));
    else if (type === "line" || type === "path")
      left.push(...this.strokeControls(sel[0], type));
    else if (type === "image") left.push(...this.imageControls(sel[0]));
    const right = sel.length ? this.commonControls(sel) : [];
    this.root.replaceChildren(
      h("div.tb-group", {}, left),
      h("div.tb-spacer"),
      h("div.tb-group", {}, right),
    );
  }

  pageControls() {
    const page = this.store.activePage;
    const bg = page.background;
    const value = bg.color ?? bg.gradient?.[0] ?? "#ffffff";
    const setBg = (background) =>
      this.store.update(() => (this.store.activePage.background = background));
    const chip = this.colorButton(
      "Background color",
      value,
      (c) => setBg({ color: c }),
      { gradient: (g) => setBg({ gradient: g, angle: 135 }) },
    );
    if (bg.gradient)
      chip.querySelector(".color-chip").style.background =
        `linear-gradient(135deg, ${bg.gradient[0]}, ${bg.gradient[1]})`;
    return [
      chip,
      h("span.tb-hint", {}, "Background"),
      divider(),
      h(
        "span.tb-hint",
        {},
        "Select an element to edit it, or add one from the side panel.",
      ),
    ];
  }

  textControls(el) {
    const fontBtn = h(
      "button.tb-btn.font-btn",
      { title: "Font", style: { fontFamily: `"${el.fontFamily}"` } },
      el.fontFamily,
      h("span", { html: icon("chevronDown", 16) }),
    );
    fontBtn.addEventListener("click", () =>
      openPopover(fontBtn, this.fontList(el.fontFamily)),
    );
    const size = h("input.size-input", {
      value: Math.round(el.fontSize * 10) / 10,
      "aria-label": "Font size",
    });
    size.addEventListener("change", () => {
      const v = Number(size.value);
      if (v > 0) this.set({ fontSize: v });
    });
    const step = (d) => () =>
      this.store.patch(this.ids(), (e) => ({
        fontSize: Math.max(1, Math.round(e.fontSize + d)),
      }));
    const aligns = ["left", "center", "right"];
    const nextAlign = aligns[(aligns.indexOf(el.align) + 1) % 3];
    return [
      fontBtn,
      h(
        "div.size-control",
        {},
        btn("Decrease font size", "minus", step(-1)),
        size,
        btn("Increase font size", "plus", step(1)),
      ),
      this.colorButton("Text color", el.color, (c) => this.set({ color: c }), {
        textStyle: true,
      }),
      btn("Bold", "bold", () => this.actions.toggleText("bold"), {
        active: el.bold,
      }),
      btn("Italic", "italic", () => this.actions.toggleText("italic"), {
        active: el.italic,
      }),
      btn(
        "Underline",
        "underline",
        () => this.actions.toggleText("underline"),
        { active: el.underline },
      ),
      btn(
        "Uppercase",
        "uppercase",
        () => this.actions.toggleText("uppercase"),
        { active: el.uppercase },
      ),
      btn(
        `Align ${el.align}`,
        `align${el.align[0].toUpperCase()}${el.align.slice(1)}`,
        () => this.set({ align: nextAlign }),
      ),
      this.popoverButton("Spacing", "spacing", () =>
        h(
          "div.panel-pop",
          {},
          this.slider(
            "Letter spacing",
            el.letterSpacing,
            [-200, 800, 10],
            (v) => ({ letterSpacing: v }),
          ),
          this.slider("Line spacing", el.lineHeight, [0.5, 2.5, 0.05], (v) => ({
            lineHeight: v,
          })),
        ),
      ),
    ];
  }

  fontList(currentFont) {
    const search = h("input.search", {
      placeholder: "Search fonts",
      "aria-label": "Search fonts",
    });
    const list = h("div.font-list");
    const fill = () => {
      const q = search.value.toLowerCase();
      list.replaceChildren(
        ...FONTS.filter((f) => f.toLowerCase().includes(q)).map((f) =>
          h(
            "button.font-item",
            {
              class: `font-item${f === currentFont ? " active" : ""}`,
              style: { fontFamily: `"${f}"` },
              onclick: () => (this.set({ fontFamily: f }), closePopover()),
            },
            f,
          ),
        ),
      );
    };
    search.addEventListener("input", fill);
    fill();
    setTimeout(() => search.focus(), 0);
    return h("div.font-pop", {}, search, list);
  }

  popoverButton(label, iconName, build, text) {
    const button = btn(label, iconName, () => openPopover(button, build()), {
      text,
    });
    return button;
  }

  flipButton() {
    return this.popoverButton(
      "Flip",
      "flip",
      () =>
        h(
          "div.menu",
          {},
          h(
            "button.menu-item",
            {
              onclick: () =>
                this.store.patch(this.ids(), (e) => ({ flipX: !e.flipX })),
            },
            "Flip horizontal",
          ),
          h(
            "button.menu-item",
            {
              onclick: () =>
                this.store.patch(this.ids(), (e) => ({ flipY: !e.flipY })),
            },
            "Flip vertical",
          ),
        ),
      "Flip",
    );
  }

  shapeControls(el) {
    const radius = el.shape === "rect" || el.shape === "rounded";
    return [
      this.colorButton("Fill color", el.fill, (c) => this.set({ fill: c })),
      this.popoverButton("Border", "border", () =>
        h(
          "div.panel-pop",
          {},
          this.slider("Border weight", el.strokeWidth, [0, 60, 1], (v) => ({
            strokeWidth: v,
          })),
          radius
            ? this.slider(
                "Corner rounding",
                Math.round(el.radius ?? 0),
                [0, Math.round(Math.min(el.w, el.h) / 2), 1],
                (v) => ({ radius: v }),
              )
            : null,
          h("h4", {}, "Border color"),
          colorPicker({
            value: el.stroke,
            onPick: (c) =>
              this.set({ stroke: c, strokeWidth: el.strokeWidth || 4 }),
          }),
        ),
      ),
      this.flipButton(),
    ];
  }

  strokeControls(el, type) {
    const controls = [
      this.colorButton("Line color", el.stroke, (c) => this.set({ stroke: c })),
      this.popoverButton("Line weight", "minus", () =>
        h(
          "div.panel-pop",
          {},
          this.slider("Weight", el.strokeWidth, [1, 80, 1], (v) => ({
            strokeWidth: v,
          })),
        ),
      ),
    ];
    if (type === "line") {
      const styles = ["solid", "dashed", "dotted"];
      const next = styles[(styles.indexOf(el.dash) + 1) % 3];
      controls.push(
        btn("Line style", null, () => this.set({ dash: next }), {
          text: el.dash,
        }),
      );
      controls.push(
        btn(
          "Arrow end",
          "chevronRight",
          () => this.set({ arrowEnd: !el.arrowEnd }),
          { active: el.arrowEnd, text: "Arrow" },
        ),
      );
    } else {
      controls.push(this.flipButton());
    }
    return controls;
  }

  imageControls(el) {
    return [
      this.popoverButton(
        "Adjust",
        "adjust",
        () =>
          h(
            "div.panel-pop",
            {},
            this.slider("Brightness", el.brightness, [0, 200, 1], (v) => ({
              brightness: v,
            })),
            this.slider("Contrast", el.contrast, [0, 200, 1], (v) => ({
              contrast: v,
            })),
            this.slider("Saturation", el.saturation, [0, 200, 1], (v) => ({
              saturation: v,
            })),
            this.slider("Blur", el.blur, [0, 30, 1], (v) => ({ blur: v })),
            h(
              "button.btn-secondary",
              {
                onclick: () => (
                  this.set({
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    blur: 0,
                  }),
                  closePopover()
                ),
              },
              "Reset adjustments",
            ),
          ),
        "Adjust",
      ),
      this.flipButton(),
      btn(
        "Set as background",
        "image",
        () => this.hooks.imageToBackground(el),
        { text: "Fill page" },
      ),
    ];
  }

  commonControls(sel) {
    const el = sel[0];
    const locked = sel.every((e) => e.locked);
    return [
      this.popoverButton(
        "Position",
        "position",
        () => this.positionPanel(sel),
        "Position",
      ),
      this.popoverButton("Transparency", "transparency", () =>
        h(
          "div.panel-pop",
          {},
          this.slider(
            "Transparency",
            Math.round(el.opacity * 100),
            [0, 100, 1],
            (v) => ({ opacity: v / 100 }),
          ),
        ),
      ),
      btn(
        locked ? "Unlock" : "Lock",
        locked ? "lock" : "unlock",
        () => this.actions.toggleLock(),
        { active: locked },
      ),
      btn("Duplicate", "copy", () => this.actions.duplicate()),
      btn("Delete", "trash", () => this.actions.remove()),
    ];
  }

  positionPanel(sel) {
    const a = this.actions;
    const arrange = (label, dir) =>
      h("button.menu-item", { onclick: () => a.arrange(dir) }, label);
    const align = (label, edge, iconName) =>
      h(
        "button.align-btn",
        { title: label, onclick: () => a.align(edge) },
        h("span", { html: icon(iconName, 18) }),
        label,
      );
    const children = [
      h("h4", {}, "Arrange"),
      h(
        "div.grid-2",
        {},
        arrange("Forward", "forward"),
        arrange("Backward", "backward"),
        arrange("To front", "front"),
        arrange("To back", "back"),
      ),
      h("h4", {}, sel.length > 1 ? "Align elements" : "Align to page"),
      h(
        "div.grid-2",
        {},
        align("Top", "top", "chevronUp"),
        align("Left", "left", "chevronLeft"),
        align("Middle", "middle", "minus"),
        align("Centre", "center", "alignCenter"),
        align("Bottom", "bottom", "chevronDown"),
        align("Right", "right", "chevronRight"),
      ),
    ];
    if (sel.length === 1)
      children.push(h("h4", {}, "Advanced"), this.geometryInputs(sel[0]));
    return h("div.panel-pop.position-pop", {}, children);
  }

  geometryInputs(el) {
    const field = (label, key) => {
      const input = h("input", {
        value: Math.round(el[key]),
        "aria-label": label,
      });
      input.addEventListener("change", () => {
        const v = Number(input.value);
        if (Number.isFinite(v))
          this.set({ [key]: key === "w" || key === "h" ? Math.max(1, v) : v });
      });
      return h("label.geo-field", {}, h("span", {}, label), input);
    };
    return h(
      "div.grid-2",
      {},
      field("Width", "w"),
      field("Height", "h"),
      field("X", "x"),
      field("Y", "y"),
      field("Rotate", "rotation"),
    );
  }
}
