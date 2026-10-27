// Wortleiter – DOM-Board (Crossclimb-Klon).
// Alle fünf mittleren Zeilen sind sofort antippbar und jederzeit per Griff (═) ziehbar. Hinweis der aktiven Zeile steht in
// einer Leiste über der Tastatur. Oberste/unterste Zeile (orange, 🔒) öffnen sich, wenn die Mitte richtig UND sortiert ist.
import { h, msgBar } from "./_shared.js";
import { keyboard } from "./_keyboard.js";
import { isOrderValid, orientation, endWords, findHint, sortTarget, hamming, MIDDLE, TOTAL } from "../engine/wortleiter.js";

const LETTERS = /^[A-ZÄÖÜ]$/;
const ORD = ["erste", "zweite", "dritte", "vierte", "fünfte", "sechste"];
const ORD_DAT = ["ersten", "zweiten", "dritten", "vierten", "fünften", "sechsten"];
const STRIPES = "repeating-linear-gradient(45deg, rgba(255,255,255,.55) 0 6px, transparent 6px 15px)";
const TEAL = "#3fb8ae", TEAL_BG = "rgba(63,184,174,.32)", ORANGE = "#f0a04b";
const UNLOCK_MSG = "Die mittleren Zeilen sind vollständig! Vervollständigen Sie nun die oberen und unteren Zeilen, um das Puzzle zu beenden.";
const diffPos = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i; return -1; };

