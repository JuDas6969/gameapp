import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as queens from "../engine/queens.js";

const AUTOX_KEY = "raetsel.queens.autox";
const loadAutoX = () => { try { return localStorage.getItem(AUTOX_KEY) !== "0"; } catch { return true; } };
const saveAutoX = (on) => { try { localStorage.setItem(AUTOX_KEY, on ? "1" : "0"); } catch {} };
// Crown glyph, drawn in a 100×100 cell (centred). Pure path so the colour follows --ink / --bad in both themes.
const CROWN = "M20 64 L15 30 L35 46 L50 22 L65 46 L85 30 L80 64 Z M20 70 H80 V80 H20 Z";

export function Queens(p, { onSolved, tools, haptic }) {
  const n = p.n, marks = Array.from({ length: n }, () => Array(n).fill(0)); // 0 empty, 1 ×, 2 queen
  const autoBy = new Map(); // cellKey -> Set(queenKey) that auto-placed the × there
  let autoX = loadAutoX();
  const key = (r, c) => r * 64 + c;
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

  // ---- marks management ----
  const setManual = (r, c, v) => { marks[r][c] = v; autoBy.delete(key(r, c)); };
  const placeQueen = (r, c, forceX = false) => {
    marks[r][c] = 2; autoBy.delete(key(r, c));
    if (!autoX && !forceX) return;
    const qk = key(r, c);
    for (const k of queens.attacked(n, r, c)) {
      const rr = Math.floor(k / 64), cc = k % 64;
      if (marks[rr][cc] === 0) { marks[rr][cc] = 1; autoBy.set(k, new Set([qk])); }
      else if (marks[rr][cc] === 1 && autoBy.has(k)) autoBy.get(k).add(qk);
    }
  };
  const removeQueen = (r, c) => {
    marks[r][c] = 0; const qk = key(r, c);
    for (const k of queens.attacked(n, r, c)) {
      const s = autoBy.get(k); if (!s || !s.delete(qk) || s.size) continue;
      autoBy.delete(k); const rr = Math.floor(k / 64), cc = k % 64; if (marks[rr][cc] === 1) marks[rr][cc] = 0;
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

  // ---- input ----
  let paintVal = null;
  b.drag({
    onStart: ([r, c]) => { paintVal = marks[r][c] === 0 ? 1 : 0; },
    onMove: ([r, c], start) => {
      if (marks[start[0]][start[1]] !== 2) setManual(start[0], start[1], paintVal);
      if (marks[r][c] !== 2) setManual(r, c, paintVal); draw();
    },
    onEnd: (moved, last, [r, c]) => {
      if (!moved) { const m = marks[r][c]; if (m === 0) setManual(r, c, 1); else if (m === 1) placeQueen(r, c); else removeQueen(r, c); haptic(); }
      draw();
    },
  });

  // ---- hint ----
  const hint = () => {
    const placed = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (marks[r][c] === 2) placed.push([r, c]);
    // (a) wrong queen → remove
    const wrong = placed.find(([r, c]) => p.solution[r] !== c);
    if (wrong) { removeQueen(...wrong); draw(); flash([wrong]); return "Diese Königin steht falsch"; }
    const good = placed.map(([r, c]) => key(r, c));
    const ex = queens.excluded(p, good);
    const regDone = new Set(good.map((k) => p.regions[Math.floor(k / 64)][k % 64]));
    const open = (r, c) => !ex.has(key(r, c)) && !regDone.has(p.regions[r][c]);
    const place = ([r, c], msg) => { placeQueen(r, c); draw(); flash([[r, c]]); return msg; };
    // (b) region with a single remaining cell
    const byReg = new Map();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (open(r, c)) { const g = p.regions[r][c]; if (!byReg.has(g)) byReg.set(g, []); byReg.get(g).push([r, c]); }
    for (const [, cells] of byReg) if (cells.length === 1) return place(cells[0], "In dieser Region bleibt nur ein Feld");
    // (c) row / column with a single remaining cell
    const rowQ = new Set(good.map((k) => Math.floor(k / 64))), colQ = new Set(good.map((k) => k % 64));
    for (let r = 0; r < n; r++) if (!rowQ.has(r)) { const cells = []; for (let c = 0; c < n; c++) if (open(r, c)) cells.push([r, c]); if (cells.length === 1) return place(cells[0], "In dieser Zeile bleibt nur ein Feld"); }
    for (let c = 0; c < n; c++) if (!colQ.has(c)) { const cells = []; for (let r = 0; r < n; r++) if (open(r, c)) cells.push([r, c]); if (cells.length === 1) return place(cells[0], "In dieser Spalte bleibt nur ein Feld"); }
    // (d) mark the cells excluded by a correct queen
    for (const [r, c] of placed) {
      const todo = queens.attacked(n, r, c).filter((k) => marks[Math.floor(k / 64)][k % 64] === 0);
      if (!todo.length) continue;
      const qk = key(r, c);
      for (const k of todo) { marks[Math.floor(k / 64)][k % 64] = 1; autoBy.set(k, new Set([qk])); }
      draw(); flash(todo.map((k) => [Math.floor(k / 64), k % 64])); return "Ausgeschlossene Felder markiert";
    }
    // (e) fallback: place a correct queen
    for (let r = 0; r < n; r++) if (!rowQ.has(r)) return place([r, p.solution[r]], "Hier steht eine Königin");
    return null;
  };

  draw();
  return { ...b, hint };
}
