import { Rng, resolveDiff, grid, clone } from "./core.js";
const N = 6;
const TARGET = { leicht: 20, mittel: 16, schwer: 12, experte: 0 };

function valid(g, r, c, v) {
  for (let i = 0; i < N; i++) if (g[r][i] === v || g[i][c] === v) return false;
  const br = (r >> 1) << 1, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === v) return false;
  return true;
}
function fill(g, rng, idx = 0) {
  if (idx === N * N) return true;
  const r = Math.floor(idx / N), c = idx % N;
  for (const v of rng.shuffle([1, 2, 3, 4, 5, 6])) {
    if (!valid(g, r, c, v)) continue;
    g[r][c] = v;
    if (fill(g, rng, idx + 1)) return true;
    g[r][c] = 0;
  }
  return false;
}
export function countSolutions(g, limit = 2) {
  let best = null;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] === 0) {
    const cands = [];
    for (let v = 1; v <= N; v++) if (valid(g, r, c, v)) cands.push(v);
    if (!cands.length) return 0;
    if (!best || cands.length < best[2].length) best = [r, c, cands];
  }
  if (!best) return 1;
  const [r, c, cands] = best; let total = 0;
  for (const v of cands) { g[r][c] = v; total += countSolutions(g, limit); g[r][c] = 0; if (total >= limit) break; }
  return total;
}
/** Cells conflicting with the rules in a (partial) grid → Set of keys r*64+c. */
export function conflicts(g) {
  const out = new Set();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = g[r][c]; if (!v) continue;
    const br = (r >> 1) << 1, bc = Math.floor(c / 3) * 3;
    let bad = false;
    for (let i = 0; i < N; i++) if ((i !== c && g[r][i] === v) || (i !== r && g[i][c] === v)) bad = true;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) if ((br + i !== r || bc + j !== c) && g[br + i][bc + j] === v) bad = true;
    if (bad) out.add(r * 64 + c);
  }
  return out;
}
/** Candidates for an empty cell (ignores the cell's own value). */
export function candidates(g, r, c) {
  const out = [];
  for (let v = 1; v <= N; v++) if (valid(g, r, c, v)) out.push(v);
  return out;
}
/** Cells of the three units (row, column, block) of (r,c). */
function units(r, c) {
  const row = [], col = [], blk = [];
  for (let i = 0; i < N; i++) { row.push([r, i]); col.push([i, c]); }
  const br = (r >> 1) << 1, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) blk.push([br + i, bc + j]);
  return { Zeile: row, Spalte: col, Block: blk };
}
/**
 * Next most logical step for the hint button. Returns null when the grid is complete, otherwise
 * { r, c, v, type: "fix"|"naked"|"hidden"|"any", old, unit } where unit ∈ Zeile|Spalte|Block for hidden singles.
 */
export function findHint(g, solution, givens) {
  // 1. wrong (non-given) entry → correct it first
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
    if (g[r][c] && !givens[r][c] && g[r][c] !== solution[r][c]) return { r, c, v: solution[r][c], old: g[r][c], type: "fix" };
  const empty = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) empty.push([r, c]);
  if (!empty.length) return null;
  // 2. naked single
  for (const [r, c] of empty) if (candidates(g, r, c).length === 1) return { r, c, v: solution[r][c], type: "naked" };
  // 3. hidden single in row/column/block
  for (const [r, c] of empty) {
    const v = solution[r][c];
    for (const [unit, cells] of Object.entries(units(r, c))) {
      let spots = 0;
      for (const [rr, cc] of cells) if (!g[rr][cc] && valid(g, rr, cc, v)) spots++;
      if (spots === 1) return { r, c, v, type: "hidden", unit };
    }
  }
  // 4. fallback: any empty cell
  const [r, c] = empty[0];
  return { r, c, v: solution[r][c], type: "any" };
}
export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const sol = grid(N, 0); fill(sol, rng);
  const g = clone(sol); let givens = N * N;
  const order = rng.shuffle([...Array(N * N).keys()]);
  for (const i of order) {
    if (givens <= TARGET[diff]) break;
    const r = Math.floor(i / N), c = i % N, v = g[r][c];
    g[r][c] = 0;
    if (countSolutions(clone(g)) === 1) givens--; else g[r][c] = v;
  }
  return { kind: "sudoku", n: N, diff, givens: g, solution: sol };
}
