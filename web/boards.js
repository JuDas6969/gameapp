// Six interactive boards, rendered as SVG. Each factory returns { el, aspect:[w,h], lock() }.
import * as sudoku from "./engine/sudoku.js";
import * as queens from "./engine/queens.js";
import * as tango from "./engine/tango.js";
import * as zip from "./engine/zip.js";
import * as patches from "./engine/patches.js";
import * as nonogram from "./engine/nonogram.js";
import { edgeKey } from "./engine/core.js";

const NS = "http://www.w3.org/2000/svg";
const S = 100; // cell size in viewBox units
const svgEl = (tag, attrs = {}, text) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
};
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v); }
  el.append(...kids.flat().filter((x) => x != null));
  return el;
};
const REGION = (i) => `var(--r${(i % 12) + 1})`;

/** Base: svg with viewBox, grid lines, pointer → cell mapping. ox/oy = offset of the n×n grid inside viewBox (for clues). */
function base(n, { ox = 0, oy = 0, strong = null, bg = null } = {}) {
  const W = ox + n * S, H = oy + n * S;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  const el = h("div", { class: "board" }, svg);
  const layers = {}; for (const name of ["bg", "cells", "mid", "lines", "top"]) { layers[name] = svgEl("g"); svg.append(layers[name]); }
  if (bg) layers.bg.append(svgEl("rect", { x: ox, y: oy, width: n * S, height: n * S, fill: bg, rx: 6 }));
  for (let i = 0; i <= n; i++) {
    const edge = i === 0 || i === n;
    const sr = edge || (strong && i % strong[0] === 0), sc = edge || (strong && i % strong[1] === 0);
    layers.lines.append(svgEl("line", { x1: ox, y1: oy + i * S, x2: W, y2: oy + i * S, stroke: sr ? "var(--line-strong)" : "var(--line)", "stroke-width": sr ? 4 : 1.5 }));
    layers.lines.append(svgEl("line", { x1: ox + i * S, y1: oy, x2: ox + i * S, y2: H, stroke: sc ? "var(--line-strong)" : "var(--line)", "stroke-width": sc ? 4 : 1.5 }));
  }
  layers.lines.style.pointerEvents = "none"; layers.top.style.pointerEvents = "none"; layers.mid.style.pointerEvents = "none";
  const cellAt = (ev) => {
    const r = svg.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * W - ox, y = ((ev.clientY - r.top) / r.height) * H - oy;
    const c = Math.floor(x / S), rr = Math.floor(y / S);
    return rr >= 0 && c >= 0 && rr < n && c < n ? [rr, c] : null;
  };
  /** drag helper: onStart(cell), onMove(cell), onEnd(moved:boolean, cell) */
  const drag = ({ onStart, onMove, onEnd }) => {
    let active = false, start = null, last = null, moved = false;
    svg.addEventListener("pointerdown", (e) => { e.preventDefault(); const c = cellAt(e); if (!c) return; active = true; moved = false; start = last = c; svg.setPointerCapture?.(e.pointerId); onStart?.(c, e); });
    svg.addEventListener("pointermove", (e) => { if (!active) return; const c = cellAt(e); if (!c || (last && c[0] === last[0] && c[1] === last[1])) return; moved = true; last = c; onMove?.(c, start, e); });
    const end = (e) => { if (!active) return; active = false; onEnd?.(moved, last, start, e); };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  };
  return { el, svg, layers, W, H, ox, oy, cellAt, drag, aspect: [W, H], lock: () => el.classList.add("locked") };
}
const txt = (x, y, s, size, cls = "cell-txt", extra = {}) => svgEl("text", { x, y, class: cls, "font-size": size, ...extra }, s);
const msgBar = (tools, text) => { const m = h("span", { class: "msg" }, text); tools.append(m); return (t, err) => { m.textContent = t; m.classList.toggle("err", !!err); }; };

