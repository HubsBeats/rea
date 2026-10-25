// Rasterises pages to a 2D canvas for PNG/JPG download and thumbnails.

import { dashArray, lineHeadPath, linePath, shapePath } from "./shapes.js";

const imageCache = new Map();

function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return imageCache.get(src);
}

function paintBackground(ctx, bg, w, h) {
  if (bg?.gradient) {
    const a = (((bg.angle ?? 135) - 90) * Math.PI) / 180;
    const len = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const dx = (Math.cos(a) * len) / 2;
    const dy = (Math.sin(a) * len) / 2;
    const g = ctx.createLinearGradient(
      w / 2 - dx,
      h / 2 - dy,
      w / 2 + dx,
      h / 2 + dy,
    );
    g.addColorStop(0, bg.gradient[0]);
    g.addColorStop(1, bg.gradient[1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg?.color ?? "#ffffff";
  }
  ctx.fillRect(0, 0, w, h);
}

/** Wraps text into lines that fit the element width, like CSS pre-wrap. */
export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split("\n")) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const next = line + word;
      if (line && ctx.measureText(next.trimEnd()).width > maxWidth) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

const fontString = (el) =>
  `${el.italic ? "italic " : ""}${el.bold ? 700 : 400} ${el.fontSize}px "${el.fontFamily}", sans-serif`;

/** Makes sure web fonts used by a page are loaded before drawing text. */
async function loadFonts(page) {
  if (!document.fonts?.load) return;
  const texts = page.elements.filter((el) => el.type === "text");
  await Promise.all(
    texts.map((el) =>
      document.fonts.load(fontString(el), el.text).catch(() => null),
    ),
  );
}

function drawText(ctx, el) {
  ctx.font = fontString(el);
  ctx.fillStyle = el.color;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx)
    ctx.letterSpacing = `${(el.letterSpacing / 1000) * el.fontSize}px`;
  const text = el.uppercase ? el.text.toUpperCase() : el.text;
  const lineH = el.fontSize * el.lineHeight;
  const lines = wrapText(ctx, text, el.w + 0.5);
  lines.forEach((line, i) => {
    const width = ctx.measureText(line).width;
    let x = 0;
    if (el.align === "center") x = (el.w - width) / 2;
    else if (el.align === "right") x = el.w - width;
    const y = i * lineH + lineH / 2;
    ctx.fillText(line, x, y);
    if (el.underline)
      ctx.fillRect(
        x,
        y + el.fontSize * 0.45,
        width,
        Math.max(1, el.fontSize / 14),
      );
  });
}

async function drawImage(ctx, el) {
  const img = await loadImage(el.src);
  if (!img) return;
  const scale = Math.max(el.w / img.naturalWidth, el.h / img.naturalHeight);
  const sw = el.w / scale;
  const sh = el.h / scale;
  ctx.filter = `brightness(${el.brightness ?? 100}%) contrast(${el.contrast ?? 100}%) saturate(${el.saturation ?? 100}%) blur(${el.blur ?? 0}px)`;
  ctx.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    el.w,
    el.h,
  );
  ctx.filter = "none";
}

function drawVector(ctx, el) {
  if (el.type === "shape") {
    const path = new Path2D(shapePath(el));
    ctx.fillStyle = el.fill;
    ctx.fill(path);
    if (el.strokeWidth) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke(path);
    }
    return;
  }
  ctx.strokeStyle = el.stroke;
  ctx.lineWidth = el.strokeWidth;
  if (el.type === "line") {
    ctx.setLineDash(dashArray(el));
    ctx.lineCap = el.dash === "dotted" ? "round" : "butt";
    ctx.stroke(new Path2D(linePath(el)));
    ctx.setLineDash([]);
    const head = lineHeadPath(el);
    if (head) {
      ctx.fillStyle = el.stroke;
      ctx.fill(new Path2D(head));
    }
    return;
  }
  const path = new Path2D();
  path.addPath(
    new Path2D(el.d),
    new DOMMatrix().scale(el.w / el.ow, el.h / el.oh),
  );
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (el.highlighter) ctx.globalAlpha *= 0.45;
  ctx.stroke(path);
}

async function drawElement(ctx, el) {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  ctx.rotate((el.rotation * Math.PI) / 180);
  if (el.type !== "text") ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  ctx.translate(-el.w / 2, -el.h / 2);
  if (el.type === "text") drawText(ctx, el);
  else if (el.type === "image") await drawImage(ctx, el);
  else drawVector(ctx, el);
  ctx.restore();
}

/** Renders one page to a new canvas at the given scale. */
export async function renderPage(design, page, scale = 1) {
  await loadFonts(page);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(design.width * scale));
  canvas.height = Math.max(1, Math.round(design.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  paintBackground(ctx, page.background, design.width, design.height);
  for (const el of page.elements) await drawElement(ctx, el);
  return canvas;
}

/** Small JPEG thumbnail of the first page for the home screen. */
export async function thumbnail(design) {
  const scale = 320 / Math.max(design.width, design.height);
  const canvas = await renderPage(design, design.pages[0], scale);
  try {
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}

function slug(text) {
  return (
    (text || "design")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "design"
  );
}

/** Triggers a browser download of a blob or data URL. */
export function downloadUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
}

/** Downloads pages as PNG/JPG images, or the design as JSON. */
export async function exportDesign(
  design,
  { format = "png", pages, scale = 1 },
) {
  const name = slug(design.title);
  if (format === "json") {
    const blob = new Blob([JSON.stringify(design, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    downloadUrl(url, `${name}.pixelpad.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  for (const page of pages) {
    const index = design.pages.indexOf(page) + 1;
    const canvas = await renderPage(design, page, scale);
    const suffix =
      design.pages.length > 1
        ? `-${page.title ? slug(page.title) : index}`
        : "";
    downloadUrl(canvas.toDataURL(mime, 0.92), `${name}${suffix}.${format}`);
  }
}
