// Wörtle – DOM-Board: 6 Zeilen × L Kacheln, Tastatur, Flip-Animation.
import { h, msgBar } from "./_shared.js";
import { keyboard } from "./_keyboard.js";
import * as woertle from "../engine/woertle.js";

const HINT_WINDOW = 20000;
const COLOR = { ok: "var(--ok)", near: "var(--sun)", miss: "var(--line)" };
const RANK = { ok: 3, near: 2, miss: 1 };
const KEY_OK = /^[A-ZÄÖÜ]$/;

export function Woertle(p, { onSolved, tools, haptic }) {
  const L = p.length, MAX = p.maxGuesses, SOL = p.solution.toUpperCase();
  const guesses = [];                 // abgeschickte Versuche (Großschreibung)
  let cur = "", done = false, mistakes = 0, busy = false;
  let pending = null, hintTimer = null;
  const known = Array(L).fill("");    // aus Tipps bekannte Buchstaben (Stufe 2)
  const keyState = {};

  // --- DOM -------------------------------------------------------------------------------------
  const knownTiles = Array.from({ length: L }, () => h("span", {
    style: "display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:800;color:var(--muted);border:1.5px dashed var(--line);font-size:min(4.5vw,22px);min-height:0",
  }, "·"));
  const knownRow = h("div", { style: `display:grid;grid-template-columns:repeat(${L},1fr);gap:6px;flex:1;min-height:0;visibility:hidden` }, knownTiles);
  const knownLabel = h("div", { style: "font-size:11px;color:var(--muted);line-height:1.2;flex:0 0 auto;visibility:hidden" }, "Bekannt:");
  const knownWrap = h("div", { style: "display:flex;flex-direction:column;gap:2px;height:100%" }, knownLabel, knownRow);

  const tiles = [], rows = [];
  for (let r = 0; r < MAX; r++) {
    const row = [];
    for (let c = 0; c < L; c++) {
      const t = h("div", {
        style: "display:flex;align-items:center;justify-content:center;border:2px solid var(--line);border-radius:8px;font-weight:800;color:var(--ink);background:var(--card);font-size:min(7vw,34px);transition:transform .25s ease, background .1s, border-color .1s;transform-style:preserve-3d",
      });
      row.push(t);
    }
    tiles.push(row);
    const rowEl = h("div", { style: `display:grid;grid-template-columns:repeat(${L},1fr);gap:6px;transition:transform .08s` }, row);
    rows.push(rowEl);
  }
  const grid = h("div", { style: "display:grid;grid-auto-rows:1fr;gap:6px;flex:1;min-height:0" }, rows);
  const el = h("div", { class: "board dom", style: "display:flex;flex-direction:column;gap:6px;padding:2px" },
    h("div", { style: `flex:0 0 calc(100% * 1.1 / ${MAX + 1.1});min-height:0` }, knownWrap), grid);

  const setMsg = msgBar(tools, `${L} Buchstaben – rate das Wort.`);
  const kb = keyboard(tools, (k) => onKey(k));

  // --- Zeichnen --------------------------------------------------------------------------------
  const drawCurrent = () => {
    const r = guesses.length; if (r >= MAX) return;
    for (let c = 0; c < L; c++) {
      const t = tiles[r][c], ch = cur[c] || "";
      t.textContent = ch;
      t.style.borderColor = ch ? "var(--line-strong)" : "var(--line)";
      t.style.transform = ch ? "scale(1.04)" : "";
    }
  };
  const drawKnown = () => {
    const any = known.some(Boolean);
    knownRow.style.visibility = knownLabel.style.visibility = any ? "" : "hidden";
    known.forEach((ch, i) => {
      const t = knownTiles[i]; t.textContent = ch || "·";
      t.style.background = ch ? "var(--ok)" : ""; t.style.color = ch ? "#fff" : "var(--muted)"; t.style.borderStyle = ch ? "solid" : "dashed"; t.style.borderColor = ch ? "var(--ok)" : "var(--line)";
    });
  };
  const markKeys = (word, res) => {
    for (let i = 0; i < L; i++) {
      const k = word[i], s = res[i];
      if (!keyState[k] || RANK[s] > RANK[keyState[k]]) { keyState[k] = s; kb.mark(k, s); }
    }
  };
  const flipRow = (r, word, res) => new Promise((resolve) => {
    busy = true;
    word.split("").forEach((ch, c) => {
      const t = tiles[r][c];
      setTimeout(() => {
        t.style.transition = "transform .22s ease-in";
        t.style.transform = "rotateX(90deg)";
        setTimeout(() => {
          t.style.background = COLOR[res[c]]; t.style.borderColor = COLOR[res[c]];
          t.style.color = res[c] === "miss" ? "var(--muted)" : "#fff";
          t.style.transition = "transform .22s ease-out";
          t.style.transform = "rotateX(0deg)";
          if (c === L - 1) setTimeout(() => { busy = false; resolve(); }, 230);
        }, 220);
      }, c * 160);
    });
  });
  const shake = (r) => {
    const row = rows[r]; let i = 0;
    const seq = ["-8px", "8px", "-6px", "6px", "-3px", "3px", "0"];
    const step = () => { row.style.transform = `translateX(${seq[i]})`; if (++i < seq.length) setTimeout(step, 55); };
    step();
  };
  const dropHint = () => { pending = null; clearTimeout(hintTimer); tiles.forEach((row) => row.forEach((t) => { t.style.outline = ""; })); };

  // --- Eingabe ---------------------------------------------------------------------------------
  const onKey = (k) => {
    if (done || busy) return;
    if (k === "⌫") { if (cur) { cur = cur.slice(0, -1); haptic(); drawCurrent(); } return; }
    if (k === "⏎") { submit(); return; }
    if (KEY_OK.test(k) && cur.length < L) { cur += k; haptic(); drawCurrent(); }
  };
  const submit = async () => {
    const r = guesses.length;
    if (cur.length < L) { shake(r); setMsg("Zu wenig Buchstaben.", true); haptic(20); return; }
    if (!woertle.isValidGuess(cur)) { shake(r); setMsg("Nicht im Wörterbuch.", true); haptic(20); return; }
    dropHint();
    const word = cur; cur = "";
    const res = woertle.score(word, SOL);
    guesses.push(word);
    haptic();
    await flipRow(r, word, res);
    markKeys(word, res);
    if (word === SOL) {
      done = true; setMsg(`Richtig! ${guesses.length}/${MAX} Versuche.`); onSolved(); return;
    }
    mistakes++;
    if (guesses.length >= MAX) {
      done = true; setMsg(`Das Wort war ${SOL}.`, true);
      known.forEach((_, i) => { known[i] = SOL[i]; }); drawKnown();
      return;
    }
    setMsg(`Versuch ${guesses.length + 1} von ${MAX}.`);
    drawCurrent();
  };

  // --- API -------------------------------------------------------------------------------------
  const undo = () => {
    if (done || busy || !cur) return false;
    cur = cur.slice(0, -1); haptic(); drawCurrent(); return true;
  };
  const canUndo = () => !done && cur.length > 0;
  const clear = () => {
    if (done || busy || !cur) return false;
    cur = ""; haptic(); drawCurrent(); return true;
  };
  const metrics = () => ({ line: `${guesses.length}/${MAX} Versuche`, mistakes });
  const lock = () => { done = true; el.classList.add("locked"); };
  const destroy = () => { clearTimeout(hintTimer); kb.destroy(); };

  const hint = () => {
    if (done) return null;
    const step = woertle.findHint(p, guesses.map((g) => g.toLowerCase()));
    if (!step) return null;
    const { pos } = step, letter = step.letter.toUpperCase();
    const r = Math.min(guesses.length, MAX - 1);
    const same = pending && pending.pos === pos && Date.now() - pending.at < HINT_WINDOW;
    if (!same) {
      // Stufe 1: Position hervorheben + Eigenschaft nennen
      dropHint();
      pending = { pos, at: Date.now() };
      tiles[r][pos].style.outline = "3px solid var(--ok)"; tiles[r][pos].style.outlineOffset = "-3px";
      hintTimer = setTimeout(() => { if (pending && pending.pos === pos) dropHint(); }, HINT_WINDOW);
      const kind = woertle.isVowel(letter) ? "ein Vokal" : "ein Konsonant";
      const extra = letter === "Ä" || letter === "Ö" || letter === "Ü" ? " (mit Umlaut)" : "";
      return `Buchstabe ${pos + 1} ist ${kind}${extra}. Noch ein Tipp zeigt ihn.`;
    }
    // Stufe 2: Buchstaben in die „Bekannt“-Zeile setzen
    dropHint();
    known[pos] = letter; drawKnown();
    if (!keyState[letter]) { keyState[letter] = "near"; kb.mark(letter, "near"); }
    return `Buchstabe ${pos + 1} ist ein ${letter}.`;
  };

  drawCurrent(); drawKnown();
  return { el, aspect: [L, MAX + 1.1], lock, hint, undo, canUndo, clear, metrics, destroy };
}
