// Kakuro ("Kreuzsumme") – generator, solver, hints. Pure JS, no DOM.
// Puzzle: { kind:"kakuro", n, diff, black: boolean[][], across: {key:{sum,cells}}, down: {...}, solution: number[][] }
// Keys are r*64+c of the clue (black) cell. cells = [[r,c],...] of the white run, in reading order.
import { Rng, resolveDiff, grid, key } from "./core.js";

const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 11 };
const BLACK_P = { leicht: 0.26, mittel: 0.33, schwer: 0.36, experte: 0.38 };
const MAX_RUN = { leicht: 4, mittel: 5, schwer: 6, experte: 7 };   // long runs = huge combination sets = slow & ambiguous
const MIN_WHITE = { leicht: 10, mittel: 20, schwer: 32, experte: 48 };
const FILL_TRIES = 2;       // solution fillings per pattern before a new pattern is rolled
const TAU = { leicht: 0.3, mittel: 0.7, schwer: 1.0, experte: 1.3 };   // target avg. log2(#combinations) per run after phase 1 (low = extreme sums = easy)

// ---- combination table: COMBOS[len][sum] = bitmasks (bit d-1 = digit d) of digit sets with that size & sum
const COMBOS = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
for (let m = 1; m < 512; m++) {
  let len = 0, sum = 0;
  for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) { len++; sum += d; }
  COMBOS[len][sum].push(m);
}
const popcount = (m) => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
const digitsOf = (m) => { const out = []; for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) out.push(d); return out; };

// ---- pattern -------------------------------------------------------------------------------------
function runLenH(black, r, c) { let a = c, b = c; while (a - 1 >= 0 && !black[r][a - 1]) a--; while (b + 1 < black.length && !black[r][b + 1]) b++; return [a, b]; }
function runLenV(black, r, c) { let a = r, b = r; while (a - 1 >= 0 && !black[a - 1][c]) a--; while (b + 1 < black.length && !black[b + 1][c]) b++; return [a, b]; }

/** Random black/white layout: row 0 / col 0 black, all white runs 2..maxRun long. Returns null if too sparse. */
function makePattern(rng, n, pBlack, maxRun, minWhite) {
  const black = grid(n, false);
  for (let i = 0; i < n; i++) { black[0][i] = true; black[i][0] = true; }
  for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) black[r][c] = rng.chance(pBlack);
  // repair: kill runs of length 1, split runs longer than maxRun
  for (let guard = 0; guard < 200; guard++) {
    let changed = false;
    for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) {
      if (black[r][c]) continue;
      const [a, b] = runLenH(black, r, c), [u, v] = runLenV(black, r, c);
      if (b - a === 0 || v - u === 0) { black[r][c] = true; changed = true; continue; }
      if (b - a + 1 > maxRun) { black[r][a + 2 + rng.int(b - a - 3)] = true; changed = true; }
      else if (v - u + 1 > maxRun) { black[u + 2 + rng.int(v - u - 3)][c] = true; changed = true; }
    }
    if (!changed) break;
  }
  let whites = 0;
  for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) if (!black[r][c]) whites++;
  if (whites < minWhite) return null;
  return black;
}

/** Runs from a black/white layout (sums not yet known). */
function extractRuns(black) {
  const n = black.length, across = {}, down = {};
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!black[r][c]) continue;
    if (c + 1 < n && !black[r][c + 1]) { const cells = []; for (let cc = c + 1; cc < n && !black[r][cc]; cc++) cells.push([r, cc]); across[key(r, c)] = { sum: 0, cells }; }
    if (r + 1 < n && !black[r + 1][c]) { const cells = []; for (let rr = r + 1; rr < n && !black[rr][c]; rr++) cells.push([rr, c]); down[key(r, c)] = { sum: 0, cells }; }
  }
  return { across, down };
}

