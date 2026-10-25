// Small original stroke icon set (24x24, currentColor).

const PATHS = {
  home: "M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10",
  design: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  elements:
    "M7 3l4 7H3zM17 7a4 4 0 1 1 0 .01M4 14h7v7H4zM17 14l4 3.5-4 3.5-4-3.5z",
  text: "M5 6V4h14v2M12 4v16M9 20h6",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  draw: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  layers: "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5 12 22l9-4.5",
  folder: "M3 6h6l2 2h10v11H3z",
  apps: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  redo: "m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3",
  cloud: "M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  share:
    "M16 8a3 3 0 1 0 0-.01M6 15a3 3 0 1 0 0-.01M16 22a3 3 0 1 0 0-.01M8.6 13.5l4.8-3M8.6 16.5l4.8 3",
  chevronUp: "m6 15 6-6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 6-6 6 6 6",
  chevronRight: "m9 6 6 6-6 6",
  copy: "M8 8h12v12H8zM4 16V4h12",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  plus: "M12 5v14M5 12h14",
  plusSquare: "M4 4h16v16H4zM12 8v8M8 12h8",
  minus: "M5 12h14",
  rotate: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  unlock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2",
  bold: "M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z",
  italic: "M10 4h8M6 20h8M14 4l-4 16",
  underline: "M7 4v7a5 5 0 0 0 10 0V4M5 20h14",
  uppercase:
    "M3 18 7 6l4 12M4.5 14h5M14 18V6h4a3 3 0 0 1 0 6h-4M18 12a3 3 0 0 1 0 6",
  alignLeft: "M4 6h16M4 10h10M4 14h16M4 18h10",
  alignCenter: "M4 6h16M7 10h10M4 14h16M7 18h10",
  alignRight: "M4 6h16M10 10h10M4 14h16M10 18h10",
  spacing: "M4 4v16M20 4v16M8 12h8M10 9l-2 3 2 3M14 9l2 3-2 3",
  flip: "M12 3v18M9 7 4 17h5zM15 7l5 10h-5z",
  adjust: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  transparency:
    "M4 4h4v4H4zM12 4h4v4h-4zM8 8h4v4H8zM16 8h4v4h-4zM4 12h4v4H4zM12 12h4v4h-4zM8 16h4v4H8zM16 16h4v4h-4z",
  position: "M4 4h10v10H4zM10 10h10v10H10z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  notes: "M5 3h10l4 4v14H5zM9 10h6M9 14h6M9 18h4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l5 5",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 6h16M4 12h16M4 18h16",
  resize: "M4 14v6h6M20 10V4h-6M4 20 20 4",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01",
  shapes: "M4 4h8v8H4zM16 12a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  play: "M7 4v16l13-8z",
  border: "M4 4h16v16H4z",
  check: "m5 12 5 5 9-10",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
};

/** Returns an inline SVG icon. */
export function icon(name, size = 20) {
  const d = PATHS[name] ?? PATHS.sparkle;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
