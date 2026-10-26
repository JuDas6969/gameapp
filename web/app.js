import { GAMES, GAME_KEYS, DIFF_TITLE, dailySeed, dailyDiff, dayKey, randomSeed } from "./engine/index.js";
import { BOARDS } from "./boards/index.js";

// ---------- stats (localStorage) ----------
const Stats = {
  key: "raetsel.v1",
  data: null,
  load() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch { this.data = {}; } return this; },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch {} },
  g(kind) { return (this.data[kind] ||= { solved: 0, best: {}, daily: [], lastDiff: "mittel" }); },
  dailyDone(kind, d = new Date()) { return this.g(kind).daily.includes(dayKey(d)); },
  streak(kind) {
    const days = new Set(this.g(kind).daily); let d = new Date();
    if (!days.has(dayKey(d))) { d.setDate(d.getDate() - 1); if (!days.has(dayKey(d))) return 0; }
    let n = 0; while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  record(kind, diff, sec, isDaily) {
    const g = this.g(kind); g.solved++;
    const prev = g.best[diff]; g.best[diff] = prev == null ? sec : Math.min(prev, sec);
    if (isDaily && !g.daily.includes(dayKey())) g.daily.push(dayKey());
    this.save(); return prev == null || sec < prev;
  },
}.load();

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else if (v != null) el.setAttribute(k, v); }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
};
export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };

// ---------- worker ----------
const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
let reqId = 0; const pending = new Map();
worker.onmessage = (e) => { const cb = pending.get(e.data.id); pending.delete(e.data.id); cb?.(e.data); };
const generateAsync = (kind, diff, seed) => new Promise((res, rej) => {
  const id = ++reqId; pending.set(id, (d) => (d.error ? rej(new Error(d.error)) : res(d.puzzle)));
  worker.postMessage({ id, kind, diff, seed });
});

// ---------- views ----------
const app = document.getElementById("app");
const render = (node) => { app.replaceChildren(node); document.querySelector(".ios-tip")?.remove(); };

function Home() {
  const done = GAME_KEYS.filter((k) => Stats.dailyDone(k)).length;
  const streak = Math.max(...GAME_KEYS.map((k) => Stats.streak(k)));
  const el = h("div", { class: "home" },
    h("h1", {}, "Rätsel"),
    h("div", { class: "daily" },
      h("div", {}, h("b", {}, "Tagesrätsel"), h("span", {}, `${done} von ${GAME_KEYS.length} gelöst · ${DIFF_TITLE[dailyDiff()]}`)),
      streak ? h("div", { class: "streak" }, `🔥 ${streak}`) : null),
    h("div", { class: "cards" }, GAME_KEYS.map((k) => h("button", { class: "card", onclick: () => Launch(k) },
      h("div", { class: "ic" }, GAMES[k].icon, Stats.dailyDone(k) ? h("span", { class: "done" }, "✓") : null),
      h("b", {}, GAMES[k].title), h("small", {}, GAMES[k].subtitle),
      h("span", { class: "cnt" }, `${Stats.g(k).solved} gelöst`)))),
    h("div", { class: "hint" }, "Alles offline. Kein Konto, keine Werbung."));
  render(el);
  iosInstallTip();
}

