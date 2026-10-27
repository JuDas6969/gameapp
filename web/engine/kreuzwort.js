// Kreuzwort – klassisches Kreuzworträtsel mit schwarzen Feldern (britisches Gitter, 180°-Symmetrie). Reine Logik, kein DOM.
// generate(diff, seed) → { kind:"kreuzwort", n, diff, black: bool[][], solution: string[][] ("" für schwarz),
//                          slots: [{ id, dir:"across"|"down", r, c, len, word, clue, num }] }
// Füllung per Backtracking aus den Wörtern in data/kreuzwort.js (nur Wörter mit Hinweis). Eindeutigkeit ist bei
// Kreuzworträtseln per Definition durch die Hinweise gegeben, nicht durch das Gitter.
import { Rng, resolveDiff, grid } from "./core.js";
import { CLUES, WORDS_BY_LEN } from "../data/kreuzwort.js";

export const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 11 };
const MIN_LEN = 3, MAX_LEN = 8;
const TIME_LIMIT = 1000, PATTERN_BUDGET = { 5: 50, 7: 150, 9: 220, 11: 250 };

// ---------- Wortindex: pro Länge Liste + idx[len][pos][letter] → Array von Wortindizes ----------
let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  INDEX = {};
  for (let L = MIN_LEN; L <= MAX_LEN; L++) {
    const words = (WORDS_BY_LEN[L] || []).slice().sort();
    const pos = Array.from({ length: L }, () => ({}));
    words.forEach((w, i) => { for (let k = 0; k < L; k++) (pos[k][w[k]] ||= []).push(i); });
    INDEX[L] = { words, pos };
  }
  return INDEX;
}

// ---------- Muster ----------
/** Alle Slots (waagrecht/senkrecht) eines Schwarz/Weiß-Musters, Länge ≥ 2 (Länge-2-Slots machen das Muster ungültig). */
function runs(black, n) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (black[r][c]) continue;
    if ((c === 0 || black[r][c - 1]) && c + 1 < n && !black[r][c + 1]) { let len = 0; while (c + len < n && !black[r][c + len]) len++; out.push({ dir: "across", r, c, len }); }
    if ((r === 0 || black[r - 1][c]) && r + 1 < n && !black[r + 1][c]) { let len = 0; while (r + len < n && !black[r + len][c]) len++; out.push({ dir: "down", r, c, len }); }
  }
  return out;
}
/** Gültig: alle Läufe 3..MAX_LEN, jedes weiße Feld in mindestens einem Lauf, weiße Felder zusammenhängend. */
function validPattern(black, n, allowLong = false) {
  const rs = runs(black, n);
  const covered = grid(n, false);
  for (const s of rs) {
    if (s.len < MIN_LEN || (!allowLong && s.len > MAX_LEN)) return false;
    for (let i = 0; i < s.len; i++) { const r = s.dir === "across" ? s.r : s.r + i, c = s.dir === "across" ? s.c + i : s.c; covered[r][c] = true; }
  }
  let whites = 0, start = null;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!black[r][c]) { whites++; if (!covered[r][c]) return false; start ||= [r, c]; }
  if (!whites) return false;
  // Zusammenhang
  const seen = grid(n, false); const stack = [start]; seen[start[0]][start[1]] = true; let cnt = 0;
  while (stack.length) {
    const [r, c] = stack.pop(); cnt++;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < n && cc < n && !black[rr][cc] && !seen[rr][cc]) { seen[rr][cc] = true; stack.push([rr, cc]); } }
  }
  return cnt === whites;
}
const longRuns = (black, n) => runs(black, n).filter((s) => s.len > MAX_LEN).length;
/** Kein 2×2-Block aus schwarzen Feldern (Qualitätsregel klassischer Gitter). */
function noBlackBlock(black, n) {
  for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) if (black[r][c] && black[r - 1][c] && black[r][c - 1] && black[r - 1][c - 1]) return false;
  return true;
}
const MIN_WORDS = { 5: 6, 7: 8, 9: 14, 11: 20 }, MAX_BLACK = 0.4;

