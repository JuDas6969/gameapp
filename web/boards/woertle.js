// Wörtle – DOM-Board: 6 Zeilen × L Kacheln, Tastatur, Flip-Animation.
import { h, msgBar } from "./_shared.js";
import { keyboard } from "./_keyboard.js";
import * as woertle from "../engine/woertle.js";

const LETTERS_DE = (xs) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} oder ${xs[xs.length - 1]}`;
const STRIPES = "repeating-linear-gradient(45deg, rgba(255,255,255,.55) 0 6px, transparent 6px 15px)";
const COLOR = { ok: "var(--ok)", near: "var(--sun)", miss: "var(--line)" };
const RANK = { ok: 3, near: 2, miss: 1 };
const KEY_OK = /^[A-ZÄÖÜ]$/;

export function Woertle(p, { onSolved, tools, haptic }) {
  const L = p.length, MAX = p.maxGuesses, SOL = p.solution.toUpperCase();
  const guesses = [];                 // abgeschickte Versuche (Großschreibung)
  let cur = "", done = false, mistakes = 0, busy = false;
  const known = Array(L).fill("");    // aus Tipps bekannte Buchstaben
  const keyState = {};

  // --- DOM -------------------------------------------------------------------------------------
  const knownTiles = Array.from({ length: L }, () => h("span", {
    style: "display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:800;color:var(--muted);border:1.5px dashed var(--line);min-height:0",
  }, "·"));
  const knownRow = h("div", { style: `display:grid;grid-template-columns:repeat(${L},1fr);gap:6px;flex:1;min-height:0;visibility:hidden` }, knownTiles);
  const knownLabel = h("div", { style: "font-size:11px;color:var(--muted);line-height:1.2;flex:0 0 auto;visibility:hidden" }, "Bekannt:");
  const knownWrap = h("div", { style: "display:flex;flex-direction:column;gap:2px;height:100%" }, knownLabel, knownRow);

  const tiles = [], rows = [];
  for (let r = 0; r < MAX; r++) {
    const row = [];
    for (let c = 0; c < L; c++) {
      const t = h("div", {
        style: "display:flex;align-items:center;justify-content:center;border:2px solid var(--line);border-radius:8px;font-weight:800;color:var(--ink);background:var(--card);transition:transform .25s ease, background .1s, border-color .1s;transform-style:preserve-3d",
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

  // Schriftgröße an die Kachelhöhe koppeln (Board wird im kompakten Modus recht klein)
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
    const th = tiles[0][0].getBoundingClientRect().height || 40, tw = tiles[0][0].getBoundingClientRect().width || 40;
    grid.style.fontSize = `${Math.round(Math.min(th, tw) * 0.58)}px`;
    knownRow.style.fontSize = `${Math.round(Math.max(10, Math.min(th, tw) * 0.36))}px`;
  }) : null;
  ro?.observe(el);

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
  // --- Tipp-Spotlight (DOM): Rest abdunkeln, Ziel blau umrahmen, Ausschluss gestreift ---------
  // Koordinaten [r, c]: r = Versuchszeile 0..MAX-1, r = -1 = „Bekannt“-Zeile.
  const tileAt = ([r, c]) => (r < 0 ? knownTiles[c] : tiles[r]?.[c]);
  const SPOT_PROPS = ["filter", "outline", "outline-offset", "background-image"];
  const clearSpotlight = () => { [...knownTiles, ...tiles.flat()].forEach((t) => SPOT_PROPS.forEach((k) => t.style.removeProperty(k))); };
  const spotlight = (spec = {}) => {
    clearSpotlight();
    const focus = (spec.focus || []).map(tileAt), target = (spec.target || []).map(tileAt), strike = (spec.strike || []).map(tileAt);
    const lit = new Set([...focus, ...target, ...strike].filter(Boolean));
    if (!lit.size) return;
    [...knownTiles, ...tiles.flat()].forEach((t) => { if (!lit.has(t)) t.style.filter = "brightness(.42)"; });
    strike.forEach((t) => { if (t) t.style.backgroundImage = STRIPES; });
    target.forEach((t) => { if (t) { t.style.outline = "3px solid #1f7aff"; t.style.outlineOffset = "1px"; } });
  };

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
    clearSpotlight();
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
  const destroy = () => { ro?.disconnect(); kb.destroy(); };

  const hint = () => {
    if (done || busy) return null;
    const step = woertle.explainHint(p, guesses, known);
    if (!step) return null;
    const { pos } = step, letter = step.letter.toUpperCase(), n = pos + 1;
    const r = Math.min(guesses.length, MAX - 1);
    let why;
    if (!guesses.length) {
      why = woertle.isVowel(letter) ? "Fast jedes deutsche Wort hat einen Vokal – hier ist einer."
        : "Ein fester Buchstabe grenzt die möglichen Wörter am stärksten ein.";
    } else {
      const opts = step.options.map((x) => x.toUpperCase());
      const gelb = step.yellow ? `das ${letter} kommt laut Gelb schon vor${step.yellowAt.length ? ` (nur nicht an Stelle ${LETTERS_DE(step.yellowAt.map((i) => i + 1)).replace(" oder ", " und ")})` : ""}` : "";
      const abs = step.absent.map((x) => x.toUpperCase()).sort((a, b) => a.localeCompare(b, "de"));
      const absTxt = abs.length > 6 ? `${abs.slice(0, 6).join(", ")} …` : LETTERS_DE(abs).replace(/ oder ([^ ]+)$/, " und $1");
      if (opts.length === 1) why = `Nach deinen Versuchen passt an Stelle ${n} nur noch ein einziger Buchstabe${gelb ? ` – und ${gelb}` : ""}.`;
      else if (opts.length <= 4) why = `Nach deinen Versuchen ist an Stelle ${n} nur noch ${LETTERS_DE(opts)} möglich${gelb ? `, und ${gelb}` : ""}.`;
      else if (gelb) why = `${gelb[0].toUpperCase()}${gelb.slice(1)}; ${abs.length ? `${absTxt} ${abs.length === 1 ? "ist" : "sind"} schon ausgeschlossen` : `an Stelle ${n} sind noch ${opts.length} Buchstaben offen`}.`;
      else if (abs.length) why = `Nach deinen Versuchen ${abs.length === 1 ? "ist" : "sind"} ${absTxt} ausgeschlossen – an Stelle ${n} bleiben ${opts.length} Buchstaben übrig.`;
      else why = `Deine Versuche lassen an Stelle ${n} noch ${opts.length} Buchstaben offen – dieser Tipp legt sie fest.`;
    }
    return {
      text: `${why}\nAn Stelle ${n} steht ein ${letter}.`,
      focus: step.focus, target: [[r, pos]],
      apply: () => {
        known[pos] = letter; drawKnown();
        if (!keyState[letter]) { keyState[letter] = "near"; kb.mark(letter, "near"); }
        return `${letter} an Stelle ${n} steht jetzt in der Zeile „Bekannt“.`;
      },
    };
  };

  drawCurrent(); drawKnown();
  return { el, aspect: [L, MAX + 1.1], compact: true, instantHints: true, lock, hint, spotlight, clearSpotlight, undo, canUndo, clear, metrics, destroy };
}
