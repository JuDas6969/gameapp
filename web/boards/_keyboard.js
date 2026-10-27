// Shared on-screen keyboard for the word games (QWERTZ + ÄÖÜ). Usage:
//   const kb = keyboard(container, (key) => {...});   // key: "A".."Z", "Ä","Ö","Ü", "⌫", "⏎"
//   kb.mark("A", "ok"|"near"|"miss"|"")  – colour a key (Wordle-style)
//   kb.destroy()
// Also listens to the hardware keyboard while mounted (iPad with keyboard, desktop).
import { h } from "./_shared.js";

const ROWS = [["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"], ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"], ["⏎", "Y", "X", "C", "V", "B", "N", "M", "⌫"]];

export function keyboard(container, onKey, { enter = true } = {}) {
  const keys = new Map();
  const el = h("div", { class: "kb" }, ROWS.map((row) => h("div", { class: "kb-row" }, row.map((k) => {
    if (k === "⏎" && !enter) return h("span", { class: "kb-gap" });
    const b = h("button", { class: "kb-key" + (k === "⏎" || k === "⌫" ? " wide" : ""), onpointerdown: (e) => { e.preventDefault(); onKey(k); } }, k);
    keys.set(k, b); return b;
  }))));
  container.append(el);
  const hw = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key === "Backspace" ? "⌫" : e.key === "Enter" ? "⏎" : e.key.length === 1 ? e.key.toUpperCase() : null;
    if (k && (keys.has(k) || k === "⏎")) { e.preventDefault(); onKey(k); }
  };
  window.addEventListener("keydown", hw);
  return {
    el,
    mark(k, state) { const b = keys.get(k); if (!b) return; b.classList.remove("ok", "near", "miss"); if (state) b.classList.add(state); },
    reset() { for (const b of keys.values()) b.classList.remove("ok", "near", "miss"); },
    destroy() { window.removeEventListener("keydown", hw); el.remove(); },
  };
}