// ---- run index (shared by solver, conflicts, hints) ---------------------------------------------
const INDEX = new WeakMap();
/** { runs:[{sum,cells:[key],len}], of: Map cellKey → [acrossRunIdx, downRunIdx], whites:[key] } */
export function runIndex(p) {
  let idx = INDEX.get(p); if (idx) return idx;
  const runs = [], of = new Map(), whites = [];
  const add = (table, slot) => {
    for (const k of Object.keys(table)) {
      const run = table[k], cells = run.cells.map(([r, c]) => key(r, c));
      runs.push({ sum: run.sum, cells, len: cells.length, clue: Number(k), dir: slot === 0 ? "across" : "down" });
      for (const ck of cells) { if (!of.has(ck)) of.set(ck, [-1, -1]); of.get(ck)[slot] = runs.length - 1; }
    }
  };
  add(p.across, 0); add(p.down, 1);
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!p.black[r][c]) whites.push(key(r, c));
  idx = { runs, of, whites }; INDEX.set(p, idx); return idx;
}

// ---- solver ---------------------------------------------------------------------------------------
const toVals = (p, g) => { const vals = new Uint8Array(p.n * 64); if (g) for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!p.black[r][c] && g[r][c]) vals[key(r, c)] = g[r][c]; return vals; };
const initMasks = (idx, vals) => { const m = new Int32Array(vals.length); for (const ck of idx.whites) m[ck] = vals[ck] ? 1 << (vals[ck] - 1) : 511; return m; };

/**
 * Constraint propagation on candidate masks (bit d-1 = digit d). For each run only the digit combinations that
 * fit sum, placed digits and the cells' current candidates survive; cells are narrowed to their union, digits
 * required by every combination that fit a single cell are pinned, single candidates are written into vals.
 * Repeats until stable (or maxPasses). Returns false on contradiction.
 */
function propagate(idx, vals, masks, maxPasses = 99) {
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const run of idx.runs) {
      let used = 0, open = 0, cellUnion = 0;
      for (const ck of run.cells) {
        const v = vals[ck];
        if (v) { const bit = 1 << (v - 1); if (used & bit) return false; used |= bit; } else { open++; cellUnion |= masks[ck]; }
      }
      if (!open) { let s = 0; for (const d of digitsOf(used)) s += d; if (s !== run.sum) return false; continue; }
      let union = 0, must = 511;
      for (const m of COMBOS[run.len][run.sum]) {
        if ((m & used) !== used) continue;
        const rem = m & ~used;
        if (rem & ~cellUnion) continue;
        let ok = true;
        for (const ck of run.cells) if (!vals[ck] && !(masks[ck] & rem)) { ok = false; break; }
        if (!ok) continue;
        union |= rem; must &= rem;
      }
      if (!union) return false;
      for (const ck of run.cells) {
        if (vals[ck]) continue;
        const nm = masks[ck] & union; if (!nm) return false;
        if (nm !== masks[ck]) { masks[ck] = nm; changed = true; }
      }
      for (const d of digitsOf(must)) {
        const bit = 1 << (d - 1); let spot = -1, cnt = 0;
        for (const ck of run.cells) if (!vals[ck] && (masks[ck] & bit)) { cnt++; spot = ck; }
        if (cnt === 0) return false;
        if (cnt === 1 && masks[spot] !== bit) { masks[spot] = bit; changed = true; }
      }
    }
    for (const ck of idx.whites) if (!vals[ck] && popcount(masks[ck]) === 1) { vals[ck] = digitsOf(masks[ck])[0]; changed = true; }
    if (!changed) return true;
  }
  return true;
}

