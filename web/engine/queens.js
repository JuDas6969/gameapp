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
    if (repair(n, reg, q, rng)) return { kind: "queens", n, diff, regions: reg, solution: q };
  }
}
