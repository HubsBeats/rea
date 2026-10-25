// Shape geometry shared by the DOM renderer (SVG) and the PNG exporter
// (Path2D accepts the same SVG path strings).

const r = (n) => Math.round(n * 100) / 100;

function polygon(points) {
  return `M${points.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L")} Z`;
}

function regular(w, h, sides, rotation = -Math.PI / 2) {
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i * 2 * Math.PI) / sides;
    points.push([w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)]);
  }
  return polygon(points);
}

function star(w, h, spikes = 5, inner = 0.45) {
  const points = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const k = i % 2 === 0 ? 1 : inner;
    points.push([
      w / 2 + (w / 2) * k * Math.cos(a),
      h / 2 + (h / 2) * k * Math.sin(a),
    ]);
  }
  return polygon(points);
}

function roundedRect(w, h, radius) {
  const rad = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (rad === 0) return `M0 0 H${r(w)} V${r(h)} H0 Z`;
  return [
    `M${r(rad)} 0 H${r(w - rad)}`,
    `A${r(rad)} ${r(rad)} 0 0 1 ${r(w)} ${r(rad)} V${r(h - rad)}`,
    `A${r(rad)} ${r(rad)} 0 0 1 ${r(w - rad)} ${r(h)} H${r(rad)}`,
    `A${r(rad)} ${r(rad)} 0 0 1 0 ${r(h - rad)} V${r(rad)}`,
    `A${r(rad)} ${r(rad)} 0 0 1 ${r(rad)} 0 Z`,
  ].join(" ");
}

function ellipse(w, h) {
  const rx = w / 2;
  const ry = h / 2;
  return `M0 ${r(ry)} A${r(rx)} ${r(ry)} 0 1 0 ${r(w)} ${r(ry)} A${r(rx)} ${r(ry)} 0 1 0 0 ${r(ry)} Z`;
}

function heart(w, h) {
  const p = (x, y) => `${r(x * w)} ${r(y * h)}`;
  return [
    `M${p(0.5, 0.95)}`,
    `C${p(0.15, 0.7)} ${p(0, 0.5)} ${p(0, 0.3)}`,
    `C${p(0, 0.12)} ${p(0.14, 0)} ${p(0.28, 0)}`,
    `C${p(0.38, 0)} ${p(0.46, 0.06)} ${p(0.5, 0.16)}`,
    `C${p(0.54, 0.06)} ${p(0.62, 0)} ${p(0.72, 0)}`,
    `C${p(0.86, 0)} ${p(1, 0.12)} ${p(1, 0.3)}`,
    `C${p(1, 0.5)} ${p(0.85, 0.7)} ${p(0.5, 0.95)} Z`,
  ].join(" ");
}

function arrow(w, h) {
  const head = Math.min(w * 0.4, h);
  return polygon([
    [0, h * 0.3],
    [w - head, h * 0.3],
    [w - head, 0],
    [w, h / 2],
    [w - head, h],
    [w - head, h * 0.7],
    [0, h * 0.7],
  ]);
}

function bubble(w, h) {
  const body = h * 0.8;
  const rad = Math.min(w, body) * 0.18;
  return [
    `M${r(rad)} 0 H${r(w - rad)} Q${r(w)} 0 ${r(w)} ${r(rad)}`,
    `V${r(body - rad)} Q${r(w)} ${r(body)} ${r(w - rad)} ${r(body)}`,
    `H${r(w * 0.4)} L${r(w * 0.2)} ${r(h)} L${r(w * 0.24)} ${r(body)}`,
    `H${r(rad)} Q0 ${r(body)} 0 ${r(body - rad)} V${r(rad)} Q0 0 ${r(rad)} 0 Z`,
  ].join(" ");
}

function cross(w, h) {
  const t = 0.32;
  return polygon([
    [w * t, 0],
    [w * (1 - t), 0],
    [w * (1 - t), h * t],
    [w, h * t],
    [w, h * (1 - t)],
    [w * (1 - t), h * (1 - t)],
    [w * (1 - t), h],
    [w * t, h],
    [w * t, h * (1 - t)],
    [0, h * (1 - t)],
    [0, h * t],
    [w * t, h * t],
  ]);
}

const GENERATORS = {
  rect: (w, h, el) => roundedRect(w, h, el.radius ?? 0),
  rounded: (w, h, el) => roundedRect(w, h, el.radius ?? Math.min(w, h) * 0.2),
  circle: (w, h) => ellipse(w, h),
  triangle: (w, h) =>
    polygon([
      [w / 2, 0],
      [w, h],
      [0, h],
    ]),
  rightTriangle: (w, h) =>
    polygon([
      [0, 0],
      [w, h],
      [0, h],
    ]),
  diamond: (w, h) =>
    polygon([
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
      [0, h / 2],
    ]),
  pentagon: (w, h) => regular(w, h, 5),
  hexagon: (w, h) => regular(w, h, 6, 0),
  octagon: (w, h) => regular(w, h, 8, Math.PI / 8),
  star: (w, h) => star(w, h),
  burst: (w, h) => star(w, h, 12, 0.72),
  heart,
  arrow,
  bubble,
  cross,
};

/** Shape kinds shown in the Elements panel, in display order. */
export const SHAPE_KINDS = Object.keys(GENERATORS);

/** Returns the SVG path for a shape element in its own 0..w, 0..h box. */
export function shapePath(el) {
  const gen = GENERATORS[el.shape] ?? GENERATORS.rect;
  return gen(el.w, el.h, el);
}

/** Returns the SVG path for a line element, centred vertically in its box. */
export function linePath(el) {
  const y = r(el.h / 2);
  const end = el.arrowEnd ? el.w - el.strokeWidth * 2 : el.w;
  return `M0 ${y} H${r(end)}`;
}

/** Returns the arrow-head polygon for a line element, or null. */
export function lineHeadPath(el) {
  if (!el.arrowEnd) return null;
  const s = el.strokeWidth * 3;
  const y = el.h / 2;
  return polygon([
    [el.w - s, y - s],
    [el.w, y],
    [el.w - s, y + s],
  ]);
}

/** Dash pattern for a line style, scaled by stroke width. */
export function dashArray(el) {
  if (el.dash === "dashed") return [el.strokeWidth * 3, el.strokeWidth * 2];
  if (el.dash === "dotted") return [0.1, el.strokeWidth * 2];
  return [];
}