// work budget: a search that exceeds `budget.left` nodes gives up and reports `limit` ("many solutions")
const budget = { left: Infinity };
function search(idx, vals, masks, limit, found = null) {
  if (--budget.left < 0) return limit;
  if (!propagate(idx, vals, masks)) return 0;
  let best = -1, bestCnt = 10;
  for (const ck of idx.whites) if (!vals[ck]) { const cnt = popcount(masks[ck]); if (cnt < bestCnt) { bestCnt = cnt; best = ck; } }
  if (best === -1) { found?.push(vals); return 1; }
  let total = 0;
  for (const d of digitsOf(masks[best])) {
    const v2 = vals.slice(), m2 = masks.slice(); v2[best] = d; m2[best] = 1 << (d - 1);
    total += search(idx, v2, m2, limit - total, found);
    if (total >= limit) break;
  }
  return total;
}

/** Number of solutions (capped at limit) for puzzle p from (partial) grid g (0 = empty). */
export function countSolutions(p, g = null, limit = 2) { const idx = runIndex(p), vals = toVals(p, g); return search(idx, vals, initMasks(idx, vals), limit); }

/**
 * Candidate digits per empty white cell given grid g → Map key → number[] (null when g is contradictory).
 * deep=false: one pass only (what fits both run sums directly); deep=true: full propagation.
 */
export function candidates(p, g, deep = false) {
  const idx = runIndex(p), given = toVals(p, g), vals = given.slice(), masks = initMasks(idx, vals);
  if (!propagate(idx, vals, masks, deep ? 99 : 1)) return null;
  const out = new Map();
  for (const ck of idx.whites) if (!given[ck]) out.set(ck, digitsOf(masks[ck]));
  return out;
}

// ---- rules ----------------------------------------------------------------------------------------
/** Cells violating the rules: duplicate digit within a run, or a completed run with the wrong sum. Set of r*64+c. */
export function conflicts(p, g) {
  const out = new Set(), idx = runIndex(p);
  for (const run of idx.runs) {
    const seen = new Map(); let sum = 0, filled = 0;
    for (const ck of run.cells) {
      const v = g[Math.floor(ck / 64)][ck % 64]; if (!v) continue;
      filled++; sum += v;
      if (seen.has(v)) { out.add(ck); out.add(seen.get(v)); } else seen.set(v, ck);
    }
    if (filled === run.len && sum !== run.sum) for (const ck of run.cells) out.add(ck);
  }
  return out;
}
export function isSolved(p, g) {
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!p.black[r][c] && !g[r][c]) return false;
  return conflicts(p, g).size === 0;
}

/**
 * Next logical step for the hint button. null when complete, else { r, c, v, type:"fix"|"naked"|"any", old?, msg }.
 * fix: a wrong entry is corrected; naked: only one digit fits both run sums; any: fallback.
 */
export function findHint(p, g) {
  const n = p.n;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (!p.black[r][c] && g[r][c] && g[r][c] !== p.solution[r][c])
      return { r, c, v: p.solution[r][c], old: g[r][c], type: "fix", msg: `Die ${g[r][c]} in Zeile ${r}, Spalte ${c} war falsch – richtig ist die ${p.solution[r][c]}.` };
  const cands = candidates(p, g);
  if (!cands || cands.size === 0) return null;
  let anyKey = null, anyCnt = 99;
  for (const [ck, list] of cands) {
    const r = Math.floor(ck / 64), c = ck % 64;
    if (list.length === 1) return { r, c, v: p.solution[r][c], type: "naked", msg: `Zeile ${r}, Spalte ${c}: zu beiden Summen passt nur die ${p.solution[r][c]}.` };
    if (list.length < anyCnt) { anyCnt = list.length; anyKey = ck; }
  }
  // deeper: a cell pinned down by the interplay of several runs
  const deep = candidates(p, g, true);
  if (deep) for (const [ck, list] of deep) if (list.length === 1) {
    const r = Math.floor(ck / 64), c = ck % 64;
    return { r, c, v: p.solution[r][c], type: "deep", msg: `Zeile ${r}, Spalte ${c}: aus den Summen rundherum bleibt nur die ${p.solution[r][c]}.` };
  }
  const r = Math.floor(anyKey / 64), c = anyKey % 64;
  return { r, c, v: p.solution[r][c], type: "any", msg: `Zeile ${r}, Spalte ${c}: hier kommt die ${p.solution[r][c]} hin.` };
}

