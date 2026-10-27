import { Rng, resolveDiff, grid } from "./core.js";
const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 11 };
const MAX_AREA = { leicht: 6, mittel: 8, schwer: 10, experte: 12 };
// clue mix per difficulty: [number only (any shape), shape + number, shape only]
const MIX = { leicht: [0.5, 0.4, 0.1], mittel: [0.45, 0.25, 0.3], schwer: [0.4, 0.15, 0.45], experte: [0.35, 0.1, 0.55] };

// Puzzle format: clues {key: area} (0 = no number), shapes {key: "square"|"tall"|"wide"} (absent = any shape), key = r*64+c.
// rect: {r,c,w,h}
export const SHAPES = ["square", "tall", "wide"];
export const shapeOf = (w, h) => (w === h ? "square" : h > w ? "tall" : "wide");
const shapeOk = (s, w, h) => !s || shapeOf(w, h) === s;
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
/** prefix sums over clue positions → O(1) "how many clues inside rect" */
function cluePrefix(n, keys) {
  const P = new Int32Array((n + 1) * (n + 1));
  const at = new Uint8Array(n * n); for (const k of keys) at[Math.floor(k / 64) * n + (k % 64)] = 1;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) P[(r + 1) * (n + 1) + c + 1] = at[r * n + c] + P[r * (n + 1) + c + 1] + P[(r + 1) * (n + 1) + c] - P[r * (n + 1) + c];
  return (r, c, h, w) => P[(r + h) * (n + 1) + c + w] - P[r * (n + 1) + c + w] - P[(r + h) * (n + 1) + c] + P[r * (n + 1) + c];
}
/** All rects covering (cr,cc) with matching area (0 = any) and shape (null = any) that contain no other clue. */
function placements(n, cr, cc, area, shape, count) {
  const out = [];
  for (let h = 1; h <= n; h++) for (let w = 1; w <= n; w++) {
    if (area && w * h !== area) continue;
    if (!shapeOk(shape, w, h)) continue;
    for (let r = Math.max(0, cr - h + 1); r <= cr && r + h <= n; r++) for (let c = Math.max(0, cc - w + 1); c <= cc && c + w <= n; c++) {
      if (count(r, c, h, w) === 1) out.push({ r, c, w, h });
    }
  }
  return out;
}
const shapesOf = (p) => p.shapes || {};
/** All geometrically possible rects for the clue at `key` (area/shape match, covers the clue, no other clue inside). */
export function placementsFor(p, key) {
  key = Number(key);
  const count = cluePrefix(p.n, Object.keys(p.clues).map(Number));
  return placements(p.n, Math.floor(key / 64), key % 64, p.clues[key] || 0, shapesOf(p)[key] || null, count);
}
/** Rect fits the current board: clue/area/shape match and no overlap with `rects`. */
export const fits = (p, rects, rc) => isValid(p, rc) && !rects.some((x) => overlaps(x, rc));
/**
 * UI helper: the player drags from clue `key` to `finger` ([r,c]). Returns {rect, snapped, raw}:
 * raw = bounding box clue↔finger; rect = raw if it fits, else (numbered clues only) the unique placement that contains raw,
 * keeps the finger on its far edge(s) and fits – else null.
 */
