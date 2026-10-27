import { S, svgEl, h, base, txt, REGION } from "./_shared.js";
import * as sudoku from "../engine/sudoku.js";

const SETTINGS_KEY = "raetsel.sudoku.settings";
const DEFAULTS = { autoCheck: true, remaining: true, avail: false };

const loadSettings = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
};
const saveSettings = (s) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* privat/blocked */ } };

export function Sudoku(p, { onSolved, tools, haptic }) {
  const n = p.n || 6, g = p.givens.map((r) => r.slice());
  const variant = p.variant || "klassisch", boxes = p.boxes || sudoku.classicBoxes(n);
  const b = base(n);
  let sel = null, selDigit = 0, pencil = false, mistakes = 0, solved = false, showSettings = false;
  const settings = loadSettings();
  const notes = Array.from({ length: n * n }, () => new Set());
  const undoStack = [];
  const rects = [], texts = [], noteTexts = [];
  const peerSet = Array.from({ length: n * n }, (_, i) => new Set(sudoku.peersOf(p, Math.floor(i / n), i % n).map(([r, c]) => r * n + c)));

  // ---- decorations: regions, windows, diagonals, parity marks, killer cages ----
  if (variant === "jigsaw") for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    b.layers.bg.append(svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: REGION(boxes[r][c]), "fill-opacity": 0.55 }));
  for (const eu of p.extraUnits || []) {
    if (eu.type === "window") {
      const r0 = Math.min(...eu.cells.map(([r]) => r)), c0 = Math.min(...eu.cells.map(([, c]) => c));
      b.layers.bg.append(svgEl("rect", { x: c0 * S, y: r0 * S, width: 3 * S, height: 3 * S, fill: "rgba(127,127,127,.2)" }));
    } else if (eu.type === "diag") {
      const [a, z] = [eu.cells[0], eu.cells[eu.cells.length - 1]];
      const x1 = a[1] < z[1] ? 0 : n * S, x2 = n * S - x1;
      b.layers.mid.append(svgEl("line", { x1, y1: 0, x2, y2: n * S, stroke: "var(--line-strong)", "stroke-opacity": 0.22, "stroke-width": 4 }));
    }
  }
  for (const [k, t] of Object.entries(p.parity || {})) {
    const r = Math.floor(k / 64), c = k % 64, cx = c * S + S / 2, cy = r * S + S / 2;
    b.layers.mid.append(t === "e"
      ? svgEl("rect", { x: cx - 34, y: cy - 34, width: 68, height: 68, rx: 6, fill: "rgba(127,127,127,.26)" })
      : svgEl("circle", { cx, cy, r: 36, fill: "rgba(127,127,127,.26)" }));
  }
  const killer = (p.cages || []).length > 0;
  if (killer) {
    const cageOf = Array.from({ length: n }, () => Array(n).fill(-1));
    p.cages.forEach((cg, k) => cg.cells.forEach(([r, c]) => { cageOf[r][c] = k; }));
    const d = 8, dash = { stroke: "var(--ink)", "stroke-opacity": 0.6, "stroke-width": 2.2, "stroke-dasharray": "7 6", fill: "none" };
    p.cages.forEach((cg, k) => {
      const inC = (r, c) => r >= 0 && c >= 0 && r < n && c < n && cageOf[r][c] === k;
      const seg = (x1, y1, x2, y2) => b.layers.mid.append(svgEl("line", { x1, y1, x2, y2, ...dash }));
      for (const [r, c] of cg.cells) {
        const L = c * S, R = (c + 1) * S, T = r * S, B = (r + 1) * S;
        const hx0 = (dr) => (inC(r, c - 1) ? (inC(r + dr, c - 1) ? L - d : L) : L + d), hx1 = (dr) => (inC(r, c + 1) ? (inC(r + dr, c + 1) ? R + d : R) : R - d);
        const vy0 = (dc) => (inC(r - 1, c) ? (inC(r - 1, c + dc) ? T - d : T) : T + d), vy1 = (dc) => (inC(r + 1, c) ? (inC(r + 1, c + dc) ? B + d : B) : B - d);
        if (!inC(r - 1, c)) seg(hx0(-1), T + d, hx1(-1), T + d);
        if (!inC(r + 1, c)) seg(hx0(1), B - d, hx1(1), B - d);
        if (!inC(r, c - 1)) seg(L + d, vy0(-1), L + d, vy1(-1));
        if (!inC(r, c + 1)) seg(R - d, vy0(1), R - d, vy1(1));
      }
      const [r0, c0] = cg.cells.reduce((a, x) => (x[0] < a[0] || (x[0] === a[0] && x[1] < a[1]) ? x : a));
      const label = String(cg.sum), w = 8 + label.length * 13;
      b.layers.top.append(svgEl("rect", { x: c0 * S + 3, y: r0 * S + 3, width: w, height: 25, rx: 4, fill: "var(--bg)" }));
      b.layers.top.append(svgEl("text", { x: c0 * S + 7, y: r0 * S + 16, "font-size": 22, "font-weight": 700, fill: "var(--ink)", "dominant-baseline": "central", "font-family": "-apple-system, system-ui, sans-serif" }, label));
    });
  }
  // region borders (thick) wherever neighbouring cells belong to different regions
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const thick = { stroke: "var(--line-strong)", "stroke-width": 4, "stroke-linecap": "round" };
    if (c < n - 1 && boxes[r][c] !== boxes[r][c + 1]) b.layers.lines.append(svgEl("line", { x1: (c + 1) * S, y1: r * S, x2: (c + 1) * S, y2: (r + 1) * S, ...thick }));
    if (r < n - 1 && boxes[r][c] !== boxes[r + 1][c]) b.layers.lines.append(svgEl("line", { x1: c * S, y1: (r + 1) * S, x2: (c + 1) * S, y2: (r + 1) * S, ...thick }));
  }

  const snapshot = () => ({ g: g.map((r) => r.slice()), notes: notes.map((s) => [...s]) });
  const restore = (s) => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = s.g[r][c];
    notes.forEach((set, i) => { set.clear(); for (const d of s.notes[i]) set.add(d); });
  };
  const push = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const dropHint = () => b.clearSpotlight();

  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "transparent" }); b.layers.cells.append(rc); rects.push(rc);
    const t = txt(c * S + S / 2, r * S + S / 2 + (killer ? 4 : 0), "", n === 9 ? 56 : 50); b.layers.top.append(t); texts.push(t);
    // candidate digits: 6×6 → 3×2 grid, 9×9 → 3×3 grid (killer: shifted below the cage sum)
    const ns = [];
    for (let v = 1; v <= n; v++) {
      const col = (v - 1) % 3, row = Math.floor((v - 1) / 3);
      const x = killer ? c * S + 30 + col * 23 : c * S + S / 6 + col * (S / 3);
      const y = killer ? r * S + 38 + row * (n === 9 ? 23 : 30) : n === 9 ? r * S + S / 6 + row * (S / 3) : r * S + S / 3 + row * (S / 3);
      const nt = txt(x, y, "", killer ? 20 : n === 9 ? 25 : 24, "cell-txt", { fill: "var(--muted)", "font-weight": 600 });
      b.layers.top.append(nt); ns.push(nt);
    }
    noteTexts.push(ns);
    rc.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (selDigit) { sel = [r, c]; enter(selDigit); sel = null; return; } // Ziffer-zuerst-Modus
      sel = [r, c]; haptic(); draw();
    });
  }
  const counts = () => { const k = Array(n + 1).fill(0); for (const row of g) for (const v of row) if (v) k[v]++; return k; };
  const draw = () => {
    const bad = sudoku.conflicts(p, g);
    const avail = selDigit && settings.avail;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, v = g[r][c], given = p.givens[r][c] !== 0;
      let fill = "transparent";
      if (avail) {
        if (!v && sudoku.canPlace(p, g, r, c, selDigit)) fill = "var(--accent-soft)";
        else if (v === selDigit) fill = "rgba(127,127,127,.18)";
      } else if (sel) {
        const [sr, sc] = sel, sv = g[sr][sc];
        if (sr === r && sc === c) fill = "var(--accent-soft)";
        else if (sv && sv === v) fill = "var(--accent-soft)";
        else if (peerSet[sr * n + sc].has(i)) fill = "rgba(127,127,127,.12)";
      }
      rects[i].setAttribute("fill", fill);
      const wrong = settings.autoCheck && v && !given && v !== p.solution[r][c];
      texts[i].textContent = v || ""; texts[i].setAttribute("class", `cell-txt ${given ? "given" : "entry"}${bad.has(r * 64 + c) || wrong ? " bad" : ""}`);
      texts[i].setAttribute("font-weight", given ? 800 : 500);
      for (let d = 1; d <= n; d++) noteTexts[i][d - 1].textContent = !v && notes[i].has(d) ? String(d) : "";
    }
    const k = counts();
    digitBtns.forEach((btn, idx) => {
      const v = idx + 1, left = n - k[v];
      btn.disabled = left <= 0 && selDigit !== v;
      btn.lastChild.textContent = settings.remaining && left > 0 ? String(left) : "";
      setPressed(btn, selDigit === v);
    });
    for (const ps of pencilStates) {
      ps.textContent = pencil ? "An" : "Aus";
      ps.style.background = pencil ? "var(--accent)" : "var(--line)";
      ps.style.color = pencil ? "#fff" : "var(--ink)";
    }
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
  const clearPeerNotes = (r, c, v) => { for (const [rr, cc] of sudoku.peersOf(p, r, c, true)) notes[rr * n + cc].delete(v); };
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

  // ---- tools (LinkedIn layout). DOM order keeps the digit buttons first (smoke test clicks .numpad button 0–5).
  // 6×6: [✎ Notizen · ⚙] above 1 2 3 Löschen / 4 5 6 Rückgängig.
  // 9×9: [Varianten-Regel · ⚙] above 1 2 3 4 5 Löschen / 6 7 8 9 ✎ Rückgängig.
  const big = n === 9;
  const cellBtn = `position:relative;padding:${big ? "11px 0" : "12px 0"};font-size:22px;font-weight:700`;
  const digitPos = (v) => (big ? `grid-row:${v > 5 ? 2 : 1};grid-column:${v > 5 ? v - 5 : v}` : `grid-row:${v > 3 ? 2 : 1};grid-column:${((v - 1) % 3) + 1}`);
  const digitBtns = Array.from({ length: n }, (_, k) => k + 1).map((v) => h("button", { "aria-label": `Ziffer ${v}`, style: `${cellBtn};${digitPos(v)}`, onclick: () => enter(v) },
    h("span", {}, String(v)),
    h("span", { "aria-hidden": "true", style: "position:absolute;top:4px;right:6px;font-size:11px;font-weight:700;line-height:1;color:var(--muted);font-variant-numeric:tabular-nums" }, "")));
  const sideCol = big ? 6 : 4;
  const sideBtn = `padding:${big ? "8px 0" : "12px 0"};font-size:14px;font-weight:600;grid-column:${sideCol};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.1`;
  const eraseBtn = h("button", { "aria-label": "Feld löschen", style: `${sideBtn};grid-row:1`, onclick: () => enter(0) }, h("span", { style: "font-size:18px" }, "⌫"), h("span", { style: "font-size:11px" }, "Löschen"));
  const undoBtn = h("button", { "aria-label": "Rückgängig", style: `${sideBtn};grid-row:2`, onclick: undo }, h("span", { style: "font-size:18px" }, "↶"), h("span", { style: `font-size:${big ? 9.5 : 11}px;letter-spacing:-.2px` }, "Rückgängig"));
  const togglePencil = () => { pencil = !pencil; haptic(); draw(); };
  const pencilStates = [];
  const pState = () => { const s = h("span", { style: "padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700" }, "Aus"); pencilStates.push(s); return s; };
  const padKids = [...digitBtns, eraseBtn, undoBtn];
  let pencilBtn;
  if (big) {
    pencilBtn = h("button", { "aria-label": "Notizen-Modus", style: `${sideBtn};grid-column:5;grid-row:2`, onclick: togglePencil }, h("span", { style: "font-size:16px" }, "✎"), pState());
    padKids.push(pencilBtn);
  } else {
    const st = pState(); st.style.marginLeft = "8px"; st.style.fontSize = "12px"; st.style.padding = "2px 9px";
    pencilBtn = h("button", { "aria-label": "Notizen-Modus", style: "display:flex;align-items:center;border:none;background:none;padding:8px 4px", onclick: togglePencil },
      h("span", { style: "font-size:16px;margin-right:6px" }, "✎"), h("span", {}, "Notizen"), st);
  }
  const pad = h("div", { class: "numpad", style: `grid-template-columns:repeat(${big ? 6 : 4},1fr);grid-template-rows:auto auto` }, padKids);
  const gearBtn = h("button", { title: "Einstellungen", "aria-label": "Einstellungen", style: "padding:6px 10px;font-size:16px", onclick: () => { showSettings = !showSettings; haptic(); draw(); } }, "⚙");
  const settingBtns = {};
  const toggle = (key, label, title) => settingBtns[key] = h("button", { title, "aria-label": title, style: "font-size:12px;padding:7px 9px;white-space:nowrap", onclick: () => { settings[key] = !settings[key]; saveSettings(settings); if (!settings.avail) selDigit = 0; haptic(); draw(); } }, label);
  toggle("autoCheck", "Auto-Check", "Auto-Check: falsche Eingaben sofort rot markieren");
  toggle("remaining", "Restzähler", "Restzähler: an jeder Ziffer zeigen, wie oft sie noch fehlt");
  toggle("avail", "Mögliche Felder", "Mögliche Felder: Ziffer ohne Zelle antippen hebt alle passenden Felder hervor");
  const settingsRow = h("div", { style: "flex:1 0 100%;display:flex;gap:6px;justify-content:center;flex-wrap:wrap" }, Object.values(settingBtns));
  const rule = p.rulesText ? h("div", { class: "sudoku-rule", style: "flex:1;min-width:0;font-size:12.5px;line-height:1.3;color:var(--muted);text-align:left;padding:4px 0" }, p.rulesText) : null;
  const bar = h("div", { style: "flex:1 0 100%;display:flex;align-items:center;justify-content:space-between;gap:8px;max-width:520px;margin:0 auto" },
    big ? (rule || h("span", {})) : pencilBtn, gearBtn);
  tools.replaceChildren(...(!big && rule ? [h("div", { style: "flex:1 0 100%;max-width:520px;margin:0 auto;display:flex" }, rule)] : []), bar, settingsRow, pad);

  // ---- LinkedIn-style hint: { text: "Warum.\nWas.", focus, target, strike, apply } ----------------------
  const hint = () => {
    if (solved) return null;
    const step = sudoku.explainHint(p, g);
    if (!step) return null;
    const { r, c, v } = step;
    sel = null; selDigit = 0; draw();
    if (step.type === "fix")
      return { text: step.text, focus: step.focus, strike: step.strike,
        apply: () => { if (solved) return; push(); g[r][c] = 0; sel = [r, c]; haptic(); draw(); } };
    return { text: step.text, focus: step.focus, target: step.target,
      apply: () => { if (solved || g[r][c] === v) return; push(); place(r, c, v); sel = [r, c]; haptic(); draw(); checkSolved(); } };
  };
  draw(); return { ...b, hint, undo, canUndo, clear, metrics };
}
