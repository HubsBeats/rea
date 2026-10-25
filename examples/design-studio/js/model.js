// Document model: design sizes, element factories and shared constants.

/** Returns a short random id. */
export function uid(prefix = "el") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Preset design sizes offered on the home page and in Resize. */
export const DESIGN_PRESETS = [
  {
    id: "instagram",
    label: "Instagram post",
    width: 1080,
    height: 1080,
    color: "#e1306c",
    group: "Social media",
  },
  {
    id: "story",
    label: "Story",
    width: 1080,
    height: 1920,
    color: "#8b3dff",
    group: "Social media",
  },
  {
    id: "presentation",
    label: "Presentation",
    width: 1920,
    height: 1080,
    color: "#ff7a1a",
    group: "Presentations",
  },
  {
    id: "poster",
    label: "Poster",
    width: 1587,
    height: 2245,
    color: "#00a3a3",
    group: "Print",
  },
  {
    id: "a4",
    label: "A4 document",
    width: 1240,
    height: 1754,
    color: "#2f6fed",
    group: "Docs",
  },
  {
    id: "youtube",
    label: "YouTube thumbnail",
    width: 1280,
    height: 720,
    color: "#ff3b3b",
    group: "Video",
  },
  {
    id: "logo",
    label: "Logo",
    width: 500,
    height: 500,
    color: "#14b866",
    group: "Marketing",
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    width: 2400,
    height: 1600,
    color: "#f5b400",
    group: "Whiteboards",
  },
];

/** Fonts loaded from Google Fonts (all SIL Open Font License). */
export const FONTS = [
  "Inter",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Lora",
  "Oswald",
  "Bebas Neue",
  "Pacifico",
  "Caveat",
  "Space Grotesk",
  "DM Serif Display",
  "Archivo Black",
  "Roboto Mono",
  "Abril Fatface",
];

/** Default swatches for the color picker. */
export const PALETTE = [
  "#000000",
  "#545454",
  "#737373",
  "#a6a6a6",
  "#d9d9d9",
  "#ffffff",
  "#ff3131",
  "#ff5757",
  "#ff66c4",
  "#cb6ce6",
  "#8c52ff",
  "#5e17eb",
  "#03989e",
  "#00c2cb",
  "#5ce1e6",
  "#38b6ff",
  "#5170ff",
  "#004aad",
  "#00bf63",
  "#7ed957",
  "#c1ff72",
  "#ffde59",
  "#ffbd59",
  "#ff914d",
];

/** Background gradients offered for pages. */
export const GRADIENTS = [
  ["#8c52ff", "#5ce1e6"],
  ["#ff66c4", "#ffde59"],
  ["#004aad", "#cb6ce6"],
  ["#00bf63", "#0cc0df"],
  ["#ff3131", "#ff914d"],
  ["#000000", "#737373"],
];

const BASE = {
  rotation: 0,
  opacity: 1,
  locked: false,
  flipX: false,
  flipY: false,
};

/** Creates a text element. */
export function createText(props = {}) {
  return {
    ...BASE,
    id: uid(),
    type: "text",
    x: 100,
    y: 100,
    w: 600,
    h: 60,
    text: "Add a little bit of body text",
    fontFamily: "Inter",
    fontSize: 32,
    color: "#000000",
    bold: false,
    italic: false,
    underline: false,
    uppercase: false,
    align: "center",
    letterSpacing: 0,
    lineHeight: 1.4,
    ...props,
  };
}

/** Creates a shape element. */
export function createShape(shape, props = {}) {
  return {
    ...BASE,
    id: uid(),
    type: "shape",
    shape,
    x: 100,
    y: 100,
    w: 300,
    h: shape === "arrow" ? 160 : 300,
    fill: "#c1c1c1",
    stroke: "#000000",
    strokeWidth: 0,
    ...props,
  };
}

/** Creates a line element. */
export function createLine(props = {}) {
  return {
    ...BASE,
    id: uid(),
    type: "line",
    x: 100,
    y: 100,
    w: 400,
    h: 24,
    stroke: "#000000",
    strokeWidth: 6,
    dash: "solid",
    arrowEnd: false,
    ...props,
  };
}

/** Creates an image element. */
export function createImage(src, props = {}) {
  return {
    ...BASE,
    id: uid(),
    type: "image",
    src,
    x: 100,
    y: 100,
    w: 400,
    h: 400,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    ...props,
  };
}

/** Creates a freehand drawing element from page-space points. */
export function createPath(points, props = {}) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = (props.strokeWidth ?? 8) / 2;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(Math.max(...xs) + pad - minX, 1);
  const h = Math.max(Math.max(...ys) + pad - minY, 1);
  const d = points
    .map(
      ([x, y], i) =>
        `${i === 0 ? "M" : "L"}${Math.round((x - minX) * 10) / 10} ${Math.round((y - minY) * 10) / 10}`,
    )
    .join(" ");
  return {
    ...BASE,
    id: uid(),
    type: "path",
    d,
    ow: w,
    oh: h,
    x: minX,
    y: minY,
    w,
    h,
    stroke: "#000000",
    strokeWidth: 8,
    ...props,
  };
}

/** Creates an empty page. */
export function createPage(props = {}) {
  return {
    id: uid("page"),
    title: "",
    background: { color: "#ffffff" },
    notes: "",
    elements: [],
    ...props,
  };
}

/** Creates an empty design. */
export function createDesign({ width, height, title = "Untitled design" }) {
  return {
    id: uid("design"),
    title,
    width,
    height,
    pages: [createPage()],
    updatedAt: Date.now(),
  };
}

/** Returns a deep copy of a JSON-compatible value. */
export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** CSS value for a page background. */
export function backgroundCss(bg) {
  if (bg?.gradient) {
    return `linear-gradient(${bg.angle ?? 135}deg, ${bg.gradient[0]}, ${bg.gradient[1]})`;
  }
  return bg?.color ?? "#ffffff";
}

/** Collects every color used in a design, for "Document colors". */
export function documentColors(design) {
  const set = new Set();
  for (const page of design.pages) {
    if (page.background.color) set.add(page.background.color);
    for (const g of page.background.gradient ?? []) set.add(g);
    for (const el of page.elements) {
      for (const key of ["color", "fill", "stroke"]) {
        if (typeof el[key] === "string" && el[key].startsWith("#"))
          set.add(el[key].toLowerCase());
      }
    }
  }
  return [...set].slice(0, 18);
}