export function snapDrag(p, rects, key, finger) {
  key = Number(key); const cr = Math.floor(key / 64), cc = key % 64, [fr, fc] = finger;
  const raw = { r: Math.min(cr, fr), c: Math.min(cc, fc), w: Math.abs(cc - fc) + 1, h: Math.abs(cr - fr) + 1 };
  if (fits(p, rects, raw)) return { rect: raw, snapped: false, raw };
  const area = p.clues[key] || 0;
  if (!area || raw.w * raw.h >= area) return { rect: null, snapped: false, raw };
  const within = (o) => o.r <= raw.r && o.c <= raw.c && o.r + o.h >= raw.r + raw.h && o.c + o.w >= raw.c + raw.w;
  const farEdge = (o) => (fr <= cr || o.r + o.h - 1 === fr) && (fr >= cr || o.r === fr) && (fc <= cc || o.c + o.w - 1 === fc) && (fc >= cc || o.c === fc);
  const cands = placementsFor(p, key).filter((o) => within(o) && farEdge(o) && !rects.some((x) => overlaps(x, o)));
  return { rect: cands.length === 1 ? cands[0] : null, snapped: cands.length === 1, raw };
}
/** Exact solver. clues {key: area|0}, shapes {key: shape}. Counts solutions up to `limit`. */
export function countSolutions(n, clues, limit = 2, shapes = {}) {
  const keys = Object.keys(clues).map(Number), count = cluePrefix(n, keys);
  const opts = keys.map((k) => placements(n, Math.floor(k / 64), k % 64, clues[k] || 0, shapes[k] || null, count));
  // flatten options; per cell: options covering it
  const all = [], byCell = Array.from({ length: n * n }, () => []);
  opts.forEach((list, ci) => list.forEach((o) => {
    const id = all.length; all.push({ ...o, ci, cells: [] });
    for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) { all[id].cells.push(r * n + c); byCell[r * n + c].push(id); }
  }));
  const byClue = opts.map(() => []); all.forEach((o, id) => byClue[o.ci].push(id));
  const cover = new Uint8Array(n * n), done = new Uint8Array(keys.length); let found = 0;
  const free = (o) => { for (const x of o.cells) if (cover[x]) return false; return true; };
  const set = (o, v) => { for (const x of o.cells) cover[x] = v; };
  const valid = new Uint8Array(all.length);
  const rec = (remaining) => {
    if (found >= limit) return;
    if (!remaining) { for (let i = 0; i < n * n; i++) if (!cover[i]) return; found++; return; }
    for (let id = 0; id < all.length; id++) valid[id] = !done[all[id].ci] && free(all[id]) ? 1 : 0;
    let best = null;
    for (let ci = 0; ci < keys.length; ci++) {
      if (done[ci]) continue;
      const v = byClue[ci].filter((id) => valid[id]);
      if (!v.length) return;
      if (!best || v.length < best.length) best = v;
    }
    for (let x = 0; x < n * n; x++) {
      if (cover[x]) continue;
      let cnt = 0; for (const id of byCell[x]) if (valid[id]) cnt++;
      if (!cnt) return;
      if (cnt < best.length) best = byCell[x].filter((id) => valid[id]);
    }
    for (const id of best) {
      const o = all[id]; set(o, 1); done[o.ci] = 1; rec(remaining - 1); done[o.ci] = 0; set(o, 0);
      if (found >= limit) return;
    }
  };
  rec(keys.length);
  return found;
}
export function isValid(p, rc) {
  if (rc.r < 0 || rc.c < 0 || rc.r + rc.h > p.n || rc.c + rc.w > p.n) return false;
  let found = 0, key = -1;
  for (const k in p.clues) { const r = Math.floor(k / 64), c = k % 64; if (contains(rc, r, c)) { found++; key = k; } }
  if (found !== 1) return false;
  const area = p.clues[key] || 0;
  return (!area || area === rc.w * rc.h) && shapeOk(shapesOf(p)[key], rc.w, rc.h);
}
export function isSolved(p, rects) {
  if (rects.length !== Object.keys(p.clues).length || !rects.every((rc) => isValid(p, rc))) return false;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (overlaps(rects[i], rects[j])) return false;
  return rects.reduce((s, rc) => s + rc.w * rc.h, 0) === p.n * p.n;
}

const sameRect = (a, b) => a.r === b.r && a.c === b.c && a.w === b.w && a.h === b.h;
const keyIn = (p, rc) => Object.keys(p.clues).map(Number).find((k) => contains(rc, Math.floor(k / 64), k % 64));
/** German name of a clue in dative ("zur 6", "zum Quadrat", "zum hohen Rechteck"). */
export function clueDative(p, k) {
  const a = p.clues[k] || 0, s = shapesOf(p)[k];
  if (a) return `zur ${a}`;
  return s === "square" ? "zum Quadrat" : s === "tall" ? "zum hohen Rechteck" : "zum breiten Rechteck";
}
export function clueNominative(p, k) {
  const a = p.clues[k] || 0, s = shapesOf(p)[k];
  if (a) return `Die ${a}`;
  return s === "square" ? "Das Quadrat" : s === "tall" ? "Das hohe Rechteck" : "Das breite Rechteck";
}
/**
 * Pure hint planner with reasoning.
 * { type:"wrong", rect, key, text } – a placed rect that is not in the solution
 * { type:"place", rect, key, cell?, text } – a solution rect that can be justified
 */
