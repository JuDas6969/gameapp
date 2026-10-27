// Wortpfad (Klon von LinkedIn „Wend“): Buchstabengitter, das sich vollständig in Pfade zerlegen lässt, die
// jeweils ein Wort bilden. Nachbarschaft = 8 Richtungen (wie bei Wend: waagrecht, senkrecht, diagonal),
// jedes Feld gehört zu genau einem Wort. Eindeutigkeit ist bei Wortspielen per Definition unüblich:
// isSolved() akzeptiert jede Zerlegung aus gültigen Wörtern, die alle Felder genau einmal nutzt.
import { Rng, resolveDiff } from "./core.js";
import { WORDS, isWord } from "../data/words.js";

const DIRS8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// Gittergröße + erlaubte Wortlängen je Stufe
const CFG = {
  leicht:  { n: 4, min: 4, max: 8 },
  mittel:  { n: 5, min: 4, max: 8 },
  schwer:  { n: 6, min: 4, max: 8 },
  experte: { n: 6, min: 6, max: 9 },
};

// Kandidaten je Länge: common ohne q/y (ß ist in common bereits ausgeschlossen), nur a–z äöü
const POOL = {};
const pool = (L) => (POOL[L] ||= (WORDS[L]?.common || []).filter((w) => /^[a-zäöü]+$/.test(w) && !/[qy]/.test(w)));

/** zufällige Zerlegung von total in Summanden aus [min,max] */
function composition(total, min, max, rng) {
  for (let tries = 0; tries < 200; tries++) {
    const parts = []; let rest = total;
    while (rest > 0) {
      const choices = [];
      for (let L = min; L <= Math.min(max, rest); L++) { const r = rest - L; if (r === 0 || r >= min) choices.push(L); }
      if (!choices.length) break;
      const L = choices[rng.int(choices.length)]; parts.push(L); rest -= L;
    }
    if (rest === 0 && parts.length) return rng.shuffle(parts);
  }
  return null;
}

/** Hamiltonpfad im 8-Nachbarschafts-Gitter (randomisierte DFS mit Warnsdorff-Heuristik) */
function hamiltonian(n, rng) {
  const N = n * n, seen = new Uint8Array(N), path = [];
  const inb = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
  const deg = (r, c) => { let d = 0; for (const [dr, dc] of DIRS8) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && !seen[rr * n + cc]) d++; } return d; };
  let steps = 0;
  const dfs = (r, c) => {
    if (++steps > 200000) return false;
    path.push([r, c]); seen[r * n + c] = 1;
    if (path.length === N) return true;
    const nb = [];
    for (const [dr, dc] of DIRS8) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && !seen[rr * n + cc]) nb.push([rr, cc]); }
    rng.shuffle(nb);
    nb.sort((a, b) => deg(...a) - deg(...b) + (rng.float() - 0.5) * 1.2); // Warnsdorff mit Rauschen
    for (const [rr, cc] of nb) if (dfs(rr, cc)) return true;
    path.pop(); seen[r * n + c] = 0; return false;
  };
  for (let tries = 0; tries < 20; tries++) {
    path.length = 0; seen.fill(0); steps = 0;
    if (dfs(rng.int(n), rng.int(n))) return path;
  }
  return null;
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const { n, min, max } = CFG[diff];
  for (let attempt = 0; attempt < 50; attempt++) {
    const parts = composition(n * n, min, max, rng); if (!parts) continue;
    const ham = hamiltonian(n, rng); if (!ham) continue;
    // Pfad in Segmente schneiden → Pfade; dann Wörter wählen
    const letters = Array.from({ length: n }, () => Array(n).fill(""));
    const words = [], used = new Set(); let pos = 0, ok = true;
    for (const L of parts) {
      const path = ham.slice(pos, pos + L); pos += L;
      const cand = pool(L); if (!cand.length) { ok = false; break; }
      let w = null;
      for (let t = 0; t < 30; t++) { const x = cand[rng.int(cand.length)]; if (!used.has(x)) { w = x; break; } }
      if (!w) { ok = false; break; }
      used.add(w);
      path.forEach(([r, c], i) => { letters[r][c] = w[i].toUpperCase(); });
      words.push({ word: w, path });
    }
    if (!ok) continue;
    rng.shuffle(words); // Reihenfolge verrät nichts über die Lage
    return { kind: "wortpfad", n, diff, letters, words };
  }
  throw new Error("Wortpfad: keine Generierung möglich");
}

/** Hinweiszeile wie bei Wend: Anzahl Wörter und Längen */
export const lengthsLine = (p) => `${p.words.length} Wörter: ${p.words.map((w) => w.word.length).join(" · ")}`;

export const adjacent = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;
export const wordOf = (p, path) => path.map(([r, c]) => p.letters[r][c]).join("").toLowerCase();

/** gültiger Pfad: in den Grenzen, Schritte in 8 Richtungen, keine Wiederholung */
export function isValidPath(p, path) {
  if (!Array.isArray(path) || !path.length) return false;
  const seen = new Set();
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (!(r >= 0 && c >= 0 && r < p.n && c < p.n)) return false;
    const k = r * p.n + c; if (seen.has(k)) return false; seen.add(k);
    if (i && !adjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

/** gelöst: alle Pfade gültig, alle Wörter gültig, jedes Feld genau einmal */
export function isSolved(p, paths) {
  const cover = new Set();
  for (const path of paths) {
    if (!isValidPath(p, path) || !isWord(wordOf(p, path))) return false;
    for (const [r, c] of path) { const k = r * p.n + c; if (cover.has(k)) return false; cover.add(k); }
  }
  return cover.size === p.n * p.n;
}

/**
 * Tipp: noch nicht gefundenes Lösungswort. Ist `current` (Pfad in Arbeit) ein Präfix davon, zeigt `next` auf den
 * nächsten Buchstaben, sonst auf das erste Feld. `blocked` = alle fehlenden Wörter überlappen mit gefundenen Pfaden.
 * → { word, path, next:[r,c], index, blocked } | null (alles gefunden)
 */
export function findHint(p, paths, current = []) {
  const occ = new Set(); for (const path of paths) for (const [r, c] of path) occ.add(r * p.n + c);
  const same = (a, b) => a.length === b.length && a.every(([r, c], i) => b[i][0] === r && b[i][1] === c);
  const missing = p.words.filter((w) => !paths.some((path) => same(path, w.path) || same(path.slice().reverse(), w.path)));
  if (!missing.length) return null;
  const free = missing.filter((w) => w.path.every(([r, c]) => !occ.has(r * p.n + c)));
  if (!free.length) { const w = missing[0]; return { word: w.word, path: w.path, next: w.path[0], index: 0, blocked: true }; }
  // Präfix des aktuellen Pfads?
  if (current.length) {
    for (const w of free) {
      if (current.length < w.path.length && current.every(([r, c], i) => w.path[i][0] === r && w.path[i][1] === c))
        return { word: w.word, path: w.path, next: w.path[current.length], index: current.length, blocked: false };
    }
  }
  const w = free[0]; return { word: w.word, path: w.path, next: w.path[0], index: 0, blocked: false };
}
