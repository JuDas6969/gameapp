// Wortleiter – deutscher Crossclimb-Klon. Reine Logik, kein DOM.
// generate(diff, seed) → { kind:"wortleiter", diff, length, ladder:[top, w1..w5, bottom], shuffle:[…], clues:{WORT: hinweis} }
// Regeln: fünf Hinweise → fünf gleich lange Wörter; richtig sortiert unterscheiden sich Nachbarn in genau einem
// Buchstaben. Oben und unten liegt je ein verdecktes Wort, das zuletzt über zwei weitere Hinweise gefunden wird.
import { Rng, resolveDiff } from "./core.js";
import { WORDS } from "../data/words.js";
import { CLUES } from "../data/wortleiter.js";

export const LENGTH = { leicht: 4, mittel: 4, schwer: 5, experte: 5 };
export const MIDDLE = 5;                 // Zeilen mit Hinweis
export const TOTAL = MIDDLE + 2;         // plus oberes und unteres Wort

/** Hamming-Distanz zweier gleich langer Wörter. */
export function hamming(a, b) {
  if (a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** true, wenn benachbarte Wörter sich in genau einem Buchstaben unterscheiden (keine Lücken erlaubt). */
export function isOrderValid(words) {
  if (!words || words.length < 2) return false;
  for (let i = 1; i < words.length; i++) {
    if (!words[i] || !words[i - 1] || hamming(words[i], words[i - 1]) !== 1) return false;
  }
  return true;
}

// ---- Graph pro Wortlänge (lazy) ----
const graphs = {};
function graph(L) {
  if (graphs[L]) return graphs[L];
  const rank = new Map(WORDS[L].common.map((w, i) => [w, i]));
  const words = Object.keys(CLUES).filter((w) => w.length === L && rank.has(w.toLowerCase()));
  words.sort((a, b) => rank.get(a.toLowerCase()) - rank.get(b.toLowerCase())); // häufig → selten
  const idx = new Map(words.map((w, i) => [w, i]));
  const buckets = new Map();
  words.forEach((w, i) => {
    for (let p = 0; p < L; p++) {
      const key = w.slice(0, p) + "_" + w.slice(p + 1);
      let b = buckets.get(key); if (!b) buckets.set(key, (b = []));
      b.push(i);
    }
  });
  const adj = words.map(() => []);
  for (const b of buckets.values()) for (const i of b) for (const j of b) if (i !== j) adj[i].push(j);
  for (const a of adj) a.sort((x, y) => x - y);
  return (graphs[L] = { words, idx, adj });
}

// Schwierigkeit über Wortgeläufigkeit: Anteil der (nach Häufigkeit sortierten) Hinweiswörter, der benutzt werden darf,
// und Mindestanzahl „seltener“ Wörter (aus der oberen Ranghälfte) in der Leiter.
const PROFILE = {
  leicht:  { share: 0.45, rareMin: 0 },
  mittel:  { share: 1.0,  rareMin: 0 },
  schwer:  { share: 0.75, rareMin: 0 },
  experte: { share: 1.0,  rareMin: 3 },
};

/** Zufälliger Pfad ohne Wiederholung der Länge TOTAL im Teilgraphen (Indizes < limit). */
function walk(g, rng, limit, rareFrom, rareMin) {
  const n = Math.min(limit, g.words.length);
  for (let attempt = 0; attempt < 400; attempt++) {
    const start = rng.int(n);
    if (!g.adj[start].length) continue;
    const path = [start]; const used = new Set(path);
    while (path.length < TOTAL) {
      const cur = path[path.length - 1];
      const opts = g.adj[cur].filter((j) => j < n && !used.has(j));
      if (!opts.length) break;
      const next = opts[rng.int(opts.length)];
      path.push(next); used.add(next);
    }
    if (path.length < TOTAL) continue;
    if (rareMin && path.filter((i) => i >= rareFrom).length < rareMin) continue;
    const words = path.map((i) => g.words[i]);
    if (!uniqueMiddleOrder(words.slice(1, TOTAL - 1))) continue;
    return words;
  }
  return null;
}

/** Die fünf Mittelwörter dürfen (bis auf Umkehrung) nur eine gültige Leiter-Reihenfolge haben. */
export function uniqueMiddleOrder(ws) {
  const n = ws.length;
  const adj = ws.map((a) => ws.map((b) => a !== b && hamming(a, b) === 1));
  let count = 0;
  const dfs = (cur, visited, depth) => {
    if (depth === n) { count++; return; }
    for (let j = 0; j < n && count < 3; j++) if (!visited[j] && adj[cur][j]) { visited[j] = true; dfs(j, visited, depth + 1); visited[j] = false; }
  };
  for (let s = 0; s < n && count < 3; s++) { const v = ws.map(() => false); v[s] = true; dfs(s, v, 1); }
  return count === 2; // ein Pfad in beiden Richtungen
}

export function generate(diff, seed) {
  const rng = new Rng(seed);
  diff = resolveDiff(diff, rng);
  const length = LENGTH[diff];
  const g = graph(length);
  const prof = PROFILE[diff];
  const limit = Math.max(60, Math.floor(g.words.length * prof.share));
  const rareFrom = Math.floor(limit / 2);
  let ladder = walk(g, rng, limit, rareFrom, prof.rareMin) || walk(g, rng, g.words.length, 0, 0);
  if (!ladder) throw new Error("Wortleiter: keine Leiter gefunden");
  const middle = ladder.slice(1, TOTAL - 1);
  let shuffle;
  do { shuffle = rng.shuffle(middle.map((_, i) => i)); } while (isOrderValid(shuffle.map((i) => middle[i])));
  const clues = {}; for (const w of ladder) clues[w] = CLUES[w];
  return { kind: "wortleiter", diff, length, ladder, shuffle, clues };
}

/** state: Array der 7 Wörter von oben nach unten (null = offen). Gelöst, wenn gleich der Leiter oder ihrer Umkehrung. */
export function isSolved(p, state) {
  if (!state || state.length !== TOTAL) return false;
  const fwd = p.ladder.every((w, i) => state[i] === w);
  const rev = p.ladder.every((w, i) => state[TOTAL - 1 - i] === w);
  return fwd || rev;
}

/** Orientierung der sortierten Mittelwörter: 1 = wie Leiter, -1 = umgekehrt, 0 = nicht sortiert. */
export function orientation(p, middleOrder) {
  const m = p.ladder.slice(1, TOTAL - 1);
  if (m.every((w, i) => middleOrder[i] === w)) return 1;
  if (m.every((w, i) => middleOrder[MIDDLE - 1 - i] === w)) return -1;
  return 0;
}

/** Erwartete Endwörter [oben, unten] für eine gegebene Orientierung. */
export function endWords(p, orient) {
  return orient === -1 ? [p.ladder[TOTAL - 1], p.ladder[0]] : [p.ladder[0], p.ladder[TOTAL - 1]];
}

/**
 * Tipp. state = { phase: 1|2|3, word, buffer, order, orient }:
 *  Phase 1/3: word = Lösungswort der aktiven Zeile, buffer = eingegebene Buchstaben → { type:"letter", pos, letter }
 *  Phase 2:   order = aktuelle Reihenfolge der fünf Mittelwörter → { type:"swap", i, j }
 */
export function findHint(p, state) {
  if (!state) return null;
  if (state.phase === 2) {
    const m = p.ladder.slice(1, TOTAL - 1);
    const order = state.order || [];
    const score = (t) => t.reduce((s, w, i) => s + (order[i] === w ? 1 : 0), 0);
    const rev = [...m].reverse();
    const target = score(rev) > score(m) ? rev : m;
    for (let i = 0; i < MIDDLE; i++) {
      if (order[i] === target[i]) continue;
      const j = order.indexOf(target[i]);
      if (j < 0) return null;
      return { type: "swap", i, j };
    }
    return null;
  }
  const word = state.word; if (!word) return null;
  const buf = state.buffer || [];
  for (let i = 0; i < word.length; i++) if (buf[i] !== word[i]) return { type: "letter", pos: i, letter: word[i] };
  return null;
}
