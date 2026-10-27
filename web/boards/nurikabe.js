import { S, svgEl, h, base, txt } from "./_shared.js";
import * as nurikabe from "../engine/nurikabe.js";

/** Nurikabe („Inseln“). g: 0 unbekannt, 1 Wasser, 2 Insel-Markierung. */
export function Nurikabe(p, { onSolved, tools, haptic }) {
  const n = p.n, g = Array.from({ length: n }, () => Array(n).fill(0));
  const b = base(n, { bg: "var(--card)" });
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = c * S, y = r * S;
    const done = svgEl("rect", { x, y, width: S, height: S, fill: "var(--ok)", "fill-opacity": .18, visibility: "hidden" });
    const water = svgEl("rect", { x: x + 3, y: y + 3, width: S - 6, height: S - 6, rx: 6, fill: "transparent" });
    const dot = svgEl("circle", { cx: x + S / 2, cy: y + S / 2, r: 9, fill: "var(--muted)", visibility: "hidden" });
    const bad = svgEl("rect", { x: x + 5, y: y + 5, width: S - 10, height: S - 10, rx: 6, fill: "none", stroke: "var(--bad)", "stroke-width": 6, visibility: "hidden" });
    b.layers.bg.append(done); b.layers.cells.append(water); b.layers.mid.append(dot, bad);
    if (p.clues[r][c]) b.layers.top.append(txt(x + S / 2, y + S / 2, String(p.clues[r][c]), 48, "cell-txt"));
    cells.push({ done, water, dot, bad });
  }
  const flash = (list, ms = 900, color = "var(--ok)") => {
    const rects = list.map(([r, c]) => svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: color, "fill-opacity": .45 }));
    b.layers.top.append(...rects); setTimeout(() => rects.forEach((x) => x.remove()), ms); return rects;
  };
  // ---- Undo (ein Eintrag je Geste) + Metrik „Fehler“ (gesetzter Wert passt nicht zur Lösung) ----
  const undoStack = []; let errors = 0;
  const snapshot = () => g.map((row) => row.slice());
  const restore = (snap) => { for (let r = 0; r < n; r++) g[r] = snap[r].slice(); };
  const same = (a) => a.every((row, r) => row.every((v, i) => v === g[r][i]));
  const pushUndo = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const undo = () => { if (!undoStack.length) return false; restore(undoStack.pop()); draw(); return true; };
  const canUndo = () => undoStack.length > 0;
  const clear = () => { if (g.some((row) => row.some(Boolean))) pushUndo(); for (const row of g) row.fill(0); draw(); };
  const metrics = () => ({ line: `${errors} Fehler` });
  // ---- Werkzeuge ----
  let tool = 1;
  const seg = h("div", { class: "seg" });
  const drawSeg = () => seg.replaceChildren(
    h("button", { class: tool === 1 ? "on" : "", onclick: () => { tool = 1; drawSeg(); } }, "■ Wasser"),
    h("button", { class: tool === 2 ? "on" : "", onclick: () => { tool = 2; drawSeg(); } }, "• Insel"));
  drawSeg();
  const clearBtn = h("button", { onclick: () => clear() }, "Löschen");
  tools.append(seg, clearBtn);

  const draw = () => {
    const bad = nurikabe.conflicts(p, g), done = nurikabe.completeIslands(p, g);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const k = r * 64 + c, cell = cells[r * n + c];
      cell.water.setAttribute("fill", g[r][c] === 1 ? "var(--ink)" : "transparent");
      cell.dot.setAttribute("visibility", g[r][c] === 2 && !p.clues[r][c] ? "visible" : "hidden");
      cell.bad.setAttribute("visibility", bad.has(k) ? "visible" : "hidden");
      cell.done.setAttribute("visibility", done.has(k) ? "visible" : "hidden");
    }
  };
  // ---- Eingabe: Tippen setzt/löscht, Ziehen malt entlang Zeile/Spalte ----
  let solvedFired = false, val = 0, lockR = null, lockC = null;
  const set = (r, c) => {
    if (p.clues[r][c] || g[r][c] === val) return;
    const s = p.solution[r][c]; // 1 Wasser, 0 Insel
    if ((val === 1 && s === 0) || (val === 2 && s === 1)) errors++;
    g[r][c] = val;
  };
  const checkSolved = () => { if (!solvedFired && nurikabe.isSolved(p, g)) { solvedFired = true; onSolved(); } };
  b.drag({
    onStart: ([r, c]) => { pushUndo(); val = g[r][c] === tool ? 0 : tool; lockR = lockC = null; set(r, c); haptic(); draw(); },
    onMove: ([r, c], [sr, sc]) => {
      if (lockR === null && lockC === null) { if (r === sr) lockR = sr; else if (c === sc) lockC = sc; else return; }
      if ((lockR !== null && r !== lockR) || (lockC !== null && c !== lockC)) return;
      set(r, c); draw();
    },
    onEnd: () => { if (undoStack.length && same(undoStack[undoStack.length - 1])) undoStack.pop(); checkSolved(); },
  });
  // ---- Tipp (LinkedIn-Stil): Begründung + Spotlight; „Anzeigen“ führt aus (undo-fähig) ----
  const hint = () => {
    const hnt = nurikabe.explainHint(p, g); if (!hnt) return null;
    const apply = () => {
      pushUndo(); for (const [r, c, v] of hnt.set) g[r][c] = v;
      draw(); if (hnt.kind !== "wrong") flash(hnt.set.map(([r, c]) => [r, c])); checkSolved();
      const k = hnt.set.length, f = k === 1 ? "1 Feld" : `${k} Felder`;
      return hnt.kind === "wrong" ? `${f} geleert.` : hnt.set[0][2] === 1 ? `${f} als Wasser gesetzt.` : `${f} als Insel markiert.`;
    };
    return { text: hnt.text, focus: hnt.focus, target: hnt.target, strike: hnt.strike, apply };
  };
  draw();
  return { ...b, hint, undo, canUndo, clear, metrics };
}