/** Zufälliges symmetrisches Muster: Gitter-Basis (ungerade Zeile ∧ ungerade Spalte schwarz) plus zufällige Schwarzpaare. */
function pattern(n, rng) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const black = grid(n, false);
    const lattice = n >= 7 || rng.chance(0.6);
    if (lattice) for (let r = 1; r < n; r += 2) for (let c = 1; c < n; c += 2) black[r][c] = true;
    const extra = n <= 5 ? rng.int(3) : n <= 7 ? 2 + rng.int(4) : n <= 9 ? 4 + rng.int(5) : 7 + rng.int(6);
    let added = 0, tries = 0, long = longRuns(black, n);
    const cells = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
    rng.shuffle(cells);
    while ((added < extra || long > 0) && tries < cells.length * 2) {
      const [r, c] = cells[tries % cells.length]; tries++;
      const r2 = n - 1 - r, c2 = n - 1 - c;
      if (black[r][c]) continue;
      black[r][c] = true; black[r2][c2] = true;
      const nl = longRuns(black, n);
      if (nl <= long && noBlackBlock(black, n) && validPattern(black, n, true)) { long = nl; added++; }
      else { black[r][c] = false; black[r2][c2] = false; }
    }
    if (long !== 0 || !validPattern(black, n)) continue;
    const blacks = black.flat().filter(Boolean).length;
    if (blacks > MAX_BLACK * n * n || runs(black, n).length < MIN_WORDS[n]) continue;
    return black;
  }
  return null;
}

// ---------- Füllung ----------
function buildSlots(black, n) {
  const slots = runs(black, n).map((s, id) => ({ ...s, id }));
  const cellSlots = new Map(); // key → [slotId...]
  for (const s of slots) for (let i = 0; i < s.len; i++) {
    const r = s.dir === "across" ? s.r : s.r + i, c = s.dir === "across" ? s.c + i : s.c;
    const k = r * 64 + c; (cellSlots.get(k) || cellSlots.set(k, []).get(k)).push(s.id);
    (s.cells ||= []).push(k);
  }
  return { slots, cellSlots };
}

function fill(black, n, rng, deadline) {
  const { slots, cellSlots } = buildSlots(black, n);
  const idx = index();
  const letters = new Map(); // key → letter
  const used = new Set();
  const assigned = new Array(slots.length).fill(null);
  let nodes = 0, timedOut = false;

  const candidates = (s) => {
    const { words, pos } = idx[s.len];
    let best = null;
    const fixed = [];
    for (let i = 0; i < s.len; i++) { const ch = letters.get(s.cells[i]); if (ch) { fixed.push([i, ch]); const l = pos[i][ch] || []; if (!best || l.length < best.length) best = l; } }
    const base = best || words.map((_, i) => i);
    const out = [];
    for (const wi of base) {
      const w = words[wi]; if (used.has(w)) continue;
      let ok = true; for (const [i, ch] of fixed) if (w[i] !== ch) { ok = false; break; }
      if (ok) out.push(w);
    }
    return out;
  };
  const solve = () => {
    if ((++nodes & 63) === 0 && Date.now() > deadline) { timedOut = true; return false; }
    // MRV: offener Slot mit wenigsten Kandidaten, bei Gleichstand der längste
    let bestS = null, bestC = null;
    for (const s of slots) {
      if (assigned[s.id]) continue;
      const c = candidates(s);
      if (!c.length) return false;
      if (!bestS || c.length < bestC.length || (c.length === bestC.length && s.len > bestS.len)) { bestS = s; bestC = c; }
    }
    if (!bestS) return true;
    rng.shuffle(bestC);
    for (const w of bestC) {
      const placed = [];
      for (let i = 0; i < bestS.len; i++) { const k = bestS.cells[i]; if (!letters.has(k)) { letters.set(k, w[i]); placed.push(k); } }
      assigned[bestS.id] = w; used.add(w);
      if (solve()) return true;
      if (timedOut) return false;
      assigned[bestS.id] = null; used.delete(w);
      for (const k of placed) letters.delete(k);
    }
    return false;
  };
  if (!solve()) return null;
  return { slots, letters, assigned, cellSlots };
}

