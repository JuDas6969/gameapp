import { S, svgEl, h, base, txt } from "./_shared.js";
import * as sudoku from "../engine/sudoku.js";

const UNIT_LABEL = { Zeile: "in dieser Zeile", Spalte: "in dieser Spalte", Block: "in diesem Block" };
const SETTINGS_KEY = "raetsel.sudoku.settings";
const DEFAULTS = { autoCheck: true, remaining: true, avail: false };
const HINT_WINDOW = 20000;

const loadSettings = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
};
const saveSettings = (s) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* privat/blocked */ } };

export function Sudoku(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice());
  const b = base(n, { strong: [2, 3] });
  let sel = null, selDigit = 0, pencil = false, hintTimer = null, hintHl = null, pending = null, mistakes = 0, solved = false;
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
  const dropHint = () => { pending = null; hintHl = null; clearTimeout(hintTimer); rects.forEach((x) => x.classList.remove("hintcell")); };

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
      if (hintHl) {
        if (hintHl.main === i) fill = "var(--accent-soft)";
        else if (hintHl.cells.has(i)) fill = "rgba(127,127,127,.18)";
      } else if (avail) {
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
      btn.lastChild.textContent = settings.remaining ? String(Math.max(0, left)) : "";
      btn.lastChild.style.visibility = settings.remaining ? "" : "hidden";
      setPressed(btn, selDigit === v);
    });
    setPressed(pencilBtn, pencil);
    undoBtn.disabled = !undoStack.length;
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

  const digitBtns = [1, 2, 3, 4, 5, 6].map((v) => h("button", { style: "padding:8px 0;display:flex;flex-direction:column;align-items:center;line-height:1.1", onclick: () => enter(v) },
    h("span", {}, String(v)), h("span", { style: "font-size:10px;font-weight:600;color:var(--muted);min-height:12px" }, "")));
  const pencilBtn = h("button", { title: "Notizen", "aria-label": "Notizen-Modus", onclick: () => { pencil = !pencil; haptic(); draw(); } }, "✎");
  const pad = h("div", { class: "numpad", style: "grid-template-columns:repeat(8,1fr)" }, digitBtns, h("button", { onclick: () => enter(0) }, "⌫"), pencilBtn);
  const undoBtn = h("button", { title: "Rückgängig", "aria-label": "Rückgängig", onclick: undo }, "↶");
  const clearBtn = h("button", { onclick: clear }, "Löschen");
  const settingBtns = {};
  const toggle = (key, label, title) => settingBtns[key] = h("button", { title, "aria-label": title, style: "font-size:12px;padding:8px 8px;white-space:nowrap", onclick: () => { settings[key] = !settings[key]; saveSettings(settings); if (!settings.avail) selDigit = 0; haptic(); draw(); } }, label);
  toggle("autoCheck", "Auto-Check", "Auto-Check: falsche Eingaben sofort rot markieren");
  toggle("remaining", "Zähler", "Restzähler: unter jeder Ziffer zeigen, wie oft sie noch fehlt");
  toggle("avail", "Felder", "Mögliche Felder: Ziffer ohne Zelle antippen hebt alle passenden Felder hervor");
  const bar = h("div", { style: "flex:1 0 100%;display:flex;gap:6px;justify-content:center;flex-wrap:wrap" }, undoBtn, clearBtn, Object.values(settingBtns));
  tools.replaceChildren(bar, pad);

  const hint = () => {
    const step = sudoku.findHint(g, p.solution, p.givens);
    if (!step) return null;
    const { r, c, v } = step, i = r * n + c;
    const pos = `Zeile ${r + 1}, Spalte ${c + 1}`;
    const same = pending && pending.r === r && pending.c === c && pending.v === v && Date.now() - pending.at < HINT_WINDOW;
    if (!same) {
      // Stufe 1: zeigen + begründen
      clearTimeout(hintTimer); rects.forEach((x) => x.classList.remove("hintcell"));
      const units = sudoku.units(r, c), cells = new Set();
      const add = (list) => { for (const [rr, cc] of list) cells.add(rr * n + cc); };
      if (step.type === "hidden") add(units[step.unit]);
      else if (step.type === "naked") { add(units.Zeile); add(units.Spalte); add(units.Block); }
      hintHl = { main: i, cells }; sel = null; selDigit = 0;
      pending = { r, c, v, at: Date.now() };
      hintTimer = setTimeout(() => { if (hintHl && hintHl.main === i) { hintHl = null; pending = null; draw(); } }, HINT_WINDOW);
      draw();
      let msg;
      if (step.type === "fix") msg = `${pos}: die ${step.old} stimmt hier nicht.`;
      else if (step.type === "naked") msg = `${pos}: Zeile, Spalte und Block lassen nur eine Ziffer zu.`;
      else if (step.type === "hidden") msg = `${pos}: eine Ziffer geht ${UNIT_LABEL[step.unit]} nur noch hier.`;
      else msg = `${pos}: schau dir dieses Feld an.`;
      return `${msg} Noch ein Tipp trägt sie ein.`;
    }
    // Stufe 2: eintragen
    dropHint(); push();
    place(r, c, v); sel = [r, c]; draw();
    const rc = rects[i];
    rc.classList.add("hintcell");
    hintTimer = setTimeout(() => { rc.classList.remove("hintcell"); draw(); }, 1200);
    let msg;
    if (step.type === "fix") msg = `Die ${step.old} in ${pos} war falsch – richtig ist die ${v}.`;
    else if (step.type === "naked") msg = `${pos}: nur die ${v} passt.`;
    else if (step.type === "hidden") msg = `${pos}: die ${v} geht ${UNIT_LABEL[step.unit]} nur hier.`;
    else msg = `${pos}: hier kommt die ${v} hin.`;
    checkSolved();
    return msg;
  };
  draw(); return { ...b, hint, undo, canUndo, clear, metrics };
}
