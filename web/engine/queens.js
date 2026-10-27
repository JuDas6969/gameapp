import { Rng, resolveDiff, grid, DIRS4 } from "./core.js";
const SIZE = { leicht: 6, mittel: 7, schwer: 8, experte: 9 };

function randomQueens(n, rng) {
  for (let t = 0; t < 2000; t++) {
    const p = rng.shuffle([...Array(n).keys()]);
    let ok = true;
    for (let i = 0; i < n - 1; i++) if (Math.abs(p[i] - p[i + 1]) < 2) { ok = false; break; }
    if (ok) return p;
  }
  return null;
}
function growRegions(n, queens, rng) {
  const reg = grid(n, -1), sizes = Array(n).fill(1);
  queens.forEach((c, r) => { reg[r][c] = r; });
  let left = n * n - n;
  while (left > 0) {
    const cands = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (reg[r][c] >= 0)
      for (const [dr, dc] of DIRS4) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < n && cc < n && reg[rr][cc] < 0) cands.push([reg[r][c], rr, cc]); }
    let pick;
    if (rng.chance(0.6)) { const m = Math.min(...cands.map((x) => sizes[x[0]])); pick = rng.pick(cands.filter((x) => sizes[x[0]] === m)); }
    else pick = rng.pick(cands);
    reg[pick[1]][pick[2]] = pick[0]; sizes[pick[0]]++; left--;
  }
  return reg;
}
export function solutions(n, reg, limit = 2) {
  const cols = Array(n).fill(false), regs = Array(n).fill(false), placed = Array(n).fill(-1), out = [];
  (function rec(r) {
    if (out.length >= limit) return;
    if (r === n) { out.push(placed.slice()); return; }
    for (let c = 0; c < n; c++) {
      if (cols[c] || regs[reg[r][c]]) continue;
      if (r > 0 && Math.abs(placed[r - 1] - c) <= 1) continue;
      cols[c] = regs[reg[r][c]] = true; placed[r] = c; rec(r + 1); cols[c] = regs[reg[r][c]] = false; placed[r] = -1;
    }
  })(0);
  return out;
}
function connectedWithout(n, reg, g, r0, c0) {
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (reg[r][c] === g && !(r === r0 && c === c0)) cells.push(r * 64 + c);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), stack = [cells[0]];
  while (stack.length) {
    const k = stack.pop(), r = Math.floor(k / 64), c = k % 64;
    for (const [dr, dc] of DIRS4) {
      const rr = r + dr, cc = c + dc, kk = rr * 64 + cc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && reg[rr][cc] === g && !(rr === r0 && cc === c0) && !seen.has(kk)) { seen.add(kk); stack.push(kk); }
    }
  }
  return seen.size === cells.length;
}
function repair(n, reg, q, rng) {
  for (let step = 0; step < 400; step++) {
    const sols = solutions(n, reg, 2);
    if (sols.length === 1) return true;
    if (!sols.length) return false;
    const alt = sols[0].every((v, i) => v === q[i]) ? sols[1] : sols[0];
    const rows = rng.shuffle([...Array(n).keys()].filter((r) => alt[r] !== q[r]));
    let moved = false;
    for (const r of rows) {
      const c = alt[r], g = reg[r][c];
      for (const [dr, dc] of rng.shuffle(DIRS4.slice())) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n && reg[rr][cc] !== g && connectedWithout(n, reg, g, r, c)) { reg[r][c] = reg[rr][cc]; moved = true; break; }
      }
      if (moved) break;
    }
    if (!moved) return false;
  }
  return false;
}
/** queens: array of keys r*64+c. Returns Set of conflicting keys. */
export function conflicts(p, queens) {
  const out = new Set(), qs = [...queens];
  for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) {
    const a = qs[i], b = qs[j], ar = Math.floor(a / 64), ac = a % 64, br = Math.floor(b / 64), bc = b % 64;
    if (ar === br || ac === bc || p.regions[ar][ac] === p.regions[br][bc] || (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1)) { out.add(a); out.add(b); }
  }
  return out;
}
/** Keys (r*64+c) a queen at (r,c) rules out: its row, its column and the 8 neighbours (without the queen's own cell). */
export function attacked(n, r, c) {
  const out = [];
  for (let i = 0; i < n; i++) { if (i !== c) out.push(r * 64 + i); if (i !== r) out.push(i * 64 + c); }
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if ((dr || dc) && rr >= 0 && cc >= 0 && rr < n && cc < n && dr && dc) out.push(rr * 64 + cc);
  }
  return out;
}
/** Keys a queen at (r,c) rules out including its whole colour region (LinkedIn Auto-×): attacked() ∪ region cells, without the queen's own cell. */
export function autoCells(p, r, c) {
  const out = new Set(attacked(p.n, r, c)), g = p.regions[r][c];
  for (let rr = 0; rr < p.n; rr++) for (let cc = 0; cc < p.n; cc++) if (p.regions[rr][cc] === g && !(rr === r && cc === c)) out.add(rr * 64 + cc);
  return [...out];
}
/** Set of keys excluded by the given queens (iterable of keys): attacked cells, cells of the same region and the queens themselves. */
export function excluded(p, queens) {
  const out = new Set(), regs = new Set();
  for (const k of queens) { const r = Math.floor(k / 64), c = k % 64; out.add(k); regs.add(p.regions[r][c]); for (const a of attacked(p.n, r, c)) out.add(a); }
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (regs.has(p.regions[r][c])) out.add(r * 64 + c);
  return out;
}
export function isSolved(p, queens) {
  if (queens.size !== p.n) return false;
  for (const k of queens) if (p.solution[Math.floor(k / 64)] !== k % 64) return false;
  return true;
}
export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff];
  for (;;) {
    const q = randomQueens(n, rng); if (!q) continue;
    const reg = growRegions(n, q, rng);
    if (!repair(n, reg, q, rng)) continue;
    const p = { kind: "queens", n, diff, regions: reg, solution: q };
    if (logicSolvable(p)) return p;     // LinkedIn-like: every step must be explainable by the hint rules
  }
}
/** true if the puzzle can be solved from scratch using only nextHint's logical rules (never the fallback). */
export function logicSolvable(p) {
  const n = p.n, marks = Array.from({ length: n }, () => Array(n).fill(0));
  for (let step = 0; step < n * n * 2; step++) {
    const h = nextHint(p, marks);
    if (!h) return true;
    if (h.kind === "fallback" || h.kind === "wrongQueen" || h.kind === "wrongX") return false;
    if (h.kind === "single") marks[h.cell[0]][h.cell[1]] = 2;
    else if (h.kind === "confine") for (const [r, c] of h.strike) marks[r][c] = 1;
    else if (h.kind === "blocks") marks[h.cell[0]][h.cell[1]] = 1;
    else return false;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Hints (pure): next logical step for a marks grid (0 empty, 1 ×, 2 queen), LinkedIn-style.
// Returns { kind, ... } or null when solved. kinds:
//   wrongQueen { cell, why: row|col|region|touch|blocks|dead, focus, area? }
//   wrongX     { cell }
//   single     { type: region|row|col, cell, focus, strike }
//   confine    { k, from: region|row|col, to: row|col|region, focus, strike }
//   blocks     { cell, type: region|row|col, focus }
//   fallback   { cell, focus, strike }
// Invariant (no wrong queen, no wrong ×): every struck cell is not a solution cell.
// ---------------------------------------------------------------------------------------------
const combos = (arr, k, f) => {
  const pick = [];
  const rec = (s) => { if (pick.length === k) return f(pick.slice()); for (let i = s; i < arr.length; i++) { pick.push(arr[i]); const res = rec(i + 1); pick.pop(); if (res) return res; } return null; };
  return rec(0);
};
export function nextHint(p, marks) {
  const n = p.n, R = p.regions, K = (r, c) => r * 64 + c;
  const all = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) all.push([r, c]);
  const areaCells = (type, i) => all.filter(([r, c]) => (type === "region" ? R[r][c] : type === "row" ? r : c) === i);
  const qs = all.filter(([r, c]) => marks[r][c] === 2);
  const wrong = qs.filter(([r, c]) => p.solution[r] !== c), good = qs.filter(([r, c]) => p.solution[r] === c);
  // (1) wrong queen
  for (const q of wrong) {
    const [r, c] = q, others = qs.filter((o) => o !== q);
    const o = (f) => others.find(f);
    if (o(([rr]) => rr === r)) return { kind: "wrongQueen", cell: q, why: "row", focus: areaCells("row", r) };
    if (o(([, cc]) => cc === c)) return { kind: "wrongQueen", cell: q, why: "col", focus: areaCells("col", c) };
    if (o(([rr, cc]) => R[rr][cc] === R[r][c])) return { kind: "wrongQueen", cell: q, why: "region", focus: areaCells("region", R[r][c]) };
    const t = o(([rr, cc]) => Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1);
    if (t) return { kind: "wrongQueen", cell: q, why: "touch", focus: [t] };
    const ex = excluded(p, [...good.map(([a, b]) => K(a, b)), K(r, c)]);
    const used = { region: new Set([...good, q].map(([a, b]) => R[a][b])), row: new Set([...good, q].map(([a]) => a)), col: new Set([...good, q].map(([, b]) => b)) };
    for (const type of ["region", "row", "col"]) for (let i = 0; i < n; i++) {
      if (used[type].has(i)) continue;
      const cells = areaCells(type, i);
      if (cells.every(([a, b]) => ex.has(K(a, b)) || marks[a][b] === 1)) return { kind: "wrongQueen", cell: q, why: "blocks", type, focus: cells };
    }
    return { kind: "wrongQueen", cell: q, why: "dead", focus: [] };
  }
  // (1b) × on a solution cell
  for (let r = 0; r < n; r++) if (marks[r][p.solution[r]] === 1) return { kind: "wrongX", cell: [r, p.solution[r]] };
  if (good.length === n) return null;
  // free cells = empty and not ruled out by the placed (correct) queens
  const ex = excluded(p, good.map(([a, b]) => K(a, b)));
  const isFree = (r, c) => marks[r][c] === 0 && !ex.has(K(r, c));
  const usedR = new Set(good.map(([a, b]) => R[a][b])), usedRow = new Set(good.map(([a]) => a)), usedCol = new Set(good.map(([, b]) => b));
  const open = { region: [], row: [], col: [] };
  for (let i = 0; i < n; i++) {
    if (!usedR.has(i)) open.region.push(i);
    if (!usedRow.has(i)) open.row.push(i);
    if (!usedCol.has(i)) open.col.push(i);
  }
  const freeOf = (type, i) => areaCells(type, i).filter(([r, c]) => isFree(r, c));
  const idx = (type, [r, c]) => (type === "region" ? R[r][c] : type === "row" ? r : c);
  // (5) area with exactly one free cell
  for (const type of ["region", "row", "col"]) for (const i of open[type]) {
    const f = freeOf(type, i);
    if (f.length === 1) {
      const cell = f[0];
      return { kind: "single", type, cell, focus: areaCells(type, i), strike: areaCells(type, i).filter(([r, c]) => (r !== cell[0] || c !== cell[1]) && marks[r][c] === 0) };
    }
  }
  // (2)+(3) k areas of one kind whose free cells lie in exactly k areas of another kind → rest of those is excluded
  const pairs = [["region", "row"], ["region", "col"], ["row", "region"], ["col", "region"]];
  for (let k = 1; k < open.region.length; k++) for (const [from, to] of pairs) {
    const res = combos(open[from], k, (set) => {
      const cells = set.flatMap((i) => freeOf(from, i));
      const tos = new Set(cells.map((x) => idx(to, x)));
      if (tos.size !== k) return null;
      const fromSet = new Set(set);
      const strike = all.filter(([r, c]) => isFree(r, c) && tos.has(idx(to, [r, c])) && !fromSet.has(idx(from, [r, c])));
      if (!strike.length) return null;
      return { kind: "confine", k, from, to, focus: set.flatMap((i) => areaCells(from, i)), strike };
    });
    if (res) return res;
  }
  // (4) a free cell whose queen would leave some region / row / column without room
  for (const type of ["region", "row", "col"]) for (const i of open[type]) {
    const fa = freeOf(type, i);
    for (const [r, c] of all) {
      if (!isFree(r, c) || idx(type, [r, c]) === i) continue;
      const exX = new Set([...attacked(n, r, c), K(r, c)]);
      const blocked = fa.every(([a, b]) => exX.has(K(a, b)) || (type !== "region" && R[a][b] === R[r][c]));
      if (blocked) return { kind: "blocks", cell: [r, c], type, focus: areaCells(type, i) };
    }
  }
  // (6) fallback: tightest open region, place its queen
  const g = open.region.map((i) => [i, freeOf("region", i)]).sort((a, b) => a[1].length - b[1].length)[0];
  const [gi, f] = g, row = f.find(([r, c]) => p.solution[r] === c);
  return { kind: "fallback", cell: row, focus: areaCells("region", gi), strike: areaCells("region", gi).filter(([r, c]) => !(r === row[0] && c === row[1]) && marks[r][c] === 0) };
}
