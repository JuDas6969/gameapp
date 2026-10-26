import { S, svgEl, h, base, txt } from "./_shared.js";
import * as sudoku from "../engine/sudoku.js";

const UNIT_LABEL = { Zeile: "in dieser Zeile", Spalte: "in dieser Spalte", Block: "in diesem Block" };

export function Sudoku(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice());
  const b = base(n, { strong: [2, 3] }); let sel = null, pencil = false, hintTimer = null;
  const notes = Array.from({ length: n * n }, () => new Set());
  const rects = [], texts = [], noteTexts = [];
  const sameBlock = (r1, c1, r2, c2) => (r1 >> 1) === (r2 >> 1) && Math.floor(c1 / 3) === Math.floor(c2 / 3);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "transparent" }); b.layers.cells.append(rc); rects.push(rc);
    const t = txt(c * S + S / 2, r * S + S / 2, "", 50); b.layers.top.append(t); texts.push(t);
    // 3×2 candidate digits: 1-3 top row, 4-6 bottom row
    const ns = [];
    for (let v = 1; v <= 6; v++) {
      const col = (v - 1) % 3, row = v > 3 ? 1 : 0;
      const nt = txt(c * S + S / 6 + col * (S / 3), r * S + S / 3 + row * (S / 3), "", 24, "cell-txt", { fill: "var(--muted)", "font-weight": 600 });
      b.layers.top.append(nt); ns.push(nt);
    }
    noteTexts.push(ns);
    rc.addEventListener("pointerdown", (e) => { e.preventDefault(); sel = [r, c]; haptic(); draw(); });
  }
  const counts = () => { const k = Array(7).fill(0); for (const row of g) for (const v of row) if (v) k[v]++; return k; };
  const draw = () => {
    const bad = sudoku.conflicts(g);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, v = g[r][c], given = p.givens[r][c] !== 0;
      let fill = "transparent";
      if (sel) {
        const [sr, sc] = sel, sv = g[sr][sc];
        if (sr === r && sc === c) fill = "var(--accent-soft)";
        else if (sv && sv === v) fill = "var(--accent-soft)";
        else if (sr === r || sc === c || sameBlock(sr, sc, r, c)) fill = "rgba(127,127,127,.09)";
      }
      rects[i].setAttribute("fill", fill);
      texts[i].textContent = v || ""; texts[i].setAttribute("class", `cell-txt ${given ? "given" : "entry"}${bad.has(r * 64 + c) ? " bad" : ""}`);
      texts[i].setAttribute("font-weight", given ? 800 : 500);
      for (let d = 1; d <= 6; d++) noteTexts[i][d - 1].textContent = !v && notes[i].has(d) ? String(d) : "";
    }
    const k = counts();
    digitBtns.forEach((btn, idx) => { btn.disabled = k[idx + 1] >= 6; });
    pencilBtn.style.background = pencil ? "var(--accent-soft)" : "";
    pencilBtn.style.borderColor = pencil ? "var(--accent)" : "";
    pencilBtn.setAttribute("aria-pressed", String(pencil));
  };
  const clearPeerNotes = (r, c, v) => {
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++)
      if (rr === r || cc === c || sameBlock(r, c, rr, cc)) notes[rr * n + cc].delete(v);
  };
  const place = (r, c, v) => {
    g[r][c] = v;
    if (v) { notes[r * n + c].clear(); clearPeerNotes(r, c, v); }
  };
  const checkSolved = () => { if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved(); };
  const enter = (v) => {
    if (!sel || p.givens[sel[0]][sel[1]] !== 0) return;
    const [r, c] = sel, i = r * n + c;
    if (v === 0) {
      if (g[r][c]) g[r][c] = 0; else notes[i].clear();
    } else if (pencil && !g[r][c]) {
      if (notes[i].has(v)) notes[i].delete(v); else notes[i].add(v);
    } else place(r, c, v);
    haptic(); draw();
    checkSolved();
  };
  const digitBtns = [1, 2, 3, 4, 5, 6].map((v) => h("button", { onclick: () => enter(v) }, String(v)));
  const pencilBtn = h("button", { title: "Notizen", "aria-label": "Notizen-Modus", onclick: () => { pencil = !pencil; haptic(); draw(); } }, "✎");
  const pad = h("div", { class: "numpad", style: "grid-template-columns:repeat(8,1fr)" }, digitBtns, h("button", { onclick: () => enter(0) }, "⌫"), pencilBtn);
  tools.replaceChildren(pad);

  const hint = () => {
    const step = sudoku.findHint(g, p.solution, p.givens);
    if (!step) return null;
    const { r, c, v } = step;
    place(r, c, v); sel = [r, c]; draw();
    const rc = rects[r * n + c];
    clearTimeout(hintTimer); rects.forEach((x) => x.classList.remove("hintcell"));
    rc.classList.add("hintcell");
    hintTimer = setTimeout(() => { rc.classList.remove("hintcell"); draw(); }, 1200);
    const pos = `Zeile ${r + 1}, Spalte ${c + 1}`;
    let msg;
    if (step.type === "fix") msg = `Die ${step.old} in Zeile ${r + 1}, Spalte ${c + 1} war falsch – richtig ist die ${v}.`;
    else if (step.type === "naked") msg = `${pos}: nur die ${v} passt.`;
    else if (step.type === "hidden") msg = `${pos}: die ${v} geht ${UNIT_LABEL[step.unit]} nur hier.`;
    else msg = `${pos}: hier kommt die ${v} hin.`;
    checkSolved();
    return msg;
  };
  draw(); return { ...b, hint };
}