// ---------------- Sudoku ----------------
function Sudoku(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice());
  const b = base(n, { strong: [2, 3] }); let sel = null;
  const rects = [], texts = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "transparent" }); b.layers.cells.append(rc); rects.push(rc);
    const t = txt(c * S + S / 2, r * S + S / 2, "", 50); b.layers.top.append(t); texts.push(t);
    rc.addEventListener("pointerdown", (e) => { e.preventDefault(); sel = [r, c]; haptic(); draw(); });
  }
  const draw = () => {
    const bad = sudoku.conflicts(g);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, v = g[r][c], given = p.givens[r][c] !== 0;
      let fill = "transparent";
      if (sel) {
        const [sr, sc] = sel, sv = g[sr][sc];
        if (sr === r && sc === c) fill = "var(--accent-soft)";
        else if (sv && sv === v) fill = "var(--accent-soft)";
        else if (sr === r || sc === c || ((sr >> 1) === (r >> 1) && Math.floor(sc / 3) === Math.floor(c / 3))) fill = "rgba(127,127,127,.09)";
      }
      rects[i].setAttribute("fill", fill);
      texts[i].textContent = v || ""; texts[i].setAttribute("class", `cell-txt ${given ? "given" : "entry"}${bad.has(r * 64 + c) ? " bad" : ""}`);
      texts[i].setAttribute("font-weight", given ? 800 : 500);
    }
  };
  const enter = (v) => {
    if (!sel || p.givens[sel[0]][sel[1]] !== 0) return;
    g[sel[0]][sel[1]] = v; haptic(); draw();
    if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved();
  };
  const pad = h("div", { class: "numpad" }, [1, 2, 3, 4, 5, 6].map((v) => h("button", { onclick: () => enter(v) }, String(v))), h("button", { onclick: () => enter(0) }, "⌫"));
  tools.replaceChildren(pad);
  draw(); return b;
}

// ---------------- Queens ----------------
function Queens(p, { onSolved, tools, haptic }) {
  const n = p.n, marks = Array.from({ length: n }, () => Array(n).fill(0)); // 0 empty, 1 ×, 2 queen
  const b = base(n); const glyphs = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    b.layers.bg.append(svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: REGION(p.regions[r][c]) }));
    const t = txt(c * S + S / 2, r * S + S / 2, "", 52); b.layers.top.append(t); glyphs.push(t);
    if (c + 1 < n && p.regions[r][c] !== p.regions[r][c + 1]) b.layers.mid.append(svgEl("line", { x1: (c + 1) * S, y1: r * S, x2: (c + 1) * S, y2: (r + 1) * S, stroke: "var(--line-strong)", "stroke-width": 5 }));
    if (r + 1 < n && p.regions[r][c] !== p.regions[r + 1][c]) b.layers.mid.append(svgEl("line", { x1: c * S, y1: (r + 1) * S, x2: (c + 1) * S, y2: (r + 1) * S, stroke: "var(--line-strong)", "stroke-width": 5 }));
  }
  const setMsg = msgBar(tools, "Tippen: leer → × → ♛ · Ziehen malt ×");
  const draw = () => {
    const qs = new Set(); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (marks[r][c] === 2) qs.add(r * 64 + c);
    const bad = queens.conflicts(p, qs);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = glyphs[r * n + c], m = marks[r][c];
      t.textContent = m === 1 ? "×" : m === 2 ? "♛" : "";
      t.setAttribute("font-size", m === 1 ? 40 : 56);
      t.setAttribute("class", "cell-txt" + (bad.has(r * 64 + c) ? " bad" : ""));
      t.setAttribute("fill", m === 1 ? "var(--muted)" : "var(--ink)");
    }
    if (queens.isSolved(p, qs)) onSolved();
  };
  let paintVal = null;
  b.drag({
    onStart: ([r, c]) => { paintVal = marks[r][c] === 0 ? 1 : 0; },
    onMove: ([r, c], start) => {
      if (marks[start[0]][start[1]] !== 2) marks[start[0]][start[1]] = paintVal;
      if (marks[r][c] !== 2) marks[r][c] = paintVal; draw();
    },
    onEnd: (moved, last, [r, c]) => { if (!moved) { marks[r][c] = (marks[r][c] + 1) % 3; haptic(); } draw(); },
  });
  draw(); return b;
}

