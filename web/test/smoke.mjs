// Playwright smoke test: serves web/, opens each game on an iPhone viewport, plays Sudoku + Zip + Nonogram to completion via the solution.
import { chromium, devices } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = path.resolve(new URL("..", import.meta.url).pathname);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split("?")[0])); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); res.end(data); });
}).listen(0);
const PORT = await new Promise((r) => server.on("listening", () => r(server.address().port)));
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 14"], colorScheme: process.argv.includes("--dark") ? "dark" : "light" });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: `/tmp/shots/${name}.png` });
fs.mkdirSync("/tmp/shots", { recursive: true });
await page.goto(`${BASE}/`); await page.waitForSelector(".card"); await shot("00-home");

// expose puzzle for the test: hook worker messages

const games = ["sudoku", "queens", "tango", "zip", "patches", "nonogram"];
for (const [i, kind] of games.entries()) {
  await page.goto(`${BASE}/`); await page.waitForSelector(".card");
  await page.locator(".card").nth(i).click(); await page.waitForSelector(".sheet");
  if (i === 0) await shot("01-sheet");
  await page.locator(".seg button").nth(1).click(); // mittel
  await page.locator(".btn.primary").click();
  await page.waitForSelector(".board svg", { timeout: 15000 });
  await page.waitForTimeout(300);
  await shot(`1${i}-${kind}`);
}
// play Sudoku via numpad using the solution extracted from the worker reply
await page.goto(`${BASE}/`); await page.waitForSelector(".card");
// Simplest: generate the same puzzle in-page by intercepting the worker's message through a tiny patch
await page.evaluate(() => {
  const O = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (m) { this.addEventListener("message", (e) => { if (e.data.puzzle) window.__puzzle = e.data.puzzle; }, { once: true }); return O.call(this, m); };
});
await page.locator(".card").nth(0).click(); await page.locator(".btn.primary").click(); await page.waitForSelector(".board svg");
await page.waitForFunction(() => window.__puzzle);
const sp = await page.evaluate(() => window.__puzzle);
const box = await page.locator(".board svg").boundingBox();
for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (!sp.givens[r][c]) {
  await page.mouse.click(box.x + (c + 0.5) * box.width / 6, box.y + (r + 0.5) * box.height / 6);
  await page.locator(".numpad button").nth(sp.solution[r][c] - 1).click();
}
await page.waitForSelector(".win", { timeout: 3000 }); await page.waitForTimeout(500); await shot("20-sudoku-win");

// play Zip by dragging along the solution path
await page.goto(`${BASE}/`); await page.waitForSelector(".card");
await page.evaluate(() => { window.__puzzle = null; const O = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m) { this.addEventListener("message", (e) => { if (e.data.puzzle) window.__puzzle = e.data.puzzle; }, { once: true }); return O.call(this, m); }; });
await page.locator(".card").nth(3).click(); await page.locator(".btn.primary").click(); await page.waitForSelector(".board svg");
await page.waitForFunction(() => window.__puzzle);
const zp = await page.evaluate(() => window.__puzzle);
const zb = await page.locator(".board svg").boundingBox(); const n = zp.n;
const pt = ([r, c]) => [zb.x + (c + 0.5) * zb.width / n, zb.y + (r + 0.5) * zb.height / n];
await page.mouse.move(...pt(zp.solution[0])); await page.mouse.down();
for (const cell of zp.solution.slice(1)) await page.mouse.move(...pt(cell), { steps: 2 });
await page.mouse.up();
await page.waitForSelector(".win", { timeout: 3000 }); await page.waitForTimeout(500); await shot("21-zip-win");

// nonogram: tap all filled cells of the solution
await page.goto(`${BASE}/`); await page.waitForSelector(".card");
await page.evaluate(() => { window.__puzzle = null; const O = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m) { this.addEventListener("message", (e) => { if (e.data.puzzle) window.__puzzle = e.data.puzzle; }, { once: true }); return O.call(this, m); }; });
await page.locator(".card").nth(5).click(); await page.locator(".seg button").nth(0).click(); await page.locator(".btn.primary").click(); await page.waitForSelector(".board svg");
await page.waitForFunction(() => window.__puzzle);
const np = await page.evaluate(() => window.__puzzle);
const vb = await page.evaluate(() => document.querySelector(".board svg").getAttribute("viewBox").split(" ").map(Number));
const nb = await page.locator(".board svg").boundingBox(); const sc = nb.width / vb[2];
const ox = vb[2] - np.n * 100, oy = vb[3] - np.n * 100;
for (let r = 0; r < np.n; r++) for (let c = 0; c < np.n; c++) if (np.solution[r][c]) await page.mouse.click(nb.x + (ox + (c + 0.5) * 100) * sc, nb.y + (oy + (r + 0.5) * 100) * sc);
await page.waitForSelector(".win", { timeout: 3000 }); await page.waitForTimeout(500); await shot("22-nonogram-win");

await browser.close(); server.close();
if (errors.length) { console.error("PAGE ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("smoke ok, screenshots in /tmp/shots");
