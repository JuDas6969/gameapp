import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as nonogram from "../engine/nonogram.js";

export function Nonogram(p, { onSolved, tools, haptic }) {
  const n = p.n, g = Array.from({ length: n }, () => Array(n).fill(0)); // 0 unknown, 1 fill, 2 mark
  const maxR = Math.max(1, ...p.rows.map((x) => x.length)), maxC = Math.max(1, ...p.cols.map((x) => x.length));
  const ox = Math.round(maxR * S * 0.62) + 10, oy = Math.round(maxC * S * 0.62) + 10;
  const b = base(n, { ox, oy, strong: [5, 5] });
  const { svg, el } = b;
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
  // row/column highlight while dragging (orientation aid)
  const hiR = svgEl("rect", { x: 0, y: 0, width: b.W, height: S, fill: "var(--accent)", opacity: 0, rx: 4 });
  const hiC = svgEl("rect", { x: 0, y: 0, width: S, height: b.H, fill: "var(--accent)", opacity: 0, rx: 4 });
  b.layers.bg.append(hiR, hiC);
  const highlight = (r, c) => {
    if (r == null) { hiR.setAttribute("opacity", 0); hiC.setAttribute("opacity", 0); return; }
    hiR.setAttribute("y", oy + r * S); hiR.setAttribute("opacity", .10);
    hiC.setAttribute("x", ox + c * S); hiC.setAttribute("opacity", .10);
  };

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
  const snapshot = () => g.map((row) => row.slice());
  const restore = (snap) => { for (let r = 0; r < n; r++) g[r] = snap[r].slice(); };

  // ---------- zoom / pan (CSS transform on the svg; no transform at zoom 1) ----------
  el.style.overflow = "hidden"; svg.style.transformOrigin = "0 0";
  let zs = 1, ztx = 0, zty = 0;
  const applyZoom = () => {
    if (zs <= 1.001) { zs = 1; ztx = zty = 0; svg.style.transform = ""; return; }
    const r = el.getBoundingClientRect();
    ztx = Math.min(0, Math.max(r.width * (1 - zs), ztx)); zty = Math.min(0, Math.max(r.height * (1 - zs), zty));
    svg.style.transform = `translate(${ztx}px, ${zty}px) scale(${zs})`;
  };
  const resetZoom = () => { zs = 1; applyZoom(); };

  // ---------- pointer handling: 1 finger paints, 2 fingers pinch/pan, double tap resets zoom ----------
  const pts = new Map(); // pointerId → {x, y} relative to el
  let painting = false, paintId = null, paintSnap = null, startCell = null, startPt = null, lastCell = null, moved = false;
  let val = 0, lockR = null, lockC = null;
  let pinch = null, ignoreRest = false, lastTap = null;
  const local = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const dist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);

  const paintStart = ([r, c]) => {
    val = g[r][c] === tool ? 0 : tool; lockR = lockC = null; g[r][c] = val; haptic(); highlight(r, c); draw();
  };
  const paintMove = ([r, c], lp) => {
    const [sr, sc] = startCell;
    if (r === sr && c === sc) return;
    // decide direction from the finger's displacement, not from the first cell hit (diagonal jitter)
    const dx = lp.x - startPt.x, dy = lp.y - startPt.y;
    if (lockR === null && lockC === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dx) >= Math.abs(dy)) lockR = sr; else lockC = sc;
    }
    if (lockR !== null) { if (r !== lockR) return; }
    else if (c !== lockC) return;
    // paint every cell between the last painted cell and this one so fast swipes don't skip cells
    const [pr, pc] = lastCell;
    if (lockR !== null) { for (let x = Math.min(pc, c); x <= Math.max(pc, c); x++) g[sr][x] = val; }
    else { for (let y = Math.min(pr, r); y <= Math.max(pr, r); y++) g[y][sc] = val; }
    lastCell = [r, c]; draw();
  };
  const paintEnd = () => { highlight(null); if (nonogram.isSolved(p, g)) onSolved(); };

  svg.addEventListener("pointerdown", (e) => {
    e.preventDefault(); svg.setPointerCapture?.(e.pointerId);
    const lp = local(e); pts.set(e.pointerId, lp);
    if (pts.size === 1) {
      ignoreRest = false;
      const now = performance.now();
      if (lastTap && zs > 1 && now - lastTap.t < 320 && dist(lastTap, lp) < 30) { // double tap → reset zoom, undo first tap
        restore(lastTap.snap); draw(); resetZoom(); lastTap = null; ignoreRest = true; return;
      }
      const cell = b.cellAt(e); if (!cell) return;
      painting = true; paintId = e.pointerId; paintSnap = snapshot(); startCell = cell; lastCell = cell; startPt = lp; moved = false; paintStart(cell);
    } else if (pts.size === 2) {
      if (painting) { restore(paintSnap); highlight(null); draw(); painting = false; paintId = null; }
      ignoreRest = true; lastTap = null;
      const [a, c] = [...pts.values()];
      pinch = { d0: Math.max(10, dist(a, c)), m0: { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }, s0: zs, tx0: ztx, ty0: zty };
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    const lp = local(e); pts.set(e.pointerId, lp);
    if (pinch && pts.size >= 2) {
      const [a, c] = [...pts.values()];
      const d = dist(a, c), m = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
      zs = Math.min(4, Math.max(1, pinch.s0 * d / pinch.d0));
      // keep the svg point under the initial midpoint fixed under the current midpoint
      const px = (pinch.m0.x - pinch.tx0) / pinch.s0, py = (pinch.m0.y - pinch.ty0) / pinch.s0;
      ztx = m.x - px * zs; zty = m.y - py * zs; applyZoom();
      return;
    }
    if (!painting || e.pointerId !== paintId) return;
    const cell = b.cellAt(e); if (!cell) return;
    moved = true; paintMove(cell, lp);
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    const lp = pts.get(e.pointerId); pts.delete(e.pointerId);
    if (pinch && pts.size < 2) pinch = null;
    if (painting && e.pointerId === paintId) {
      painting = false; paintId = null;
      lastTap = moved ? null : { t: performance.now(), x: lp.x, y: lp.y, snap: paintSnap };
      paintEnd();
    }
    if (pts.size === 0) ignoreRest = false;
  };
  svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);

  // ---------- hint ----------
  const flash = (list, bad) => {
    for (const [r, c] of list) { const rc = cells[r * n + c][0]; if (bad) rc.style.fill = "var(--bad)"; else rc.classList.add("hintcell"); }
    setTimeout(() => { for (const [r, c] of list) { const rc = cells[r * n + c][0]; rc.style.fill = ""; rc.classList.remove("hintcell"); } }, 900);
  };
  const finish = () => { draw(); if (nonogram.isSolved(p, g)) onSolved(); };
  const hint = () => {
    // (a) a wrong cell: filled but empty in the solution, or marked × but filled in the solution
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const s = !!p.solution[r][c];
      if ((g[r][c] === 1 && !s) || (g[r][c] === 2 && s)) { g[r][c] = s ? 1 : 2; finish(); flash([[r, c]], true); return "Dieses Feld ist falsch"; }
    }
    // (b) line logic: find the row/column with the most newly deducible cells
    const { UNK, FILL, EMPTY } = nonogram.LINE;
    const conv = (v) => (v === 1 ? FILL : v === 2 ? EMPTY : UNK);
    let best = null;
    for (let r = 0; r < n; r++) {
      const line = g[r].map(conv), nw = nonogram.solveLine(line, p.rows[r]); if (!nw) continue;
      const k = nw.filter((v, i) => line[i] === UNK && v !== UNK).length;
      if (k && (!best || k > best.k)) best = { k, r, nw, line };
    }
    for (let c = 0; c < n; c++) {
      const line = g.map((row) => conv(row[c])), nw = nonogram.solveLine(line, p.cols[c]); if (!nw) continue;
      const k = nw.filter((v, i) => line[i] === UNK && v !== UNK).length;
      if (k && (!best || k > best.k)) best = { k, c, nw, line };
    }
    if (best) {
      const changed = [];
      best.nw.forEach((v, i) => {
        if (best.line[i] !== UNK || v === UNK) return;
        const r = best.r != null ? best.r : i, c = best.c != null ? best.c : i;
        g[r][c] = v === FILL ? 1 : 2; changed.push([r, c]);
      });
      finish(); flash(changed, false);
      const f = best.k === 1 ? "1 Feld" : `${best.k} Felder`;
      return best.r != null ? `Zeile ${best.r + 1}: ${f} sicher` : `Spalte ${best.c + 1}: ${f} ${best.k === 1 ? "lässt" : "lassen"} sich ableiten`;
    }
    // (c) fallback: fill one solution cell
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.solution[r][c] && g[r][c] !== 1) { g[r][c] = 1; finish(); flash([[r, c]], false); return "Ein Feld gefüllt"; }
    return null;
  };

  draw();
  return { ...b, hint };
}
