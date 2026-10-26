import { Rng, resolveDiff, grid } from "./core.js";
const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 11 };
const MAX_AREA = { leicht: 6, mittel: 8, schwer: 10, experte: 12 };

// rect: {r,c,w,h}
export const contains = (rc, r, c) => r >= rc.r && r < rc.r + rc.h && c >= rc.c && c < rc.c + rc.w;
export const overlaps = (a, b) => a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;

function partition(n, rng, maxArea) {
  const owner = grid(n, -1), rects = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (owner[r][c] !== -1) continue;
    const opts = [];
    for (let h = 1; h <= n - r; h++) for (let w = 1; w <= n - c; w++) {
      if (w * h > maxArea) break;
      let free = true;
      for (let i = 0; i < h && free; i++) for (let j = 0; j < w; j++) if (owner[r + i][c + j] !== -1) { free = false; break; }
      if (free) opts.push([w, h]);
    }
    const nt = opts.filter(([w, h]) => w !== 1 || h !== 1);
    const [w, h] = rng.pick(nt.length ? nt : opts);
    const idx = rects.length; rects.push({ r, c, w, h });
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) owner[r + i][c + j] = idx;
  }
  return rects;
}
function placements(n, cr, cc, area, clueKeys) {
  const out = [];
  for (let h = 1; h <= Math.min(area, n); h++) {
    if (area % h) continue; const w = area / h; if (w > n) continue;
    for (let r = cr - h + 1; r <= cr; r++) for (let c = cc - w + 1; c <= cc; c++) {
      if (r < 0 || c < 0 || r + h > n || c + w > n) continue;
      let other = false;
      for (let rr = r; rr < r + h && !other; rr++) for (let x = c; x < c + w; x++) if ((rr !== cr || x !== cc) && clueKeys.has(rr * 64 + x)) { other = true; break; }
      if (!other) out.push({ r, c, w, h });
    }
  }
  return out;
}
/** All geometrically possible rects for the clue at `key` (area match, covers the clue, no other clue inside). Pure helper for hints. */
export function placementsFor(p, key) {
  const clueKeys = new Set(Object.keys(p.clues).map(Number)); key = Number(key);
  return placements(p.n, Math.floor(key / 64), key % 64, p.clues[key], clueKeys);
}
/** clues: {key: area} with key = r*64+c */
export function countSolutions(n, clues, limit = 2) {
  const keys = Object.keys(clues).map(Number), clueKeys = new Set(keys);
  const opts = keys.map((k) => placements(n, Math.floor(k / 64), k % 64, clues[k], clueKeys));
  const cover = new Uint8Array(n * n), done = new Uint8Array(keys.length); let count = 0;
  const free = (rc) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) if (cover[r * n + c]) return false; return true; };
  const set = (rc, v) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) cover[r * n + c] = v; };
  const rec = (remaining) => {
    if (count >= limit) return;
    if (!remaining) { count++; return; }
    let best = -1, bestOpts = null;
    for (let i = 0; i < keys.length; i++) {
      if (done[i]) continue;
      const valid = opts[i].filter(free);
      if (!valid.length) return;
      if (best < 0 || valid.length < bestOpts.length) { best = i; bestOpts = valid; }
    }
    for (const o of bestOpts) { set(o, 1); done[best] = 1; rec(remaining - 1); done[best] = 0; set(o, 0); }
  };
  rec(keys.length);
  return count;
}
export function isValid(p, rc) {
  if (rc.r < 0 || rc.c < 0 || rc.r + rc.h > p.n || rc.c + rc.w > p.n) return false;
  let found = 0, area = -1;
  for (const k in p.clues) { const r = Math.floor(k / 64), c = k % 64; if (contains(rc, r, c)) { found++; area = p.clues[k]; } }
  return found === 1 && area === rc.w * rc.h;
}
export function isSolved(p, rects) {
  if (rects.length !== Object.keys(p.clues).length || !rects.every((rc) => isValid(p, rc))) return false;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (overlaps(rects[i], rects[j])) return false;
  return rects.reduce((s, rc) => s + rc.w * rc.h, 0) === p.n * p.n;
}
export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff];
  for (;;) {
    const rects = partition(n, rng, MAX_AREA[diff]);
    for (let t = 0; t < 8; t++) {
      const clues = {};
      for (const rc of rects) clues[(rc.r + rng.int(rc.h)) * 64 + rc.c + rng.int(rc.w)] = rc.w * rc.h;
      if (countSolutions(n, clues) === 1) return { kind: "patches", n, diff, clues, solution: rects };
    }
  }
}