export function hintPlan(p, rects) {
  const wrong = rects.find((rc) => !p.solution.some((s) => sameRect(s, rc)));
  if (wrong) {
    const own = keyIn(p, wrong);
    const other = p.solution.find((s) => overlaps(s, wrong) && keyIn(p, s) !== own);
    let why;
    if (other) why = `Dieses Rechteck überdeckt Felder, die ${clueDative(p, keyIn(p, other))} gehören.`;
    else why = "Dieses Rechteck ist zu klein – die übrigen Felder daneben könnte sonst kein anderer Flicken mehr abdecken.";
    return { type: "wrong", rect: wrong, key: own, other: other || null, text: `${why}\nEntfernen Sie es.` };
  }
  const missing = p.solution.filter((s) => !rects.some((rc) => sameRect(rc, s)));
  if (!missing.length) return null;
  const free = (o) => !rects.some((rc) => overlaps(rc, o));
  const dims = (o) => `${o.w}×${o.h}`;
  const geo = new Map(), fitting = new Map();
  for (const s of missing) { const k = keyIn(p, s); const g = placementsFor(p, k); geo.set(k, g); fitting.set(k, g.filter(free)); }
  // (1) a clue with exactly one placement that still fits
  for (const s of missing) {
    const k = keyIn(p, s), opts = fitting.get(k);
    if (opts.length !== 1) continue;
    const g1 = geo.get(k).length === 1;
    const why = `${clueNominative(p, k)} kann nur als ${dims(s)} ${g1 ? "hier liegen" : "in diese Lücke passen"} – jede andere Form würde ${g1 ? "einen anderen Hinweis überdecken oder über den Rand ragen" : "einen anderen Hinweis oder einen gesetzten Flicken überdecken"}.`;
    return { type: "place", rect: s, key: k, text: `${why}\nZiehen Sie das hervorgehobene Rechteck.` };
  }
  // (2) an open cell that only one clue can still reach, in only one way
  const n = p.n, covered = new Uint8Array(n * n);
  for (const rc of rects) for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) covered[r * n + c] = 1;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (covered[r * n + c]) continue;
    const reach = [];
    for (const [k, opts] of fitting) for (const o of opts) if (contains(o, r, c)) reach.push([k, o]);
    if (reach.length !== 1) continue;
    const [k, o] = reach[0];
    return { type: "place", rect: o, key: k, cell: [r, c], text: `Das markierte Feld kann nur ${clueDative(p, k).replace(/^zu[rm] /, (m) => (m === "zur " ? "von der " : "vom "))} abgedeckt werden – und zwar nur so.\nZiehen Sie das hervorgehobene Rechteck.` };
  }
  // (3) fallback: the solution rect of the clue with the fewest fitting options
  let pick = missing[0], best = Infinity;
  for (const s of missing) { const l = fitting.get(keyIn(p, s)).length; if (l < best) { best = l; pick = s; } }
  const k = keyIn(p, pick);
  return { type: "place", rect: pick, key: k, text: `${clueNominative(p, k)} hat nur ${best} mögliche Lagen – nur diese lässt das restliche Gitter vollständig füllen.\nZiehen Sie das hervorgehobene Rechteck.` };
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff], [pNum, pBoth] = MIX[diff];
  for (;;) {
    const rects = partition(n, rng, MAX_AREA[diff]);
    for (let t = 0; t < 24; t++) {
      const clues = {}, shapes = {}, kinds = [];
      for (const rc of rects) {
        const k = (rc.r + rng.int(rc.h)) * 64 + rc.c + rng.int(rc.w), u = rng.float();
        const kind = u < pNum ? "num" : u < pNum + pBoth ? "both" : "shape";
        clues[k] = kind === "shape" ? 0 : rc.w * rc.h;
        if (kind !== "num") shapes[k] = shapeOf(rc.w, rc.h);
        kinds.push([k, rc]);
      }
      // too ambiguous? add information step by step (shape-only → +number, number-only → +shape)
      for (let guard = 0; guard <= kinds.length * 2; guard++) {
        if (countSolutions(n, clues, 2, shapes) === 1) return { kind: "patches", n, diff, clues, shapes, solution: rects };
        if (t < 16) break; // first try other clue positions / types before adding information
        const shapeOnly = kinds.filter(([k]) => !clues[k]), numOnly = kinds.filter(([k]) => !shapes[k]);
        if (shapeOnly.length) { const [k, rc] = rng.pick(shapeOnly); clues[k] = rc.w * rc.h; }
        else if (numOnly.length) { const [k, rc] = rng.pick(numOnly); shapes[k] = shapeOf(rc.w, rc.h); }
        else break;
      }
    }
  }
}
