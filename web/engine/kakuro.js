// Kakuro ("Kreuzsumme") – generator, solver, hints. Pure JS, no DOM.
// Puzzle: { kind:"kakuro", n, diff, black: boolean[][], across: {key:{sum,cells}}, down: {...}, solution: number[][] }
// Keys are r*64+c of the clue (black) cell. cells = [[r,c],...] of the white run, in reading order.
import { Rng, resolveDiff, grid, key } from "./core.js";

const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 10 };
const BLACK_P = { leicht: 0.26, mittel: 0.33, schwer: 0.36, experte: 0.38 };
const MAX_RUN = { leicht: 4, mittel: 5, schwer: 6, experte: 6 };   // long runs = huge combination sets = slow & ambiguous
const MIN_WHITE = { leicht: 10, mittel: 20, schwer: 32, experte: 40 };
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
      if (makeUnique(p, rng, TAU[diff], Math.floor(MIN_WHITE[diff] * 0.85)) && logicSolvable(p)) return p;
    }
  }
}

// ---- explained hints (for the LinkedIn-style hint panel) ------------------------------------------
const NUM = ["null", "einem", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"];
const fields = (k) => (k === 1 ? "einem Feld" : `${NUM[k]} Feldern`);
const listOr = (ds) => (ds.length <= 1 ? String(ds[0] ?? "") : `${ds.slice(0, -1).join(", ")} oder ${ds[ds.length - 1]}`);
const LABEL = { across: "waagrechte", down: "senkrechte" };
const LABEL_M = { across: "waagrechten", down: "senkrechten" };

/** State of run ri in grid g: placed sum, used mask, open cells, rest, remaining combos, allowed digits mask. */
function runState(idx, g, ri) {
  const run = idx.runs[ri]; let used = 0, s = 0; const open = [];
  for (const ck of run.cells) { const v = g[Math.floor(ck / 64)][ck % 64]; if (v) { used |= 1 << (v - 1); s += v; } else open.push(ck); }
  const rest = run.sum - s;
  const combos = open.length && rest >= 1 && rest <= 45 ? COMBOS[open.length][rest].filter((m) => !(m & used)) : [];
  let allowed = 0; for (const m of combos) allowed |= m;
  return { run, ri, used, s, open, rest, combos, allowed };
}
/** "die waagrechte Summe 4 auf zwei Feldern geht nur mit 1+3" etc. */
function describe(st, short = false) {
  const { run, open, rest, combos, allowed, s } = st, lab = LABEL[run.dir];
  const head = s ? `die ${lab} ${short ? "" : "Summe "}${run.sum} braucht noch ${rest} auf ${fields(open.length)}` : `die ${lab} ${short ? "" : "Summe "}${run.sum} auf ${fields(run.len)}`;
  const sets = combos.map(digitsOf).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const alts = listOr(sets.map((d) => d.join("+")));
  if (combos.length <= 3) return s ? `${head}, also ${alts}` : `${head} ${short ? "" : "geht "}nur mit ${alts}`;
  return `${head} erlaubt nur ${listOr(digitsOf(allowed))}`;
}
const cap = (t) => t[0].toUpperCase() + t.slice(1);

/**
 * Next hint with a human explanation. null when complete, else
 * { type: "fix"|"last"|"cross"|"deep"|"any", r, c, v (digit to enter; 0 for fix = remove), runs:[ri…], extra:[ck…], text }.
 * text = "Begründung.\nAktion." (German, LinkedIn style).
 */
export function explainHint(p, g) {
  const idx = runIndex(p), n = p.n, at = (ck) => g[Math.floor(ck / 64)][ck % 64];
  // 1. wrong entries first
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (p.black[r][c] || !g[r][c] || g[r][c] === p.solution[r][c]) continue;
    const ck = key(r, c), v = g[r][c], runs = idx.of.get(ck);
    for (const ri of runs) {
      const run = idx.runs[ri], dup = run.cells.find((o) => o !== ck && at(o) === v);
      if (dup != null) return { type: "fix", r, c, v: 0, runs: [ri], extra: [dup], text: `Die ${v} kommt im ${LABEL_M[run.dir]} Lauf schon vor – jede Zahl darf in einem Lauf nur einmal stehen.\nEntfernen Sie diesen Eintrag.` };
    }
    for (const ri of runs) {
      const st = runState(idx, g, ri);
      if (!st.open.length && st.s !== st.run.sum) return { type: "fix", r, c, v: 0, runs: [ri], extra: [], text: `Der ${LABEL_M[st.run.dir]} Lauf ergibt ${st.s} statt ${st.run.sum}.\nEntfernen Sie diesen Eintrag.` };
    }
    return { type: "fix", r, c, v: 0, runs: [...runs], extra: [], text: `Dieser Eintrag widerspricht der Lösung: Mit der ${v} an dieser Stelle lässt sich das Rätsel nicht mehr korrekt füllen.\nEntfernen Sie ihn.` };
  }
  // 2. a run with exactly one open cell
  for (let ri = 0; ri < idx.runs.length; ri++) {
    const st = runState(idx, g, ri);
    if (st.open.length !== 1) continue;
    const ck = st.open[0], r = Math.floor(ck / 64), c = ck % 64, v = st.rest;
    if (v !== p.solution[r][c]) continue;
    return { type: "last", r, c, v, runs: [...idx.of.get(ck)], extra: [], text: `In diesem Lauf fehlt nur noch eine Zahl: ${st.run.sum}\u00a0−\u00a0${st.s}\u00a0=\u00a0${v}.\nTragen Sie ${v} ein.` };
  }
  // 3. intersection of the two runs' possible digits
  const empties = idx.whites.filter((ck) => !at(ck));
  if (!empties.length) return null;
  const info = empties.map((ck) => {
    const [a, d] = idx.of.get(ck), A = runState(idx, g, a), D = runState(idx, g, d);
    return { ck, A, D, both: A.allowed & D.allowed };
  });
  let best = null;
  for (const it of info) if (popcount(it.both) === 1) {
    const score = it.A.combos.length + it.D.combos.length;
    if (!best || score < best.score) best = { ...it, score };
  }
  if (best) {
    const r = Math.floor(best.ck / 64), c = best.ck % 64, v = p.solution[r][c];
    if (digitsOf(best.both)[0] === v)
      return { type: "cross", r, c, v, runs: [best.A.ri, best.D.ri], extra: [], text: `${cap(describe(best.A))}, ${describe(best.D, true)} – gemeinsam bleibt nur die ${v}.\nTragen Sie ${v} ein.` };
  }
  // 3b. a digit every combination of a run needs, which fits only one of its open cells
  for (let ri = 0; ri < idx.runs.length; ri++) {
    const st = runState(idx, g, ri);
    if (st.open.length < 2 || !st.combos.length) continue;
    let must = 511; for (const m of st.combos) must &= m;
    for (const d of digitsOf(must)) {
      const bit = 1 << (d - 1), spots = [], others = [];
      for (const ck of st.open) {
        const it = info.find((x) => x.ck === ck), perp = it.A.ri === ri ? it.D : it.A;
        if (perp.allowed & bit) spots.push({ ck, perp }); else others.push(perp);
      }
      if (spots.length !== 1) continue;
      const ck = spots[0].ck, r = Math.floor(ck / 64), c = ck % 64;
      if (p.solution[r][c] !== d) continue;
      const other = LABEL[st.run.dir === "across" ? "down" : "across"];
      return { type: "must", r, c, v: d, runs: [ri, spots[0].perp.ri], extra: others.map((o) => o.run.clue),
        text: `${cap(describe(st))} – die ${d} muss also hinein. In den anderen freien Feldern lässt die ${other} Summe keine ${d} zu.\nTragen Sie ${d} ein.` };
    }
  }
  // 4. deeper reasoning / fallback: pick the cell with the fewest common candidates
  const deep = candidates(p, g, true);
  const pinned = deep ? info.filter((it) => (deep.get(it.ck) || []).length === 1) : [];
  const pool = pinned.length ? pinned : info;
  const it = pool.reduce((m, x) => (popcount(x.both) < popcount(m.both) ? x : m));
  const r = Math.floor(it.ck / 64), c = it.ck % 64, v = p.solution[r][c];
  const common = digitsOf(it.both);
  const why = common.length > 1
    ? `Waagrecht passen hier ${listOr(digitsOf(it.A.allowed))}, senkrecht ${listOr(digitsOf(it.D.allowed))} – gemeinsam also ${listOr(common)}.`
    : `${cap(describe(it.A))}, ${describe(it.D)}.`;
  const rest = pinned.length
    ? ` Die übrigen Zahlen lassen die Summen rundherum nicht mehr zu; es bleibt nur die ${v}.`
    : ` Nur mit der ${v} lässt sich das Rätsel ohne Widerspruch zu Ende füllen.`;
  return { type: pinned.length ? "deep" : "any", r, c, v, runs: [it.A.ri, it.D.ri], extra: [], text: `${why}${rest}\nTragen Sie ${v} ein.` };
}

/** true if the puzzle can be filled from scratch with explainHint's reasoning alone (never the "any" fallback). */
export function logicSolvable(p) {
  const g = p.solution.map((row) => row.map(() => 0));
  for (let i = 0; i < p.n * p.n; i++) {
    let open = false;
    for (let r = 0; r < p.n && !open; r++) for (let c = 0; c < p.n; c++) if (!p.black[r][c] && !g[r][c]) { open = true; break; }
    if (!open) return true;
    const h = explainHint(p, g);
    if (!h || h.type === "any" || h.type === "fix") return false;
    g[h.r][h.c] = h.v;
  }
  return false;
}
