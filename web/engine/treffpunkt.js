// Treffpunkt – Pinpoint-Klon. Reine Logik, kein DOM.
// generate(diff, seed) → { kind:"treffpunkt", diff, cat, alt, words, maxGuesses: 5 }
// Fünf Wörter werden nacheinander aufgedeckt (das erste sofort); jeder Fehlversuch deckt das nächste auf.
// Gelöst nach k Wörtern = k-1 Fehlversuche. Fünf Fehlversuche → verloren, Kategorie wird gezeigt.
import { Rng, resolveDiff, DIFFS } from "./core.js";
import { CATEGORIES } from "../data/treffpunkt.js";

export const MAX_GUESSES = 5;
export const WORDS_PER_PUZZLE = 5;

const byDiff = {};
function pool(diff) {
  if (!byDiff[diff]) byDiff[diff] = CATEGORIES.filter((c) => c.diff === diff);
  return byDiff[diff];
}

export function generate(diff, seed) {
  const rng = new Rng(seed);
  diff = resolveDiff(diff, rng);
  let list = pool(diff);
  if (!list.length) list = CATEGORIES;
  const c = rng.pick(list);
  return { kind: "treffpunkt", diff, cat: c.cat, alt: [...(c.alt || [])], words: [...c.words], maxGuesses: MAX_GUESSES };
}

// ---------- Normalisierung & Vergleich ----------
const STOP = new Set(["die", "der", "das", "den", "dem", "des", "dinge", "sachen", "ein", "eine", "einer", "eines", "etwas", "alles", "was"]);

/** Kleinschreibung, Umlaute/ß vereinheitlicht, Satzzeichen raus, Artikel/Füllwörter am Anfang entfernt. */
export function normalize(s) {
  let t = String(s ?? "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const parts = t.split(" ").filter(Boolean);
  while (parts.length > 1 && STOP.has(parts[0])) parts.shift();
  return parts.join(" ");
}

/** Levenshtein-Distanz mit Abbruch bei > max. */
export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v); if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const fuzzyEq = (g, target) => g === target || (target.length >= 5 && g.length >= 5 && levenshtein(g, target, 1) <= 1);

/** Trefferkriterium: exakt (normalisiert), alle Schlüsselwörter eines alt-Eintrags enthalten, oder Tippfehler (Levenshtein ≤ 1 ab 5 Zeichen). */
export function matches(p, guess) {
  const g = normalize(guess);
  if (!g) return false;
  const cat = normalize(p.cat);
  if (fuzzyEq(g, cat)) return true;
  const gWords = g.split(" ");
  for (const a of p.alt || []) {
    const keys = normalize(a).split(" ").filter(Boolean);
    if (!keys.length) continue;
    if (keys.length === 1 && fuzzyEq(g, keys[0])) return true;
    // alle Schlüsselwörter müssen im Tipp vorkommen (als Teilwort, damit Flexion/Komposita durchgehen)
    if (keys.every((k) => g.includes(k) || gWords.some((w) => fuzzyEq(w, k)))) return true;
  }
  return false;
}

/**
 * Tipp: zuerst der Anfangsbuchstabe der Kategorie, danach das nächste noch verdeckte Wort.
 * revealed = Anzahl bereits aufgedeckter Wörter; state.letter = Buchstaben-Tipp schon gegeben.
 * → { type:"letter", letter } | { type:"reveal", index } | null
 */
export function findHint(p, revealed, state = {}) {
  if (!state.letter) return { type: "letter", letter: p.cat.trim()[0].toUpperCase() };
  if (revealed < p.words.length) return { type: "reveal", index: revealed };
  return null;
}

export { DIFFS };
