import { S, svgEl, h, base, txt, msgBar } from "./_shared.js";
import * as zip from "../engine/zip.js";

const mid = (r, c) => [c * S + S / 2, r * S + S / 2];
const HINT_TTL = 20000; // ms – second hint tap within this window executes the previewed step

export function Zip(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let path = [];
  // undo stack: one snapshot of `path` per gesture (pointer-down → up, hint, clear)
  const history = []; let backtracks = 0;

  // visited-cell tint (cells layer, below lines)
  const tint = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S + 3, y: r * S + 3, width: S - 6, height: S - 6, rx: 10, fill: "var(--accent-soft)", visibility: "hidden" });
    b.layers.cells.append(rc); tint[r * n + c] = rc;
  }

  // path line + head with direction marker
  const line = svgEl("polyline", { fill: "none", stroke: "var(--accent)", "stroke-width": S * 0.42, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .9 });
  const headG = svgEl("g", { visibility: "hidden" });
  const head = svgEl("circle", { r: S * 0.13, fill: "#fff", opacity: .95 });
  const arrow = svgEl("polygon", { points: `${S * 0.08},0 ${-S * 0.06},${-S * 0.09} ${-S * 0.06},${S * 0.09}`, fill: "#fff", opacity: .95, visibility: "hidden" });
  headG.append(head, arrow);
  const fx = svgEl("g", { "pointer-events": "none" }); // transient hint highlights
  // hint preview: dashed continuation of the path (stage 1 of the two-stage hint)
  const previewLine = svgEl("polyline", { fill: "none", stroke: "var(--ok)", "stroke-width": S * 0.3, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${S * 0.22} ${S * 0.22}`, opacity: .8, visibility: "hidden", "pointer-events": "none" });
  b.layers.mid.append(line, headG, previewLine, fx);

  // walls: thick, rounded, clearly distinct from grid
  for (const w of p.walls) {
    const [a, c2] = w.split("-").map(Number), ar = Math.floor(a / 64), ac = a % 64, br = Math.floor(c2 / 64), bc = c2 % 64;
    const attrs = ar === br ? { x1: bc * S, y1: ar * S, x2: bc * S, y2: (ar + 1) * S } : { x1: ac * S, y1: br * S, x2: (ac + 1) * S, y2: br * S };
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--bg)", "stroke-width": 20, "stroke-linecap": "round", opacity: .9 }));
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--ink)", "stroke-width": 13, "stroke-linecap": "round" }));
  }

  // numbered waypoints
  const nums = new Map();
  for (const [k, num] of Object.entries(p.waypoints)) {
    const r = Math.floor(k / n), c = k % n, [cx, cy] = mid(r, c);
    const circ = svgEl("circle", { cx, cy, r: S * 0.33, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 4 });
    const t = txt(cx, cy, String(num), 36, "cell-txt", { fill: "var(--ink)" }); b.layers.top.append(circ, t); nums.set(Number(k), [circ, t]);
  }

  const setMsg = msgBar(tools, "Von 1 aus über jedes Feld ziehen");
  const clearBtn = h("button", { onclick: () => b.clear() }, "Löschen"); // undo lives in the app's top bar (b.undo/b.canUndo)
  tools.append(clearBtn);

  // --- hint preview state ---
  const pathKey = () => path.map(([r, c]) => r * n + c).join(",");
  let pending = null; // { key, cells, target, at }
  const clearPreview = () => { pending = null; previewLine.setAttribute("visibility", "hidden"); };
  const pendingValid = () => pending && pending.key === pathKey() && Date.now() - pending.at < HINT_TTL;

  const draw = () => {
    if (pending && pending.key !== pathKey()) clearPreview();
    line.setAttribute("points", path.map(([r, c]) => mid(r, c).join(",")).join(" "));
    const L = path.length;
    if (L) {
      const [x, y] = mid(...path[L - 1]);
      let rot = null;
      if (L >= 2) { const [pr, pc] = path[L - 2], [r, c] = path[L - 1]; rot = Math.atan2(r - pr, c - pc) * 180 / Math.PI; }
      headG.setAttribute("transform", `translate(${x},${y})${rot == null ? "" : ` rotate(${rot})`}`);
      headG.setAttribute("visibility", "visible");
      arrow.setAttribute("visibility", rot == null || L === n * n ? "hidden" : "visible");
      head.setAttribute("r", rot == null ? S * 0.16 : S * 0.11);
    } else headG.setAttribute("visibility", "hidden");
    const visited = new Set(path.map(([r, c]) => r * n + c));
    tint.forEach((rc, k) => rc.setAttribute("visibility", visited.has(k) ? "visible" : "hidden"));
    for (const [k, [circ, t]] of nums) {
      const v = visited.has(k);
      circ.setAttribute("fill", v ? "var(--accent)" : "var(--card)"); circ.setAttribute("stroke", v ? "var(--accent)" : "var(--line-strong)");
      t.style.fill = v ? "#fff" : "var(--ink)";
    }
    clearBtn.disabled = !path.length;
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
    // skipped cells during a fast drag: ignore silently (no "Nicht benachbart" message)
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
    if (!path.length) return;
    history.push(path.slice()); path = []; backtracks++; setMsg(""); draw();
  };
  b.metrics = () => ({ backtracks, line: backtracks === 0 ? "Keine Rückschritte" : backtracks === 1 ? "1 Rückschritt" : `${backtracks} Rückschritte` });

  // transient highlight helpers for hints
  const flash = (nodes, ms) => { fx.append(...nodes); setTimeout(() => nodes.forEach((x) => x.remove()), ms); };
  const cellMark = (r, c, fill) => svgEl("rect", { x: c * S + 6, y: r * S + 6, width: S - 12, height: S - 12, rx: 12, fill, opacity: .45 });
  const segMark = (a, bcell, stroke) => { const [x1, y1] = mid(...a), [x2, y2] = mid(...bcell); return svgEl("line", { x1, y1, x2, y2, stroke, "stroke-width": S * 0.5, "stroke-linecap": "round", opacity: .55 }); };

  const applyCells = (cells, target) => {
    history.push(path.slice());
    const marks = [];
    for (const cell of cells) {
      const prev = path.length ? path[path.length - 1] : null;
      if (prev) marks.push(segMark(prev, cell, "var(--ok)"));
      marks.push(cellMark(cell[0], cell[1], "var(--ok)"));
      path.push(cell);
    }
    clearPreview(); draw(); flash(marks, 1100); setMsg("");
    const msg = target != null ? `Weiter bis zur ${target}` : cells.length === 1 ? "Ein Schritt weiter" : `${cells.length} Schritte weiter`;
    if (zip.isSolved(p, path)) onSolved();
    return msg;
  };

  b.hint = () => {
    // stage 2: same path, previewed within the last 20 s → draw it
    if (pendingValid()) { const { cells, target } = pending; return applyCells(cells, target); }
    clearPreview();
    const step = zip.hintStep(p, path, 6);
    if (!step) return null;
    if (step.type === "cut") {
      const cut = path[step.keep], prev = step.keep ? path[step.keep - 1] : null;
      history.push(path.slice()); path.length = step.keep; backtracks++; draw();
      const marks = [cellMark(cut[0], cut[1], "var(--bad)")]; if (prev) marks.push(segMark(prev, cut, "var(--bad)"));
      flash(marks, 900); haptic(20);
      setMsg("Ab hier war's falsch", true);
      return "Ab hier war's falsch – zurückgesetzt";
    }
    // stage 1: dashed preview of the next cells up to the next waypoint
    const pts = (path.length ? [path[path.length - 1]] : []).concat(step.cells);
    previewLine.setAttribute("points", pts.map(([r, c]) => mid(r, c).join(",")).join(" "));
    previewLine.setAttribute("visibility", "visible");
    pending = { key: pathKey(), cells: step.cells, target: step.target, at: Date.now() };
    setTimeout(() => { if (pending && Date.now() - pending.at >= HINT_TTL) clearPreview(); }, HINT_TTL + 50);
    const where = step.target != null ? `So geht's weiter bis zur ${step.target}` : "So geht's weiter";
    setMsg(`${where} – nochmal tippen zum Zeichnen`);
    return `${where} – Tipp nochmal tippen, um zu zeichnen`;
  };

  draw(); return b;
}