function Launch(kind) {
  const g = Stats.g(kind); let diff = g.lastDiff || "mittel";
  const scrim = h("div", { class: "scrim", onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  const seg = h("div", { class: "seg" });
  const drawSeg = () => seg.replaceChildren(...Object.keys(DIFF_TITLE).map((d) => h("button", { class: d === diff ? "on" : "", onclick: () => { diff = d; g.lastDiff = d; Stats.save(); drawSeg(); } }, DIFF_TITLE[d])));
  drawSeg();
  const best = Object.entries(g.best);
  scrim.append(h("div", { class: "sheet" },
    h("h2", {}, GAMES[kind].title), h("p", {}, GAMES[kind].rules),
    h("div", { style: "font-weight:700;font-size:14px;margin-bottom:6px" }, "Schwierigkeit"), seg,
    best.length ? h("div", { class: "best" }, "Bestzeiten:", best.map(([d, s]) => h("span", {}, `${DIFF_TITLE[d]} ${clock(s)}`))) : null,
    h("button", { class: "btn primary", onclick: () => { scrim.remove(); Game(kind, { mode: "random", diff }); } }, "Neues Rätsel"),
    h("button", { class: "btn ghost" + (Stats.dailyDone(kind) ? " done" : ""), onclick: () => { scrim.remove(); Game(kind, { mode: "daily" }); } },
      Stats.dailyDone(kind) ? "✓ Tagesrätsel nochmal spielen" : `Tagesrätsel – ${DIFF_TITLE[dailyDiff()]}`)));
  document.body.append(scrim);
}

async function Game(kind, session) {
  const isDaily = session.mode === "daily";
  let seconds = 0, solved = false, timer = null, puzzle = null, board = null, hints = 0;
  const timeEl = h("span", {}, "0:00");
  const hintBtn = h("button", { class: "hintbtn", onclick: () => {
    if (!board?.hint || solved) return;
    const msg = board.hint();                   // board applies one step and returns a short German message (or null if nothing to show)
    if (msg) { hints++; seconds += 30; timeEl.textContent = clock(seconds); hintBtn.textContent = `💡 Tipp (${hints})`; haptic(); toast(msg); }
  } }, "💡 Tipp");
  const metaL = h("span", {}, isDaily ? "Tagesrätsel" : DIFF_TITLE[session.diff]);
  const wrap = h("div", { class: "board-wrap" }, h("div", { class: "spin" }));
  const tools = h("div", { class: "tools" });
  const screen = h("div", { class: "game" },
    h("div", { class: "top" },
      h("button", { onclick: () => { stop(); Home(); } }, "‹ Zurück"),
      h("div", { class: "title" }, GAMES[kind].title),
      h("button", { onclick: () => alertSheet(GAMES[kind].title, GAMES[kind].rules) }, "?"),
      hintBtn,
      isDaily ? h("span", { style: "width:38px" }) : h("button", { onclick: () => load() }, "↻")),
    h("div", { class: "meta" }, metaL, timeEl), wrap, tools);
  render(screen);

  const stop = () => { clearInterval(timer); timer = null; };
  const onSolved = () => {
    if (solved) return; solved = true; stop(); haptic(30);
    board?.lock?.();
    const newBest = Stats.record(kind, puzzle.diff, seconds, isDaily);
    const overlay = h("div", { class: "win" }, h("div", { class: "box" },
      h("div", { class: "check" }, "✓"), h("h2", {}, "Gelöst!"), h("p", {}, `${DIFF_TITLE[puzzle.diff]} · ${clock(seconds)}${hints ? ` · ${hints} Tipp${hints > 1 ? "s" : ""} (+30 s je Tipp)` : ""}`),
      newBest && Stats.g(kind).solved > 1 ? h("div", { class: "nb" }, "Neue Bestzeit") : null,
      h("div", { class: "row" },
        h("button", { class: "btn ghost small", onclick: () => overlay.remove() }, "Ansehen"),
        isDaily ? h("button", { class: "btn primary small", onclick: () => Home() }, "Fertig") : h("button", { class: "btn primary small", onclick: () => load() }, "Nächstes"))));
    wrap.style.position = "relative"; wrap.append(overlay);
  };
  async function load() {
    stop(); seconds = 0; solved = false; hints = 0; hintBtn.textContent = "💡 Tipp"; timeEl.textContent = "0:00";
    wrap.replaceChildren(h("div", { class: "spin" })); tools.replaceChildren();
    const seed = isDaily ? dailySeed(kind) : randomSeed();
    const diff = isDaily ? dailyDiff() : session.diff;
    puzzle = await generateAsync(kind, diff, seed);
    metaL.textContent = isDaily ? `Tagesrätsel · ${DIFF_TITLE[puzzle.diff]}` : DIFF_TITLE[puzzle.diff];
    board = BOARDS[kind](puzzle, { onSolved, tools, haptic });
    wrap.replaceChildren(board.el);
    fit(); timer = setInterval(() => { if (!solved) timeEl.textContent = clock(++seconds); }, 1000);
  }
  const fit = () => {
    if (!board) return;
    const r = wrap.getBoundingClientRect(); const side = Math.max(120, Math.min(r.width, r.height) - 8);
    const [aw, ah] = board.aspect || [1, 1];
    const scale = Math.min(side / aw, side / ah);
    board.el.style.width = `${aw * scale}px`; board.el.style.height = `${ah * scale}px`;
  };
  window.addEventListener("resize", fit);
  await load();
}

let toastEl = null, toastTimer = null;
export function toast(text) {
  toastEl?.remove(); clearTimeout(toastTimer);
  toastEl = h("div", { class: "toast" }, text); document.body.append(toastEl);
  toastTimer = setTimeout(() => toastEl?.remove(), 2600);
}

function alertSheet(title, text) {
  const scrim = h("div", { class: "scrim", onclick: (e) => { if (e.target === scrim) scrim.remove(); } },
    h("div", { class: "sheet" }, h("h2", {}, title), h("p", {}, text), h("button", { class: "btn ghost", onclick: () => scrim.remove() }, "OK")));
  document.body.append(scrim);
}

function iosInstallTip() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  if (!isIOS || standalone || localStorage.getItem("raetsel.tip")) return;
  const tip = h("div", { class: "ios-tip" }, "Als App installieren: Teilen-Symbol ⎋ → „Zum Home-Bildschirm“",
    h("button", { onclick: () => { tip.remove(); localStorage.setItem("raetsel.tip", "1"); } }, "OK"));
  document.body.append(tip);
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
Home();