// ---------------- Tango ----------------
function Tango(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice()); const b = base(n); const glyphs = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (p.givens[r][c] !== -1) b.layers.bg.append(svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "rgba(127,127,127,.1)" }));
    const t = txt(c * S + S / 2, r * S + S / 2, "", 54); b.layers.top.append(t); glyphs.push(t);
  }
  for (const k of p.constraints) {
    const x = ((k.a[1] + k.b[1]) / 2 + 0.5) * S, y = ((k.a[0] + k.b[0]) / 2 + 0.5) * S;
    b.layers.top.append(svgEl("circle", { cx: x, cy: y, r: 17, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 2 }));
    b.layers.top.append(txt(x, y + 1, k.eq ? "=" : "×", 28, "cell-txt", { "font-weight": 900 }));
  }
  msgBar(tools, "Tippen: leer → ☀ → ☾");
  const draw = () => {
    const bad = tango.conflicts(p, g);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = glyphs[r * n + c], v = g[r][c];
      t.textContent = v === 0 ? "☀" : v === 1 ? "☾" : "";
      t.setAttribute("fill", bad.has(r * 64 + c) ? "var(--bad)" : v === 0 ? "var(--sun)" : "var(--moon)");
      t.setAttribute("class", "cell-txt");
    }
  };
  b.drag({ onEnd: (moved, last, [r, c]) => {
    if (moved || p.givens[r][c] !== -1) return;
    g[r][c] = g[r][c] === 1 ? -1 : g[r][c] + 1; haptic(); draw();
    if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved();
  } });
  draw(); return b;
}

// ---------------- Zip ----------------
function Zip(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let path = [];
  const line = svgEl("polyline", { fill: "none", stroke: "var(--accent)", "stroke-width": S * 0.42, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .9 });
  const head = svgEl("circle", { r: S * 0.16, fill: "#fff", visibility: "hidden" });
  b.layers.mid.append(line, head);
  const walls = new Set(p.walls);
  for (const w of p.walls) {
    const [a, c2] = w.split("-").map(Number), ar = Math.floor(a / 64), ac = a % 64, br = Math.floor(c2 / 64), bc = c2 % 64;
    const attrs = ar === br ? { x1: bc * S, y1: ar * S, x2: bc * S, y2: (ar + 1) * S } : { x1: ac * S, y1: br * S, x2: (ac + 1) * S, y2: br * S };
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--ink)", "stroke-width": 9, "stroke-linecap": "round" }));
  }
  const nums = new Map();
  for (const [k, num] of Object.entries(p.waypoints)) {
    const r = Math.floor(k / n), c = k % n, cx = c * S + S / 2, cy = r * S + S / 2;
    const circ = svgEl("circle", { cx, cy, r: S * 0.33, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 4 });
    const t = txt(cx, cy, String(num), 36); b.layers.top.append(circ, t); nums.set(Number(k), [circ, t]);
  }
  const setMsg = msgBar(tools, "Von 1 aus über jedes Feld ziehen");
  const undo = h("button", { onclick: () => { path.pop(); draw(); } }, "↶ Zurück");
  const clear = h("button", { onclick: () => { path = []; draw(); } }, "Löschen");
  tools.append(undo, clear);
  const draw = () => {
    line.setAttribute("points", path.map(([r, c]) => `${c * S + S / 2},${r * S + S / 2}`).join(" "));
    if (path.length) { const [r, c] = path[path.length - 1]; head.setAttribute("cx", c * S + S / 2); head.setAttribute("cy", r * S + S / 2); head.setAttribute("visibility", "visible"); } else head.setAttribute("visibility", "hidden");
    const visited = new Set(path.map(([r, c]) => r * n + c));
    for (const [k, [circ, t]] of nums) { const v = visited.has(k); circ.setAttribute("fill", v ? "var(--accent)" : "var(--card)"); t.setAttribute("fill", v ? "#fff" : "var(--ink)"); }
    undo.disabled = clear.disabled = !path.length;
  };
  const extend = ([r, c]) => {
    const L = path.length;
    if (L && path[L - 1][0] === r && path[L - 1][1] === c) return;
    if (L >= 2 && path[L - 2][0] === r && path[L - 2][1] === c) { path.pop(); draw(); return; }
    const idx = path.findIndex(([a, bb]) => a === r && bb === c);
    if (idx >= 0) { path.length = idx + 1; draw(); return; }
    if (L) { const [lr, lc] = path[L - 1]; if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return; }
    const err = zip.stepError(p, path, r, c);
    if (err) { setMsg(err, true); haptic(20); return; }
    path.push([r, c]); setMsg(""); if (p.waypoints[r * n + c]) haptic(); draw();
  };
  b.drag({ onStart: extend, onMove: extend, onEnd: () => { if (zip.isSolved(p, path)) onSolved(); } });
  draw(); return b;
}

