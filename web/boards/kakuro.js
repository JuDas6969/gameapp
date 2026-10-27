import { S, svgEl, h, base, txt } from "./_shared.js";
import * as kakuro from "../engine/kakuro.js";

const HINT_WINDOW = 20000;
const key = (r, c) => r * 64 + c;

export function Kakuro(p, { onSolved, tools, haptic }) {
  const n = p.n, g = p.solution.map((row) => row.map(() => 0));
  const b = base(n);
  const idx = kakuro.runIndex(p);                       // runs, of: cellKey → [acrossRun, downRun]
  let sel = null, hintTimer = null, hintHl = null, pending = null, mistakes = 0, solved = false;
  const undoStack = [];
  const rects = new Map(), texts = new Map(), sumTexts = new Map();   // keyed by cell key; sumTexts: runIdx → text

  // ---- static layer: black cells, diagonals, clue sums -------------------------------------------
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!p.black[r][c]) continue;
    const x = c * S, y = r * S;
    b.layers.bg.append(svgEl("rect", { x, y, width: S, height: S, fill: "var(--ink)" }));
    const hasA = p.across[key(r, c)], hasD = p.down[key(r, c)];
    if (hasA || hasD) b.layers.bg.append(svgEl("line", { x1: x, y1: y, x2: x + S, y2: y + S, stroke: "var(--bg)", "stroke-width": 2, "stroke-opacity": .7 }));
  }
  idx.runs.forEach((run, i) => {
    const r = Math.floor(run.clue / 64), c = run.clue % 64;
    const across = run.dir === "across";
    const t = txt(c * S + (across ? S * 0.70 : S * 0.30), r * S + (across ? S * 0.30 : S * 0.70), String(run.sum), S * 0.28, "cell-txt", { style: "fill:var(--bg)", "font-weight": 700 });
    b.layers.bg.append(t); sumTexts.set(i, t);
  });

  // ---- white cells -----------------------------------------------------------------------------
  for (const ck of idx.whites) {
    const r = Math.floor(ck / 64), c = ck % 64;
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "transparent" }); b.layers.cells.append(rc); rects.set(ck, rc);
    const t = txt(c * S + S / 2, r * S + S / 2, "", 50, "cell-txt entry", { "font-weight": 500 }); b.layers.top.append(t); texts.set(ck, t);
    rc.addEventListener("pointerdown", (e) => { e.preventDefault(); sel = [r, c]; haptic(); draw(); });
  }

  const at = (ck) => g[Math.floor(ck / 64)][ck % 64];
  const runInfo = (ri) => { const run = idx.runs[ri]; let s = 0, open = 0; for (const ck of run.cells) { const v = at(ck); if (v) s += v; else open++; } return { run, rest: run.sum - s, open }; };
  const snapshot = () => g.map((row) => row.slice());
  const restore = (s) => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = s[r][c]; };
  const push = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const dropHint = () => { pending = null; hintHl = null; clearTimeout(hintTimer); for (const rc of rects.values()) rc.classList.remove("hintcell"); };

  const draw = () => {
    const bad = kakuro.conflicts(p, g);
    let selRuns = null;
    if (hintHl) selRuns = hintHl.runs;
    else if (sel) selRuns = idx.of.get(key(sel[0], sel[1]));
    const runCells = new Set(); if (selRuns) for (const ri of selRuns) for (const ck of idx.runs[ri].cells) runCells.add(ck);
    for (const ck of idx.whites) {
      const v = at(ck); let fill = "transparent";
      if (hintHl) { if (hintHl.main === ck) fill = "var(--accent-soft)"; else if (runCells.has(ck)) fill = "rgba(127,127,127,.18)"; }
      else if (sel) {
        const sk = key(sel[0], sel[1]), sv = at(sk);
        if (sk === ck) fill = "var(--accent-soft)";
        else if (runCells.has(ck)) fill = "rgba(127,127,127,.09)";
        else if (sv && sv === v) fill = "rgba(127,127,127,.09)";
      }
      rects.get(ck).setAttribute("fill", fill);
      const t = texts.get(ck); t.textContent = v || ""; t.setAttribute("class", `cell-txt entry${bad.has(ck) ? " bad" : ""}`);
    }
    sumTexts.forEach((t, ri) => t.setAttribute("style", selRuns && selRuns.includes(ri) ? "fill:var(--accent)" : "fill:var(--bg)"));
    // helper line: remaining sum of the selected cell's runs
    if (sel && !hintHl) {
      const [a, d] = idx.of.get(key(sel[0], sel[1]));
      const part = (ri, label) => { const { run, rest, open } = runInfo(ri); return `${label} ${run.sum}: ${open ? `noch ${rest} auf ${open} Feld${open > 1 ? "er" : ""}` : rest === 0 ? "✓" : "falsch"}`; };
      setMsg(`${part(a, "Waagrecht")} · ${part(d, "Senkrecht")}`);
    } else setMsg("");
    undoBtn.disabled = !undoStack.length;
    clearBtn.disabled = !g.some((row) => row.some(Boolean));
  };

  const checkSolved = () => { if (!solved && kakuro.isSolved(p, g)) { solved = true; sel = null; draw(); onSolved(); } };
  const enter = (v) => {
    if (!sel || solved) return;
    const [r, c] = sel;
    if (g[r][c] === v || (v === 0 && !g[r][c])) return;
    dropHint(); push();
    if (v && v !== p.solution[r][c]) mistakes++;
    g[r][c] = v; haptic(); draw(); checkSolved();
  };
  const undo = () => { if (!undoStack.length || solved) return false; dropHint(); restore(undoStack.pop()); haptic(); draw(); return true; };
  const canUndo = () => undoStack.length > 0;
  const clear = () => {
    if (!g.some((row) => row.some(Boolean)) || solved) return false;
    dropHint(); push(); for (const row of g) row.fill(0); haptic(); draw(); return true;
  };
  const metrics = () => ({ line: `${mistakes} Fehler`, mistakes });

  // ---- tools: undo / clear / helper line / numpad ------------------------------------------------
  const undoBtn = h("button", { title: "Rückgängig", "aria-label": "Rückgängig", onclick: undo }, "↶");
  const clearBtn = h("button", { onclick: clear }, "Löschen");
  const msgEl = h("div", { class: "msg", style: "flex:1 0 100%;text-align:center;min-height:18px;font-variant-numeric:tabular-nums" });
  const setMsg = (t) => { msgEl.textContent = t; };
  const bar = h("div", { style: "flex:1 0 100%;display:flex;gap:6px;justify-content:center;flex-wrap:wrap" }, undoBtn, clearBtn);
  const pad = h("div", { class: "numpad" }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => h("button", { onclick: () => enter(v) }, String(v))), h("button", { "aria-label": "Löschen", onclick: () => enter(0) }, "⌫"));
  tools.replaceChildren(bar, msgEl, pad);

  // ---- two-stage hint: 1. highlight + explain, 2. (within 20 s) fill in --------------------------
  const hint = () => {
    if (solved) return null;
    const step = kakuro.findHint(p, g);
    if (!step) return null;
    const { r, c, v } = step, ck = key(r, c), pos = `Zeile ${r}, Spalte ${c}`;
    const same = pending && pending.ck === ck && pending.v === v && Date.now() - pending.at < HINT_WINDOW;
    if (!same) {
      clearTimeout(hintTimer); for (const rc of rects.values()) rc.classList.remove("hintcell");
      hintHl = { main: ck, runs: idx.of.get(ck) }; sel = null;
      pending = { ck, v, at: Date.now() };
      hintTimer = setTimeout(() => { if (hintHl && hintHl.main === ck) { hintHl = null; pending = null; draw(); } }, HINT_WINDOW);
      draw();
      let msg;
      if (step.type === "fix") msg = `${pos}: die ${step.old} stimmt hier nicht.`;
      else if (step.type === "naked") msg = `${pos}: zu beiden Summen passt nur eine Ziffer.`;
      else if (step.type === "deep") msg = `${pos}: aus den Summen rundherum bleibt nur eine Ziffer.`;
      else msg = `${pos}: schau dir dieses Feld an.`;
      return `${msg} Noch ein Tipp trägt sie ein.`;
    }
    dropHint(); push();
    g[r][c] = v; sel = [r, c]; draw();
    const rc = rects.get(ck); rc.classList.add("hintcell");
    hintTimer = setTimeout(() => { rc.classList.remove("hintcell"); draw(); }, 1200);
    let msg;
    if (step.type === "fix") msg = `Die ${step.old} in ${pos} war falsch – richtig ist die ${v}.`;
    else if (step.type === "naked") msg = `${pos}: nur die ${v} passt zu beiden Summen.`;
    else if (step.type === "deep") msg = `${pos}: aus den Summen rundherum bleibt nur die ${v}.`;
    else msg = `${pos}: hier kommt die ${v} hin.`;
    checkSolved();
    return msg;
  };

  draw(); return { ...b, hint, undo, canUndo, clear, metrics };
}
