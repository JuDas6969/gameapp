import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as sudoku from "../engine/sudoku.js";

export function Sudoku(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice());
  const b = base(n, { strong: [2, 3] }); let sel = null;
  const rects = [], texts = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "transparent" }); b.layers.cells.append(rc); rects.push(rc);
    const t = txt(c * S + S / 2, r * S + S / 2, "", 50); b.layers.top.append(t); texts.push(t);
    rc.addEventListener("pointerdown", (e) => { e.preventDefault(); sel = [r, c]; haptic(); draw(); });
  }
  const draw = () => {
    const bad = sudoku.conflicts(g);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, v = g[r][c], given = p.givens[r][c] !== 0;
      let fill = "transparent";
      if (sel) {
        const [sr, sc] = sel, sv = g[sr][sc];
        if (sr === r && sc === c) fill = "var(--accent-soft)";
        else if (sv && sv === v) fill = "var(--accent-soft)";
        else if (sr === r || sc === c || ((sr >> 1) === (r >> 1) && Math.floor(sc / 3) === Math.floor(c / 3))) fill = "rgba(127,127,127,.09)";
      }
      rects[i].setAttribute("fill", fill);
      texts[i].textContent = v || ""; texts[i].setAttribute("class", `cell-txt ${given ? "given" : "entry"}${bad.has(r * 64 + c) ? " bad" : ""}`);
      texts[i].setAttribute("font-weight", given ? 800 : 500);
    }
  };
  const enter = (v) => {
    if (!sel || p.givens[sel[0]][sel[1]] !== 0) return;
    g[sel[0]][sel[1]] = v; haptic(); draw();
    if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved();
  };
  const pad = h("div", { class: "numpad" }, [1, 2, 3, 4, 5, 6].map((v) => h("button", { onclick: () => enter(v) }, String(v))), h("button", { onclick: () => enter(0) }, "⌫"));
  tools.replaceChildren(pad);
  draw(); return b;
}
