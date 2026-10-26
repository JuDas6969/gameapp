import { Rng, resolveDiff } from "./core.js";
const SIZE = { leicht: 5, mittel: 10, schwer: 15, experte: 20 };
const DENSITY = { leicht: 0.6, mittel: 0.6, schwer: 0.58, experte: 0.55 };
const UNK = -1, FILL = 1, EMPTY = 0;

export function cluesOf(line) {
  const out = []; let run = 0;
  for (const v of line) { if (v) run++; else if (run) { out.push(run); run = 0; } }
  if (run) out.push(run);
  return out;
}
// Line solver via memoised recursion with BigInt bitmasks (n ≤ 20 so Number would do, but keep it simple & safe).
function solveLine(cells, clues) {
  const L = cells.length, all = (1n << BigInt(L)) - 1n, W = clues.length + 1;
  const memo = new Map();
  const rec = (i, j) => {
    const k = i * W + j; if (memo.has(k)) return memo.get(k);
    let okAny = false, fm = 0n, em = 0n;
    if (j === clues.length) {
      let ok = true; for (let x = i; x < L; x++) if (cells[x] === FILL) { ok = false; break; }
      if (ok) { okAny = true; em = (all >> BigInt(i)) << BigInt(i); }
    } else {
      if (i < L && cells[i] !== FILL) { const [ok, f, e] = rec(i + 1, j); if (ok) { okAny = true; fm |= f; em |= e | (1n << BigInt(i)); } }
      const blk = clues[j];
      if (i + blk <= L) {
        let fits = true; for (let x = i; x < i + blk; x++) if (cells[x] === EMPTY) { fits = false; break; }
        if (fits && i + blk < L && cells[i + blk] === FILL) fits = false;
        if (fits) {
          const [ok, f, e] = rec(i + blk < L ? i + blk + 1 : L, j + 1);
          if (ok) { okAny = true; fm |= f | (((1n << BigInt(blk)) - 1n) << BigInt(i)); em |= e | (i + blk < L ? 1n << BigInt(i + blk) : 0n); }
        }
      }
    }
    const res = [okAny, fm, em]; memo.set(k, res); return res;
  };
  const [ok, fm, em] = rec(0, 0);
  if (!ok) return null;
  const out = cells.slice();
  for (let x = 0; x < L; x++) if (out[x] === UNK) {
    const f = (fm >> BigInt(x)) & 1n, e = (em >> BigInt(x)) & 1n;
    if (f && !e) out[x] = FILL; else if (e && !f) out[x] = EMPTY;
  }
  return out;
}
export function lineSolve(n, rows, cols) {
  const g = Array.from({ length: n }, () => Array(n).fill(UNK));
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n; r++) { const nw = solveLine(g[r], rows[r]); if (!nw) return null; if (nw.some((v, i) => v !== g[r][i])) { g[r] = nw; changed = true; } }
    for (let c = 0; c < n; c++) {
      const col = g.map((row) => row[c]); const nw = solveLine(col, cols[c]); if (!nw) return null;
      if (nw.some((v, i) => v !== col[i])) { for (let r = 0; r < n; r++) g[r][c] = nw[r]; changed = true; }
    }
  }
  return g;
}
/** grid values: 0 unknown, 1 filled, 2 marked */
export function isSolved(p, g) {
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if ((g[r][c] === 1) !== !!p.solution[r][c]) return false;
  return true;
}
export function satisfied(p, g) {
  const rows = new Set(), cols = new Set();
  for (let i = 0; i < p.n; i++) {
    if (JSON.stringify(cluesOf(g[i].map((v) => v === 1))) === JSON.stringify(p.rows[i])) rows.add(i);
    if (JSON.stringify(cluesOf(g.map((row) => row[i] === 1))) === JSON.stringify(p.cols[i])) cols.add(i);
  }
  return { rows, cols };
}
export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff], d = DENSITY[diff];
  for (;;) {
    const sol = Array.from({ length: n }, () => Array.from({ length: n }, () => (rng.chance(d) ? 1 : 0)));
    const rows = sol.map(cluesOf), cols = [...Array(n).keys()].map((c) => cluesOf(sol.map((row) => row[c])));
    const g = lineSolve(n, rows, cols);
    if (g && !g.some((row) => row.includes(UNK))) return { kind: "nonogram", n, diff, rows, cols, solution: sol };
  }
}
