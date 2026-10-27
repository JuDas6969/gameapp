// Treffpunkt (Pinpoint-Klon) – DOM-Board: zusammenhängender Kartenstapel aus 5 Balken (Blauverlauf), Freitext-Eingabe, 5 Versuche.
// Board-API: { el, aspect, lock, hint, spotlight, clearSpotlight, canUndo, metrics, destroy }
import { h, msgBar } from "./_shared.js";
import { matches, normalize, MAX_GUESSES } from "../engine/treffpunkt.js";

const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
// Blauverlauf hell (Wort 1) → dunkel (Wort 5); Schriftfarbe passend
const BLUES = ["#d6e6fb", "#a9c9f2", "#78a6e3", "#4a7fcb", "#2a5ca8"];
const INKS = ["#14243b", "#14243b", "#0d1b30", "#fff", "#fff"];
const STRIPES = "repeating-linear-gradient(45deg, rgba(255,255,255,.55) 0 6px, transparent 6px 15px)";
const WORDS_DE = ["ein", "zwei", "drei", "vier", "fünf"];

export function Treffpunkt(p, { onSolved, tools, haptic } = {}) {
  const N = p.words.length, MAX = p.maxGuesses || MAX_GUESSES;
  let revealed = 1, mistakes = 0, done = false, solved = false, solvedAt = 0, letterHint = false;
  const wrong = [];                    // Fehlversuche (Text) in Reihenfolge
  const seen = new Set();
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  // ---- Kartenstapel ----
  const bars = p.words.map((_, i) => h("div", {
    style: css({ position: "relative", flex: "1 1 0", "min-height": "2.3em", display: "grid", "grid-template-columns": "1fr auto 1fr", "align-items": "center", gap: ".4em", padding: "0 .7em", background: BLUES[i], color: INKS[i], "box-sizing": "border-box", "border-radius": i === 0 ? ".9em .9em 0 0" : i === N - 1 ? "0 0 .9em .9em" : "0" }),
  }));
  const stack = h("div", { style: css({ display: "flex", "flex-direction": "column", gap: "2px", flex: "5 1 0", "min-height": "0" }) }, bars);
  const resultBar = h("div", { style: css({ display: "none", "align-items": "center", "justify-content": "center", gap: ".5em", "min-height": "2.3em", padding: ".2em .7em", "border-radius": ".9em", background: "#eef4fd", color: "#14243b", "font-weight": "800", "font-size": "1.1em", "text-align": "center", "box-sizing": "border-box" }) });

  const input = h("input", {
    type: "text", enterkeyhint: "send", autocomplete: "off", autocorrect: "off", autocapitalize: "sentences", spellcheck: "false",
    placeholder: "Kategorie erraten …", "aria-label": "Kategorie erraten",
    style: css({ flex: "1 1 0", "min-width": "0", font: "inherit", "font-size": "max(16px, 1em)", padding: ".55em .8em", "border-radius": "999px", border: "1px solid var(--line-strong)", background: "var(--card)", color: "var(--ink)", outline: "none", "user-select": "text", "-webkit-user-select": "text", "touch-action": "manipulation" }),
  });
  const counter = h("span", { style: css({ flex: "0 0 auto", color: "var(--muted)", "font-size": ".8em", "font-weight": "700", "white-space": "nowrap" }) });
  const btn = h("button", { type: "button", "aria-label": "Rateversuch", style: css({ flex: "0 0 auto", width: "2.3em", height: "2.3em", font: "inherit", "font-weight": "800", "border-radius": "50%", border: "none", background: "#2a5ca8", color: "#fff", "touch-action": "manipulation", padding: "0" }), onclick: () => guess() }, "↑");
  const inputRow = h("div", { style: css({ display: "flex", gap: ".5em", "align-items": "center" }) }, input, counter, btn);
  const info = h("div", { style: css({ border: "1px solid var(--line)", "border-radius": ".8em", padding: ".5em .8em", color: "var(--muted)", "font-size": ".72em", "line-height": "1.35" }) },
    `Alle ${N} Hinweise gehören einer gemeinsamen Kategorie an. Erraten Sie die Kategorie mit so wenigen Hinweisen wie möglich.`);
  const el = h("div", { class: "board dom", style: css({ display: "flex", "flex-direction": "column", gap: ".6em", "box-sizing": "border-box", padding: ".2em 0", "font-size": "18px" }) },
    stack, resultBar, inputRow, info);

  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); guess(); } });
  input.addEventListener("focus", () => later(() => { try { input.scrollIntoView({ block: "nearest" }); } catch {} }, 320));

  // Schrift an Board-Breite koppeln (app.js setzt width/height in px).
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { const w = el.clientWidth || 300; el.style.fontSize = `${Math.max(13, Math.min(22, w / 17))}px`; }) : null;
  ro?.observe(el);

  const setMsg = tools ? msgBar(tools, "") : () => {};

  const pill = (text) => h("span", { style: css({ "justify-self": "start", "max-width": "100%", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap", background: "#fff", color: "#1d1d1f", "border-radius": "999px", padding: ".15em .65em", "font-size": ".7em", "font-weight": "700", "box-shadow": "0 1px 3px rgba(0,0,0,.18)" }) }, text);
  const draw = () => {
    bars.forEach((b, i) => {
      const on = i < revealed;
      const left = i > 0 && wrong[i - 1] != null ? pill(wrong[i - 1]) : h("span");
      const mid = on
        ? h("span", { style: css({ "font-weight": "800", "font-size": "1.15em", "text-align": "center", "line-height": "1.1", "word-break": "break-word" }) }, p.words[i])
        : h("span", { style: css({ "font-weight": "700", "font-size": ".72em", "letter-spacing": ".18em", opacity: ".75" }) }, `HINWEIS ${i + 1}`);
      b.replaceChildren(left, mid, h("span"));
    });
    counter.textContent = `${Math.min(mistakes + 1, MAX)} von ${MAX}`;
  };
  const reveal = (i) => {
    revealed = Math.max(revealed, i + 1); draw();
    try { bars[i].animate([{ transform: "rotateX(90deg)", opacity: .3 }, { transform: "rotateX(0)", opacity: 1 }], { duration: 260, easing: "ease-out" }); } catch {}
  };
  const shake = (node) => { try { node.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 340 }); } catch {} };
  const finish = (ok) => {
    done = true; input.disabled = true; btn.disabled = true;
    for (let i = revealed; i < N; i++) reveal(i);
    inputRow.style.display = "none";
    const mark = h("span", { style: css({ display: "inline-flex", "align-items": "center", "justify-content": "center", width: "1.5em", height: "1.5em", "border-radius": "50%", background: ok ? "var(--ok)" : "var(--bad)", color: "#fff", "font-size": ".85em", flex: "0 0 auto" }) }, ok ? "✓" : "✕");
    resultBar.replaceChildren(mark, h("span", {}, p.cat));
    if (!ok && wrong[N - 1] != null) resultBar.prepend(pill(wrong[N - 1]));
    resultBar.style.display = "flex";
    resultBar.style.background = ok ? "#eef4fd" : "#dcdcdc";
    try { resultBar.animate([{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 300, easing: "ease-out" }); } catch {}
    try { input.blur(); } catch {}
  };

  function guess() {
    if (done) return;
    const text = input.value.trim();
    if (!text) { shake(input); return; }
    const key = normalize(text);
    if (!key) { shake(input); return; }
    if (seen.has(key)) { setMsg("Das hast du schon probiert.", true); shake(input); return; }
    seen.add(key); clearSpotlight();
    if (matches(p, text)) {
      solved = true; solvedAt = revealed;
      haptic?.(30);
      setMsg(solvedAt === 1 ? "Richtig – beim ersten Hinweis!" : `Richtig – nach ${solvedAt} Hinweisen.`);
      finish(true);
      onSolved?.();
      return;
    }
    wrong[mistakes] = text; mistakes++; input.value = "";
    haptic?.(20); shake(bars[Math.min(revealed - 1, N - 1)]); draw();
    if (mistakes >= MAX) {
      finish(false);
      setMsg(`Die Kategorie war: ${p.cat}`, true);
      return;
    }
    if (revealed < N) later(() => reveal(revealed), 180);
    const left = MAX - mistakes;
    setMsg(`Leider nein. Noch ${left} Versuch${left === 1 ? "" : "e"}.`, true);
    try { input.focus({ preventScroll: true }); } catch {}
  }

  // ---- Tipp-Spotlight (DOM): [i, 0] = Balken i ----
  const SPOT_PROPS = ["filter", "outline", "outline-offset", "background-image", "z-index"];
  const dimmables = [...bars, inputRow, info];
  function clearSpotlight() { dimmables.forEach((e) => SPOT_PROPS.forEach((k) => e.style.removeProperty(k))); }
  function spotlight(spec = {}) {
    clearSpotlight();
    const at = ([r]) => bars[r];
    const focus = (spec.focus || []).map(at), target = (spec.target || []).map(at), strike = (spec.strike || []).map(at);
    const lit = new Set([...focus, ...target, ...strike].filter(Boolean));
    if (!lit.size) return;
    dimmables.forEach((e) => { if (!lit.has(e)) e.style.filter = "brightness(.42)"; });
    strike.forEach((e) => { if (e) e.style.backgroundImage = STRIPES; });
    target.forEach((e) => { if (e) { e.style.outline = "3px solid #1f7aff"; e.style.outlineOffset = "-3px"; e.style.zIndex = "1"; } });
  }

  function hint() {
    if (done) return null;
    const catWords = p.cat.trim().split(/\s+/);
    const shape = catWords.length === 1 ? `ein einzelnes Wort mit ${p.cat.trim().length} Buchstaben` : `ein Begriff aus ${WORDS_DE[catWords.length - 1] || catWords.length} Wörtern`;
    const shown = p.words.slice(0, revealed).map((w) => `„${w}“`);
    const focus = shown.map((_, i) => [i, 0]);
    const next = revealed < N ? revealed : -1;
    const revealApply = next < 0 ? undefined : () => {
      reveal(next); setMsg(`Hinweis ${revealed} aufgedeckt – kein Versuch verbraucht.`);
      return `Hinweis ${revealed} ist aufgedeckt – das hat keinen Versuch gekostet.`;
    };
    const first = p.cat.trim()[0].toUpperCase();
    if (!letterHint) {
      letterHint = true;
      const why = revealed === 1
        ? `${shown[0]} ist ein typisches Beispiel für eine Kategorie aus dem Alltag – gesucht ist ${shape}.`
        : `Alle bisherigen Wörter (${shown.join(", ")}) haben etwas gemeinsam – gesucht ist ${shape}.`;
      return { text: `${why}\nDie Kategorie beginnt mit „${first}“.`, focus, target: next < 0 ? [] : [[next, 0]], apply: revealApply };
    }
    if (next >= 0) {
      return {
        text: `Gesucht ist ${shape}, Anfangsbuchstabe „${first}“. Jeder weitere Hinweis grenzt die Kategorie ein – und hier kostet er keinen Versuch.\nDecken Sie Hinweis ${next + 1} auf.`,
        focus, target: [[next, 0]], apply: revealApply,
      };
    }
    return {
      text: `Alle ${N} Hinweise liegen offen; die Kategorie ist ${shape} und beginnt mit „${first}“.\nDie Anfangsbuchstaben lauten: ${catWords.map((w) => `${w[0]}…`).join(" ")}`,
      focus,
    };
  }

  draw();
  return {
    el,
    aspect: [3, 4],
    lock() { el.classList.add("locked"); input.disabled = true; btn.disabled = true; },
    canUndo: () => false,
    hint, spotlight, clearSpotlight,
    metrics() {
      const k = solved ? solvedAt : revealed;
      const squares = Array.from({ length: N }, (_, i) => (solved && i === solvedAt - 1 ? "🟩" : i < k ? "🟥" : "⬜")).join("");
      return { line: solved ? `Gelöst nach ${k === 1 ? "1 Hinweis" : `${k} Hinweisen`} ${squares}` : `Nicht gelöst ${squares}`, mistakes };
    },
    destroy() { for (const t of timers) clearTimeout(t); timers.clear(); ro?.disconnect(); el.remove(); },
  };
}
