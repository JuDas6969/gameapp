// Treffpunkt (Pinpoint-Klon) – DOM-Board: 5 Karten, Freitext-Eingabe, 5 Versuche.
// Board-API: { el, aspect, lock, hint, undo?, canUndo, metrics, destroy }
import { h, msgBar } from "./_shared.js";
import { matches, findHint, normalize, MAX_GUESSES } from "../engine/treffpunkt.js";

const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
const CARD = css({ flex: "1 1 0", display: "flex", "align-items": "center", "justify-content": "center", "border-radius": ".8em", border: "1px solid var(--line)", background: "var(--card)", "font-weight": "700", "font-size": "1.15em", "text-align": "center", padding: "0 .6em", "min-height": "2.2em", "line-height": "1.15", "word-break": "break-word", overflow: "hidden" });
const HIDDEN = css({ color: "var(--muted)", "border-style": "dashed", background: "transparent", "font-size": "1.4em" });

export function Treffpunkt(p, { onSolved, tools, haptic } = {}) {
  const N = p.words.length, MAX = p.maxGuesses || MAX_GUESSES;
  let revealed = 1, mistakes = 0, done = false, solved = false, solvedAt = 0, letterHint = false;
  const seen = new Set();
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  const cards = p.words.map(() => h("div", { style: CARD }));
  const dots = Array.from({ length: MAX }, () => h("span", { style: css({ width: ".6em", height: ".6em", "border-radius": "50%", background: "var(--line)", display: "inline-block" }) }));
  const input = h("input", {
    type: "text", enterkeyhint: "done", autocomplete: "off", autocorrect: "off", autocapitalize: "sentences", spellcheck: "false",
    placeholder: "Kategorie …", "aria-label": "Kategorie raten",
    style: css({ flex: "1 1 0", "min-width": "0", font: "inherit", "font-size": "max(16px, 1em)", padding: ".55em .8em", "border-radius": ".7em", border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", outline: "none", "user-select": "text", "-webkit-user-select": "text", "touch-action": "manipulation" }),
  });
  const btn = h("button", { type: "button", style: css({ font: "inherit", "font-weight": "700", padding: ".55em 1em", "border-radius": ".7em", border: "none", background: "var(--accent)", color: "#fff", "touch-action": "manipulation" }), onclick: () => guess() }, "Raten");
  const inputRow = h("div", { style: css({ display: "flex", gap: ".5em", "align-items": "stretch" }) }, input, btn);
  const result = h("div", { style: css({ display: "none", "text-align": "center", "font-weight": "800", "font-size": "1.35em", "line-height": "1.2", padding: ".3em .4em", "border-radius": ".8em", background: "var(--accent-soft)", color: "var(--ink)" }) });
  const el = h("div", { class: "board dom", style: css({ display: "flex", "flex-direction": "column", gap: ".55em", "box-sizing": "border-box", padding: ".3em 0", "font-size": "18px" }) },
    ...cards,
    h("div", { style: css({ display: "flex", gap: ".45em", "justify-content": "center", padding: ".1em 0" }) }, ...dots),
    inputRow, result);

  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); guess(); } });
  input.addEventListener("focus", () => later(() => { try { input.scrollIntoView({ block: "nearest" }); } catch {} }, 320));

  // Schrift an Board-Breite koppeln (app.js setzt width/height in px).
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { const w = el.clientWidth || 300; el.style.fontSize = `${Math.max(13, Math.min(22, w / 16))}px`; }) : null;
  ro?.observe(el);

  const setMsg = tools ? msgBar(tools, "Wort 1 von 5 – rate die Kategorie!") : () => {};

  const draw = () => {
    cards.forEach((c, i) => {
      const on = i < revealed;
      c.textContent = on ? p.words[i] : "?";
      c.setAttribute("style", on ? CARD : CARD + ";" + HIDDEN);
      c.style.borderColor = on ? "var(--line-strong)" : "";
    });
    dots.forEach((d, i) => { d.style.background = i < mistakes ? "var(--bad)" : "var(--line)"; });
  };
  const reveal = (i) => {
    revealed = Math.max(revealed, i + 1); draw();
    try { cards[i].animate([{ transform: "rotateX(90deg)", opacity: .2 }, { transform: "rotateX(0)", opacity: 1 }], { duration: 260, easing: "ease-out" }); } catch {}
  };
  const shake = (node) => { try { node.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 340 }); } catch {} };
  const finish = (ok) => {
    done = true; input.disabled = true; btn.disabled = true;
    for (let i = revealed; i < N; i++) reveal(i);
    inputRow.style.display = "none";
    result.textContent = p.cat; result.style.display = "block";
    result.style.background = ok ? "var(--accent-soft)" : "var(--line)";
    try { result.animate([{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 300, easing: "ease-out" }); } catch {}
    try { input.blur(); } catch {}
  };

  function guess() {
    if (done) return;
    const text = input.value.trim();
    if (!text) { shake(input); return; }
    const key = normalize(text);
    if (!key) { shake(input); return; }
    if (seen.has(key)) { setMsg("Das hast du schon probiert.", true); shake(input); return; }
    seen.add(key);
    if (matches(p, text)) {
      solved = true; solvedAt = revealed;
      haptic?.(30);
      setMsg(solvedAt === 1 ? "Richtig – beim ersten Wort!" : `Richtig – nach ${solvedAt} Wörtern.`);
      finish(true);
      onSolved?.();
      return;
    }
    mistakes++; input.value = "";
    haptic?.(20); shake(cards[Math.min(revealed - 1, N - 1)]); draw();
    if (mistakes >= MAX) {
      finish(false);
      setMsg(`Die Kategorie war: ${p.cat}`, true);
      return;
    }
    if (revealed < N) later(() => reveal(revealed), 180);
    const left = MAX - mistakes;
    setMsg(`Leider nein. ${revealed < N ? `Wort ${Math.min(revealed + 1, N)} von ${N}. ` : ""}Noch ${left} Versuch${left === 1 ? "" : "e"}.`, true);
    try { input.focus({ preventScroll: true }); } catch {}
  }

  draw();
  return {
    el,
    aspect: [3, 4],
    lock() { el.classList.add("locked"); input.disabled = true; btn.disabled = true; },
    canUndo: () => false,
    hint() {
      if (done) return null;
      const hnt = findHint(p, revealed, { letter: letterHint });
      if (!hnt) return null;
      if (hnt.type === "letter") { letterHint = true; return `Die Kategorie beginnt mit „${hnt.letter}“`; }
      reveal(hnt.index); setMsg(`Wort ${revealed} von ${N} aufgedeckt – kein Versuch verbraucht.`);
      return `Wort ${revealed} aufgedeckt`;
    },
    metrics() {
      const k = solved ? solvedAt : revealed;
      const squares = Array.from({ length: N }, (_, i) => (solved && i === solvedAt - 1 ? "🟩" : i < k ? "🟥" : "⬜")).join("");
      return { line: solved ? `Gelöst nach ${k === 1 ? "1 Wort" : `${k} Wörtern`} ${squares}` : `Nicht gelöst ${squares}`, mistakes };
    },
    destroy() { for (const t of timers) clearTimeout(t); timers.clear(); ro?.disconnect(); el.remove(); },
  };
}
