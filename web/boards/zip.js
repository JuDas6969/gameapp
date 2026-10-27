import { S, svgEl, h, base, txt, msgBar } from "./_shared.js";
import * as zip from "../engine/zip.js";

// Pfad (LinkedIn "Zip"): rounded grid, blue-tinted visited cells, thick blue gradient path, ring on the next number.
const mid = (r, c) => [c * S + S / 2, r * S + S / 2];
const BLUE = "#1f7aff";
// path gradient: light → deep blue along the path
const C0 = [96, 170, 255], C1 = [24, 92, 220];
const mix = (t) => `rgb(${C0.map((v, i) => Math.round(v + (C1[i] - v) * t)).join(",")})`;

export function Zip(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "var(--card)" }); let path = [];
  const W = n * S, RAD = 26;
  // undo stack: one snapshot of `path` per gesture (pointer-down → up, hint, clear)
  const history = []; let backtracks = 0;

  // rounded outer corners: clip grid layers, draw a rounded frame on top
  const cid = "zc" + Math.random().toString(36).slice(2, 8);
  const clip = svgEl("clipPath", { id: cid }); clip.append(svgEl("rect", { x: 0, y: 0, width: W, height: W, rx: RAD }));
  const defs = svgEl("defs"); defs.append(clip); b.svg.prepend(defs);
  for (const k of ["bg", "cells", "lines", "mid"]) b.layers[k].setAttribute("clip-path", `url(#${cid})`);
  b.layers.top.append(svgEl("rect", { x: 2, y: 2, width: W - 4, height: W - 4, rx: RAD - 2, fill: "none", stroke: "var(--line-strong)", "stroke-width": 5 }));

  // visited-cell tint (cells layer, below lines)
  const tint = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: BLUE, opacity: .16, visibility: "hidden" });
    b.layers.cells.append(rc); tint[r * n + c] = rc;
  }

  // path (segments with gradient colour) + head with direction arrow
  const pathG = svgEl("g");
  const startDot = svgEl("circle", { r: S * 0.25, fill: mix(0), visibility: "hidden" });
  const headG = svgEl("g", { display: "none" });
  const head = svgEl("circle", { r: S * 0.13, fill: "#fff", opacity: .95 });
  const arrow = svgEl("polygon", { points: `${S * 0.1},0 ${-S * 0.07},${-S * 0.11} ${-S * 0.07},${S * 0.11}`, fill: "#fff", visibility: "hidden" });
  headG.append(head, arrow);
  b.layers.mid.append(startDot, pathG);

  // walls: thick, rounded, clearly distinct from grid
  for (const w of p.walls) {
    const [a, c2] = w.split("-").map(Number), ar = Math.floor(a / 64), ac = a % 64, br = Math.floor(c2 / 64), bc = c2 % 64;
    const attrs = ar === br ? { x1: bc * S, y1: ar * S, x2: bc * S, y2: (ar + 1) * S } : { x1: ac * S, y1: br * S, x2: (ac + 1) * S, y2: br * S };
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--bg)", "stroke-width": 20, "stroke-linecap": "round", opacity: .9 }));
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--ink)", "stroke-width": 13, "stroke-linecap": "round" }));
  }

  // numbered waypoints: dark discs with light digits; blue ring = next number to reach
  const nums = new Map();
  const ring = svgEl("circle", { r: S * 0.41, fill: "none", stroke: BLUE, "stroke-width": 7, visibility: "hidden" });
  b.layers.top.append(ring);
  for (const [k, num] of Object.entries(p.waypoints)) {
    const r = Math.floor(k / n), c = k % n, [cx, cy] = mid(r, c);
    const circ = svgEl("circle", { cx, cy, r: S * 0.32, fill: "var(--ink)" });
    const t = txt(cx, cy, String(num), 38, "cell-txt", { fill: "var(--bg)", "font-weight": 800 });
    t.style.fill = "var(--bg)";
    b.layers.top.append(circ, t); nums.set(num, Number(k));
  }
  b.layers.top.append(headG);

  const setMsg = msgBar(tools, "Von 1 aus über jedes Feld ziehen");
  const clearBtn = h("button", { onclick: () => b.clear() }, "Löschen"); // undo lives in the app (b.undo/b.canUndo)
  tools.append(clearBtn);

  const draw = () => {
    const L = path.length;
    pathG.replaceChildren();
    const tAt = (i) => (L > 1 ? i / (L - 1) : 0);
    for (let i = 0; i < L; i++) { const [cx, cy] = mid(...path[i]); pathG.append(svgEl("circle", { cx, cy, r: S * 0.25, fill: mix(tAt(i)) })); }
    for (let i = 1; i < L; i++) {
      const [x1, y1] = mid(...path[i - 1]), [x2, y2] = mid(...path[i]);
      const gid = `${cid}g${i}`, gr = svgEl("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 });
      gr.append(svgEl("stop", { offset: 0, "stop-color": mix(tAt(i - 1)) }), svgEl("stop", { offset: 1, "stop-color": mix(tAt(i)) }));
      pathG.append(gr, svgEl("line", { x1, y1, x2, y2, stroke: `url(#${gid})`, "stroke-width": S * 0.5, "stroke-linecap": "butt" }));
    }
    if (L) {
      const [sx, sy] = mid(...path[0]); startDot.setAttribute("cx", sx); startDot.setAttribute("cy", sy); startDot.setAttribute("visibility", "visible");
      const [x, y] = mid(...path[L - 1]);
      let rot = null;
      if (L >= 2) { const [pr, pc] = path[L - 2], [r, c] = path[L - 1]; rot = Math.atan2(r - pr, c - pc) * 180 / Math.PI; }
      const onNum = !!p.waypoints[path[L - 1][0] * n + path[L - 1][1]];
      headG.setAttribute("transform", `translate(${x},${y})${rot == null ? "" : ` rotate(${rot})`}`);
      headG.setAttribute("display", onNum || L === n * n ? "none" : "inline");
      arrow.setAttribute("visibility", rot == null ? "hidden" : "visible");
      head.setAttribute("visibility", rot == null ? "visible" : "hidden");
    } else { headG.setAttribute("display", "none"); startDot.setAttribute("visibility", "hidden"); }
    const visited = new Set(path.map(([r, c]) => r * n + c));
    tint.forEach((rc, k) => rc.setAttribute("visibility", visited.has(k) ? "visible" : "hidden"));
    // next number to reach
    let reached = 0; for (const [r, c] of path) reached = Math.max(reached, p.waypoints[r * n + c] || 0);
    const nextK = nums.get(reached + 1);
    if (nextK != null && !(L === n * n)) {
      const [cx, cy] = mid(Math.floor(nextK / n), nextK % n); ring.setAttribute("cx", cx); ring.setAttribute("cy", cy); ring.setAttribute("visibility", "visible");
    } else ring.setAttribute("visibility", "hidden");
    clearBtn.disabled = !L;
  };

  // --- gesture bookkeeping: snapshot at pointer-down, commit at pointer-up ---
  let gestureStart = null, gestureShortened = false;
  const beginGesture = () => { gestureStart = path.slice(); gestureShortened = false; };
  const endGesture = () => {
    if (!gestureStart) return;
    const changed = gestureStart.length !== path.length || gestureStart.some(([r, c], i) => path[i][0] !== r || path[i][1] !== c);
    if (changed) history.push(gestureStart);
    if (gestureShortened) backtracks++;
    gestureStart = null; gestureShortened = false; draw();
  };
  const shorten = (len) => { path.length = len; gestureShortened = true; };

  const extend = (cell) => {
    if (!cell) return; // dragged outside the board
    const [r, c] = cell, L = path.length;
    if (L && path[L - 1][0] === r && path[L - 1][1] === c) return;
    if (L >= 2 && path[L - 2][0] === r && path[L - 2][1] === c) { shorten(L - 1); draw(); return; }
    const idx = path.findIndex(([a, bb]) => a === r && bb === c);
    if (idx >= 0) { if (idx + 1 < L) shorten(idx + 1); draw(); return; }
    // skipped cells during a fast drag: ignore silently
    if (L) { const [lr, lc] = path[L - 1]; if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return; }
    const err = zip.stepError(p, path, r, c);
    if (err) { setMsg(err, true); haptic(20); return; }
    path.push([r, c]); setMsg(""); if (p.waypoints[r * n + c]) haptic(); draw();
  };
  b.drag({
    onStart: (cell) => { beginGesture(); extend(cell); },
    onMove: extend,
    onEnd: () => { endGesture(); if (zip.isSolved(p, path)) onSolved(); },
  });

  // --- board API: undo / clear / metrics ---
  b.canUndo = () => history.length > 0;
  b.undo = () => {
    if (!history.length) return false;
    const prev = history.pop();
    if (prev.length < path.length) backtracks++;
    path = prev.slice(); setMsg(""); draw(); return true;
  };
  b.clear = () => {
    if (!path.length) return false;
    history.push(path.slice()); path = []; backtracks++; setMsg(""); draw(); return true;
  };
  b.metrics = () => ({ backtracks, line: backtracks === 0 ? "Keine Rückschritte" : backtracks === 1 ? "1 Rückschritt" : `${backtracks} Rückschritte` });

  // --- hint (LinkedIn): executed immediately – cut back to the first error, then extend up to the next number ---
  b.hint = () => {
    const hnt = zip.explainHint(p, path, 6);
    if (!hnt) return null;
    const before = path.slice();
    const next = path.slice(0, hnt.keep).concat(hnt.cells);
    const keepSet = new Set(next.map(([r, c]) => r * n + c));
    const strike = before.slice(hnt.keep).filter(([r, c]) => !keepSet.has(r * n + c));
    history.push(before); if (hnt.cut) { backtracks++; haptic(20); }
    path = next; setMsg(""); draw();
    if (zip.isSolved(p, path)) setTimeout(onSolved, 0);
    return { text: hnt.text, focus: hnt.cells, target: hnt.targetCell ? [hnt.targetCell] : [], strike };
  };

  draw(); return b;
}