// ---- generator -------------------------------------------------------------------------------------
/** Fill white cells with 1–9, no repeats within a run (backtracking, random digit order). */
function fillSolution(black, runs, rng) {
  const n = black.length, sol = grid(n, 0);
  const of = new Map();   // cellKey → [acrossCells, downCells]
  for (const run of Object.values(runs.across)) for (const [r, c] of run.cells) of.set(key(r, c), [run.cells, null]);
  for (const run of Object.values(runs.down)) for (const [r, c] of run.cells) of.get(key(r, c))[1] = run.cells;
  const cells = []; for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) if (!black[r][c]) cells.push([r, c]);
  let nodes = 0;
  const go = (i) => {
    if (i === cells.length) return true;
    if (++nodes > 20000) return false;
    const [r, c] = cells[i], [ac, dc] = of.get(key(r, c)); let used = 0;
    for (const [rr, cc] of ac) if (sol[rr][cc]) used |= 1 << (sol[rr][cc] - 1);
    for (const [rr, cc] of dc) if (sol[rr][cc]) used |= 1 << (sol[rr][cc] - 1);
    for (const d of rng.shuffle(digitsOf(511 & ~used))) { sol[r][c] = d; if (go(i + 1)) return true; }
    sol[r][c] = 0; return false;
  };
  return go(0) ? sol : null;
}

/** Sums of all runs in table from solution sol (in place). */
function setSums(table, sol) { for (const run of Object.values(table)) run.sum = run.cells.reduce((s, [r, c]) => s + sol[r][c], 0); }

/**
 * Drive the digits of p.solution until the puzzle has exactly one solution. Local search in three phases:
 *  1. cheap proxy – minimise Σ log2(#digit combinations per run) by re-choosing single cells, until the
 *     average per run is below `tau` (lower = more extreme sums = easier puzzle);
 *  2. exact – at a cell where a second solution differs, pick the digit that minimises the capped
 *     solution count (proxy as tie-breaker above the cap, sideways moves on plateaus);
 *  3. when stuck, blacken one cell of the ambiguous region (runs are repaired, digits kept) and continue.
 * Returns true when unique; p.black / p.across / p.down / p.solution are kept consistent.
 */