export function Wortleiter(p, { onSolved, tools, haptic } = {}) {
  const L = p.length;
  const middle = p.ladder.slice(1, TOTAL - 1);
  const rows = p.shuffle.map((i) => ({ kind: "mid", word: middle[i], clue: p.clues[middle[i]], buf: [], solved: false, flash: "" }));
  const ends = { top: { kind: "top", word: null, buf: [], solved: false, flash: "" }, bottom: { kind: "bottom", word: null, buf: [], solved: false, flash: "" } };
  const endClues = [p.clues[p.ladder[0]], p.clues[p.ladder[TOTAL - 1]]];
  let active = rows[0], unlocked = false, orient = 1, mistakes = 0, locked = false, done = false;
  const undoStack = [];
  const display = () => [ends.top, ...rows, ends.bottom];

  // ---- Grundgerüst ----
  const el = h("div", { class: "board dom", style: "display:flex;flex-direction:column;gap:var(--g,5px);padding:4px 2px;box-sizing:border-box;--t:32px;" });
  const list = h("div", { style: "display:flex;flex-direction:column;gap:var(--g,5px);flex:5 1 0;min-height:0;position:relative;" });
  const fitUnits = () => {
    const r = el.getBoundingClientRect(); const w = r.width || 300, hh = r.height || 300;
    const g = Math.max(3, hh * 0.016);
    const rowH = (hh - 8 - 6 * g) / TOTAL;
    const t = Math.max(18, Math.min(rowH * 0.8, (w - 4 - 2 * 44 - 16) / (L + 0.6), 56));
    el.style.setProperty("--t", `${t}px`); el.style.setProperty("--g", `${g}px`);
  };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitUnits) : null;
  ro?.observe(el);

  // ---- tools: Meldung, Hinweisleiste, Tastatur ----
  const set = msgBar(tools, "");
  const navBtn = (label, aria, d) => h("button", { "aria-label": aria, style: "padding:6px 10px;flex:0 0 auto;font-size:16px;line-height:1", onclick: () => stepRow(d) }, label);
  const clueText = h("div", { style: "flex:1;min-width:0;text-align:center;color:var(--ink);font-weight:600;font-size:15px;line-height:1.25;min-height:2.5em;display:flex;align-items:center;justify-content:center" });
  const clueBar = h("div", { style: "flex:1 0 100%;display:flex;align-items:center;gap:6px;padding:6px 6px;border-radius:12px;background:var(--card);border:1px solid var(--line);box-sizing:border-box" },
    navBtn("⌃", "Vorige Zeile", -1), clueText, navBtn("⌄", "Nächste Zeile", 1));
  tools.append(clueBar);
  const kb = keyboard(tools, (k) => onKey(k));

  // ---- Zeilen ----
  const handle = (r) => {
    const g = h("div", { "aria-label": "Zeile ziehen", style: "flex:0 0 44px;align-self:stretch;display:flex;align-items:center;justify-content:center;font-size:calc(var(--t)*.55);color:var(--muted);touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none" }, "═");
    g.addEventListener("pointerdown", (e) => startDrag(r, e));
    return g;
  };
  const makeRow = (r) => {
    r.tiles = Array.from({ length: L }, () => h("div", { style: "position:relative;display:flex;align-items:center;justify-content:center;width:var(--t);height:var(--t);font-weight:800;font-size:calc(var(--t)*.62);box-sizing:border-box;border-bottom:2.5px solid currentColor;color:var(--ink);line-height:1" }));
    r.tileBox = h("div", { style: "display:flex;gap:calc(var(--t)*.16);flex:0 0 auto;" }, r.tiles);
    if (r.kind === "mid") { r.hl = handle(r); r.hr = handle(r); }
    else { r.hl = h("div", { style: "flex:0 0 44px;text-align:center;font-size:calc(var(--t)*.5)" }); r.hr = h("div", { style: "flex:0 0 44px" }); }
    r.el = h("div", { style: "position:relative;display:flex;align-items:center;justify-content:space-between;border-radius:calc(var(--t)*.3);border:2px solid transparent;min-height:0;flex:1 1 0;box-sizing:border-box;user-select:none;-webkit-user-select:none;transition:background .2s,border-color .2s,transform .12s,box-shadow .12s;" },
      r.hl, r.tileBox, r.hr);
    r.el.addEventListener("pointerdown", (e) => { if (e.target === r.hl || e.target === r.hr) return; selectRow(r); });
    return r.el;
  };
  el.append(makeRow(ends.top), list, makeRow(ends.bottom));
  rows.forEach((r) => list.append(makeRow(r)));

  // ---- Rendering ----
  const cursor = () => h("span", { style: "position:absolute;left:50%;top:14%;bottom:18%;width:2px;margin-left:-1px;background:var(--ink);animation:wlblink 1s steps(2) infinite" });
  if (!document.getElementById("wl-blink")) document.head.append(h("style", { id: "wl-blink" }, "@keyframes wlblink{0%{opacity:1}50%{opacity:0}}"));
  function render() {
    for (const r of display()) {
      const isEnd = r.kind !== "mid";
      const isActive = !done && r === active;
      let bg = "var(--card)", border = "var(--line)", ink = "var(--ink)";
      if (isEnd && !r.solved) { bg = ORANGE; border = ORANGE; ink = "#1d1406"; }
      if (isActive) { bg = TEAL_BG; border = TEAL; ink = "var(--ink)"; }
      if (r.flash === "ok") { bg = "var(--ok)"; border = "var(--ok)"; ink = "#fff"; }
      if (r.flash === "bad") { bg = "var(--bad)"; border = "var(--bad)"; ink = "#fff"; }
      r.el.style.background = bg; r.el.style.borderColor = border; r.el.style.color = ink;
      const word = r.solved ? r.word : null;
      const hiddenEnd = isEnd && !unlocked;
      r.tiles.forEach((t, i) => {
        t.textContent = hiddenEnd ? "" : word ? word[i] : (r.buf[i] || "");
        t.style.color = ink; t.style.opacity = hiddenEnd ? ".55" : "1";
        if (isActive && !r.solved && i === Math.min(r.buf.length, L - 1) && r.buf.length < L) t.append(cursor());
      });
      if (isEnd) r.hl.textContent = r.solved ? "" : unlocked ? "🔓" : "🔒";
      else { const show = !unlocked && !done ? "" : "hidden"; r.hl.style.visibility = r.hr.style.visibility = show; }
    }
    const a = active;
    clueText.textContent = done ? "Gelöst!" : !a ? "" : a.kind === "mid" ? a.clue
      : unlocked ? `Oben + unten: „${endClues[0]}“ und „${endClues[1]}“. Achtung: Das erste Wort kann auch unten stehen.`
        : "Gesperrt – erst alle mittleren Zeilen lösen und sortieren.";
  }

  // ---- Hilfen ----
  const snapshot = () => ({ bufs: rows.map((r) => [...r.buf]), ends: [[...ends.top.buf], [...ends.bottom.buf]], order: rows.map((r) => r.word) });
  const push = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const shake = (node) => { try { node.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 320 }); } catch {} };
  const flash = (r, kind, ms) => { r.flash = kind; render(); setTimeout(() => { r.flash = ""; render(); }, ms); };
  const typable = () => display().filter((r) => !r.solved && (r.kind === "mid" || unlocked));
  const firstOpen = () => rows.find((r) => !r.solved) || (unlocked ? [ends.top, ends.bottom].find((r) => !r.solved) : null);
  const allMidSolved = () => rows.every((r) => r.solved);
  const wordOf = (r) => r.word;
  const ladderNeighbors = (word) => { const k = p.ladder.indexOf(word); return [p.ladder[k - 1], p.ladder[k + 1]].filter(Boolean); };

  function selectRow(r) {
    if (locked || done) return;
    if (r.kind !== "mid" && !unlocked) { shake(r.el); set("Oben und unten öffnen sich, wenn die Mitte gelöst und sortiert ist.", true); active = r; render(); return; }
    active = r; clearSpotlight(); render();
  }
  function stepRow(d) {
    if (locked || done) return;
    const all = display().filter((r) => r.kind === "mid" || unlocked);
    const i = all.indexOf(active);
    active = all[(i + d + all.length) % all.length]; clearSpotlight(); haptic?.(); render();
  }

  function onKey(k) {
    if (locked || done) return;
    const r = active; if (!r || r.solved || (r.kind !== "mid" && !unlocked)) return;
    if (k === "⌫") { if (!r.buf.length) return; push(); r.buf.pop(); render(); return; }
    if (k === "⏎") { if (r.buf.length === L) submit(r); else { set("Wort unvollständig", true); shake(r.el); } return; }
    if (!LETTERS.test(k) || r.buf.length >= L) return;
    push(); r.buf.push(k); render();
    if (r.buf.length === L) submit(r);
  }

  function submit(r) {
    const guess = r.buf.join("");
    if (guess === r.word) {
      r.solved = true; r.buf = []; haptic?.(); set(""); clearSpotlight();
      flash(r, "ok", 650);
      afterSolve(r);
    } else {
      mistakes++; haptic?.(20);
      const nbs = r.kind === "mid" ? [] : [r.kind === "top" ? rows[0].word : rows[MIDDLE - 1].word];
      set(nbs.length && hamming(guess, nbs[0]) !== 1 ? "Passt nicht zum Nachbarwort" : "Leider falsch", true);
      flash(r, "bad", 600); shake(r.el);
    }
  }
  function afterSolve(r) {
    if (r.kind !== "mid") {
      if (ends.top.solved && ends.bottom.solved) { finish(); return; }
      active = ends.top.solved ? ends.bottom : ends.top; render(); return;
    }
    if (!checkUnlock()) {
      const n = rows.find((x) => !x.solved);
      if (n) active = n;
      else set("Alle Wörter gefunden – sortiere die Zeilen: Nachbarn unterscheiden sich in genau einem Buchstaben.");
      render();
    }
  }
  function checkUnlock() {
    if (unlocked || !allMidSolved()) return false;
    const order = rows.map(wordOf);
    if (!isOrderValid(order)) return false;
    orient = orientation(p, order) || 1;
    const [top, bottom] = endWords(p, orient);
    ends.top.word = top; ends.bottom.word = bottom;
    unlocked = true; active = ends.top; undoStack.length = 0;
    set(UNLOCK_MSG); haptic?.(15);
    render(); return true;
  }
  function finish() { done = true; set("Gelöst!"); render(); onSolved?.(); }

  // ---- Drag & Drop über die Griffe ----
  let drag = null;
  function swap(i, j) { [rows[i], rows[j]] = [rows[j], rows[i]]; for (const r of rows) list.append(r.el); }
  function startDrag(r, e) {
    if (locked || done || unlocked) return;
    e.preventDefault(); e.stopPropagation(); clearSpotlight();
    const rect = r.el.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    drag = { r, startY: e.clientY, h: rect.height + gap, moved: false, before: snapshot() };
    const tgt = e.currentTarget; tgt.setPointerCapture?.(e.pointerId);
    r.el.style.zIndex = "5"; r.el.style.boxShadow = "0 8px 22px rgba(0,0,0,.28)"; r.el.style.transition = "none";
    const lift = (dy) => { r.el.style.transform = `translateY(${dy}px) scaleX(1.05) scaleY(1.04)`; };
    lift(0);
    const onMove = (ev) => {
      if (!drag) return;
      const dy = ev.clientY - drag.startY, i = rows.indexOf(drag.r);
      if (dy > drag.h / 2 && i < MIDDLE - 1) { swap(i, i + 1); drag.startY += drag.h; drag.moved = true; haptic?.(); }
      else if (dy < -drag.h / 2 && i > 0) { swap(i, i - 1); drag.startY -= drag.h; drag.moved = true; haptic?.(); }
      lift(ev.clientY - drag.startY);
    };
    const onUp = () => {
      if (!drag) return;
      const d = drag; drag = null;
      d.r.el.style.transform = ""; d.r.el.style.zIndex = ""; d.r.el.style.boxShadow = ""; d.r.el.style.transition = "";
      tgt.removeEventListener("pointermove", onMove); tgt.removeEventListener("pointerup", onUp); tgt.removeEventListener("pointercancel", onUp);
      if (d.moved) { undoStack.push(d.before); if (!checkUnlock()) render(); }
      else selectRow(d.r);
    };
    tgt.addEventListener("pointermove", onMove); tgt.addEventListener("pointerup", onUp); tgt.addEventListener("pointercancel", onUp);
  }

  // ---- Undo / Clear ----
  function undo() {
    if (locked || done || !undoStack.length) return false;
    const s = undoStack.pop();
    if (!unlocked) {
      const byWord = new Map(rows.map((r) => [r.word, r]));
      const re = s.order.map((w) => byWord.get(w));
      rows.splice(0, MIDDLE, ...re); for (const r of rows) list.append(r.el);
    }
    rows.forEach((r) => { const i = s.order.indexOf(r.word); if (!r.solved) r.buf = [...s.bufs[i]]; });
    if (!ends.top.solved) ends.top.buf = [...s.ends[0]];
    if (!ends.bottom.solved) ends.bottom.buf = [...s.ends[1]];
    render(); return true;
  }
  function clear() {
    if (locked || done) return false;
    const r = active; if (!r || !r.buf.length) return false;
    push(); r.buf = []; render(); return true;
  }

  // ---- Tipp-Spotlight (DOM): [zeile, spalte], zeile 0..6 von oben, spalte -1 = ganze Zeile ----
  const SPOT_PROPS = ["filter", "outline", "outline-offset", "background-image"];
  function clearSpotlight() { for (const r of display()) [r.el, ...r.tiles].forEach((e) => SPOT_PROPS.forEach((k) => e.style.removeProperty(k))); }
  function spotlight(spec = {}) {
    clearSpotlight();
    const all = display();
    const lit = new Set([...(spec.focus || []), ...(spec.target || []), ...(spec.strike || [])].map(([r]) => r));
    if (!lit.size) return;
    all.forEach((r, i) => { if (!lit.has(i)) r.el.style.filter = "brightness(.42)"; });
    const at = ([r, c]) => (c < 0 ? all[r]?.el : all[r]?.tiles[c]);
    (spec.strike || []).map(at).forEach((e) => { if (e) e.style.backgroundImage = STRIPES; });
    (spec.target || []).map(at).forEach((e) => { if (e) { e.style.outline = "3px solid #1f7aff"; e.style.outlineOffset = "2px"; } });
  }
  const rowIndex = (r) => display().indexOf(r);

  // Zeile, auf die sich Tipp / Offenlegen beziehen: aktive offene Zeile, sonst die erste offene
  const hintRow = () => (active && !active.solved && (active.kind === "mid" || unlocked) ? active : firstOpen());

  function sortHint() {
    const order = rows.map(wordOf);
    const res = findHint(p, { phase: 2, order });
    if (!res) return null;
    const target = sortTarget(p, order);
    const a = rows[res.i], b = rows[res.j];
    let nbWord, extra = "";
    if (res.i > 0) nbWord = rows[res.i - 1].word;
    else { nbWord = target[1]; extra = `, ${b.word} ganz nach oben`; }
    const k = diffPos(nbWord, b.word);
    const nbRow = rows.find((r) => r.word === nbWord);
    return {
      text: `${nbWord} und ${b.word} unterscheiden sich nur im ${ORD_DAT[k]} Buchstaben – sie gehören nebeneinander${extra}.\nTauschen Sie die hervorgehobenen Zeilen.`,
      focus: [[rowIndex(nbRow), -1]], target: [[rowIndex(a), -1], [rowIndex(b), -1]],
      apply: () => { push(); swap(res.i, res.j); if (!checkUnlock()) render(); return "Zeilen getauscht."; },
    };
  }

  function letterHint(r) {
    const res = findHint(p, { phase: 1, word: r.word, buffer: r.buf });
    if (!res) return null;
    const { pos, letter } = res;
    const wrongHere = r.buf[pos] != null && r.buf[pos] !== letter;
    let why, focus = [];
    if (r.kind === "mid") {
      const nb = ladderNeighbors(r.word).map((w) => rows.find((x) => x.word === w && x.solved)).find(Boolean);
      why = `Hinweis: „${r.clue}“ – ${L} Buchstaben` + (nb ? `, passt zu „${nb.word}“ in der Leiter (ein Buchstabe Unterschied)` : "; Nachbarn in der Leiter unterscheiden sich in genau einem Buchstaben");
      if (nb) focus.push([rowIndex(nb), -1]);
    } else {
      const nbRow = r.kind === "top" ? rows[0] : rows[MIDDLE - 1];
      why = `Das ${r.kind === "top" ? "obere" : "untere"} Wort unterscheidet sich von „${nbRow.word}“ nur in einem Buchstaben und passt zu „${p.clues[r.word]}“`;
      focus.push([rowIndex(nbRow), -1]);
    }
    why += wrongHere ? `. Dein ${ORD[pos]}r Buchstabe „${r.buf[pos]}“ passt nicht dazu.` : ".";
    const ri = rowIndex(r);
    focus.push([ri, -1]);
    return {
      text: `${why}\nDer ${ORD[pos]} Buchstabe ist ${letter}.`,
      focus, target: [[ri, pos]], strike: wrongHere ? [[ri, pos]] : [],
      apply: () => {
        active = r; push();
        r.buf = r.word.slice(0, pos + 1).split("");
        render();
        if (r.buf.length === L) submit(r);
        return `Buchstabe „${letter}“ eingetragen.`;
      },
    };
  }

  // LinkedIn-Crossclimb: der Tipp setzt sofort ein (Buchstabe bzw. Tausch), das Panel erklärt nur noch warum.
  const runNow = (h) => {
    if (!h) return null;
    const why = h.text.split("\n")[0];
    const done = h.apply();
    return { text: `${why}\n${done}`, focus: h.focus, target: h.target };
  };
  function hint() {
    if (locked || done) return null;
    const r = hintRow();
    if (r) { if (r !== active) { active = r; render(); } return runNow(letterHint(r)); }
    if (allMidSolved() && !unlocked) return runNow(sortHint());
    return null;
  }

  // „Jetzt offenlegen“: deckt die komplette aktive Zeile auf (bzw. sortiert, wenn nur noch das fehlt)
  function reveal() {
    if (locked || done) return null;
    const r = hintRow();
    if (r) {
      active = r; push();
      r.buf = r.word.split(""); render();
      const why = r.kind === "mid"
        ? `„${r.clue}“ → ${r.word}.`
        : `${r.word} unterscheidet sich von „${(r.kind === "top" ? rows[0] : rows[MIDDLE - 1]).word}“ nur in einem Buchstaben und passt zu „${p.clues[r.word]}“.`;
      submit(r);
      return `${why}\nDie Zeile ist aufgedeckt.`;
    }
    if (allMidSolved() && !unlocked) {
      push();
      const target = sortTarget(p, rows.map(wordOf));
      const byWord = new Map(rows.map((x) => [x.word, x]));
      rows.splice(0, MIDDLE, ...target.map((w) => byWord.get(w))); for (const x of rows) list.append(x.el);
      checkUnlock(); render();
      return "In der Leiter unterscheiden sich Nachbarn in genau einem Buchstaben.\nDie Zeilen sind jetzt richtig sortiert.";
    }
    return null;
  }

  set("Tippe eine Zeile an und löse den Hinweis über der Tastatur.");
  render();
  requestAnimationFrame(fitUnits);

  return {
    el,
    aspect: [5, 4],
    compact: true,
    lock() { locked = true; el.classList.add("locked"); },
    hint, undo, spotlight, clearSpotlight,
    actions: [{ label: "Jetzt offenlegen", cooldown: 8000, run: reveal }],
    canUndo: () => !locked && !done && undoStack.length > 0,
    clear,
    metrics: () => ({ mistakes, line: `${mistakes} Fehler` }),
    destroy() { ro?.disconnect(); kb.destroy(); clueBar.remove(); },
  };
}