export function generate(diff, seed) {
  const rng = new Rng(seed);
  diff = resolveDiff(diff, rng);
  const n = SIZE[diff];
  const t0 = Date.now();
  let black, res = null;
  while (!res) {
    const now = Date.now();
    if (now - t0 > TIME_LIMIT * 4) throw new Error("Kreuzwort: keine Füllung gefunden");
    black = pattern(n, rng);
    if (!black) continue;
    res = fill(black, n, rng, Math.min(now + PATTERN_BUDGET[n], t0 + TIME_LIMIT * 4));
  }
  const solution = grid(n, "");
  for (const [k, ch] of res.letters) solution[Math.floor(k / 64)][k % 64] = ch;
  // klassische Nummerierung: Zeile für Zeile, jede Startzelle eines Slots bekommt eine Nummer
  const numAt = new Map(); let num = 0;
  const starts = new Set(res.slots.map((s) => s.r * 64 + s.c));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (starts.has(r * 64 + c)) numAt.set(r * 64 + c, ++num);
  const slots = res.slots.map((s) => {
    const word = res.assigned[s.id], clues = CLUES[word];
    return { id: s.id, dir: s.dir, r: s.r, c: s.c, len: s.len, word, clue: clues[rng.int(clues.length)], num: numAt.get(s.r * 64 + s.c) };
  });
  slots.sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === "across" ? -1 : 1));
  slots.forEach((s, i) => (s.id = i));
  return { kind: "kreuzwort", n, diff, black, solution, slots };
}

// ---------- Helfer für Board/Tests ----------
export const slotCells = (s) => Array.from({ length: s.len }, (_, i) => (s.dir === "across" ? [s.r, s.c + i] : [s.r + i, s.c]));
/** Slot, der (r,c) in Richtung dir enthält, oder null */
export function slotAt(p, r, c, dir) {
  return p.slots.find((s) => s.dir === dir && (dir === "across" ? s.r === r && c >= s.c && c < s.c + s.len : s.c === c && r >= s.r && r < s.r + s.len)) || null;
}
export function isSolved(p, g) {
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!p.black[r][c] && (g[r][c] || "") !== p.solution[r][c]) return false;
  return true;
}
/** Set der Zellschlüssel (r*64+c) mit falschem Buchstaben – nur für Auto-Check. */
export function conflicts(p, g) {
  const bad = new Set();
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!p.black[r][c] && g[r][c] && g[r][c] !== p.solution[r][c]) bad.add(r * 64 + c);
  return bad;
}
/** Tipp: zuerst falschen Buchstaben korrigieren, sonst leere Zelle eines angefangenen Slots, sonst eines beliebigen Slots. */
export function findHint(p, g) {
  const mk = (r, c, slot) => ({ r, c, letter: p.solution[r][c], slot, wrong: !!g[r][c] });
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++)
    if (!p.black[r][c] && g[r][c] && g[r][c] !== p.solution[r][c]) return mk(r, c, slotAt(p, r, c, "across") || slotAt(p, r, c, "down"));
  let any = null;
  for (const s of p.slots) {
    const cells = slotCells(s), filled = cells.filter(([r, c]) => g[r][c]).length;
    const empty = cells.find(([r, c]) => !g[r][c]);
    if (!empty) continue;
    if (filled > 0) return mk(empty[0], empty[1], s);
    any ||= mk(empty[0], empty[1], s);
  }
  return any;
}
