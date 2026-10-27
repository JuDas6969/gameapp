import { S, svgEl, base, txt, msgBar } from "./_shared.js";
import * as tango from "../engine/tango.js";

const EMOJI = ["☀️", "🌙"];
const SYM = ["☀", "🌙"], ART = ["eine ☀", "ein 🌙"], DAT = ["einer ☀", "einem 🌙"];

/** SVG sun: disc + 8 rays, coloured via --sun. */
function sunGlyph(cx, cy) {
  const g = svgEl("g", { fill: "var(--sun)", stroke: "var(--sun)" });
  g.append(svgEl("circle", { cx, cy, r: 17, stroke: "none" }));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, r0 = 24, r1 = 32;
    g.append(svgEl("line", { x1: cx + Math.cos(a) * r0, y1: cy + Math.sin(a) * r0, x2: cx + Math.cos(a) * r1, y2: cy + Math.sin(a) * r1, "stroke-width": 5.5, "stroke-linecap": "round" }));
  }
  return g;
}
/** SVG crescent moon, coloured via --moon. Outer radius 25, inner circle offset to the right. */
function moonGlyph(cx, cy) {
  const g = svgEl("g", { transform: `translate(${cx} ${cy}) rotate(-20)` });
  // outer circle r=25 centred (0,0); inner circle r=20 centred (12,0); intersections x≈15.2, y≈±19.8
  const x = 15.4, y = 19.7;
  g.append(svgEl("path", { d: `M ${x} ${-y} A 25 25 0 1 0 ${x} ${y} A 20 20 0 1 1 ${x} ${-y} Z`, fill: "var(--moon)", stroke: "none" }));
  return g;
}

