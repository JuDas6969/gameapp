// Wortpfad (Klon von LinkedIn „Wend“): Buchstabengitter mit Löchern, das sich vollständig in Pfade zerlegen
// lässt, die jeweils ein Wort bilden. Nachbarschaft = 4 Richtungen (waagrecht/senkrecht, wie bei Wend),
// jedes freie Feld gehört zu genau einem Wort; Löcher (`holes`, graue Rechtecke) sind gesperrt.
// Eindeutigkeit ist bei Wortspielen per Definition unüblich: isSolved() akzeptiert jede Zerlegung aus
// gültigen Wörtern, die alle freien Felder genau einmal nutzt.
import { Rng, resolveDiff, DIRS4 } from "./core.js";
import { WORDS, isWord } from "../data/words.js";

const D4 = DIRS4 || [[-1, 0], [1, 0], [0, -1], [0, 1]];
// Gittergröße, erlaubte Wortlängen und Anzahl Löcher [min, max] je Stufe
const CFG = {
  leicht:  { n: 4, min: 4, max: 8, holes: [0, 0] },
  mittel:  { n: 5, min: 4, max: 8, holes: [1, 1] },
  schwer:  { n: 6, min: 4, max: 8, holes: [1, 2] },
  experte: { n: 6, min: 6, max: 9, holes: [2, 2] },
};
// Lochformen [w, h] – klein, damit es um sie herum genug Platz gibt
const SHAPES = [[1, 1], [2, 1], [1, 2], [3, 1], [1, 3], [2, 2]];

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

/** Löcher: nur im Inneren (nie am Rand), untereinander mit mindestens einem Feld Abstand */
function placeHoles(n, count, rng) {
  const holes = [];
  for (let tries = 0; holes.length < count && tries < 200; tries++) {
    const fit = SHAPES.filter(([w, h]) => w <= n - 2 && h <= n - 2);
    const [w, h] = fit[rng.int(fit.length)];
    const r = 1 + rng.int(n - 1 - h), c = 1 + rng.int(n - 1 - w);
    if (holes.some((o) => r <= o.r + o.h && o.r <= r + h && c <= o.c + o.w && o.c <= c + w)) continue; // überlappt/berührt
    holes.push({ r, c, w, h });
  }
  return holes.length === count ? holes : null;
}

export const holeMask = (n, holes = []) => {
  const m = new Uint8Array(n * n);
  for (const { r, c, w, h } of holes) for (let i = r; i < r + h; i++) for (let j = c; j < c + w; j++) m[i * n + j] = 1;
  return m;
};
/** freies Feld (im Gitter und kein Loch) */
export const isFree = (p, r, c) => r >= 0 && c >= 0 && r < p.n && c < p.n && !!p.letters[r][c];
export const freeCount = (p) => p.letters.reduce((s, row) => s + row.filter(Boolean).length, 0);
/** freie Nachbarn (4 Richtungen) */
export const neighbors = (p, r, c) => D4.map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => isFree(p, rr, cc));

