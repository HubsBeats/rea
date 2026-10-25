// End-to-end smoke test for the Pixelpad editor.
// Usage: node examples/design-studio/tests/smoke.mjs [--shots DIR]
// Serves the app on a local port, drives it with Playwright's Chromium and
// checks the main editing flows.

import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shotsArg = process.argv.indexOf("--shots");
const shots = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  const path = normalize(
    decodeURIComponent(new URL(req.url, "http://x").pathname),
  ).replace(/^([/\\])+/, "");
  try {
    const body = await readFile(join(root, path || "index.html"));
    res.writeHead(200, {
      "content-type": TYPES[extname(path)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on(
  "console",
  (m) =>
    m.type() === "error" &&
    !m.text().includes("fonts.g") &&
    errors.push(m.text()),
);

const state = () =>
  page.evaluate(() => JSON.parse(JSON.stringify(window.pixelpad.store.design)));
const selection = () => page.evaluate(() => window.pixelpad.store.selection);
const shot = async (name) =>
  shots && page.screenshot({ path: join(shots, `${name}.png`) });
const box = (sel) => page.locator(sel).first().boundingBox();
const steps = [];
async function step(name, fn) {
  await fn();
  steps.push(name);
  console.log(`ok - ${name}`);
}

if (shots) await mkdir(shots, { recursive: true });

try {
  await step("home page lists presets and templates", async () => {
    await page.goto(`${base}/index.html`);
    assert.equal(await page.locator(".category").count(), 8);
    await page.waitForSelector("#template-grid .design-card");
    await shot("01-home");
  });

  await step("creating a design opens the editor", async () => {
    await page.click(".category >> nth=0");
    await page.waitForSelector(".page-frame");
    const d = await state();
    assert.equal(d.width, 1080);
    assert.equal(d.pages.length, 1);
  });

  await step("text panel adds a heading", async () => {
    await page.click("[data-tab=text]");
    await page.click(".text-preset.heading");
    const d = await state();
    assert.equal(d.pages[0].elements[0].type, "text");
    assert.equal((await selection()).length, 1);
    assert.ok(await page.locator(".font-btn").isVisible());
    await shot("02-text-selected");
  });

  await step("drag moves the element and snaps to the centre", async () => {
    const before = (await state()).pages[0].elements[0];
    const b = await box(".el[data-type=text]");
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 4, b.y + b.height / 2 + 120, {
      steps: 8,
    });
    assert.ok(
      await page.locator(".guide").count(),
      "smart guide visible while dragging",
    );
    await shot("03-dragging");
    await page.mouse.up();
    const after = (await state()).pages[0].elements[0];
    assert.equal(after.x, before.x, "snapped back to horizontal centre");
    assert.ok(after.y > before.y + 100);
  });

  await step("undo and redo", async () => {
    const moved = (await state()).pages[0].elements[0].y;
    await page.keyboard.press("Control+z");
    assert.notEqual((await state()).pages[0].elements[0].y, moved);
    await page.keyboard.press("Control+Shift+z");
    assert.equal((await state()).pages[0].elements[0].y, moved);
  });

  await step("corner resize scales text", async () => {
    const before = (await state()).pages[0].elements[0];
    const hb = await box(".handle-se");
    await page.mouse.move(hb.x + 7, hb.y + 7);
    await page.mouse.down();
    await page.mouse.move(hb.x + 80, hb.y + 40, { steps: 5 });
    await page.mouse.up();
    const after = (await state()).pages[0].elements[0];
    assert.ok(after.fontSize > before.fontSize);
    assert.ok(after.w > before.w);
  });

  await step("toolbar bold, color and font", async () => {
    await page.click("button[aria-label=Bold]");
    assert.equal((await state()).pages[0].elements[0].bold, false);
    await page.click("button[aria-label='Text color']");
    await page.click(".popover .swatch[title='#ff3131']");
    assert.equal((await state()).pages[0].elements[0].color, "#ff3131");
    await page.click(".font-btn");
    await page.fill(".font-pop .search", "pacif");
    await page.click(".font-item");
    assert.equal((await state()).pages[0].elements[0].fontFamily, "Pacifico");
  });

  await step("in-place text editing", async () => {
    const b = await box(".el[data-type=text]");
    await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
    await page.keyboard.type("Hello Pixelpad");
    await page.mouse.click(
      b.x + b.width / 2,
      b.y - 60 > 120 ? b.y - 60 : b.y + b.height + 40,
    );
    assert.equal((await state()).pages[0].elements[0].text, "Hello Pixelpad");
  });

  await step("keyboard shortcuts add and rotate shapes", async () => {
    await page.keyboard.press("Escape");
    await page.keyboard.press("r");
    let d = await state();
    assert.equal(d.pages[0].elements.at(-1).shape, "rect");
    const rb = await box(".handle-rotate");
    await page.mouse.move(rb.x + 14, rb.y + 14);
    await page.mouse.down();
    const center = await box(".sel-box");
    await page.mouse.move(
      center.x + center.width + 150,
      center.y + center.height / 2,
      { steps: 6 },
    );
    await page.mouse.up();
    d = await state();
    assert.ok(d.pages[0].elements.at(-1).rotation !== 0);
    await shot("04-rotated-shape");
  });

  await step("elements panel shape fill and position", async () => {
    await page.click("[data-tab=elements]");
    await page.click(".tile[title=star]");
    await page.click("button[aria-label='Fill color']");
    await page.click(".popover .swatch[title='#ffde59']");
    assert.equal((await state()).pages[0].elements.at(-1).fill, "#ffde59");
    await page.click("button[aria-label=Position]");
    await page.click(".popover .align-btn[title=Left]");
    assert.equal((await state()).pages[0].elements.at(-1).x, 0);
    await page.keyboard.press("Escape");
  });

  await step("duplicate, delete and select all", async () => {
    await page.click(".el[data-type=shape] >> nth=-1", { force: true });
    const count = (await state()).pages[0].elements.length;
    await page.keyboard.press("Control+d");
    assert.equal((await state()).pages[0].elements.length, count + 1);
    await page.keyboard.press("Delete");
    assert.equal((await state()).pages[0].elements.length, count);
    await page.keyboard.press("Control+a");
    assert.equal((await selection()).length, count);
    await page.keyboard.press("Escape");
  });

  await step("marquee selection", async () => {
    const f = await box(".page-frame");
    await page.mouse.move(f.x + 2, f.y + 2);
    await page.mouse.down();
    await page.mouse.move(f.x + f.width - 2, f.y + f.height - 2, { steps: 5 });
    await page.mouse.up();
    assert.ok((await selection()).length >= 2);
    await page.keyboard.press("Escape");
  });

  await step("draw tool creates a path", async () => {
    await page.click("[data-tab=draw]");
    const f = await box(".page-frame");
    await page.mouse.move(f.x + 60, f.y + f.height - 80);
    await page.mouse.down();
    for (let i = 0; i < 10; i += 1)
      await page.mouse.move(
        f.x + 60 + i * 20,
        f.y + f.height - 80 - (i % 2) * 30,
      );
    await page.mouse.up();
    assert.equal((await state()).pages[0].elements.at(-1).type, "path");
    await page.click("[data-tab=draw]");
  });

  await step("layers panel reorders", async () => {
    await page.click("[data-tab=layers]");
    const layers = page.locator(".layer");
    assert.equal(
      await layers.count(),
      (await state()).pages[0].elements.length,
    );
    await layers.last().click();
    await page.click("button[aria-label=Position]");
    await page.click(".popover .menu-item:has-text('To front')");
    await page.keyboard.press("Escape");
    await shot("05-layers");
  });

  await step("templates apply and pages can be added", async () => {
    await page.click("[data-tab=design]");
    await page.click("#add-page");
    await page.click(".template-card >> nth=2");
    const d = await state();
    assert.equal(d.pages.length, 2);
    assert.ok(d.pages[1].elements.length >= 3);
    await page.click(".page-wrap >> nth=1 >> [data-page-action=duplicate]");
    assert.equal((await state()).pages.length, 3);
    await page.click(".page-wrap >> nth=2 >> [data-page-action=delete]");
    assert.equal((await state()).pages.length, 2);
  });

  await step("background color from the page toolbar", async () => {
    await page.keyboard.press("Escape");
    await page.click("button[aria-label='Background color']");
    await page.click(".popover .swatches >> nth=-1 >> .swatch >> nth=0");
    assert.ok((await state()).pages[1].background.gradient);
    await page.keyboard.press("Escape");
    await shot("06-two-pages");
  });

  await step("resize scales content", async () => {
    await page.click("#resize-btn");
    await page.click(".resize-pop .menu-item:has-text('Presentation')");
    await page.click(".resize-pop .btn-primary");
    const d = await state();
    assert.equal(d.width, 1920);
    assert.equal(d.height, 1080);
    await shot("07-resized");
  });

  await step("download PNG", async () => {
    await page.click("#share");
    await page.click(".share-pop .btn-primary");
    await page.selectOption(
      ".download-pop select[aria-label=Pages]",
      "current",
    );
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("[data-testid=download-go]"),
    ]);
    assert.match(download.suggestedFilename(), /\.png$/);
    const path = await download.path();
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  });

  await step("present mode", async () => {
    await page.click("#present");
    await page.waitForSelector(".present canvas");
    await shot("08-present");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".present").count(), 0);
  });

  await step("autosave persists across reloads", async () => {
    await page.fill("#title", "Smoke test design");
    await page.press("#title", "Enter");
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForSelector(".page-frame");
    const d = await state();
    assert.equal(d.title, "Smoke test design");
    assert.equal(d.pages.length, 2);
    await page.goto(`${base}/index.html`);
    await page.waitForSelector("#recent-grid .design-card img");
    await shot("09-home-recent");
  });

  assert.deepEqual(errors, [], `no page errors: ${errors.join("\n")}`);
  console.log(`\n${steps.length} checks passed`);
} catch (error) {
  console.error(`not ok - after: ${steps.at(-1) ?? "start"}`);
  console.error(error);
  if (errors.length) console.error("page errors:", errors);
  await shot("failure");
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