function makeUnique(p, rng, tau, minWhite) {
  let idx = runIndex(p); const sol = p.solution, n = p.n, W = idx.whites.length;
  const at = (ck) => sol[Math.floor(ck / 64)][ck % 64];
  const set = (ck, v) => { sol[Math.floor(ck / 64)][ck % 64] = v; };
  const recompute = () => { for (const run of idx.runs) { let s = 0; for (const ck of run.cells) s += at(ck); run.sum = s; (run.dir === "across" ? p.across : p.down)[run.clue].sum = s; } };
  const freeDigits = (ck) => { let used = 0; for (const ri of idx.of.get(ck)) for (const o of idx.runs[ri].cells) if (o !== ck) used |= 1 << (at(o) - 1); return digitsOf(511 & ~used); };
  let work = 0;
  const count = (cap) => { const vals = toVals(p, null); budget.left = 3000; const r = search(idx, vals, initMasks(idx, vals), cap); work += 3000 - budget.left; budget.left = Infinity; return r; };
  const proxy = () => { let e = 0; for (const run of idx.runs) e += Math.log2(COMBOS[run.len][run.sum].length); return e; };
  const blacken = (ck) => {
    const todo = [ck];
    while (todo.length) {
      const k = todo.pop(), r = Math.floor(k / 64), c = k % 64; if (p.black[r][c]) continue;
      p.black[r][c] = true; sol[r][c] = 0;
      for (const [rr, cc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (rr < 1 || cc < 1 || rr >= n || cc >= n || p.black[rr][cc]) continue;
        const [a, b] = runLenH(p.black, rr, cc), [u, v] = runLenV(p.black, rr, cc);
        if (a === b || u === v) todo.push(key(rr, cc));   // would become a run of length 1
      }
    }
    const runs = extractRuns(p.black); setSums(runs.across, sol); setSums(runs.down, sol);
    p.across = runs.across; p.down = runs.down; INDEX.delete(p); idx = runIndex(p);
  };
  recompute();
  // phase 1: proxy descent until the average combination entropy per run is below tau, then in chunks
  // until the solution count is small enough for phase 2 to see a gradient
  const CAP = 64;
  const proxyStep = () => {
    const ck = rng.pick(idx.whites); let bestD = at(ck), bestE = Infinity;
    for (const d of freeDigits(ck)) { set(ck, d); recompute(); const e = proxy(); if (e < bestE || (e === bestE && rng.chance(0.5))) { bestE = e; bestD = d; } }
    set(ck, bestD); recompute(); return bestE;
  };
  for (let it = 0; it < 12 * W; it++) if (proxyStep() / idx.runs.length <= tau) break;
  let best = count(CAP);
  for (let round = 0; round < 12 && best >= CAP; round++) { for (let i = 0; i < Math.ceil(W / 3); i++) proxyStep(); best = count(CAP); }
  // phase 2: exact descent on the (capped) solution count; proxy breaks ties while the count is at the cap
  let since = 0;
  for (let it = 0; it < 12 * W && best > 1 && work < 250000; it++) {
    const found = [], vals = toVals(p, null);
    budget.left = 3000; search(idx, vals, initMasks(idx, vals), 2, found); work += 3000 - budget.left; budget.left = Infinity;
    const A = toVals(p, sol); let B = found[0]; if (B && !B.some((v, i) => v !== A[i])) B = found[1];
    const diffCells = []; if (B) for (const ck of idx.whites) if (A[ck] !== B[ck]) diffCells.push(ck);
    if (best >= CAP || since >= 12) {               // phase 3: too loose or stuck → remove a cell of the ambiguous region
      blacken(diffCells.length ? rng.pick(diffCells) : rng.pick(idx.whites));
      if (idx.whites.length < minWhite) return false;
      best = count(CAP); since = 0; continue;
    }
    const ck = diffCells.length ? rng.pick(diffCells) : rng.pick(idx.whites), cur = at(ck);
    const curE = proxy(); let bestD = cur, bestC = best, bestE = curE; const ties = [];
    for (const d of freeDigits(ck)) {
      if (d === cur) continue;
      set(ck, d); recompute(); const c = count(bestC), e = proxy();
      if (c < bestC || (c === bestC && c >= CAP && e < bestE)) { bestC = c; bestD = d; bestE = e; ties.length = 0; }
      else if (c === bestC && c < CAP) ties.push(d);
    }
    since = bestC < best || (bestD !== cur && best >= CAP) ? 0 : since + 1;
    if (bestD === cur && ties.length && rng.chance(0.5)) bestD = rng.pick(ties);   // sideways move on plateaus
    set(ck, bestD); recompute(); best = bestC;
  }
  return best === 1;
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff];
  for (;;) {
    const pattern = makePattern(rng, n, BLACK_P[diff], MAX_RUN[diff], MIN_WHITE[diff]); if (!pattern) continue;
    for (let t = 0; t < FILL_TRIES; t++) {
      const black = pattern.map((row) => row.slice()), runs = extractRuns(black);
      const sol = fillSolution(black, runs, rng); if (!sol) break;
      setSums(runs.across, sol); setSums(runs.down, sol);
      const p = { kind: "kakuro", n, diff, black, across: runs.across, down: runs.down, solution: sol };
      if (makeUnique(p, rng, TAU[diff], Math.floor(MIN_WHITE[diff] * 0.85))) return p;
    }
  }
}
