// Kreuzwort – klassisches Kreuzworträtsel. SVG-Gitter mit schwarzen Feldern, Hinweiszeile + Tastatur in tools.
import { S, svgEl, h, base, txt } from "./_shared.js";
import { keyboard } from "./_keyboard.js";
import * as kw from "../engine/kreuzwort.js";

const SETTINGS_KEY = "raetsel.kreuzwort.settings";
const DEFAULTS = { autoCheck: false };
const ORD = ["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.", "10.", "11."];
const DIR_WORD = { across: "waagrecht", down: "senkrecht" };
const loadSettings = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return { ...DEFAULTS }; } };
const saveSettings = (s) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* privat/blocked */ } };

export function Kreuzwort(p, { onSolved, tools, haptic }) {
  const n = p.n, g = Array.from({ length: n }, () => Array(n).fill(""));
  const b = base(n);
  const settings = loadSettings();
  let sel = null, dir = "across", solved = false, mistakes = 0;
  let hintTimer = null;
  const undoStack = [];
  const rects = [], letters = [];
  const key = (r, c) => r * 64 + c;
  const slotsAt = (r, c) => [kw.slotAt(p, r, c, "across"), kw.slotAt(p, r, c, "down")].filter(Boolean);
  const cellsOf = (s) => kw.slotCells(s);
  const inSlot = (s, r, c) => s && (s.dir === "across" ? s.r === r && c >= s.c && c < s.c + s.len : s.c === c && r >= s.r && r < s.r + s.len);
  const curSlot = () => (sel ? kw.slotAt(p, sel.r, sel.c, dir) : null);
  const slotDone = (s) => cellsOf(s).every(([r, c]) => g[r][c] === p.solution[r][c]);

  const snapshot = () => g.map((row) => row.slice());
  const push = () => { undoStack.push(snapshot()); if (undoStack.length > 300) undoStack.shift(); };
  const dropHint = () => { clearTimeout(hintTimer); rects.forEach((x) => x.classList.remove("hintcell")); };

  // ---- Gitter ---- (schwarze Felder in beiden Farbschemata dunkel, weiße Felder als Karte)
  const darkMq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  const colors = () => (darkMq?.matches ? { black: "#050505", white: "#34312b" } : { black: "#1d1b17", white: "var(--card)" });
  const selRect = svgEl("rect", { x: 0, y: 0, width: S, height: S, fill: "none", stroke: "var(--accent)", "stroke-width": 7, rx: 4, visibility: "hidden" });
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const black = p.black[r][c];
    const rc = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: black ? colors().black : colors().white });
    b.layers.cells.append(rc); rects.push(rc);
    if (black) { letters.push(null); continue; }
    const t = txt(c * S + S / 2, r * S + S / 2 + 4, "", 54, "cell-txt entry"); b.layers.top.append(t); letters.push(t);
    rc.addEventListener("pointerdown", (e) => { e.preventDefault(); if (solved) return; select(r, c); haptic(); });
  }
  b.layers.mid.append(selRect);
  for (const s of p.slots) {
    if (p.slots.some((o) => o !== s && o.r === s.r && o.c === s.c && o.id < s.id)) continue; // Nummer nur einmal pro Startzelle
    b.layers.top.append(txt(s.c * S + 9, s.r * S + 7, String(s.num), 23, "cell-txt", { "text-anchor": "start", "dominant-baseline": "hanging", fill: "var(--muted)", "font-weight": 600 }));
  }

  // ---- tools ----
  const clueText = h("span", { style: "flex:1;text-align:center;color:var(--ink);font-weight:600;font-size:15px;line-height:1.25;min-height:2.5em;display:flex;align-items:center;justify-content:center" }, "");
  const prevBtn = h("button", { "aria-label": "Voriges Wort", style: "padding:9px 14px", onclick: () => stepSlot(-1) }, "‹");
  const nextBtn = h("button", { "aria-label": "Nächstes Wort", style: "padding:9px 14px", onclick: () => stepSlot(1) }, "›");
  const clueRow = h("div", { style: "flex:1 0 100%;display:flex;align-items:center;gap:8px;padding:2px 0" }, prevBtn, clueText, nextBtn);
  const clearBtn = h("button", { onclick: () => clear() }, "Löschen");
  const checkBtn = h("button", { title: "Auto-Check: falsche Buchstaben rot markieren", "aria-label": "Auto-Check", style: "font-size:12px;padding:8px 10px;white-space:nowrap", onclick: () => { settings.autoCheck = !settings.autoCheck; saveSettings(settings); haptic(); draw(); } }, "Auto-Check");
  const bar = h("div", { style: "flex:1 0 100%;display:flex;gap:6px;justify-content:center;flex-wrap:wrap" }, clearBtn, checkBtn);
  tools.replaceChildren(bar, clueRow);
  const kb = keyboard(tools, (k) => { if (solved) return; if (k === "⌫") backspace(); else if (k !== "⏎") enter(k); }, { enter: false });
  const setPressed = (btn, on) => { btn.style.background = on ? "var(--accent-soft)" : ""; btn.style.borderColor = on ? "var(--accent)" : ""; btn.setAttribute("aria-pressed", String(on)); };

  // ---- Logik ----
  const select = (r, c, keepDir = false) => {
    if (p.black[r][c]) return;
    dropHint();
    if (sel && sel.r === r && sel.c === c && !keepDir) {
      const other = dir === "across" ? "down" : "across";
      if (kw.slotAt(p, r, c, other)) dir = other;
    } else {
      sel = { r, c };
      if (!kw.slotAt(p, r, c, dir)) dir = dir === "across" ? "down" : "across";
    }
    draw();
  };
  const gotoSlot = (s) => { const cells = cellsOf(s); const [r, c] = cells.find(([rr, cc]) => !g[rr][cc]) || cells[0]; dir = s.dir; sel = { r, c }; dropHint(); draw(); };
  const stepSlot = (d) => {
    if (solved || !p.slots.length) return;
    const cur = curSlot(); const i = cur ? p.slots.indexOf(cur) : -1;
    gotoSlot(p.slots[(i + d + p.slots.length) % p.slots.length]); haptic();
  };
  const move = (d) => { // innerhalb des Slots um d Zellen
    const s = curSlot(); if (!s) return;
    const i = s.dir === "across" ? sel.c - s.c : sel.r - s.r, j = i + d;
    if (j < 0 || j >= s.len) return;
    sel = s.dir === "across" ? { r: s.r, c: s.c + j } : { r: s.r + j, c: s.c };
  };
  const checkSolved = () => { if (!solved && kw.isSolved(p, g)) { solved = true; selRect.setAttribute("visibility", "hidden"); sel = null; draw(); onSolved(); } };
  const enter = (ch) => {
    if (!sel) gotoSlot(p.slots[0]);
    const { r, c } = sel;
    dropHint();
    if (g[r][c] !== ch) {
      push();
      if (ch !== p.solution[r][c]) mistakes++;
      g[r][c] = ch;
    }
    move(1); haptic(); draw(); checkSolved();
  };
  const backspace = () => {
    if (!sel) return;
    dropHint();
    if (!g[sel.r][sel.c]) move(-1);
    if (g[sel.r][sel.c]) { push(); g[sel.r][sel.c] = ""; }
    haptic(); draw();
  };
  const undo = () => { if (!undoStack.length || solved) return false; dropHint(); const s = undoStack.pop(); for (let r = 0; r < n; r++) g[r] = s[r].slice(); haptic(); draw(); return true; };
  const canUndo = () => undoStack.length > 0 && !solved;
  const clear = () => {
    if (solved || !g.some((row) => row.some(Boolean))) return false;
    dropHint(); push(); for (const row of g) row.fill(""); haptic(); draw(); return true;
  };
  const metrics = () => ({ line: `${mistakes} Fehler`, mistakes });

  const draw = () => {
    const cur = curSlot(), bad = settings.autoCheck ? kw.conflicts(p, g) : null, col = colors();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (p.black[r][c]) { rects[r * n + c].setAttribute("fill", col.black); continue; }
      const i = r * n + c;
      let fill = col.white;
      if (inSlot(cur, r, c) && !solved) fill = darkMq?.matches ? "#4d4941" : "#e9e4da";
      rects[i].setAttribute("fill", fill);
      const t = letters[i]; t.textContent = g[r][c];
      t.setAttribute("class", `cell-txt entry${bad && bad.has(key(r, c)) ? " bad" : ""}`);
      const done = g[r][c] && slotsAt(r, c).every(slotDone);
      t.setAttribute("opacity", solved ? 1 : done ? 0.55 : 1);
    }
    if (sel && !solved) { selRect.setAttribute("x", sel.c * S + 3.5); selRect.setAttribute("y", sel.r * S + 3.5); selRect.setAttribute("width", S - 7); selRect.setAttribute("height", S - 7); selRect.setAttribute("visibility", "visible"); }
    else selRect.setAttribute("visibility", "hidden");
    clueText.textContent = cur ? `${cur.num} ${DIR_WORD[cur.dir]}: ${cur.clue}` : solved ? "Gelöst!" : "Feld antippen oder › drücken";
    prevBtn.disabled = nextBtn.disabled = solved;
    setPressed(checkBtn, settings.autoCheck);
    clearBtn.disabled = solved;
  };

  // Hardware-Pfeiltasten (iPad mit Tastatur, Desktop)
  const onKey = (e) => {
    if (solved || e.metaKey || e.ctrlKey || e.altKey) return;
    const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (!d) return;
    e.preventDefault();
    if (!sel) { gotoSlot(p.slots[0]); return; }
    let { r, c } = sel;
    do { r += d[0]; c += d[1]; } while (r >= 0 && c >= 0 && r < n && c < n && p.black[r][c]);
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    const nd = d[0] ? "down" : "across";
    sel = { r, c }; if (kw.slotAt(p, r, c, nd)) dir = nd; else if (!kw.slotAt(p, r, c, dir)) dir = dir === "across" ? "down" : "across";
    dropHint(); draw();
  };
  window.addEventListener("keydown", onKey);
  darkMq?.addEventListener?.("change", draw);

  const hint = () => {
    if (solved) return null;
    const step = kw.findHint(p, g);
    if (!step) return null;
    const { r, c, letter, slot } = step;
    const name = (sl) => `„${sl.clue}“ (${sl.num} ${DIR_WORD[sl.dir]})`;
    const A = kw.slotAt(p, r, c, "across"), D = kw.slotAt(p, r, c, "down");
    const focus = [...(A ? cellsOf(A) : []), ...(D ? cellsOf(D) : [])];
    dropHint(); sel = { r, c }; dir = slot.dir; draw();
    if (step.wrong) {
      return {
        text: `Dieser Buchstabe passt nicht zu ${name(slot)}.\nEntfernen Sie ihn.`,
        focus: cellsOf(slot), strike: [[r, c]],
        apply: () => { push(); g[r][c] = ""; sel = { r, c }; dir = slot.dir; draw(); return undefined; },
      };
    }
    const why = A && D ? `${name(A)} und ${name(D)} kreuzen sich hier.`
      : `Das Wort zu ${name(slot)} hat ${slot.len} Buchstaben – dies ist der ${ORD[slot.dir === "across" ? c - slot.c : r - slot.r]}.`;
    return {
      text: `${why}\nDer Buchstabe ist ${letter}.`,
      focus, target: [[r, c]],
      apply: () => {
        dropHint(); push();
        g[r][c] = letter; sel = { r, c }; dir = slot.dir;
        move(1); draw();
        const rc = rects[r * n + c]; rc.classList.add("hintcell");
        hintTimer = setTimeout(() => { rc.classList.remove("hintcell"); draw(); }, 1200);
        checkSolved();
        return undefined;
      },
    };
  };

  const destroy = () => { kb.destroy(); window.removeEventListener("keydown", onKey); darkMq?.removeEventListener?.("change", draw); clearTimeout(hintTimer); };
  gotoSlot(p.slots[0]);
  return { ...b, compact: true, instantHints: true, hint, undo, canUndo, clear, metrics, destroy };
}
