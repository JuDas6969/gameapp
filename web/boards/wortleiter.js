// Wortleiter – DOM-Board (Crossclimb-Klon). Phase 1: Wörter aus Hinweisen eingeben, Phase 2: Zeilen sortieren
// (Drag & Drop oder ▲▼), Phase 3: oberes und unteres Wort finden.
import { h, msgBar } from "./_shared.js";
import { keyboard } from "./_keyboard.js";
import { isOrderValid, orientation, endWords, findHint, hamming, MIDDLE, TOTAL } from "../engine/wortleiter.js";

const LETTERS = /^[A-ZÄÖÜ]$/;

export function Wortleiter(p, { onSolved, tools, haptic } = {}) {
  const L = p.length;
  const middle = p.ladder.slice(1, TOTAL - 1);
  // Zeilen-Objekte für die fünf Mittelwörter in angezeigter (gemischter) Reihenfolge
  const rows = p.shuffle.map((i) => ({ word: middle[i], clue: p.clues[middle[i]], buf: [], solved: false, el: null, tiles: [] }));
  const ends = { top: { buf: [], solved: false, el: null, tiles: [], word: null }, bottom: { buf: [], solved: false, el: null, tiles: [], word: null } };
  const endClues = [p.clues[p.ladder[0]], p.clues[p.ladder[TOTAL - 1]]];
  let phase = 1, active = 0, activeEnd = "top", mistakes = 0, locked = false, done = false;
  let orient = 1;
  const undoStack = [];
  let hintStage = null; // { key, ...payload } – zweistufiger Tipp

  // ---- Grundgerüst ----
  const el = h("div", { class: "board dom", style: "display:flex;flex-direction:column;gap:calc(var(--u)*1.2);padding:calc(var(--u)*2);box-sizing:border-box;--u:4px;background:var(--card);border-radius:14px;" });
  const list = h("div", { style: "display:flex;flex-direction:column;gap:calc(var(--u)*1.2);flex:5 1 0;min-height:0;position:relative;touch-action:none;" });
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => fitUnits()) : null;
  const fitUnits = () => { const w = el.getBoundingClientRect().width || 300; el.style.setProperty("--u", `${w / 100}px`); };
  ro?.observe(el);

  const set = msgBar(tools, "");
  const kb = keyboard(tools, (k) => onKey(k));
  const btnRow = h("div", { style: "display:flex;gap:8px;justify-content:center;flex:1 0 100%;" });
  const clearBtn = h("button", { class: "btn ghost small", onclick: () => clear() }, "Löschen");
  btnRow.append(clearBtn);
  tools.append(btnRow);

  const tileStyle = (state) => {
    const base = "display:flex;align-items:center;justify-content:center;width:calc(var(--u)*9);height:calc(var(--u)*9);border-radius:calc(var(--u)*1.6);font-weight:800;font-size:calc(var(--u)*5);box-sizing:border-box;border:2px solid var(--line);color:var(--ink);background:var(--bg);transition:background .15s,border-color .15s;";
    if (state === "ok") return base + "background:var(--ok);border-color:var(--ok);color:#fff;";
    if (state === "bad") return base + "background:var(--bad);border-color:var(--bad);color:#fff;";
    if (state === "hidden") return base + "background:var(--line);border-color:var(--line);color:var(--muted);";
    if (state === "hint") return base + "border-color:var(--ok);background:var(--accent-soft);";
    return base;
  };

  const makeRow = (r, kind) => {
    r.tiles = Array.from({ length: L }, () => h("div", { style: tileStyle("") }));
    r.tileBox = h("div", { style: "display:flex;gap:calc(var(--u)*1);flex:0 0 auto;" }, r.tiles);
    r.clueEl = h("div", { style: "flex:1;font-size:calc(var(--u)*3.4);line-height:1.2;color:var(--ink);min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;" });
    r.handle = h("div", { style: "width:calc(var(--u)*6);text-align:center;font-size:calc(var(--u)*5);color:var(--muted);display:none;flex:0 0 auto;" }, "≡");
    r.arrows = h("div", { style: "display:none;flex-direction:column;gap:2px;flex:0 0 auto;" },
      h("button", { style: "min-width:44px;min-height:calc(var(--u)*4.4);font-size:calc(var(--u)*3);border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:0;", onpointerdown: (e) => { e.stopPropagation(); e.preventDefault(); moveRow(r, -1); } }, "▲"),
      h("button", { style: "min-width:44px;min-height:calc(var(--u)*4.4);font-size:calc(var(--u)*3);border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:0;", onpointerdown: (e) => { e.stopPropagation(); e.preventDefault(); moveRow(r, +1); } }, "▼"));
    r.el = h("div", { style: "display:flex;align-items:center;gap:calc(var(--u)*2);padding:calc(var(--u)*1.2);border-radius:calc(var(--u)*2.4);border:2px solid transparent;background:var(--bg);min-height:0;flex:1 1 0;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;" },
      r.handle, r.tileBox, r.clueEl, r.arrows);
    r.kind = kind;
    r.el.addEventListener("pointerdown", (e) => onRowPointerDown(r, e));
    return r.el;
  };

  el.append(makeRow(ends.top, "top"), list, makeRow(ends.bottom, "bottom"));
  rows.forEach((r) => list.append(makeRow(r, "mid")));

  // ---- Rendering ----
  const rowState = (r) => r.solved ? "ok" : (r.kind !== "mid" && phase < 3) ? "hidden" : "";
  function render() {
    const all = [ends.top, ...rows, ends.bottom];
    for (const r of all) {
      const st = rowState(r);
      const isActive = !done && ((phase === 1 && r.kind === "mid" && rows[active] === r) || (phase === 3 && r.kind === activeEnd && !r.solved));
      r.el.style.borderColor = isActive ? "var(--accent)" : "transparent";
      r.el.style.background = isActive ? "var(--accent-soft)" : "var(--bg)";
      r.el.style.opacity = (phase === 1 && r.kind !== "mid") ? "0.6" : "1";
      const word = r.solved ? r.word : null;
      r.tiles.forEach((t, i) => {
        const hinted = hintStage?.type === "letter" && hintStage.row === r && hintStage.pos === i && !r.solved;
        t.style.cssText = tileStyle(hinted ? "hint" : st);
        t.textContent = word ? word[i] : st === "hidden" ? "" : (r.buf[i] || "");
        if (st === "hidden") t.textContent = "?";
      });
      if (r.kind === "mid") r.clueEl.textContent = r.clue;
      else r.clueEl.textContent = phase >= 3 ? `• ${endClues[0]}\n• ${endClues[1]}` : "";
      r.clueEl.style.whiteSpace = r.kind === "mid" ? "normal" : "pre-line";
      r.clueEl.style.fontSize = r.kind === "mid" ? "calc(var(--u)*3.4)" : "calc(var(--u)*2.8)";
      r.handle.style.display = phase === 2 && r.kind === "mid" ? "block" : "none";
      r.arrows.style.display = phase === 2 && r.kind === "mid" ? "flex" : "none";
      const swapMark = hintStage?.type === "swap" && (hintStage.a === r || hintStage.b === r);
      if (swapMark) { r.el.style.borderColor = "var(--ok)"; r.el.style.background = "var(--accent-soft)"; }
    }
    kb.el.style.display = phase === 2 ? "none" : "";
    clearBtn.style.display = phase === 2 ? "none" : "";
  }

  // ---- Hilfen ----
  const snapshot = () => ({ bufs: rows.map((r) => [...r.buf]), ends: [[...ends.top.buf], [...ends.bottom.buf]], order: rows.map((r) => r.word), phase });
  const push = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const activeRow = () => phase === 1 ? rows[active] : phase === 3 ? ends[activeEnd] : null;
  const shake = (node) => { try { node.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 320 }); } catch {} };
  const flashBad = (r) => { r.tiles.forEach((t) => { t.style.cssText = tileStyle("bad"); }); shake(r.el); setTimeout(() => { if (!r.solved) { r.buf = []; render(); } }, 380); };
  const nextOpen = () => { const i = rows.findIndex((r) => !r.solved); return i; };

  function onKey(k) {
    if (locked || done || phase === 2) return;
    const r = activeRow(); if (!r || r.solved) return;
    if (k === "⌫") { if (!r.buf.length) return; push(); r.buf.pop(); hintStage = null; render(); return; }
    if (k === "⏎") { submit(r); return; }
    if (!LETTERS.test(k) || r.buf.length >= L) return;
    push(); r.buf.push(k); if (hintStage?.type === "letter") hintStage = null; render();
  }

  function submit(r) {
    if (r.buf.length < L) { set("Wort unvollständig", true); shake(r.el); return; }
    const guess = r.buf.join("");
    let ok;
    if (r.kind === "mid") ok = guess === r.word;
    else {
      const [top, bottom] = endWords(p, orient);
      const want = r.kind === "top" ? top : bottom;
      ok = guess === want;
      if (ok) r.word = want;
    }
    if (ok) {
      r.solved = true; r.buf = []; hintStage = null; haptic?.(); set("");
      if (phase === 1) { const n = nextOpen(); if (n < 0) startPhase2(); else { active = n; render(); } }
      else if (phase === 3) { if (ends.top.solved && ends.bottom.solved) finish(); else { activeEnd = ends.top.solved ? "bottom" : "top"; render(); } }
    } else {
      mistakes++; haptic?.(20);
      const neighbor = r.kind === "top" ? rows[0].word : r.kind === "bottom" ? rows[MIDDLE - 1].word : null;
      set(neighbor && hamming(guess, neighbor) !== 1 ? "Passt nicht zum Nachbarwort" : "Leider falsch", true);
      flashBad(r);
    }
  }

  function startPhase2() {
    phase = 2; hintStage = null; undoStack.length = 0;
    set("Sortiere die Zeilen: Nachbarn unterscheiden sich in einem Buchstaben");
    render();
  }
  function checkOrder() {
    const order = rows.map((r) => r.word);
    if (!isOrderValid(order)) return false;
    orient = orientation(p, order) || 1;
    phase = 3; activeEnd = "top"; hintStage = null; undoStack.length = 0;
    set("Finde das obere und das untere Wort");
    haptic?.(15);
    render();
    return true;
  }
  function finish() {
    done = true; set("Gelöst!");
    render(); onSolved?.();
  }

  // ---- Sortieren: ▲▼ und Drag & Drop ----
  function moveRow(r, dir) {
    if (locked || phase !== 2) return;
    const i = rows.indexOf(r), j = i + dir;
    if (j < 0 || j >= MIDDLE) return;
    push(); hintStage = null;
    swap(i, j); haptic?.();
    if (!checkOrder()) render();
  }
  function swap(i, j) { [rows[i], rows[j]] = [rows[j], rows[i]]; reorderDom(); }
  function reorderDom() { for (const r of rows) list.append(r.el); }

  let drag = null;
  function onRowPointerDown(r, e) {
    if (locked || done) return;
    if (phase === 1 && r.kind === "mid" && !r.solved) { active = rows.indexOf(r); hintStage = null; render(); return; }
    if (phase === 3 && r.kind !== "mid" && !r.solved) { activeEnd = r.kind; hintStage = null; render(); return; }
    if (phase !== 2 || r.kind !== "mid") return;
    e.preventDefault();
    const rect = r.el.getBoundingClientRect();
    drag = { r, startY: e.clientY, h: rect.height + parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || rect.height, moved: false, before: snapshot() };
    r.el.setPointerCapture?.(e.pointerId);
    r.el.style.zIndex = "5"; r.el.style.boxShadow = "0 6px 18px rgba(0,0,0,.18)"; r.el.style.transition = "none";
    const onMove = (ev) => {
      if (!drag) return;
      const dy = ev.clientY - drag.startY;
      const i = rows.indexOf(drag.r);
      if (dy > drag.h / 2 && i < MIDDLE - 1) { swap(i, i + 1); drag.startY += drag.h; drag.moved = true; haptic?.(); }
      else if (dy < -drag.h / 2 && i > 0) { swap(i, i - 1); drag.startY -= drag.h; drag.moved = true; haptic?.(); }
      drag.r.el.style.transform = `translateY(${ev.clientY - drag.startY}px)`;
    };
    const onUp = () => {
      if (!drag) return;
      const d = drag; drag = null;
      d.r.el.style.transform = ""; d.r.el.style.zIndex = ""; d.r.el.style.boxShadow = ""; d.r.el.style.transition = "";
      d.r.el.removeEventListener("pointermove", onMove); d.r.el.removeEventListener("pointerup", onUp); d.r.el.removeEventListener("pointercancel", onUp);
      if (d.moved) { undoStack.push(d.before); hintStage = null; if (!checkOrder()) render(); }
    };
    r.el.addEventListener("pointermove", onMove); r.el.addEventListener("pointerup", onUp); r.el.addEventListener("pointercancel", onUp);
  }

  // ---- Undo / Clear / Hint ----
  function restore(s) {
    if (s.phase !== phase) return false;
    if (phase === 2) {
      const byWord = new Map(rows.map((r) => [r.word, r]));
      const re = s.order.map((w) => byWord.get(w));
      rows.splice(0, MIDDLE, ...re); reorderDom();
    } else {
      rows.forEach((r, i) => { if (!r.solved) r.buf = [...s.bufs[i]]; });
      if (!ends.top.solved) ends.top.buf = [...s.ends[0]];
      if (!ends.bottom.solved) ends.bottom.buf = [...s.ends[1]];
    }
    hintStage = null; render(); return true;
  }
  function undo() {
    if (locked || done) return false;
    while (undoStack.length) { const s = undoStack.pop(); if (restore(s)) return true; }
    return false;
  }
  function clear() {
    if (locked || done || phase === 2) return;
    const r = activeRow(); if (!r || !r.buf.length) return;
    push(); r.buf = []; hintStage = null; render();
  }
  function hint() {
    if (locked || done) return null;
    if (phase === 2) {
      const res = findHint(p, { phase: 2, order: rows.map((r) => r.word) });
      if (!res) return null;
      const a = rows[res.i], b = rows[res.j];
      if (hintStage?.type === "swap" && hintStage.a === a && hintStage.b === b) {
        push(); hintStage = null; swap(res.i, res.j); if (!checkOrder()) render();
        return "Zeilen getauscht";
      }
      hintStage = { type: "swap", a, b }; render();
      return "Diese zwei Zeilen tauschen";
    }
    const r = activeRow(); if (!r || r.solved) return null;
    const word = r.kind === "mid" ? r.word : endWords(p, orient)[r.kind === "top" ? 0 : 1];
    const res = findHint(p, { phase, word, buffer: r.buf });
    if (!res) return null;
    if (hintStage?.type === "letter" && hintStage.row === r && hintStage.pos === res.pos) {
      push();
      r.buf = word.slice(0, res.pos + 1).split(""); // alles bis zur Tipp-Stelle ist damit korrekt
      hintStage = null; render();
      return `Buchstabe „${res.letter}“ eingetragen`;
    }
    hintStage = { type: "letter", row: r, pos: res.pos }; render();
    return `Markierter Buchstabe fehlt (${res.pos + 1}. Stelle)`;
  }

  set("Gib zu jedem Hinweis das passende Wort ein");
  render();
  requestAnimationFrame(fitUnits);

  return {
    el,
    aspect: [3, 4],
    lock() { locked = true; el.classList.add("locked"); },
    hint, undo,
    canUndo: () => !locked && !done && undoStack.length > 0,
    clear,
    metrics: () => ({ mistakes, line: `${mistakes} Fehler` }),
    destroy() { ro?.disconnect(); kb.destroy(); btnRow.remove(); },
  };
}