export function Tango(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice()); const b = base(n);
  const cells = []; // { sun, moon, ring }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = c * S, y = r * S, cx = x + S / 2, cy = y + S / 2;
    if (p.givens[r][c] !== -1) b.layers.bg.append(svgEl("rect", { x, y, width: S, height: S, fill: "var(--ink)", opacity: 0.13 }));
    const sun = sunGlyph(cx, cy), moon = moonGlyph(cx, cy);
    const ring = svgEl("rect", { x: x + 4, y: y + 4, width: S - 8, height: S - 8, rx: 10, fill: "none", stroke: "var(--bad)", "stroke-width": 5, visibility: "hidden" });
    b.layers.cells.append(sun, moon); b.layers.mid.append(ring);
    cells.push({ sun, moon, ring });
  }
  for (const k of p.constraints) {
    const x = ((k.a[1] + k.b[1]) / 2 + 0.5) * S, y = ((k.a[0] + k.b[0]) / 2 + 0.5) * S;
    // small symbol directly on the cell edge, no circle (LinkedIn look)
    b.layers.top.append(txt(x, y + (k.eq ? 0 : 1), k.eq ? "=" : "×", k.eq ? 30 : 32, "cell-txt", { "font-weight": 700, style: "fill:var(--muted)" }));
  }
  msgBar(tools, "Tippen: leer → Sonne → Mond");

  // conflicts are shown with a short delay so cycling Sonne → Mond doesn't flash red in between
  let badShown = new Set(), badTimer = null;
  const draw = (immediate = false) => {
    const bad = tango.conflicts(p, g);
    clearTimeout(badTimer);
    if (immediate || bad.size === 0) badShown = bad;
    else { badShown = new Set([...badShown].filter((k) => bad.has(k))); badTimer = setTimeout(() => { badShown = tango.conflicts(p, g); paint(); }, 700); }
    paint();
  };
  const paint = () => {
    const bad = badShown;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const { sun, moon, ring } = cells[r * n + c], v = g[r][c];
      sun.setAttribute("visibility", v === 0 ? "visible" : "hidden");
      moon.setAttribute("visibility", v === 1 ? "visible" : "hidden");
      ring.setAttribute("visibility", bad.has(r * 64 + c) ? "visible" : "hidden");
    }
  };
  const check = () => { if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved(); };

  // undo stack (snapshots of g before each player move) + first-5 metric
  const undoStack = [], firstFive = [];
  const snapshot = () => { undoStack.push(g.map((r) => r.slice())); if (undoStack.length > 400) undoStack.shift(); };
  const restore = (s) => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = s[r][c]; };
  const record = (r, c, v) => { if (v !== -1 && v === p.solution[r][c] && firstFive.length < 5) firstFive.push(v); };
  
  b.drag({ onEnd: (moved, last, [r, c]) => {
    if (moved || p.givens[r][c] !== -1) return;
    snapshot();
    g[r][c] = g[r][c] === 1 ? -1 : g[r][c] + 1; record(r, c, g[r][c]); haptic(); draw(); check();
  } });
  b.canUndo = () => undoStack.length > 0;
  b.undo = () => { if (!undoStack.length) return false; restore(undoStack.pop()); draw(true); return true; };
  b.clear = () => {
    if (!g.some((row, r) => row.some((v, c) => p.givens[r][c] === -1 && v !== -1))) return false;
    snapshot(); restore(p.givens); draw(true); return true;
  };
  b.metrics = () => ({ line: `Erste 5: ${firstFive.map((v) => EMOJI[v]).join(" ")}`.trim() });

  /** LinkedIn-style hint: reason + action; spotlight via base(), apply() sets the symbol (undo-able). */
  const setTo = (r, c, v) => () => { snapshot(); g[r][c] = v; record(r, c, v); draw(true); check(); };
  const lineCells = (kind, i) => [...Array(n).keys()].map((j) => (kind === "row" ? [i, j] : [j, i]));
  b.hint = () => {
    // (a) wrong entry first
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (p.givens[r][c] === -1 && g[r][c] !== -1 && g[r][c] !== p.solution[r][c])
        return { text: `Dieses Feld widerspricht der Lösung: Hier gehört kein ${SYM[g[r][c]]} hin.\nEntfernen Sie es.`, strike: [[r, c]], apply: setTo(r, c, -1) };
    const d = tango.explain(p, g);
    if (d && d.v === p.solution[d.r][d.c]) {
      const t = [[d.r, d.c]], todo = `Deshalb muss die hervorgehobene Zelle ${ART[d.v]} sein.`, apply = setTo(d.r, d.c, d.v);
      if (d.rule === "constraint") return { text: `${d.eq ? "Durch ein = getrennte Zellen müssen vom gleichen Typ sein." : "Durch ein × getrennte Zellen müssen verschieden sein."}\n${todo}`, focus: d.cells, target: t, apply };
      if (d.rule === "pair" || d.rule === "gap") return { text: `Es dürfen höchstens zwei ☀ oder 🌙 waagrecht oder senkrecht nebeneinander liegen.\n${todo}`, focus: d.cells, target: t, apply };
      if (d.rule === "count") {
        const row = d.line.kind === "row";
        return { text: `${row ? "Jede Zeile (und Spalte)" : "Jede Spalte (und Zeile)"} enthält gleich viele ☀ und 🌙. Diese ${row ? "Zeile" : "Spalte"} hat schon drei ${SYM[d.full]}.\n${todo}`,
          focus: lineCells(d.line.kind, d.line.i), target: t, apply };
      }
      if (d.rule === "trial") return { text: `Mit ${DAT[d.tried]} in dieser Zelle führen die Regeln zwangsläufig zu einem Widerspruch (drei gleiche nebeneinander, ungleiche Anzahl oder verletztes =/×).\n${todo}`, target: t, apply };
    }
    // (c) fallback: uniqueness
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] === -1) {
      const v = p.solution[r][c];
      return { text: `Mit ${DAT[1 - v]} hier lässt sich das Rätsel nicht widerspruchsfrei zu Ende füllen.\nDeshalb muss die hervorgehobene Zelle ${ART[v]} sein.`, target: [[r, c]], apply: setTo(r, c, v) };
    }
    return null;
  };
  draw(); return b;
}
