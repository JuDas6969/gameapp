import { GAMES, GAME_KEYS, DIFF_TITLE, dailySeed, dailyDiff, dayKey, dailyNumber, randomSeed } from "./engine/index.js";
import { BOARDS } from "./boards/index.js";

const SHARE_URL = "judas6969.github.io/gameapp";
const MAX_FREEZES = 2, WINS_PER_FREEZE = 5;

// ---------- stats (localStorage) ----------
// Per game: { solved, best:{diff:sec}, daily:[dayKey], lastDiff, flawless, wins, freezes, frozen:[dayKey] }
// Older entries lack flawless/wins/freezes/frozen – g() fills defaults in place (no data loss).
const Stats = {
  key: "raetsel.v1",
  data: null,
  load() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch { this.data = {}; } return this; },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch {} },
  g(kind) {
    const g = (this.data[kind] ||= { solved: 0, best: {}, daily: [], lastDiff: "mittel" });
    g.best ||= {}; g.daily ||= []; g.flawless ??= 0; g.wins ??= g.daily.length; g.freezes ??= 0; g.frozen ||= [];
    return g;
  },
  dailyDone(kind, d = new Date()) { return this.g(kind).daily.includes(dayKey(d)); },
  /** Consume freezes for missed days between the last solved/frozen day and yesterday. Persistent, idempotent. */
  reconcile(kind, now = new Date()) {
    const g = this.g(kind);
    if (!g.daily.length) return;
    const covered = new Set([...g.daily, ...g.frozen]);
    const last = [...covered].sort().at(-1);
    const today = dayKey(now);
    if (last >= today) return;
    const d = new Date(last.slice(0, 4), +last.slice(5, 7) - 1, +last.slice(8, 10)); d.setDate(d.getDate() + 1);
    let changed = false;
    while (dayKey(d) < today) {                       // every day strictly between last and today is a missed day
      if (g.freezes <= 0) break;                      // no freeze left → streak simply breaks
      g.freezes--; g.frozen.push(dayKey(d)); changed = true;
      d.setDate(d.getDate() + 1);
    }
    if (changed) this.save();
  },
  /** Consecutive days (today or yesterday inclusive) with a solved daily; frozen days bridge gaps but do not count. */
  streak(kind) {
    this.reconcile(kind);
    const g = this.g(kind), days = new Set(g.daily), frozen = new Set(g.frozen);
    const has = (d) => days.has(dayKey(d)) || frozen.has(dayKey(d));
    const d = new Date();
    if (!has(d)) { d.setDate(d.getDate() - 1); if (!has(d)) return 0; }
    let n = 0; while (has(d)) { if (days.has(dayKey(d))) n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  freezes(kind) { return this.g(kind).freezes; },
  /** returns true when sec is a new best for this difficulty */
  record(kind, diff, sec, isDaily, flawless) {
    const g = this.g(kind); g.solved++;
    if (flawless) g.flawless++;
    const prev = g.best[diff]; g.best[diff] = prev == null ? sec : Math.min(prev, sec);
    if (isDaily && !g.daily.includes(dayKey())) {
      this.reconcile(kind);
      g.daily.push(dayKey()); g.wins++;
      if (g.wins % WINS_PER_FREEZE === 0 && g.freezes < MAX_FREEZES) { g.freezes++; toast("🧊 Streak-Freeze verdient"); }
    }
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
  const streaks = Object.fromEntries(GAME_KEYS.map((k) => [k, Stats.streak(k)]));
  const streak = Math.max(...Object.values(streaks));
  const el = h("div", { class: "home" },
    h("h1", {}, "Rätsel"),
    h("div", { class: "daily" },
      h("div", {}, h("b", {}, `Tagesrätsel #${dailyNumber()}`), h("span", {}, `${done} von ${GAME_KEYS.length} gelöst · ${DIFF_TITLE[dailyDiff()]}`)),
      streak ? h("div", { class: "streak" }, `🔥 ${streak}`) : null),
    h("div", { class: "cards" }, GAME_KEYS.map((k) => h("button", { class: "card", onclick: () => Launch(k) },
      h("div", { class: "ic" }, GAMES[k].icon, Stats.dailyDone(k) ? h("span", { class: "done" }, "✓") : null),
      h("b", {}, GAMES[k].title), h("small", {}, GAMES[k].subtitle),
      h("div", { class: "foot" },
        h("span", { class: "cnt" }, `${Stats.g(k).solved} gelöst`),
        streaks[k] ? h("span", { class: "cstreak" }, `🔥 ${streaks[k]}`, Stats.freezes(k) ? h("span", { class: "frz" }, " " + "🧊".repeat(Stats.freezes(k))) : null) : null)))),
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
  const streak = Stats.streak(kind);
  scrim.append(h("div", { class: "sheet" },
    h("h2", {}, GAMES[kind].title), h("p", {}, GAMES[kind].rules),
    h("div", { style: "font-weight:700;font-size:14px;margin-bottom:6px" }, "Schwierigkeit"), seg,
    best.length ? h("div", { class: "best" }, "Bestzeiten:", best.map(([d, s]) => h("span", {}, `${DIFF_TITLE[d]} ${clock(s)}`))) : null,
    (streak || g.flawless) ? h("div", { class: "best" },
      streak ? h("span", {}, `🔥 ${streak} Tage${g.freezes ? ` · ${"🧊".repeat(g.freezes)} Freeze` : ""}`) : null,
      g.flawless ? h("span", {}, `${g.flawless}× fehlerfrei`) : null) : null,
    h("button", { class: "btn primary", onclick: () => { scrim.remove(); Game(kind, { mode: "random", diff }); } }, "Neues Rätsel"),
    h("button", { class: "btn ghost" + (Stats.dailyDone(kind) ? " done" : ""), onclick: () => { scrim.remove(); Game(kind, { mode: "daily" }); } },
      Stats.dailyDone(kind) ? "✓ Tagesrätsel nochmal spielen" : `Tagesrätsel #${dailyNumber()} – ${DIFF_TITLE[dailyDiff()]}`)));
  document.body.append(scrim);
}

async function Game(kind, session) {
  const isDaily = session.mode === "daily";
  let solved = false, tick = null, puzzle = null, board = null, hints = 0;
  // timer: timestamp based; pauses while the page is hidden
  let elapsed = 0, runStart = null;
  const now = () => performance.now();
  const seconds = () => Math.floor((elapsed + (runStart != null ? now() - runStart : 0)) / 1000);
  const pause = () => { if (runStart != null) { elapsed += now() - runStart; runStart = null; } };
  const resume = () => { if (runStart == null && board && !solved) runStart = now(); };
  const onVis = () => { if (document.hidden) pause(); else resume(); };
  document.addEventListener("visibilitychange", onVis);

  const timeEl = h("span", {}, "0:00");
  const hintBtn = h("button", { class: "hintbtn", onclick: () => {
    if (!board?.hint || solved) return;
    const msg = board.hint();                   // board applies one step and returns a short German message (or null if nothing to show)
    if (msg) { hints++; hintBtn.textContent = `💡 Tipp (${hints})`; haptic(); toast(msg); }
  } }, "💡 Tipp");
  const undoBtn = h("button", { class: "undobtn", "aria-label": "Rückgängig", onclick: () => {
    if (solved || !board?.undo) return;
    if (board.undo()) haptic();
  } }, "↶");
  const updateUndo = () => { undoBtn.disabled = solved || !board?.undo || (board.canUndo ? !board.canUndo() : false); };
  const metaL = h("span", {}, isDaily ? `Tagesrätsel #${dailyNumber()}` : DIFF_TITLE[session.diff]);
  const wrap = h("div", { class: "board-wrap" }, h("div", { class: "spin" }));
  const tools = h("div", { class: "tools" });
  const screen = h("div", { class: "game" },
    h("div", { class: "top" },
      h("button", { onclick: () => { leave(); Home(); } }, "‹ Zurück"),
      h("div", { class: "title" }, GAMES[kind].title),
      h("button", { onclick: () => alertSheet(GAMES[kind].title, GAMES[kind].rules) }, "?"),
      undoBtn,
      hintBtn,
      isDaily ? h("span", { style: "width:38px" }) : h("button", { "aria-label": "Neues Rätsel", onclick: () => load() }, "↻")),
    h("div", { class: "meta" }, metaL, timeEl), wrap, tools);
  render(screen);

  const stop = () => { pause(); clearInterval(tick); tick = null; };
  const leave = () => { stop(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", fit); };
  const onSolved = () => {
    if (solved) return; solved = true; stop(); haptic(30);
    board?.lock?.(); updateUndo();
    const sec = seconds(); timeEl.textContent = clock(sec);
    const m = board?.metrics?.() || {};
    const mistakes = Number(m.mistakes) || 0;
    const flawless = hints === 0 && mistakes === 0;
    const newBest = Stats.record(kind, puzzle.diff, sec, isDaily, flawless);
    const statusText = flawless ? "fehlerfrei" : [hints ? `${hints} Tipp${hints > 1 ? "s" : ""}` : null, mistakes ? `${mistakes} Fehler` : null].filter(Boolean).join(" · ");
    const shareText = [
      `Rätsel · ${GAMES[kind].title} #${isDaily ? dailyNumber() : "Zufall"} | ${clock(sec)} ${statusText}`,
      m.line || null,
      SHARE_URL,
    ].filter(Boolean).join("\n");
    const share = async () => {
      try {
        if (navigator.share) { await navigator.share({ text: shareText }); return; }
      } catch (e) { if (e?.name === "AbortError") return; }
      try { await navigator.clipboard.writeText(shareText); toast("Kopiert"); }
      catch { prompt("Ergebnis kopieren:", shareText); }
    };
    const overlay = h("div", { class: "win" }, h("div", { class: "box" },
      h("div", { class: "check" }, "✓"), h("h2", {}, "Gelöst!"),
      h("p", {}, `${isDaily ? `#${dailyNumber()} · ` : ""}${DIFF_TITLE[puzzle.diff]} · ${clock(sec)}`),
      h("div", { class: "status " + (flawless ? "ok" : "") }, flawless ? "✦ fehlerfrei" : `mit ${statusText}`),
      m.line ? h("div", { class: "mline" }, m.line) : null,
      newBest && Stats.g(kind).solved > 1 ? h("div", { class: "nb" }, "Neue Bestzeit") : null,
      isDaily && Stats.streak(kind) > 1 ? h("div", { class: "nb streak" }, `🔥 ${Stats.streak(kind)} Tage in Folge`) : null,
      h("div", { class: "row" },
        h("button", { class: "btn ghost small", onclick: () => overlay.remove() }, "Ansehen"),
        h("button", { class: "btn ghost small", onclick: share }, "Teilen"),
        isDaily ? h("button", { class: "btn primary small", onclick: () => { leave(); Home(); } }, "Fertig") : h("button", { class: "btn primary small", onclick: () => load() }, "Nächstes"))));
    wrap.style.position = "relative"; wrap.append(overlay);
  };
  async function load() {
    stop(); elapsed = 0; runStart = null; solved = false; hints = 0; hintBtn.textContent = "💡 Tipp"; timeEl.textContent = "0:00";
    board = null; updateUndo();
    wrap.replaceChildren(h("div", { class: "spin" })); tools.replaceChildren();
    const seed = isDaily ? dailySeed(kind) : randomSeed();
    const diff = isDaily ? dailyDiff() : session.diff;
    puzzle = await generateAsync(kind, diff, seed);
    metaL.textContent = isDaily ? `Tagesrätsel #${dailyNumber()} · ${DIFF_TITLE[puzzle.diff]}` : DIFF_TITLE[puzzle.diff];
    board = BOARDS[kind](puzzle, { onSolved, tools, haptic });
    wrap.replaceChildren(board.el);
    fit();
    if (!document.hidden) resume();
    tick = setInterval(() => { if (!solved) timeEl.textContent = clock(seconds()); updateUndo(); }, 300);
    updateUndo();
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
