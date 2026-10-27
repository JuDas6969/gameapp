import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as queens from "../engine/queens.js";

const AUTOX_KEY = "raetsel.queens.autox";
const loadAutoX = () => { try { return localStorage.getItem(AUTOX_KEY) !== "0"; } catch { return true; } };
const saveAutoX = (on) => { try { localStorage.setItem(AUTOX_KEY, on ? "1" : "0"); } catch {} };
// Crown glyph, drawn in a 100×100 cell (centred). Pure path so the colour follows --ink / --bad in both themes.
const CROWN = "M20 64 L15 30 L35 46 L50 22 L65 46 L85 30 L80 64 Z M20 70 H80 V80 H20 Z";
// Region index (REGION(i) → --r1..--r12) → emoji square for the share line.
const EMOJI = ["🟥", "🟦", "🟩", "🟨", "🟪", "🟫", "🟧", "⬜", "⬛", "🟧", "🟩", "🟥"];
const HINT_TTL = 20000; // ms the first (highlight-only) hint stays valid for the second (apply) call

export function Queens(p, { onSolved, tools, haptic }) {
  const n = p.n, marks = Array.from({ length: n }, () => Array(n).fill(0)); // 0 empty, 1 ×, 2 queen
  let autoBy = new Map(); // cellKey -> Set(queenKey) that auto-placed the × there
  let autoX = loadAutoX();
  const key = (r, c) => r * 64 + c, rc = (k) => [Math.floor(k / 64), k % 64];
  const b = base(n); const xs = [], crowns = [], shades = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    b.layers.bg.append(svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: REGION(p.regions[r][c]) }));
    const sh = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "#000", "fill-opacity": 0, style: "pointer-events:none" }); b.layers.cells.append(sh); shades.push(sh);
    const t = txt(c * S + S / 2, r * S + S / 2, "", 44); b.layers.top.append(t); xs.push(t);
    const q = svgEl("path", { d: CROWN, transform: `translate(${c * S} ${r * S}) scale(.72) translate(19 19)`, class: "cell-txt", "stroke-linejoin": "round", stroke: "var(--ink)", "stroke-width": 4, display: "none" });
    b.layers.top.append(q); crowns.push(q);
    if (c + 1 < n && p.regions[r][c] !== p.regions[r][c + 1]) b.layers.mid.append(svgEl("line", { x1: (c + 1) * S, y1: r * S, x2: (c + 1) * S, y2: (r + 1) * S, stroke: "var(--line-strong)", "stroke-width": 5 }));
    if (r + 1 < n && p.regions[r][c] !== p.regions[r + 1][c]) b.layers.mid.append(svgEl("line", { x1: c * S, y1: (r + 1) * S, x2: (c + 1) * S, y2: (r + 1) * S, stroke: "var(--line-strong)", "stroke-width": 5 }));
  }
  const setMsg = msgBar(tools, "Tippen: leer → × → ♛ · Ziehen malt ×");
  const autoBtn = h("button", { onclick: () => { autoX = !autoX; saveAutoX(autoX); autoBtn.textContent = `Auto-×: ${autoX ? "an" : "aus"}`; haptic(); } }, `Auto-×: ${autoX ? "an" : "aus"}`);
  tools.append(autoBtn);

  // ---- undo stack (snapshot of marks + autoBy per player action) ----
  const stack = [];
  const sig = () => marks.map((row) => row.join("")).join("|");
  const snapshot = () => ({ marks: marks.map((row) => row.slice()), autoBy: new Map([...autoBy].map(([k, s]) => [k, new Set(s)])) });
  const restore = (s) => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) marks[r][c] = s.marks[r][c]; autoBy = s.autoBy; };
  const push = () => { stack.push(snapshot()); if (stack.length > 500) stack.shift(); };

  // ---- metrics: regions of the first three correctly placed queens, in order of placement ----
  const firstGood = [], goodSeen = new Set();
  const noteGood = (r, c) => {
    if (p.solution[r] !== c || goodSeen.has(key(r, c))) return;
    goodSeen.add(key(r, c)); if (firstGood.length < 3) firstGood.push(p.regions[r][c]);
  };

  // ---- marks management ----
  const setManual = (r, c, v) => { marks[r][c] = v; autoBy.delete(key(r, c)); };
  const placeQueen = (r, c, forceX = false) => {
    marks[r][c] = 2; autoBy.delete(key(r, c)); noteGood(r, c);
    if (!autoX && !forceX) return;
    const qk = key(r, c);
    for (const k of queens.autoCells(p, r, c)) {
      const [rr, cc] = rc(k);
      if (marks[rr][cc] === 0) { marks[rr][cc] = 1; autoBy.set(k, new Set([qk])); }
      else if (marks[rr][cc] === 1 && autoBy.has(k)) autoBy.get(k).add(qk);
    }
  };
  const removeQueen = (r, c) => {
    marks[r][c] = 0; const qk = key(r, c);
    for (const k of queens.autoCells(p, r, c)) {
      const s = autoBy.get(k); if (!s || !s.delete(qk) || s.size) continue;
      autoBy.delete(k); const [rr, cc] = rc(k); if (marks[rr][cc] === 1) marks[rr][cc] = 0;
    }
  };

  // ---- rendering ----
  let solvedFired = false;
  const draw = () => {
    const qs = new Set(); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (marks[r][c] === 2) qs.add(key(r, c));
    const bad = queens.conflicts(p, qs);
    const rowQ = Array(n).fill(false), colQ = Array(n).fill(false);
    for (const k of qs) { rowQ[Math.floor(k / 64)] = true; colQ[k % 64] = true; }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, m = marks[r][c], isBad = bad.has(key(r, c));
      xs[i].textContent = m === 1 ? "×" : "";
      xs[i].setAttribute("fill", "var(--muted)");
      if (m !== 2) crowns[i].setAttribute("display", "none"); else crowns[i].removeAttribute("display");
      crowns[i].setAttribute("class", "cell-txt" + (isBad ? " bad" : ""));
      crowns[i].setAttribute("stroke", isBad ? "var(--bad)" : "var(--ink)");
      shades[i].setAttribute("fill-opacity", m !== 2 && (rowQ[r] || colQ[c]) ? 0.1 : 0);
    }
    const left = n - qs.size;
    if (bad.size) setMsg("Konflikt: Königinnen bedrohen sich", true);
    else setMsg(left === 0 ? "Alle Königinnen gesetzt" : `Noch ${left} Königin${left === 1 ? "" : "nen"} · Ziehen malt ×`);
    if (!solvedFired && queens.isSolved(p, qs)) { solvedFired = true; onSolved(); }
  };
  const flash = (cells) => {
    const rects = cells.map(([r, c]) => svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "var(--ok)", "fill-opacity": .4, style: "pointer-events:none" }));
    b.layers.top.append(...rects); setTimeout(() => rects.forEach((x) => x.remove()), 900);
  };

  // ---- two-stage hint state ----
  let pending = null; // { cells, apply, msg, t, rects, timer }
  const clearHint = () => {
    if (!pending) return;
    pending.rects.forEach((x) => x.remove()); clearTimeout(pending.timer); pending = null;
  };
  const pulse = (cells, color) => cells.map(([r, c]) => {
    const rect = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: color, "fill-opacity": .35, style: "pointer-events:none" });
    rect.append(svgEl("animate", { attributeName: "fill-opacity", values: "0.15;0.55;0.15", dur: "1.1s", repeatCount: "indefinite" }));
    b.layers.top.append(rect); return rect;
  });

  // ---- input ----
  let paintVal = null, before = null;
  b.drag({
    onStart: ([r, c]) => { clearHint(); push(); before = sig(); paintVal = marks[r][c] === 0 ? 1 : 0; },
    onMove: ([r, c], start) => {
      if (marks[start[0]][start[1]] !== 2) setManual(start[0], start[1], paintVal);
      if (marks[r][c] !== 2) setManual(r, c, paintVal); draw();
    },
    onEnd: (moved, last, [r, c]) => {
      if (!moved) { const m = marks[r][c]; if (m === 0) setManual(r, c, 1); else if (m === 1) placeQueen(r, c); else removeQueen(r, c); haptic(); }
      if (sig() === before) stack.pop(); // nothing changed → no undo entry
      draw();
    },
  });

  // ---- hint ----
  // Computes the next logical step: { cells (to highlight), msg (explanation), done (toast after applying), apply(), color? }
  const nextStep = () => {
    const placed = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (marks[r][c] === 2) placed.push([r, c]);
    // (a) wrong queen → remove
    const wrong = placed.find(([r, c]) => p.solution[r] !== c);
    if (wrong) return { cells: [wrong], color: "var(--bad)", msg: "Diese Königin steht falsch – nochmal tippen zum Entfernen", done: "Königin entfernt", apply: () => removeQueen(...wrong) };
    const good = placed.map(([r, c]) => key(r, c));
    const ex = queens.excluded(p, good);
    const regDone = new Set(good.map((k) => p.regions[Math.floor(k / 64)][k % 64]));
    const open = (r, c) => !ex.has(key(r, c)) && !regDone.has(p.regions[r][c]);
    const placeStep = (cell, area, msg) => ({ cells: area, msg: `${msg} – nochmal tippen zum Setzen`, done: "Königin gesetzt", apply: () => placeQueen(...cell) });
    // (b) region with a single remaining cell → highlight whole region
    const byReg = new Map();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (open(r, c)) { const g = p.regions[r][c]; if (!byReg.has(g)) byReg.set(g, []); byReg.get(g).push([r, c]); }
    for (const [g, cells] of byReg) if (cells.length === 1) {
      const area = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.regions[r][c] === g) area.push([r, c]);
      return placeStep(cells[0], area, "In dieser Region bleibt nur ein freies Feld");
    }
    // (c) row / column with a single remaining cell → highlight row / column
    const rowQ = new Set(good.map((k) => Math.floor(k / 64))), colQ = new Set(good.map((k) => k % 64));
    for (let r = 0; r < n; r++) if (!rowQ.has(r)) {
      const cells = []; for (let c = 0; c < n; c++) if (open(r, c)) cells.push([r, c]);
      if (cells.length === 1) return placeStep(cells[0], Array.from({ length: n }, (_, c) => [r, c]), "In dieser Zeile bleibt nur ein freies Feld");
    }
    for (let c = 0; c < n; c++) if (!colQ.has(c)) {
      const cells = []; for (let r = 0; r < n; r++) if (open(r, c)) cells.push([r, c]);
      if (cells.length === 1) return placeStep(cells[0], Array.from({ length: n }, (_, r) => [r, c]), "In dieser Spalte bleibt nur ein freies Feld");
    }
    // (d) mark the cells excluded by a correct queen (row, column, neighbours, region)
    for (const [r, c] of placed) {
      const todo = queens.autoCells(p, r, c).filter((k) => marks[Math.floor(k / 64)][k % 64] === 0);
      if (!todo.length) continue;
      const qk = key(r, c);
      return { cells: todo.map(rc), msg: "Diese Felder schließt die Königin aus – nochmal tippen zum Markieren", done: "Ausgeschlossene Felder markiert",
        apply: () => { for (const k of todo) { const [rr, cc] = rc(k); marks[rr][cc] = 1; autoBy.set(k, new Set([qk])); } } };
    }
    // (e) fallback: place a correct queen
    for (let r = 0; r < n; r++) if (!rowQ.has(r)) return placeStep([r, p.solution[r]], Array.from({ length: n }, (_, c) => [r, c]), "In dieser Zeile fehlt noch eine Königin");
    return null;
  };
  const hint = () => {
    if (pending && Date.now() - pending.t < HINT_TTL) {
      // 2nd call: apply the highlighted step
      const st = pending; clearHint();
      push(); st.apply(); draw(); flash(st.cells.length <= 3 ? st.cells : st.cells.slice(0, 0)); // short flash only for single-cell steps
      return st.done;
    }
    clearHint();
    const st = nextStep(); if (!st) return null;
    pending = { ...st, t: Date.now(), rects: pulse(st.cells, st.color || "var(--ok)"), timer: setTimeout(clearHint, HINT_TTL) };
    return st.msg;
  };

  // ---- public actions ----
  const canUndo = () => stack.length > 0;
  const undo = () => {
    if (!stack.length) return false;
    clearHint(); restore(stack.pop()); draw(); return true;
  };
  const clear = () => {
    clearHint();
    if (sig() === marks.map((row) => "0".repeat(n)).join("|")) return;
    push(); for (let r = 0; r < n; r++) marks[r].fill(0); autoBy = new Map(); draw();
  };
  const metrics = () => ({ line: `Erste 👑: ${firstGood.map((g) => EMOJI[g % 12]).join(" ")}`.trim() });

  draw();
  return { ...b, hint, undo, canUndo, clear, metrics };
}
