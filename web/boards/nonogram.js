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
  const clearBtn = h("button", { onclick: () => clear() }, "Löschen");
  tools.append(seg, clearBtn);
  const draw = () => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [rc, mark] = cells[r * n + c]; rc.setAttribute("fill", g[r][c] === 1 ? "var(--ink)" : "transparent"); mark.setAttribute("visibility", g[r][c] === 2 ? "visible" : "hidden"); }
    const sat = nonogram.satisfied(p, g);
    rowT.forEach((t, r) => t.setAttribute("opacity", sat.rows.has(r) ? .35 : 1)); colT.forEach((t, c) => t.setAttribute("opacity", sat.cols.has(c) ? .35 : 1));
  };
  const snapshot = () => g.map((row) => row.slice());
  const restore = (snap) => { for (let r = 0; r < n; r++) g[r] = snap[r].slice(); };
  // ---------- undo stack (one entry per gesture) + error metric ----------
  const undoStack = []; let errors = 0;
  const pushUndo = (snap) => { undoStack.push(snap || snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const same = (a, c) => a.every((row, r) => row.every((v, i) => v === c[r][i]));
  /** Setzt eine Zelle und zählt Fehler (gesetzter Wert passt nicht zur Lösung). */
  const setCell = (r, c, v) => {
    if (g[r][c] === v) return;
    const s = !!p.solution[r][c];
    if ((v === 1 && !s) || (v === 2 && s)) errors++;
    g[r][c] = v;
  };
  const undo = () => { if (!undoStack.length) return false; restore(undoStack.pop()); highlight(null); draw(); return true; };
  const canUndo = () => undoStack.length > 0;
  const clear = () => { if (g.some((row) => row.some(Boolean))) pushUndo(); for (const row of g) row.fill(0); draw(); };
  const metrics = () => ({ line: `${errors} Fehler` });

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
    val = g[r][c] === tool ? 0 : tool; lockR = lockC = null; setCell(r, c, val); haptic(); highlight(r, c); draw();
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
    if (lockR !== null) { for (let x = Math.min(pc, c); x <= Math.max(pc, c); x++) setCell(sr, x, val); }
    else { for (let y = Math.min(pr, r); y <= Math.max(pr, r); y++) setCell(y, sc, val); }
    lastCell = [r, c]; draw();
  };
  // Auto-×: a row/column whose filled cells already match its clues gets × on all remaining empty cells
  const autoX = () => {
    let changed = false;
    const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    for (let i = 0; i < n; i++) {
      if (eq(nonogram.cluesOf(g[i].map((v) => v === 1)), p.rows[i])) for (let c = 0; c < n; c++) if (g[i][c] === 0) { g[i][c] = 2; changed = true; }
      if (eq(nonogram.cluesOf(g.map((row) => row[i] === 1)), p.cols[i])) for (let r = 0; r < n; r++) if (g[r][i] === 0) { g[r][i] = 2; changed = true; }
    }
    if (changed) draw();
  };
  const paintEnd = () => { highlight(null); autoX(); if (nonogram.isSolved(p, g)) onSolved(); };

  svg.addEventListener("pointerdown", (e) => {
    e.preventDefault(); svg.setPointerCapture?.(e.pointerId);
    const lp = local(e); pts.set(e.pointerId, lp);
    if (pts.size === 1) {
      ignoreRest = false;
      const now = performance.now();
      if (lastTap && zs > 1 && now - lastTap.t < 320 && dist(lastTap, lp) < 30) { // double tap → reset zoom, undo first tap
        restore(lastTap.snap); if (undoStack.length && same(undoStack[undoStack.length - 1], lastTap.snap)) undoStack.pop(); // first tap is no gesture anymore
        draw(); resetZoom(); lastTap = null; ignoreRest = true; return;
      }
      const cell = b.cellAt(e); if (!cell) return;
      painting = true; paintId = e.pointerId; paintSnap = snapshot(); pushUndo(paintSnap); startCell = cell; lastCell = cell; startPt = lp; moved = false; paintStart(cell);
    } else if (pts.size === 2) {
      if (painting) { restore(paintSnap); undoStack.pop(); highlight(null); draw(); painting = false; paintId = null; }
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

  // ---------- hint (LinkedIn-Stil: Begründung + Spotlight, „Anzeigen“ führt aus) ----------
  const unflash = (list) => { for (const [r, c] of list) cells[r * n + c][0].classList.remove("hintcell"); };
  const flash = (list, ms = 900) => { for (const [r, c] of list) cells[r * n + c][0].classList.add("hintcell"); setTimeout(() => unflash(list), ms); };
  const finish = () => { draw(); autoX(); if (nonogram.isSolved(p, g)) onSolved(); };
  const hint = () => {
    const hnt = nonogram.explainHint(p, g); if (!hnt) return null;
    const rc = hnt.cells.map(([r, c]) => [r, c]);
    const apply = () => {
      pushUndo(); for (const [r, c, v] of hnt.cells) g[r][c] = v;
      finish(); if (!hnt.wrong) flash(rc.filter(([r, c]) => g[r][c] === 1));
      const k = hnt.cells.length, f = k === 1 ? "1 Feld" : `${k} Felder`;
      if (hnt.wrong) return `${f} entfernt.`;
      const nf = hnt.cells.filter((x) => x[2] === 1).length;
      return nf === k ? `${f} gefüllt.` : nf ? `${nf} gefüllt, ${k - nf} mit × markiert.` : `${f} mit × markiert.`;
    };
    return hnt.wrong
      ? { text: hnt.text, line: hnt.line, focus: [], target: [], strike: rc, apply }
      : { text: hnt.text, line: hnt.line, focus: [], target: rc, strike: [], apply };
  };
  // Spotlight lokal: ganze Zeile/Spalte inkl. Hinweiszahlen bleibt hell. Hängt am svg → skaliert mit dem Pinch-Zoom.
  let spot = null; const uid = Math.random().toString(36).slice(2, 8);
  const clearSpotlight = () => { spot?.remove(); spot = null; };
  const spotlight = (spec = {}) => {
    clearSpotlight();
    const target = spec.target || [], strike = spec.strike || [], focus = spec.focus || [];
    const holes = [...focus, ...target, ...strike].map(([r, c]) => [ox + c * S, oy + r * S, S, S]);
    if (spec.line?.r != null) holes.push([0, oy + spec.line.r * S, b.W, S]);
    if (spec.line?.c != null) holes.push([ox + spec.line.c * S, 0, S, b.H]);
    if (!holes.length) return;
    const gg = svgEl("g", { "pointer-events": "none" }), defs = svgEl("defs"), mask = svgEl("mask", { id: `nm${uid}` });
    mask.append(svgEl("rect", { x: 0, y: 0, width: b.W, height: b.H, fill: "#fff" }));
    for (const [x, y, w, hh] of holes) mask.append(svgEl("rect", { x, y, width: w, height: hh, fill: "#000" }));
    const pat = svgEl("pattern", { id: `np${uid}`, width: 22, height: 22, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.append(svgEl("rect", { x: 0, y: 0, width: 9, height: 22, fill: "rgba(255,255,255,.55)" }));
    defs.append(mask, pat); gg.append(defs);
    gg.append(svgEl("rect", { x: 0, y: 0, width: b.W, height: b.H, fill: "rgba(0,0,0,.58)", mask: `url(#nm${uid})`, class: "spot-dim" }));
    for (const [r, c] of strike) gg.append(svgEl("rect", { x: ox + c * S, y: oy + r * S, width: S, height: S, fill: `url(#np${uid})` }));
    for (const [r, c] of target) gg.append(svgEl("rect", { x: ox + c * S + 4, y: oy + r * S + 4, width: S - 8, height: S - 8, fill: "none", stroke: "#1f7aff", "stroke-width": 8, rx: 4 }));
    svg.append(gg); spot = gg;
    // gezoomt und Ziel nicht sichtbar → Zoom zurücksetzen, damit der Tipp nicht ins Leere zeigt
    if (zs > 1) {
      const er = el.getBoundingClientRect(), sr = svg.getBoundingClientRect(), k = sr.width / b.W;
      const vis = ([r, c]) => { const x = sr.left + (ox + (c + 0.5) * S) * k, y = sr.top + (oy + (r + 0.5) * S) * k; return x >= er.left && x <= er.right && y >= er.top && y <= er.bottom; };
      if (![...target, ...strike].every(vis)) resetZoom();
    }
  };

  draw();
  return { ...b, hint, spotlight, clearSpotlight, undo, canUndo, clear, metrics };
}
