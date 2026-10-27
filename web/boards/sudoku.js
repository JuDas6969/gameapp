import { S, svgEl, h, base, txt } from "./_shared.js";
import * as sudoku from "../engine/sudoku.js";

const UNIT_THIS = { Zeile: "In dieser Zeile", Spalte: "In dieser Spalte", Block: "In dieser Region" };
const UNIT_SAME = { Zeile: "derselben Zeile", Spalte: "derselben Spalte", Block: "derselben Region" };
const UNIT_BLOCKED = { Zeile: "Spalte oder Region", Spalte: "Zeile oder Region", Block: "Zeile oder Spalte" };
const listOr = (ds) => (ds.length <= 1 ? String(ds[0] ?? "") : `${ds.slice(0, -1).join(", ")} oder ${ds[ds.length - 1]}`);
const SETTINGS_KEY = "raetsel.sudoku.settings";
const DEFAULTS = { autoCheck: true, remaining: true, avail: false };

const loadSettings = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
};
const saveSettings = (s) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* privat/blocked */ } };

export function Sudoku(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice());
  const b = base(n, { strong: [2, 3] });
  let sel = null, selDigit = 0, pencil = false, mistakes = 0, solved = false, showSettings = false;
  const settings = loadSettings();
  const notes = Array.from({ length: n * n }, () => new Set());
  const undoStack = [];
  const rects = [], texts = [], noteTexts = [];
  const sameBlock = (r1, c1, r2, c2) => (r1 >> 1) === (r2 >> 1) && Math.floor(c1 / 3) === Math.floor(c2 / 3);

  const snapshot = () => ({ g: g.map((r) => r.slice()), notes: notes.map((s) => [...s]) });
  const restore = (s) => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = s.g[r][c];
    notes.forEach((set, i) => { set.clear(); for (const d of s.notes[i]) set.add(d); });
  };
  const push = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const dropHint = () => b.clearSpotlight();

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
    rc.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (selDigit) { sel = [r, c]; enter(selDigit); sel = null; return; } // Ziffer-zuerst-Modus
      sel = [r, c]; haptic(); draw();
    });
  }
  const counts = () => { const k = Array(7).fill(0); for (const row of g) for (const v of row) if (v) k[v]++; return k; };
  const draw = () => {
    const bad = sudoku.conflicts(g);
    const avail = selDigit && settings.avail;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, v = g[r][c], given = p.givens[r][c] !== 0;
      let fill = "transparent";
      if (avail) {
        if (!v && sudoku.valid(g, r, c, selDigit)) fill = "var(--accent-soft)";
        else if (v === selDigit) fill = "rgba(127,127,127,.18)";
      } else if (sel) {
        const [sr, sc] = sel, sv = g[sr][sc];
        if (sr === r && sc === c) fill = "var(--accent-soft)";
        else if (sv && sv === v) fill = "var(--accent-soft)";
        else if (sr === r || sc === c || sameBlock(sr, sc, r, c)) fill = "rgba(127,127,127,.09)";
      }
      rects[i].setAttribute("fill", fill);
      const wrong = settings.autoCheck && v && !given && v !== p.solution[r][c];
      texts[i].textContent = v || ""; texts[i].setAttribute("class", `cell-txt ${given ? "given" : "entry"}${bad.has(r * 64 + c) || wrong ? " bad" : ""}`);
      texts[i].setAttribute("font-weight", given ? 800 : 500);
      for (let d = 1; d <= 6; d++) noteTexts[i][d - 1].textContent = !v && notes[i].has(d) ? String(d) : "";
    }
    const k = counts();
    digitBtns.forEach((btn, idx) => {
      const v = idx + 1, left = 6 - k[v];
      btn.disabled = left <= 0 && selDigit !== v;
      btn.lastChild.textContent = settings.remaining && left > 0 ? String(left) : "";
      setPressed(btn, selDigit === v);
    });
    pencilState.textContent = pencil ? "An" : "Aus";
    pencilState.style.background = pencil ? "var(--accent)" : "var(--line)";
    pencilState.style.color = pencil ? "#fff" : "var(--ink)";
    pencilBtn.setAttribute("aria-pressed", String(pencil));
    undoBtn.disabled = !undoStack.length;
    setPressed(gearBtn, showSettings); settingsRow.style.display = showSettings ? "flex" : "none";
    for (const [key, btn] of Object.entries(settingBtns)) setPressed(btn, settings[key]);
  };
  const setPressed = (btn, on) => {
    btn.style.background = on ? "var(--accent-soft)" : "";
    btn.style.borderColor = on ? "var(--accent)" : "";
    btn.setAttribute("aria-pressed", String(on));
  };
  const clearPeerNotes = (r, c, v) => {
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++)
      if (rr === r || cc === c || sameBlock(r, c, rr, cc)) notes[rr * n + cc].delete(v);
  };
  const place = (r, c, v) => {
    g[r][c] = v;
    if (v) { notes[r * n + c].clear(); clearPeerNotes(r, c, v); }
  };
  const checkSolved = () => { if (!solved && JSON.stringify(g) === JSON.stringify(p.solution)) { solved = true; onSolved(); } };
  const enter = (v) => {
    if (!sel) {
      // keine Zelle gewählt: Ziffer-Taste (de)selektieren
      if (v === 0) { selDigit = 0; haptic(); draw(); return; }
      if (!settings.avail) return;
      selDigit = selDigit === v ? 0 : v; haptic(); draw(); return;
    }
    if (p.givens[sel[0]][sel[1]] !== 0) return;
    const [r, c] = sel, i = r * n + c;
    dropHint();
    const before = snapshot();
    if (v === 0) {
      if (g[r][c]) g[r][c] = 0; else notes[i].clear();
    } else if (pencil && !g[r][c]) {
      if (notes[i].has(v)) notes[i].delete(v); else notes[i].add(v);
    } else {
      if (g[r][c] === v) return;
      if (v !== p.solution[r][c]) mistakes++;
      place(r, c, v);
    }
    undoStack.push(before); if (undoStack.length > 200) undoStack.shift();
    haptic(); draw();
    checkSolved();
  };
  const undo = () => {
    if (!undoStack.length) return false;
    dropHint(); restore(undoStack.pop()); haptic(); draw(); return true;
  };
  const canUndo = () => undoStack.length > 0;
  const clear = () => {
    const dirty = g.some((row, r) => row.some((v, c) => v !== p.givens[r][c])) || notes.some((s) => s.size);
    if (!dirty) return false;
    dropHint(); push();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = p.givens[r][c];
    notes.forEach((s) => s.clear());
    selDigit = 0; haptic(); draw(); return true;
  };
  const metrics = () => ({ line: `${mistakes} Fehler`, mistakes });

  // ---- tools (LinkedIn layout): [✎ Notizen An/Aus · ⚙] above a 4×2 numpad 1 2 3 Löschen / 4 5 6 Rückgängig.
  // DOM order keeps the six digit buttons first (smoke test clicks .numpad button 0–5); placement via grid-row/column.
  const cellBtn = "position:relative;padding:12px 0;font-size:22px;font-weight:700";
  const digitBtns = [1, 2, 3, 4, 5, 6].map((v) => h("button", { "aria-label": `Ziffer ${v}`, style: `${cellBtn};grid-row:${v > 3 ? 2 : 1};grid-column:${((v - 1) % 3) + 1}`, onclick: () => enter(v) },
    h("span", {}, String(v)),
    h("span", { "aria-hidden": "true", style: "position:absolute;top:4px;right:7px;font-size:11px;font-weight:700;line-height:1;color:var(--muted);font-variant-numeric:tabular-nums" }, "")));
  const sideBtn = "padding:12px 0;font-size:14px;font-weight:600;grid-column:4;display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1.1";
  const eraseBtn = h("button", { "aria-label": "Feld löschen", style: `${sideBtn};grid-row:1`, onclick: () => enter(0) }, h("span", { style: "font-size:18px" }, "⌫"), h("span", { style: "font-size:11px" }, "Löschen"));
  const undoBtn = h("button", { "aria-label": "Rückgängig", style: `${sideBtn};grid-row:2`, onclick: undo }, h("span", { style: "font-size:18px" }, "↶"), h("span", { style: "font-size:11px" }, "Rückgängig"));
  const pad = h("div", { class: "numpad", style: "grid-template-columns:repeat(4,1fr);grid-template-rows:auto auto" }, digitBtns, eraseBtn, undoBtn);
  const pencilState = h("span", { style: "margin-left:8px;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700" }, "Aus");
  const pencilBtn = h("button", { "aria-label": "Notizen-Modus", style: "display:flex;align-items:center;border:none;background:none;padding:8px 4px", onclick: () => { pencil = !pencil; haptic(); draw(); } },
    h("span", { style: "font-size:16px;margin-right:6px" }, "✎"), h("span", {}, "Notizen"), pencilState);
  const gearBtn = h("button", { title: "Einstellungen", "aria-label": "Einstellungen", style: "padding:6px 10px;font-size:16px", onclick: () => { showSettings = !showSettings; haptic(); draw(); } }, "⚙");
  const settingBtns = {};
  const toggle = (key, label, title) => settingBtns[key] = h("button", { title, "aria-label": title, style: "font-size:12px;padding:7px 9px;white-space:nowrap", onclick: () => { settings[key] = !settings[key]; saveSettings(settings); if (!settings.avail) selDigit = 0; haptic(); draw(); } }, label);
  toggle("autoCheck", "Auto-Check", "Auto-Check: falsche Eingaben sofort rot markieren");
  toggle("remaining", "Restzähler", "Restzähler: an jeder Ziffer zeigen, wie oft sie noch fehlt");
  toggle("avail", "Mögliche Felder", "Mögliche Felder: Ziffer ohne Zelle antippen hebt alle passenden Felder hervor");
  const settingsRow = h("div", { style: "flex:1 0 100%;display:flex;gap:6px;justify-content:center;flex-wrap:wrap" }, Object.values(settingBtns));
  const bar = h("div", { style: "flex:1 0 100%;display:flex;align-items:center;justify-content:space-between;max-width:520px;margin:0 auto" }, pencilBtn, gearBtn);
  tools.replaceChildren(bar, settingsRow, pad);

  // ---- LinkedIn-style hint: { text: "Warum.\nWas.", focus, target, strike, apply } ----------------------
  const hint = () => {
    if (solved) return null;
    const step = sudoku.findHint(g, p.solution, p.givens);
    if (!step) return null;
    const { r, c, v } = step, U = sudoku.units(r, c);
    const notSelf = (list) => list.filter(([rr, cc]) => rr !== r || cc !== c);
    sel = null; selDigit = 0; draw();
    if (step.type === "fix") {
      const hits = sudoku.clashes(g, r, c), old = step.old;
      const why = hits.length
        ? `Die ${old} kollidiert mit der ${old} in ${[...new Set(hits.map((x) => UNIT_SAME[x.unit]))].join(" und ")} – jede Zahl darf in Zeile, Spalte und Region nur einmal vorkommen.`
        : `Dieser Eintrag widerspricht der Lösung: Mit der ${old} an dieser Stelle lässt sich das Rätsel nicht mehr widerspruchsfrei lösen.`;
      return { text: `${why}\nEntfernen Sie ihn.`, focus: hits.map((x) => [x.r, x.c]), strike: [[r, c]],
        apply: () => { if (solved) return; push(); g[r][c] = 0; sel = [r, c]; haptic(); draw(); } };
    }
    let text, focus;
    if (step.type === "naked") {
      text = `In der sich kreuzenden Zeile, Spalte und Region ist ${v} die einzige verbleibende Option.\nTragen Sie ${v} in die hervorgehobene Zelle ein.`;
      focus = notSelf([...U.Zeile, ...U.Spalte, ...U.Block]);
    } else if (step.type === "hidden") {
      text = `${UNIT_THIS[step.unit]} kann die ${v} nur noch in der hervorgehobenen Zelle stehen – alle anderen freien Felder sind durch eine ${v} in ihrer ${UNIT_BLOCKED[step.unit]} blockiert.\nTragen Sie ${v} ein.`;
      focus = [...notSelf(U[step.unit]), ...sudoku.blockers(g, U[step.unit], v, r, c)];
    } else {
      const cands = sudoku.candidates(g, r, c), others = cands.filter((d) => d !== v);
      text = others.length
        ? `Für dieses Feld lassen Zeile, Spalte und Region nur noch ${listOr(cands)} zu. Mit ${others.length > 1 ? "den anderen Zahlen" : `der ${others[0]}`} lässt sich das Rätsel nicht widerspruchsfrei lösen – es bleibt die ${v}.\nTragen Sie ${v} ein.`
        : `In der sich kreuzenden Zeile, Spalte und Region ist ${v} die einzige verbleibende Option.\nTragen Sie ${v} ein.`;
      focus = notSelf([...U.Zeile, ...U.Spalte, ...U.Block]);
    }
    return { text, focus, target: [[r, c]],
      apply: () => { if (solved || g[r][c] === v) return; push(); place(r, c, v); sel = [r, c]; haptic(); draw(); checkSolved(); } };
  };
  draw(); return { ...b, hint, undo, canUndo, clear, metrics };
}
