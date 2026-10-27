import { Rng, resolveDiff, grid, clone } from "./core.js";
const N = 6;
const CONS = { leicht: 7, mittel: 6, schwer: 5, experte: 4 };
const TARGET = { leicht: 10, mittel: 7, schwer: 4, experte: 0 };

function lineOK(line) {
  let z = 0, o = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 0) z++; else if (line[i] === 1) o++;
    if (i >= 2 && line[i] !== -1 && line[i] === line[i - 1] && line[i] === line[i - 2]) return false;
  }
  return z <= N / 2 && o <= N / 2;
}
// cons: [{a:[r,c], b:[r,c], eq:bool}]
function ok(g, cons, r, c) {
  const col = []; for (let i = 0; i < N; i++) col.push(g[i][c]);
  if (!lineOK(g[r]) || !lineOK(col)) return false;
  for (const k of cons) {
    if ((k.a[0] === r && k.a[1] === c) || (k.b[0] === r && k.b[1] === c)) {
      const va = g[k.a[0]][k.a[1]], vb = g[k.b[0]][k.b[1]];
      if (va !== -1 && vb !== -1 && (va === vb) !== k.eq) return false;
    }
  }
  return true;
}
function fill(g, rng, idx = 0) {
  if (idx === N * N) return true;
  const r = Math.floor(idx / N), c = idx % N;
  for (const v of rng.shuffle([0, 1])) { g[r][c] = v; if (ok(g, [], r, c) && fill(g, rng, idx + 1)) return true; }
  g[r][c] = -1; return false;
}
export function countSolutions(g, cons, limit = 2, idx = 0) {
  while (idx < N * N && g[Math.floor(idx / N)][idx % N] !== -1) idx++;
  if (idx === N * N) return 1;
  const r = Math.floor(idx / N), c = idx % N; let total = 0;
  for (const v of [0, 1]) { g[r][c] = v; if (ok(g, cons, r, c)) total += countSolutions(g, cons, limit, idx + 1); g[r][c] = -1; if (total >= limit) break; }
  return total;
}
export function conflicts(p, g) {
  const out = new Set(), add = (r, c) => out.add(r * 64 + c);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = g[r][c]; if (v === -1) continue;
    if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) { add(r, c); add(r, c - 1); add(r, c - 2); }
    if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) { add(r, c); add(r - 1, c); add(r - 2, c); }
  }
  for (let i = 0; i < N; i++) {
    const row = g[i], col = g.map((x) => x[i]);
    if (row.filter((x) => x === 0).length > N / 2 || row.filter((x) => x === 1).length > N / 2) for (let c = 0; c < N; c++) if (row[c] !== -1) add(i, c);
    if (col.filter((x) => x === 0).length > N / 2 || col.filter((x) => x === 1).length > N / 2) for (let r = 0; r < N; r++) if (col[r] !== -1) add(r, i);
  }
  for (const k of p.constraints) {
    const a = g[k.a[0]][k.a[1]], b = g[k.b[0]][k.b[1]];
    if (a !== -1 && b !== -1 && (a === b) !== k.eq) { add(...k.a); add(...k.b); }
  }
  return out;
}
/**
 * Pure helper for hints: finds one logically forced empty cell in g (no wrong entries assumed).
 * Returns { r, c, v, rule, cells, line } or null. rule ∈ pair|gap|count|constraint.
 * cells = the cells that justify the deduction (for highlighting), line = { kind:"row"|"col", i } for count.
 */
export function deduce(p, g) {
  const other = (v) => 1 - v;
  // (1) two equal neighbours → third must differ; (2) X _ X → middle differs
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (g[r][c] !== -1) continue;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const at = (i) => { const rr = r + dr * i, cc = c + dc * i; return rr < 0 || cc < 0 || rr >= N || cc >= N ? null : g[rr][cc]; };
      const pos = (i) => [r + dr * i, c + dc * i];
      // pair to the right/below
      if (at(1) !== null && at(1) !== -1 && at(1) === at(2)) return { r, c, v: other(at(1)), rule: "pair", cells: [pos(1), pos(2)] };
      // pair to the left/above
      if (at(-1) !== null && at(-1) !== -1 && at(-1) === at(-2)) return { r, c, v: other(at(-1)), rule: "pair", cells: [pos(-1), pos(-2)] };
      // gap
      if (at(-1) !== null && at(1) !== null && at(-1) !== -1 && at(-1) === at(1)) return { r, c, v: other(at(1)), rule: "gap", cells: [pos(-1), pos(1)] };
    }
  }
  // (3) a line already has N/2 of one kind → rest is the other
  for (let i = 0; i < N; i++) {
    for (const kind of ["row", "col"]) {
      const line = kind === "row" ? g[i] : g.map((x) => x[i]);
      for (const v of [0, 1]) {
        if (line.filter((x) => x === v).length !== N / 2) continue;
        const j = line.indexOf(-1); if (j === -1) continue;
        const [r, c] = kind === "row" ? [i, j] : [j, i];
        return { r, c, v: other(v), rule: "count", line: { kind, i }, full: v };
      }
    }
  }
  // (4) constraint with exactly one side known
  for (const k of p.constraints) {
    const va = g[k.a[0]][k.a[1]], vb = g[k.b[0]][k.b[1]];
    if ((va === -1) === (vb === -1)) continue;
    const [known, target, kv] = va === -1 ? [k.b, k.a, vb] : [k.a, k.b, va];
    return { r: target[0], c: target[1], v: k.eq ? kv : other(kv), rule: "constraint", eq: k.eq, cells: [known] };
  }
  return null;
}
export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const sol = grid(N, -1); fill(sol, rng);
  const pairs = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (c + 1 < N) pairs.push([[r, c], [r, c + 1]]); if (r + 1 < N) pairs.push([[r, c], [r + 1, c]]); }
  const constraints = rng.shuffle(pairs).slice(0, CONS[diff]).map(([a, b]) => ({ a, b, eq: sol[a[0]][a[1]] === sol[b[0]][b[1]] }));
  const g = clone(sol); let givens = N * N;
  for (const i of rng.shuffle([...Array(N * N).keys()])) {
    if (givens <= TARGET[diff]) break;
    const r = Math.floor(i / N), c = i % N, v = g[r][c];
    g[r][c] = -1;
    if (countSolutions(clone(g), constraints) === 1) givens--; else g[r][c] = v;
  }
  return { kind: "tango", n: N, diff, givens: g, solution: sol, constraints };
}

/**
 * Pure hint helper: like deduce(), but falls back to a short contradiction search when the simple rules are stuck.
 * Returns deduce()'s shape, or { r, c, v, rule: "trial", tried, steps } (putting `tried` in (r,c) and
 * propagating with deduce() leads to a rule violation after `steps` placements), or null.
 */
export function explain(p, g) {
  const d = deduce(p, g); if (d) return d;
  let best = null;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (g[r][c] !== -1) continue;
    for (const v of [0, 1]) {
      const h = clone(g); h[r][c] = v; let steps = 0, dead = conflicts(p, h).size > 0;
      while (!dead && steps < 36) {
        const e = deduce(p, h); if (!e) break;
        h[e.r][e.c] = e.v; steps++; dead = conflicts(p, h).size > 0;
      }
      if (dead && (!best || steps < best.steps)) best = { r, c, v: 1 - v, rule: "trial", tried: v, steps };
    }
  }
  return best;
}
