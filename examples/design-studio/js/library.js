// Original content library: illustrations, text presets and templates.
// Everything here is drawn in code for this project; no third-party assets.

import {
  createImage,
  createLine,
  createShape,
  createText,
  uid,
} from "./model.js";

const svgUri = (body, vb = "0 0 200 200") =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="${vb}">${body}</svg>`)}`;

/** Original vector illustrations, used as image elements. */
export const GRAPHICS = [
  {
    name: "Sunrise",
    src: svgUri(
      `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffbd59"/><stop offset="1" stop-color="#ff5757"/></linearGradient></defs><rect width="200" height="200" fill="#fff4e0"/><circle cx="100" cy="120" r="60" fill="url(#s)"/><rect y="130" width="200" height="70" fill="#5170ff"/><path d="M0 150q25-10 50 0t50 0 50 0 50 0M0 172q25-10 50 0t50 0 50 0 50 0" stroke="#fff" stroke-width="4" fill="none" opacity=".6"/>`,
    ),
  },
  {
    name: "Mountains",
    src: svgUri(
      `<rect width="200" height="200" fill="#d6f1ff"/><circle cx="150" cy="50" r="22" fill="#ffde59"/><path d="M0 170 60 70l40 60 30-40 70 80z" fill="#004aad"/><path d="m60 70 14 22-14-6-14 6z" fill="#fff"/><rect y="168" width="200" height="32" fill="#00bf63"/>`,
    ),
  },
  {
    name: "Leaf",
    src: svgUri(
      `<path d="M100 185C40 150 30 80 100 15c70 65 60 135 0 170z" fill="#00bf63"/><path d="M100 185V40M100 90l-25-20M100 120l28-24M100 150l-22-18" stroke="#03652f" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    name: "Blob",
    src: svgUri(
      `<path d="M150 40c30 30 35 80 5 115s-85 40-115 10S5 80 35 45s85-35 115-5z" fill="#cb6ce6"/>`,
    ),
  },
  {
    name: "Cloud",
    src: svgUri(
      `<path d="M55 150a35 35 0 0 1 0-70 50 50 0 0 1 95 10 30 30 0 0 1 0 60z" fill="#5ce1e6"/>`,
    ),
  },
  {
    name: "Sparkles",
    src: svgUri(
      `<path d="M80 20l12 40 40 12-40 12-12 40-12-40-40-12 40-12zM150 110l7 22 22 7-22 7-7 22-7-22-22-7 22-7z" fill="#ffbd59"/>`,
    ),
  },
  {
    name: "Confetti",
    src: svgUri(
      `<g stroke-width="8" stroke-linecap="round"><path d="M30 40l20 10" stroke="#ff5757"/><path d="M120 30l-6 20" stroke="#5170ff"/><path d="M160 80l20-6" stroke="#00bf63"/><path d="M50 140l-12 16" stroke="#ffbd59"/><path d="M100 170l20 6" stroke="#cb6ce6"/><path d="M90 90l10 10" stroke="#00c2cb"/></g><g><circle cx="70" cy="80" r="7" fill="#ff66c4"/><circle cx="150" cy="150" r="7" fill="#8c52ff"/><circle cx="170" cy="30" r="6" fill="#ff914d"/></g>`,
    ),
  },
  {
    name: "Plant",
    src: svgUri(
      `<path d="M70 130h60l-8 60H78z" fill="#ff914d"/><path d="M100 130c0-40-10-70-40-90 0 40 15 70 40 90zM100 130c0-50 15-80 45-95 5 45-15 80-45 95z" fill="#00bf63"/>`,
    ),
  },
  {
    name: "Rainbow",
    src: svgUri(
      `<g fill="none" stroke-width="16"><path d="M30 160a70 70 0 0 1 140 0" stroke="#ff5757"/><path d="M46 160a54 54 0 0 1 108 0" stroke="#ffbd59"/><path d="M62 160a38 38 0 0 1 76 0" stroke="#00bf63"/><path d="M78 160a22 22 0 0 1 44 0" stroke="#5170ff"/></g>`,
    ),
  },
  {
    name: "Waves",
    src: svgUri(
      `<rect width="200" height="200" fill="#004aad"/><path d="M0 60q25-20 50 0t50 0 50 0 50 0V200H0z" fill="#38b6ff"/><path d="M0 110q25-20 50 0t50 0 50 0 50 0V200H0z" fill="#5ce1e6"/><path d="M0 160q25-20 50 0t50 0 50 0 50 0V200H0z" fill="#fff" opacity=".85"/>`,
    ),
  },
  {
    name: "Gradient orb",
    src: svgUri(
      `<defs><radialGradient id="g" cx=".35" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ff66c4"/><stop offset="1" stop-color="#5e17eb"/></radialGradient></defs><circle cx="100" cy="100" r="90" fill="url(#g)"/>`,
    ),
  },
  {
    name: "Doodle arrow",
    src: svgUri(
      `<path d="M20 150C60 60 120 50 170 70M150 45l22 25-30 12" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  },
];

/** Emoji stickers, inserted as text so they stay crisp at any size. */
export const STICKERS = [
  "😀",
  "😍",
  "🎉",
  "🔥",
  "⭐",
  "💡",
  "❤️",
  "👍",
  "🌈",
  "🌸",
  "☕",
  "🚀",
];

/** Builds the "Add a heading / subheading / body" presets. */
export function textPreset(kind, design) {
  const s = Math.min(design.width, design.height) / 1080;
  const presets = {
    heading: {
      text: "Add a heading",
      fontFamily: "Montserrat",
      fontSize: 96 * s,
      bold: true,
      w: 900 * s,
    },
    subheading: {
      text: "Add a subheading",
      fontFamily: "Montserrat",
      fontSize: 56 * s,
      bold: true,
      w: 800 * s,
    },
    body: {
      text: "Add a little bit of body text",
      fontFamily: "Inter",
      fontSize: 32 * s,
      w: 700 * s,
    },
  };
  return createText(presets[kind]);
}

/** Multi-element font combinations from the Text panel. */
export const FONT_COMBOS = [
  {
    name: "Big sale",
    build: (s) => [
      createText({
        text: "SUMMER\nSALE",
        fontFamily: "Bebas Neue",
        fontSize: 200 * s,
        lineHeight: 0.95,
        color: "#ff3131",
        w: 700 * s,
      }),
      createText({
        text: "Up to 50% off everything",
        fontFamily: "Montserrat",
        fontSize: 40 * s,
        bold: true,
        y: 400 * s,
        w: 700 * s,
      }),
    ],
  },
  {
    name: "Elegant",
    build: (s) => [
      createText({
        text: "Save the date",
        fontFamily: "Pacifico",
        fontSize: 110 * s,
        color: "#5e17eb",
        w: 800 * s,
      }),
      createText({
        text: "JUNE 14 · THE OLD MILL",
        fontFamily: "Lora",
        fontSize: 36 * s,
        letterSpacing: 200,
        y: 260 * s,
        w: 800 * s,
      }),
    ],
  },
  {
    name: "Editorial",
    build: (s) => [
      createText({
        text: "The quiet issue",
        fontFamily: "Playfair Display",
        fontSize: 120 * s,
        italic: true,
        w: 800 * s,
        lineHeight: 1.05,
      }),
      createText({
        text: "Stories about slowing down",
        fontFamily: "Inter",
        fontSize: 34 * s,
        color: "#545454",
        y: 300 * s,
        w: 800 * s,
      }),
    ],
  },
  {
    name: "Handwritten",
    build: (s) => [
      createText({
        text: "you've got this!",
        fontFamily: "Caveat",
        fontSize: 140 * s,
        color: "#00bf63",
        w: 800 * s,
      }),
    ],
  },
];

/** Templates are written in fractions of the page so they fit any size. */
export const TEMPLATES = [
  {
    name: "Bold launch",
    build(W, H) {
      const s = Math.min(W, H) / 1080;
      return {
        background: { gradient: ["#8c52ff", "#5ce1e6"], angle: 135 },
        elements: [
          createShape("circle", {
            x: W * 0.62,
            y: -H * 0.1,
            w: W * 0.55,
            h: W * 0.55,
            fill: "#ffffff",
            opacity: 0.15,
          }),
          createText({
            text: "NEW\nCOLLECTION",
            fontFamily: "Archivo Black",
            fontSize: 112 * s,
            color: "#ffffff",
            align: "left",
            lineHeight: 1,
            x: W * 0.08,
            y: H * 0.3,
            w: W * 0.84,
          }),
          createText({
            text: "Available from Friday",
            fontFamily: "Inter",
            fontSize: 40 * s,
            color: "#ffffff",
            align: "left",
            x: W * 0.08,
            y: H * 0.62,
            w: W * 0.8,
          }),
          createShape("rounded", {
            x: W * 0.08,
            y: H * 0.76,
            w: 360 * s,
            h: 96 * s,
            fill: "#ffffff",
            radius: 48 * s,
          }),
          createText({
            text: "Shop now",
            fontFamily: "Montserrat",
            bold: true,
            fontSize: 38 * s,
            color: "#5e17eb",
            x: W * 0.08,
            y: H * 0.76 + 22 * s,
            w: 360 * s,
          }),
        ],
      };
    },
  },
  {
    name: "Minimal quote",
    build(W, H) {
      const s = Math.min(W, H) / 1080;
      return {
        background: { color: "#fff7ec" },
        elements: [
          createText({
            text: "“",
            fontFamily: "Playfair Display",
            fontSize: 300 * s,
            color: "#ff914d",
            x: W * 0.1,
            y: H * 0.12,
            w: W * 0.8,
          }),
          createText({
            text: "Simplicity is the ultimate sophistication.",
            fontFamily: "Playfair Display",
            italic: true,
            fontSize: 80 * s,
            lineHeight: 1.2,
            x: W * 0.1,
            y: H * 0.38,
            w: W * 0.8,
          }),
          createLine({
            x: W * 0.42,
            y: H * 0.72,
            w: W * 0.16,
            h: 20 * s,
            strokeWidth: 4 * s,
            stroke: "#ff914d",
          }),
          createText({
            text: "A FAVOURITE SAYING",
            fontFamily: "Inter",
            fontSize: 28 * s,
            letterSpacing: 250,
            color: "#545454",
            x: W * 0.1,
            y: H * 0.77,
            w: W * 0.8,
          }),
        ],
      };
    },
  },
  {
    name: "Event night",
    build(W, H) {
      const s = Math.min(W, H) / 1080;
      return {
        background: { color: "#0b0b2b" },
        elements: [
          createImage(GRAPHICS[6].src, {
            x: W * 0.05,
            y: H * 0.05,
            w: W * 0.9,
            h: W * 0.9,
            opacity: 0.55,
          }),
          createText({
            text: "Rooftop",
            fontFamily: "Pacifico",
            fontSize: 150 * s,
            color: "#ff66c4",
            x: W * 0.05,
            y: H * 0.3,
            w: W * 0.9,
          }),
          createText({
            text: "PARTY",
            fontFamily: "Bebas Neue",
            fontSize: 220 * s,
            color: "#ffffff",
            letterSpacing: 100,
            x: W * 0.05,
            y: H * 0.45,
            w: W * 0.9,
          }),
          createText({
            text: "SAT 9PM · BRING A FRIEND",
            fontFamily: "Space Grotesk",
            fontSize: 36 * s,
            color: "#5ce1e6",
            letterSpacing: 150,
            x: W * 0.05,
            y: H * 0.75,
            w: W * 0.9,
          }),
        ],
      };
    },
  },
  {
    name: "Nature notes",
    build(W, H) {
      const s = Math.min(W, H) / 1080;
      return {
        background: { color: "#e9f7ef" },
        elements: [
          createImage(GRAPHICS[1].src, {
            x: W * 0.1,
            y: H * 0.08,
            w: W * 0.8,
            h: H * 0.5,
          }),
          createText({
            text: "Weekend hike",
            fontFamily: "DM Serif Display",
            fontSize: 110 * s,
            color: "#03652f",
            x: W * 0.1,
            y: H * 0.63,
            w: W * 0.8,
          }),
          createText({
            text: "Meet at the trailhead at 8am. Pack water, snacks and good shoes.",
            fontFamily: "Inter",
            fontSize: 34 * s,
            color: "#2c4a37",
            x: W * 0.15,
            y: H * 0.78,
            w: W * 0.7,
          }),
        ],
      };
    },
  },
  {
    name: "Product card",
    build(W, H) {
      const s = Math.min(W, H) / 1080;
      return {
        background: { color: "#ffffff" },
        elements: [
          createShape("rect", {
            x: 0,
            y: 0,
            w: W,
            h: H * 0.55,
            fill: "#ffde59",
          }),
          createImage(GRAPHICS[7].src, {
            x: W * 0.3,
            y: H * 0.08,
            w: W * 0.4,
            h: W * 0.4,
          }),
          createShape("burst", {
            x: W * 0.72,
            y: H * 0.06,
            w: 220 * s,
            h: 220 * s,
            fill: "#ff3131",
          }),
          createText({
            text: "-30%",
            fontFamily: "Archivo Black",
            fontSize: 54 * s,
            color: "#ffffff",
            x: W * 0.72,
            y: H * 0.06 + 78 * s,
            w: 220 * s,
          }),
          createText({
            text: "Desk plant",
            fontFamily: "Poppins",
            bold: true,
            fontSize: 90 * s,
            x: W * 0.08,
            y: H * 0.62,
            w: W * 0.84,
            align: "left",
          }),
          createText({
            text: "Low maintenance. High happiness.",
            fontFamily: "Poppins",
            fontSize: 38 * s,
            color: "#545454",
            x: W * 0.08,
            y: H * 0.75,
            w: W * 0.84,
            align: "left",
          }),
        ],
      };
    },
  },
  {
    name: "Pitch title",
    build(W, H) {
      const s = Math.min(W, H) / 1080;
      return {
        background: { color: "#111111" },
        elements: [
          createShape("rect", {
            x: 0,
            y: H * 0.88,
            w: W,
            h: H * 0.12,
            fill: "#8c52ff",
          }),
          createText({
            text: "Quarterly review",
            fontFamily: "Space Grotesk",
            bold: true,
            fontSize: 120 * s,
            color: "#ffffff",
            align: "left",
            x: W * 0.08,
            y: H * 0.32,
            w: W * 0.84,
          }),
          createText({
            text: "Team update · Q3",
            fontFamily: "Inter",
            fontSize: 44 * s,
            color: "#a6a6a6",
            align: "left",
            x: W * 0.08,
            y: H * 0.52,
            w: W * 0.84,
          }),
        ],
      };
    },
  },
];

/** Builds a template page's contents with fresh ids. */
export function buildTemplate(template, design) {
  const page = template.build(design.width, design.height);
  page.elements = page.elements
    .filter(Boolean)
    .map((el) => ({ ...el, id: uid() }));
  return page;
}