// ---------------- Patches ----------------
function Patches(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let rects = [], preview = null;
  const rectLayer = svgEl("g"); b.layers.cells.append(rectLayer); rectLayer.style.pointerEvents = "none";
  const prevEl = svgEl("rect", { rx: 8, visibility: "hidden", "stroke-width": 4 }); b.layers.mid.append(prevEl);
  const clueEls = new Map();
  for (const [k, area] of Object.entries(p.clues)) {
    const r = Math.floor(k / 64), c = k % 64; const t = txt(c * S + S / 2, r * S + S / 2, String(area), 44); b.layers.top.append(t); clueEls.set(Number(k), t);
  }
  msgBar(tools, "Ziehen: Rechteck aufspannen · Tippen: entfernen");
  const clear = h("button", { onclick: () => { rects = []; draw(); } }, "Löschen"); tools.append(clear);
  const rectAttrs = (rc) => ({ x: rc.c * S + 3, y: rc.r * S + 3, width: rc.w * S - 6, height: rc.h * S - 6 });
  const draw = () => {
    rectLayer.replaceChildren(...rects.map((rc, i) => svgEl("rect", { ...rectAttrs(rc), rx: 8, fill: REGION(i), stroke: "var(--line-strong)", "stroke-width": 4 })));
    const covered = new Set(); rects.forEach((rc) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) covered.add(r * 64 + c); });
    for (const [k, t] of clueEls) t.setAttribute("opacity", covered.has(k) ? .55 : 1);
    if (preview) { const ok = patches.isValid(p, preview); Object.entries(rectAttrs(preview)).forEach(([k, v]) => prevEl.setAttribute(k, v)); prevEl.setAttribute("fill", ok ? "var(--accent-soft)" : "rgba(200,39,28,.25)"); prevEl.setAttribute("stroke", ok ? "var(--accent)" : "var(--bad)"); prevEl.setAttribute("visibility", "visible"); }
    else prevEl.setAttribute("visibility", "hidden");
    clear.disabled = !rects.length;
  };
  const mk = (a, c2) => ({ r: Math.min(a[0], c2[0]), c: Math.min(a[1], c2[1]), w: Math.abs(a[1] - c2[1]) + 1, h: Math.abs(a[0] - c2[0]) + 1 });
  b.drag({
    onStart: (cell) => { preview = mk(cell, cell); draw(); },
    onMove: (cell, start) => { preview = mk(start, cell); draw(); },
    onEnd: (moved, last, start) => {
      const rc = preview; preview = null;
      if (!moved || (rc.w === 1 && rc.h === 1)) { const i = rects.findIndex((x) => patches.contains(x, start[0], start[1])); if (i >= 0) { rects.splice(i, 1); haptic(); } draw(); return; }
      if (patches.isValid(p, rc)) { rects = rects.filter((x) => !patches.overlaps(x, rc)); rects.push(rc); haptic(); draw(); if (patches.isSolved(p, rects)) onSolved(); }
      else { haptic(20); draw(); }
    },
  });
  draw(); return b;
}

