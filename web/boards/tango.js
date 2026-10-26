import { S, svgEl, base, txt, msgBar } from "./_shared.js";
import * as tango from "../engine/tango.js";

const NAME = ["Sonne", "Mond"], NAME_PL = ["Sonnen", "Monde"];

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
    if (p.givens[r][c] !== -1) b.layers.bg.append(svgEl("rect", { x, y, width: S, height: S, fill: "var(--ink)", opacity: 0.08 }));
    const sun = sunGlyph(cx, cy), moon = moonGlyph(cx, cy);
    const ring = svgEl("rect", { x: x + 4, y: y + 4, width: S - 8, height: S - 8, rx: 10, fill: "none", stroke: "var(--bad)", "stroke-width": 5, visibility: "hidden" });
    b.layers.cells.append(sun, moon); b.layers.mid.append(ring);
    cells.push({ sun, moon, ring });
  }
  for (const k of p.constraints) {
    const x = ((k.a[1] + k.b[1]) / 2 + 0.5) * S, y = ((k.a[0] + k.b[0]) / 2 + 0.5) * S;
    b.layers.top.append(svgEl("circle", { cx: x, cy: y, r: 19, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 3 }));
    b.layers.top.append(txt(x, y + (k.eq ? 1 : 2), k.eq ? "=" : "×", k.eq ? 30 : 34, "cell-txt", { "font-weight": 900 }));
  }
  msgBar(tools, "Tippen: leer → Sonne → Mond");

  const lineDone = (kind, i) => {
    for (let j = 0; j < n; j++) { const [r, c] = kind === "row" ? [i, j] : [j, i]; if (g[r][c] === -1 || g[r][c] !== p.solution[r][c]) return false; }
    return true;
  };
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
    const rowsDone = [...Array(n).keys()].map((i) => lineDone("row", i)), colsDone = [...Array(n).keys()].map((i) => lineDone("col", i));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const { sun, moon, ring } = cells[r * n + c], v = g[r][c];
      sun.setAttribute("visibility", v === 0 ? "visible" : "hidden");
      moon.setAttribute("visibility", v === 1 ? "visible" : "hidden");
      ring.setAttribute("visibility", bad.has(r * 64 + c) ? "visible" : "hidden");
      const dim = (rowsDone[r] || colsDone[c]) && !bad.size ? 0.6 : 1;
      sun.setAttribute("opacity", dim); moon.setAttribute("opacity", dim);
    }
  };
  const check = () => { if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved(); };
  b.drag({ onEnd: (moved, last, [r, c]) => {
    if (moved || p.givens[r][c] !== -1) return;
    g[r][c] = g[r][c] === 1 ? -1 : g[r][c] + 1; haptic(); draw(); check();
  } });

  const flash = (r, c, soft = false) => {
    const rect = svgEl("rect", { x: c * S + 3, y: r * S + 3, width: S - 6, height: S - 6, rx: 10, class: "hintcell", opacity: soft ? 0.18 : 0.35 });
    b.layers.bg.append(rect); setTimeout(() => rect.remove(), soft ? 1400 : 1600);
  };
  const place = (r, c, v, msg, extra = []) => {
    g[r][c] = v; draw(); flash(r, c); for (const [er, ec] of extra) flash(er, ec, true);
    check(); return msg;
  };
  b.hint = () => {
    // (a) wrong entry
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (p.givens[r][c] === -1 && g[r][c] !== -1 && g[r][c] !== p.solution[r][c]) return place(r, c, p.solution[r][c], "Dieses Feld ist falsch");
    // (b) explained deduction
    const d = tango.deduce(p, g);
    if (d && d.v === p.solution[d.r][d.c]) {
      const w = NAME[d.v];
      if (d.rule === "pair") return place(d.r, d.c, d.v, `Zwei ${NAME_PL[1 - d.v]} nebeneinander – hier muss ${d.v === 0 ? "eine" : "ein"} ${w} hin`, d.cells);
      if (d.rule === "gap") return place(d.r, d.c, d.v, `Zwischen zwei ${d.v === 0 ? "Monden" : "Sonnen"} muss ${d.v === 0 ? "eine" : "ein"} ${w} stehen`, d.cells);
      if (d.rule === "count") return place(d.r, d.c, d.v, `${d.line.kind === "row" ? "Zeile" : "Spalte"} ${d.line.i + 1} hat schon drei ${NAME_PL[d.full]} – der Rest sind ${NAME_PL[d.v]}`);
      if (d.rule === "constraint") return place(d.r, d.c, d.v, d.eq ? `„=“: gleich wie der Nachbar – also ${w}` : `„ד: anders als der Nachbar – also ${w}`, d.cells);
    }
    // (c) fallback: one solution cell
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (g[r][c] === -1) return place(r, c, p.solution[r][c], `Hier gehört ${p.solution[r][c] === 0 ? "eine Sonne" : "ein Mond"} hin`);
    return null;
  };
  draw(); return b;
}
