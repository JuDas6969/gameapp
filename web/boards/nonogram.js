import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as nonogram from "../engine/nonogram.js";

export function Nonogram(p, { onSolved, tools, haptic }) {
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