// ---------------- Nonogram ----------------
function Nonogram(p, { onSolved, tools, haptic }) {
  const n = p.n, g = Array.from({ length: n }, () => Array(n).fill(0)); // 0 unknown, 1 fill, 2 mark
  const maxR = Math.max(1, ...p.rows.map((x) => x.length)), maxC = Math.max(1, ...p.cols.map((x) => x.length));
  const ox = Math.round(maxR * S * 0.62) + 10, oy = Math.round(maxC * S * 0.62) + 10;
  const b = base(n, { ox, oy, strong: [5, 5] });
  const rowT = [], colT = [];
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) b.layers.bg.append(svgEl("rect", { x: 0, y: oy + r * S, width: ox, height: S, fill: "rgba(127,127,127,.07)" }));
    const grp = svgEl("g"); p.rows[r].forEach((v, i, arr) => grp.append(txt(ox - 8 - (arr.length - 1 - i) * S * 0.62 - S * 0.3, oy + r * S + S / 2, String(v), 40, "cell-txt", { "font-family": "ui-monospace, Menlo, monospace" })));
    b.layers.top.append(grp); rowT.push(grp);
  }
  for (let c = 0; c < n; c++) {
    if (c % 2 === 0) b.layers.bg.append(svgEl("rect", { x: ox + c * S, y: 0, width: S, height: oy, fill: "rgba(127,127,127,.07)" }));
    const grp = svgEl("g"); p.cols[c].forEach((v, i, arr) => grp.append(txt(ox + c * S + S / 2, oy - 8 - (arr.length - 1 - i) * S * 0.6 - S * 0.3, String(v), 40, "cell-txt", { "font-family": "ui-monospace, Menlo, monospace" })));
    b.layers.top.append(grp); colT.push(grp);
  }
  const cells = []; const cellLayer = svgEl("g"); b.layers.cells.append(cellLayer);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: ox + c * S + 4, y: oy + r * S + 4, width: S - 8, height: S - 8, rx: 6, fill: "transparent" });
    const x1 = ox + c * S + S * 0.3, y1 = oy + r * S + S * 0.3, x2 = ox + (c + 1) * S - S * 0.3, y2 = oy + (r + 1) * S - S * 0.3;
    const mark = svgEl("path", { d: `M${x1} ${y1}L${x2} ${y2}M${x2} ${y1}L${x1} ${y2}`, stroke: "var(--muted)", "stroke-width": 7, "stroke-linecap": "round", visibility: "hidden" });
    cellLayer.append(rc, mark); cells.push([rc, mark]);
  }
  let tool = 1;
  const seg = h("div", { class: "seg" });
  const drawSeg = () => seg.replaceChildren(h("button", { class: tool === 1 ? "on" : "", onclick: () => { tool = 1; drawSeg(); } }, "■ Füllen"), h("button", { class: tool === 2 ? "on" : "", onclick: () => { tool = 2; drawSeg(); } }, "× Markieren"));
  drawSeg();
  const clear = h("button", { onclick: () => { for (const row of g) row.fill(0); draw(); } }, "Löschen");
  tools.append(seg, clear);
  const draw = () => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [rc, mark] = cells[r * n + c]; rc.setAttribute("fill", g[r][c] === 1 ? "var(--ink)" : "transparent"); mark.setAttribute("visibility", g[r][c] === 2 ? "visible" : "hidden"); }
    const sat = nonogram.satisfied(p, g);
    rowT.forEach((t, r) => t.setAttribute("opacity", sat.rows.has(r) ? .35 : 1)); colT.forEach((t, c) => t.setAttribute("opacity", sat.cols.has(c) ? .35 : 1));
  };
  let val = 0, lockR = null, lockC = null;
  b.drag({
    onStart: ([r, c]) => { val = g[r][c] === tool ? 0 : tool; lockR = lockC = null; g[r][c] = val; haptic(); draw(); },
    onMove: ([r, c], [sr, sc]) => {
      if (lockR === null && lockC === null) { if (r === sr) lockR = sr; else if (c === sc) lockC = sc; else return; }
      if ((lockR !== null && r !== lockR) || (lockC !== null && c !== lockC)) return;
      g[r][c] = val; draw();
    },
    onEnd: () => { if (nonogram.isSolved(p, g)) onSolved(); },
  });
  draw(); return b;
}

export const BOARDS = { sudoku: Sudoku, queens: Queens, tango: Tango, zip: Zip, patches: Patches, nonogram: Nonogram };
