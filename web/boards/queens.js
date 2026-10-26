import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as queens from "../engine/queens.js";

export function Queens(p, { onSolved, tools, haptic }) {
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