/** Hamiltonpfad über die freien Felder im 4er-Gitter (randomisierte DFS mit Warnsdorff-Heuristik) */
function hamiltonian(n, blocked, rng) {
  const free = []; let black = 0;
  for (let k = 0; k < n * n; k++) if (!blocked[k]) { free.push(k); if (((k / n | 0) + k % n) % 2 === 0) black++; }
  const N = free.length, white = N - black;
  if (Math.abs(black - white) > 1) return null; // Schachbrett-Parität: kein Hamiltonpfad möglich
  // zusammenhängend?
  const seen = new Uint8Array(n * n), st = [free[0]]; seen[free[0]] = 1; let cnt = 1;
  while (st.length) { const k = st.pop(), r = k / n | 0, c = k % n; for (const [dr, dc] of D4) { const rr = r + dr, cc = c + dc, kk = rr * n + cc; if (rr >= 0 && cc >= 0 && rr < n && cc < n && !blocked[kk] && !seen[kk]) { seen[kk] = 1; cnt++; st.push(kk); } } }
  if (cnt !== N) return null;
  const ok = (r, c) => r >= 0 && c >= 0 && r < n && c < n && !blocked[r * n + c] && !seen[r * n + c];
  const deg = (r, c) => { let d = 0; for (const [dr, dc] of D4) if (ok(r + dr, c + dc)) d++; return d; };
  const path = []; let steps = 0;
  const dfs = (r, c) => {
    if (++steps > 8000) return false;
    path.push([r, c]); seen[r * n + c] = 1;
    if (path.length === N) return true;
    const nb = [];
    for (const [dr, dc] of D4) if (ok(r + dr, c + dc)) nb.push([r + dr, c + dc]);
    // Sackgassen-Schnitt: mehr als ein Nachbar mit Grad 0 ist hoffnungslos
    if (nb.filter(([a, b]) => deg(a, b) === 0).length > 1 && path.length + 1 < N) { path.pop(); seen[r * n + c] = 0; return false; }
    rng.shuffle(nb);
    nb.sort((a, b) => deg(...a) - deg(...b) + (rng.float() - 0.5) * 1.2);
    for (const [rr, cc] of nb) if (dfs(rr, cc)) return true;
    path.pop(); seen[r * n + c] = 0; return false;
  };
  const starts = free.filter((k) => black === white || ((((k / n | 0) + k % n) % 2 === 0) === black > white));
  for (let tries = 0; tries < 12; tries++) {
    path.length = 0; seen.fill(0); steps = 0;
    const k = starts[rng.int(starts.length)];
    if (dfs(k / n | 0, k % n)) return path;
  }
  return null;
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const { n, min, max, holes: [hMin, hMax] } = CFG[diff];
  for (let attempt = 0; attempt < 80; attempt++) {
    const count = hMin + rng.int(hMax - hMin + 1);
    const holes = placeHoles(n, count, rng); if (!holes) continue;
    const blocked = holeMask(n, holes);
    const ham = hamiltonian(n, blocked, rng); if (!ham) continue;
    const parts = composition(ham.length, min, max, rng); if (!parts) continue;
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
    return { kind: "wortpfad", n, diff, letters, holes, words };
  }
  throw new Error("Wortpfad: keine Generierung möglich");
}

export const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
export const wordOf = (p, path) => path.map(([r, c]) => p.letters[r][c]).join("").toLowerCase();
export const samePath = (a, b) => a.length === b.length && a.every(([r, c], i) => b[i][0] === r && b[i][1] === c);

/** gültiger Pfad: nur freie Felder, Schritte waagrecht/senkrecht, keine Wiederholung */
export function isValidPath(p, path) {
  if (!Array.isArray(path) || !path.length) return false;
  const seen = new Set();
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (!isFree(p, r, c)) return false;
    const k = r * p.n + c; if (seen.has(k)) return false; seen.add(k);
    if (i && !adjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

/** gelöst: alle Pfade gültig, alle Wörter gültig, jedes freie Feld genau einmal */
export function isSolved(p, paths) {
  const cover = new Set();
  for (const path of paths) {
    if (!isValidPath(p, path) || !isWord(wordOf(p, path))) return false;
    for (const [r, c] of path) { const k = r * p.n + c; if (cover.has(k)) return false; cover.add(k); }
  }
  return cover.size === freeCount(p);
}

/** Index des Lösungsworts, dessen Pfad genau `path` ist, sonst -1 */
export const solutionIndex = (p, path) => p.words.findIndex((w) => samePath(w.path, path));

/**
 * Lage-Begründung für ein Startfeld: "deadend" (nur ein freier Nachbar – hier muss ein Wort beginnen oder enden),
 * "corner" (zwei freie Nachbarn über Eck – Gitter- oder Loch-Ecke), sonst null.
 */
export function startReason(p, [r, c]) {
  const nb = neighbors(p, r, c);
  if (nb.length === 1) return "deadend";
  if (nb.length === 2 && nb[0][0] !== nb[1][0] && nb[0][1] !== nb[1][1]) return "corner";
  return null;
}
