// Sudoku engine: 6×6 (2×3 blocks) and 9×9 (3×3 blocks) with variants
// klassisch · diagonal (X) · jigsaw (irregular regions) · killer (cages) · paritaet (even/odd marks) · fenster (Windoku, 9×9).
// Pure JS, no DOM. Candidates are bitmasks (bit v-1 = digit v); cells are flat indices i = r*n + c internally.
import { Rng, resolveDiff } from "./core.js";

export const VARIANTS = ["klassisch", "diagonal", "jigsaw", "killer", "paritaet", "fenster"];
export const VARIANT_RULES = {
  klassisch: "",
  diagonal: "Diagonal: Auch beide Diagonalen enthalten jede Zahl einmal.",
  jigsaw: "Puzzle: Statt Blöcken gibt es unregelmäßige Regionen – jede enthält jede Zahl einmal.",
  killer: "Killer: Die Zahlen in jedem gestrichelten Käfig ergeben die kleine Summe und wiederholen sich nicht.",
  paritaet: "Gerade/Ungerade: Ein graues Quadrat verlangt eine gerade Zahl, ein Kreis eine ungerade.",
  fenster: "Fenster: Auch die vier grauen 3×3-Fenster enthalten jede Zahl einmal.",
};
// minimum number of givens (the generator removes until it reaches this or nothing more can go)
const TARGET = { 6: { leicht: 20, mittel: 16, schwer: 12, experte: 0 }, 9: { leicht: 36, mittel: 30, schwer: 26, experte: 23 } };
const PARITY_FRAC = { leicht: 0.5, mittel: 0.42, schwer: 0.36, experte: 0.3 };
const KILLER_MAX = { 6: { leicht: 3, mittel: 3, schwer: 4, experte: 4 }, 9: { leicht: 3, mittel: 4, schwer: 4, experte: 5 } };
const KILLER_EXTRA = { 6: { leicht: 4, mittel: 2, schwer: 0, experte: 0 }, 9: { leicht: 6, mittel: 3, schwer: 1, experte: 0 } };

const pc = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const low = (m) => 31 - Math.clz32(m & -m);
const digitsOf = (m) => { const out = []; for (let v = 1; m; v++, m >>>= 1) if (m & 1) out.push(v); return out; };
const EVEN = 0b010101010, ODD = 0b101010101; // bit v-1: 2,4,6,8 | 1,3,5,7,9

// ---------- cage combinations ----------
const COMBO = new Int16Array(512 * 10 * 46).fill(-1);
/** union of digits used by any set of `cnt` distinct digits from `avail` summing to `sum` */
function comboUnion(sum, cnt, avail) {
  if (cnt === 0) return 0;
  if (sum <= 0 || sum > 45) return 0;
  const k = (avail * 10 + cnt) * 46 + sum;
  if (COMBO[k] >= 0) return COMBO[k];
  let u = 0;
  const rec = (start, left, s, acc) => {
    if (left === 0) { if (s === 0) u |= acc; return; }
    for (let v = start; v <= 9 && v <= s; v++) if (avail & (1 << (v - 1))) rec(v + 1, left - 1, s - v, acc | (1 << (v - 1)));
  };
  rec(1, cnt, sum, 0);
  COMBO[k] = u; return u;
}
/** all digit sets (masks) of `cnt` distinct digits from `avail` summing to `sum` */
function comboList(sum, cnt, avail) {
  const out = [];
  const rec = (start, left, s, acc) => {
    if (left === 0) { if (s === 0) out.push(acc); return; }
    for (let v = start; v <= 9 && v <= s; v++) if (avail & (1 << (v - 1))) rec(v + 1, left - 1, s - v, acc | (1 << (v - 1)));
  };
  rec(1, cnt, sum, 0); return out;
}

// ---------- structure ----------
export function classicBoxes(n) {
  const [bh, bw] = n === 9 ? [3, 3] : [2, 3];
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => Math.floor(r / bh) * (n / bw) + Math.floor(c / bw)));
}
function extraUnitsFor(n, variant) {
  if (variant === "diagonal") return [
    { type: "diag", cells: Array.from({ length: n }, (_, i) => [i, i]) },
    { type: "diag", cells: Array.from({ length: n }, (_, i) => [i, n - 1 - i]) }];
  if (variant === "fenster") {
    const out = [];
    for (const r0 of [1, 5]) for (const c0 of [1, 5]) { const cells = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push([r0 + i, c0 + j]); out.push({ type: "window", cells }); }
    return out;
  }
  return [];
}
/** Irregular regions: start from blocks, swap boundary cells between neighbouring regions while both stay connected. */
function jigsawBoxes(n, rng) {
  const NN = n * n, reg = classicBoxes(n).flat();
  const nb = (i) => { const r = Math.floor(i / n), c = i % n, o = []; if (r) o.push(i - n); if (r < n - 1) o.push(i + n); if (c) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
  const connected = (id) => {
    let start = -1, total = 0; for (let i = 0; i < NN; i++) if (reg[i] === id) { total++; if (start < 0) start = i; }
    const seen = new Uint8Array(NN); seen[start] = 1; const st = [start]; let cnt = 1;
    while (st.length) { const i = st.pop(); for (const j of nb(i)) if (!seen[j] && reg[j] === id) { seen[j] = 1; cnt++; st.push(j); } }
    return cnt === total;
  };
  let done = 0; const want = n === 9 ? 140 : 60;
  for (let t = 0; t < 6000 && done < want; t++) {
    const a = rng.int(NN), nbs = nb(a).filter((j) => reg[j] !== reg[a]);
    if (!nbs.length) continue;
    const A = reg[a], B = reg[rng.pick(nbs)];
    reg[a] = B;
    const cs = [];
    for (let i = 0; i < NN; i++) if (reg[i] === B && i !== a && nb(i).some((j) => reg[j] === A)) cs.push(i);
    rng.shuffle(cs);
    let ok = false;
    for (const c of cs) { reg[c] = A; if (connected(A) && connected(B)) { ok = true; break; } reg[c] = B; }
    if (ok) done++; else reg[a] = A;
  }
  return Array.from({ length: n }, (_, r) => reg.slice(r * n, r * n + n));
}

const CTX = new WeakMap();
function ctxOf(p) { let c = CTX.get(p); if (!c) { c = buildCtx(p); CTX.set(p, c); } return c; }
function buildCtx(p) {
  const n = p.n, NN = n * n, FULL = (1 << n) - 1, TOTAL = (n * (n + 1)) / 2;
  const units = [];
  for (let r = 0; r < n; r++) units.push({ type: "Zeile", cells: Array.from({ length: n }, (_, c) => r * n + c) });
  for (let c = 0; c < n; c++) units.push({ type: "Spalte", cells: Array.from({ length: n }, (_, r) => r * n + c) });
  const boxes = p.boxes || classicBoxes(n), byId = new Map();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const id = boxes[r][c]; if (!byId.has(id)) byId.set(id, []); byId.get(id).push(r * n + c); }
  for (const cells of byId.values()) units.push({ type: "Region", cells });
  for (const eu of p.extraUnits || []) units.push({ type: eu.type === "diag" ? "Diagonale" : "Fenster", cells: eu.cells.map(([r, c]) => r * n + c) });
  const cellUnits = Array.from({ length: NN }, () => []);
  units.forEach((u, k) => u.cells.forEach((i) => cellUnits[i].push(k)));
  const cages = (p.cages || []).map((cg) => ({ sum: cg.sum, cells: cg.cells.map(([r, c]) => r * n + c) }));
  const cageOf = new Int16Array(NN).fill(-1);
  cages.forEach((cg, k) => cg.cells.forEach((i) => { cageOf[i] = k; }));
  const parity = new Int32Array(NN).fill(FULL);
  for (const [k, t] of Object.entries(p.parity || {})) { const r = Math.floor(k / 64), c = k % 64; parity[r * n + c] = FULL & (t === "e" ? EVEN : ODD); }
  const peers = [], unitPeers = [];
  for (let i = 0; i < NN; i++) {
    const s = new Set(); for (const u of cellUnits[i]) for (const j of units[u].cells) s.add(j);
    s.delete(i); unitPeers.push([...s]);
    if (cageOf[i] >= 0) for (const j of cages[cageOf[i]].cells) s.add(j);
    s.delete(i); peers.push([...s]);
  }
  // unit pairs sharing ≥2 cells (pointing / box-line reduction)
  const pairs = [];
  for (let a = 0; a < units.length; a++) for (let b = 0; b < units.length; b++) {
    if (a === b) continue;
    const inB = new Uint8Array(NN); for (const i of units[b].cells) inB[i] = 1;
    const inter = units[a].cells.filter((i) => inB[i]);
    if (inter.length < 2 || inter.length === n) continue;
    const inA = new Uint8Array(NN); for (const i of units[a].cells) inA[i] = 1;
    pairs.push({ a, b, inter: inB, bOnly: units[b].cells.filter((i) => !inA[i]) });
  }
  // innies: cages lying completely inside a unit
  const innies = [];
  if (cages.length) units.forEach((u, k) => {
    const inU = new Set(u.cells); let inSum = 0; const inCells = new Set(), inCages = [];
    cages.forEach((cg, ci) => { if (cg.cells.every((i) => inU.has(i))) { inSum += cg.sum; inCages.push(ci); cg.cells.forEach((i) => inCells.add(i)); } });
    const rest = u.cells.filter((i) => !inCells.has(i));
    if (inCages.length && rest.length) innies.push({ unit: k, inSum, inCages, rest });
  });
  return { n, NN, FULL, TOTAL, units, cellUnits, cages, cageOf, parity, peers, unitPeers, pairs, innies };
}

// ---------- exhaustive search (bitmasks + MRV + hidden singles) ----------
function search(ctx, val0, { limit = 2, rng = null, nodeLimit = Infinity } = {}) {
  const { n, NN, FULL, units, cellUnits, cages, cageOf, parity } = ctx;
  const val = Int8Array.from(val0);
  const uUsed = new Int32Array(units.length), cSum = new Int32Array(cages.length), cUsed = new Int32Array(cages.length), cEmpty = new Int32Array(cages.length);
  cages.forEach((cg, k) => { cEmpty[k] = cg.cells.length; });
  const sols = []; let nodes = 0, aborted = false;
  const set = (i, v) => { const b = 1 << (v - 1); val[i] = v; for (const u of cellUnits[i]) uUsed[u] |= b; const k = cageOf[i]; if (k >= 0) { cSum[k] += v; cUsed[k] |= b; cEmpty[k]--; } };
  const unset = (i) => { const v = val[i], b = 1 << (v - 1); val[i] = 0; for (const u of cellUnits[i]) uUsed[u] &= ~b; const k = cageOf[i]; if (k >= 0) { cSum[k] -= v; cUsed[k] &= ~b; cEmpty[k]++; } };
  for (let i = 0; i < NN; i++) if (val[i]) {
    const v = val[i], b = 1 << (v - 1);
    if (!(parity[i] & b)) return { sols, aborted };
    for (const u of cellUnits[i]) if (uUsed[u] & b) return { sols, aborted };
    const k = cageOf[i]; if (k >= 0 && (cUsed[k] & b)) return { sols, aborted };
    val[i] = 0; set(i, v);
  }
  for (let k = 0; k < cages.length; k++) if (cSum[k] > cages[k].sum || (!cEmpty[k] && cSum[k] !== cages[k].sum)) return { sols, aborted };
  const cand = new Int32Array(NN);
  const candOf = (i) => {
    let m = FULL & parity[i];
    for (const u of cellUnits[i]) m &= ~uUsed[u];
    const k = cageOf[i];
    if (k >= 0 && m) m &= comboUnion(cages[k].sum - cSum[k], cEmpty[k], FULL & ~cUsed[k]);
    return m;
  };
  const rec = () => {
    if (++nodes > nodeLimit) { aborted = true; return; }
    let best = -1, bc = 99;
    for (let i = 0; i < NN; i++) if (!val[i]) {
      const m = candOf(i); cand[i] = m;
      if (!m) return;
      const c = pc(m); if (c < bc) { bc = c; best = i; if (c === 1) break; }
    }
    if (best < 0) { sols.push(Int8Array.from(val)); return; }
    let digits = cand[best];
    if (bc > 1) {
      for (let u = 0; u < units.length; u++) {
        let once = 0, twice = 0;
        for (const i of units[u].cells) if (!val[i]) { const m = cand[i]; twice |= once & m; once |= m; }
        const need = FULL & ~uUsed[u];
        if (need & ~once) return;
        const single = need & once & ~twice;
        if (single) { const b = single & -single; for (const i of units[u].cells) if (!val[i] && (cand[i] & b)) { best = i; break; } digits = b; break; }
      }
    }
    const list = digitsOf(digits); if (rng) rng.shuffle(list);
    for (const v of list) {
      set(best, v); rec(); unset(best);
      if (sols.length >= limit || aborted) return;
    }
  };
  rec();
  return { sols, aborted, nodes };
}

const flat = (g) => Int8Array.from(g.flat());
const toGrid = (a, n) => Array.from({ length: n }, (_, r) => Array.from(a.slice(r * n, r * n + n)));

/** Number of solutions (capped at limit) of a grid under the puzzle's rules. */
export function countSolutions(p, g = p.givens, limit = 2) {
  return search(ctxOf(p), flat(g), { limit }).sols.length;
}

// ---------- logic solver (human techniques; also drives the hints) ----------
function newState(ctx, val) {
  const { NN, FULL, peers, parity } = ctx;
  const st = { val: Int8Array.from(val), cand: new Int32Array(NN), empty: 0, dirty: new Uint8Array(ctx.cages.length).fill(1) };
  for (let i = 0; i < NN; i++) if (!st.val[i]) {
    let m = FULL & parity[i];
    for (const q of peers[i]) if (st.val[q]) m &= ~(1 << (st.val[q] - 1));
    st.cand[i] = m; st.empty++;
  }
  return st;
}
const touch = (ctx, st, i) => { const k = ctx.cageOf[i]; if (k >= 0) st.dirty[k] = 1; };
function setVal(ctx, st, i, v) {
  st.val[i] = v; st.cand[i] = 0; st.empty--; touch(ctx, st, i);
  const b = 1 << (v - 1);
  for (const q of ctx.peers[i]) if (!st.val[q] && (st.cand[q] & b)) { st.cand[q] &= ~b; touch(ctx, st, q); }
}
function applyElims(ctx, st, elims) { for (const [i, m] of elims) if (st.cand[i] & m) { st.cand[i] &= ~m; touch(ctx, st, i); } }
function applyStep(ctx, st, s) { if (s.elims) applyElims(ctx, st, s.elims); else setVal(ctx, st, s.i, s.v); }

function cageAnalyze(ctx, st, k) {
  const cg = ctx.cages[k], E = []; let placed = 0, used = 0;
  for (const i of cg.cells) { if (st.val[i]) { placed += st.val[i]; used |= 1 << (st.val[i] - 1); } else E.push(i); }
  if (E.length < 2) return null;
  const rem = cg.sum - placed, newM = new Array(E.length).fill(0), assign = new Array(E.length), combos = new Set();
  const dfs = (j, s, acc) => {
    if (j === E.length) { if (s === 0) { for (let t = 0; t < E.length; t++) newM[t] |= assign[t]; combos.add(acc); } return; }
    let m = st.cand[E[j]] & ~acc & ~used;
    while (m) { const b = m & -m; m ^= b; const v = low(b) + 1; if (v > s) break; assign[j] = b; dfs(j + 1, s - v, acc | b); }
  };
  dfs(0, rem, 0);
  if (!combos.size) return null; // contradiction (wrong entries) – stay silent
  const elims = [];
  E.forEach((i, t) => { const r = st.cand[i] & ~newM[t]; if (r) elims.push([i, r]); });
  let must = ctx.FULL; for (const c of combos) must &= c;
  return { E, rem, used, combos: [...combos], elims, must };
}

/** Next logical step: placement { kind, i, v, … } or elimination { kind, elims:[[i, mask]], … }; null when stuck. */
function nextStep(ctx, st, { advanced = true } = {}) {
  const { n, FULL, units, cages, TOTAL } = ctx, { val, cand } = st;
  // full house: unit with one empty cell
  for (let u = 0; u < units.length; u++) {
    let e = -1, cnt = 0, used = 0;
    for (const i of units[u].cells) { if (val[i]) used |= 1 << (val[i] - 1); else { e = i; cnt++; } }
    if (cnt === 1) { const m = FULL & ~used; if (pc(m) === 1 && (cand[e] & m)) return { kind: "full", i: e, v: low(m) + 1, unit: u }; }
  }
  // cage with one open cell
  for (let k = 0; k < cages.length; k++) {
    let e = -1, cnt = 0, s = 0;
    for (const i of cages[k].cells) { if (val[i]) s += val[i]; else { e = i; cnt++; } }
    if (cnt === 1) { const v = cages[k].sum - s; if (v >= 1 && v <= n && (cand[e] & (1 << (v - 1)))) return { kind: "cageLast", i: e, v, cage: k }; }
  }
  // naked single
  for (let i = 0; i < ctx.NN; i++) if (!val[i] && cand[i] && pc(cand[i]) === 1) return { kind: "naked", i, v: low(cand[i]) + 1 };
  // hidden single
  for (let u = 0; u < units.length; u++) {
    let once = 0, twice = 0, used = 0;
    for (const i of units[u].cells) { if (val[i]) used |= 1 << (val[i] - 1); else { twice |= once & cand[i]; once |= cand[i]; } }
    const single = once & ~twice & FULL & ~used;
    if (single) { const b = single & -single; for (const i of units[u].cells) if (!val[i] && (cand[i] & b)) return { kind: "hidden", i, v: low(b) + 1, unit: u }; }
  }
  // innie (45 rule): cages inside a unit + one open cell left
  for (const inn of ctx.innies) {
    let s = 0, e = -1, cnt = 0;
    for (const i of inn.rest) { if (val[i]) s += val[i]; else { e = i; cnt++; } }
    if (cnt === 1) { const v = TOTAL - inn.inSum - s; if (v >= 1 && v <= n && (cand[e] & (1 << (v - 1)))) return { kind: "innie", i: e, v, unit: inn.unit, inSum: inn.inSum, restSum: s }; }
  }
  // cage combinations / cage inside a unit
  for (let k = 0; k < cages.length; k++) {
    if (!st.dirty[k]) continue;
    const a = cageAnalyze(ctx, st, k);
    if (a && a.elims.length) return { kind: "cage", cage: k, ...a };
    if (a && a.must) {
      for (const u of ctx.cellUnits[a.E[0]]) {
        if (!a.E.every((i) => ctx.cellUnits[i].includes(u))) continue;
        const elims = [];
        for (const i of units[u].cells) if (!val[i] && ctx.cageOf[i] !== k && (cand[i] & a.must)) elims.push([i, cand[i] & a.must]);
        if (elims.length) return { kind: "cageUnit", cage: k, unit: u, combos: a.combos, must: a.must, E: a.E, elims };
      }
    }
    st.dirty[k] = 0;
  }
  if (!advanced) return null;
  // pointing / box-line reduction (generalised: candidates of a digit in unit A all inside unit B)
  for (const pr of ctx.pairs) {
    const A = units[pr.a].cells;
    let used = 0; for (const i of A) if (val[i]) used |= 1 << (val[i] - 1);
    for (let d = 0; d < n; d++) {
      const b = 1 << d; if (used & b) continue;
      let any = false, inside = true;
      for (const i of A) if (!val[i] && (cand[i] & b)) { any = true; if (!pr.inter[i]) { inside = false; break; } }
      if (!any || !inside) continue;
      const elims = pr.bOnly.filter((i) => !val[i] && (cand[i] & b)).map((i) => [i, b]);
      if (elims.length) return { kind: "pointing", a: pr.a, b: pr.b, v: d + 1, elims };
    }
  }
  // naked pair
  for (let u = 0; u < units.length; u++) {
    const cells = units[u].cells.filter((i) => !val[i] && pc(cand[i]) === 2);
    for (let x = 0; x < cells.length; x++) for (let y = x + 1; y < cells.length; y++) {
      if (cand[cells[x]] !== cand[cells[y]]) continue;
      const m = cand[cells[x]];
      const elims = units[u].cells.filter((i) => !val[i] && i !== cells[x] && i !== cells[y] && (cand[i] & m)).map((i) => [i, cand[i] & m]);
      if (elims.length) return { kind: "pair", unit: u, cells: [cells[x], cells[y]], mask: m, elims };
    }
  }
  return null;
}
function runLogic(ctx, st, opts) {
  while (st.empty > 0) { const s = nextStep(ctx, st, opts); if (!s) return false; applyStep(ctx, st, s); }
  return true;
}
const advancedFor = (p) => p.n === 9 && p.diff === "experte";
/** true if the grid can be completed by the logic techniques of its level (singles + variant units; killer: cage combos,
 *  innies; 9×9 experte additionally pointing/box-line and naked pairs). Implies a unique solution. */
export function logicSolvable(p, g = p.givens, advanced = advancedFor(p)) {
  const ctx = ctxOf(p); return runLogic(ctx, newState(ctx, flat(g)), { advanced });
}

// ---------- generator ----------
function makeCages(n, sol, rng, maxSize) {
  const NN = n * n;
  const nb = (i) => { const r = Math.floor(i / n), c = i % n, o = []; if (r) o.push(i - n); if (r < n - 1) o.push(i + n); if (c) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
  let cagesOut = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const of = new Int16Array(NN).fill(-1), cages = [];
    for (const start of rng.shuffle([...Array(NN).keys()])) {
      if (of[start] >= 0) continue;
      const size = 2 + rng.int(maxSize - 1), cells = [start]; let used = 1 << (sol[start] - 1);
      of[start] = cages.length;
      while (cells.length < size) {
        const fr = [...new Set(cells.flatMap(nb))].filter((j) => of[j] < 0 && !(used & (1 << (sol[j] - 1))));
        if (!fr.length) break;
        const j = rng.pick(fr); cells.push(j); of[j] = cages.length; used |= 1 << (sol[j] - 1);
      }
      cages.push(cells);
    }
    // merge single cells into a neighbouring cage
    let singles = 0;
    for (let k = 0; k < cages.length; k++) {
      if (cages[k].length !== 1) continue;
      const i = cages[k][0];
      const opts = rng.shuffle(nb(i).map((j) => of[j]).filter((t) => t !== k && cages[t].length >= 1 && cages[t].length < maxSize && !cages[t].some((x) => sol[x] === sol[i])));
      if (opts.length) { const t = opts[0]; cages[t].push(i); of[i] = t; cages[k] = []; } else singles++;
    }
    const list = cages.filter((c) => c.length);
    if (!singles || attempt === 39) { cagesOut = list; break; }
  }
  return cagesOut.map((cells) => ({ sum: cells.reduce((s, i) => s + sol[i], 0), cells: cells.sort((a, b) => a - b).map((i) => [Math.floor(i / n), i % n]) }));
}

export function generate(diff, seed, opts = {}) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = String(opts.size) === "9" ? 9 : 6, NN = n * n;
  let variant = VARIANTS.includes(opts.variant) ? opts.variant : "klassisch";
  if (variant === "fenster" && n !== 9) variant = "klassisch";
  const advanced = n === 9 && diff === "experte";
  for (;;) {
    const boxes = variant === "jigsaw" ? jigsawBoxes(n, rng) : classicBoxes(n);
    const p = { kind: "sudoku", n, diff, variant, boxes, extraUnits: extraUnitsFor(n, variant), cages: [], parity: {}, givens: null, solution: null, rulesText: VARIANT_RULES[variant] };
    const res = search(buildCtx(p), new Int8Array(NN), { limit: 1, rng, nodeLimit: 4000 });
    if (!res.sols.length) continue;
    const sol = res.sols[0];
    p.solution = toGrid(sol, n);
    let val;
    if (variant === "killer") {
      p.cages = makeCages(n, sol, rng, KILLER_MAX[n][diff]);
      const ctx = buildCtx(p);
      val = new Int8Array(NN);
      const st = newState(ctx, val), added = [];
      while (!runLogic(ctx, st, { advanced })) {
        let best = -1, bc = -1; const ties = [];
        for (let i = 0; i < NN; i++) if (!st.val[i]) { const c = pc(st.cand[i]); if (c > bc) { bc = c; ties.length = 0; } if (c === bc) ties.push(i); }
        best = rng.pick(ties);
        setVal(ctx, st, best, sol[best]); val[best] = sol[best]; added.push(best);
      }
      for (const i of rng.shuffle(added)) { val[i] = 0; if (!runLogic(ctx, newState(ctx, val), { advanced })) val[i] = sol[i]; }
      const free = rng.shuffle([...Array(NN).keys()].filter((i) => !val[i]));
      for (const i of free.slice(0, KILLER_EXTRA[n][diff])) val[i] = sol[i];
    } else {
      if (variant === "paritaet") {
        const cells = rng.shuffle([...Array(NN).keys()]).slice(0, Math.round(PARITY_FRAC[diff] * NN));
        for (const i of cells) p.parity[Math.floor(i / n) * 64 + (i % n)] = sol[i] % 2 ? "o" : "e";
      }
      const ctx = buildCtx(p);
      const target = Math.max(0, TARGET[n][diff] - (variant === "paritaet" ? (n === 9 ? 5 : 3) : 0));
      val = Int8Array.from(sol); let givens = NN;
      for (const i of rng.shuffle([...Array(NN).keys()])) {
        if (givens <= target) break;
        const v = val[i]; val[i] = 0;
        if (runLogic(ctx, newState(ctx, val), { advanced })) givens--; else val[i] = v;
      }
    }
    p.givens = toGrid(val, n);
    return p;
  }
}

// ---------- helpers for the board ----------
/** Cells conflicting with the rules in a (partial) grid → Set of keys r*64+c. */
export function conflicts(p, g) {
  const ctx = ctxOf(p), n = p.n, out = new Set(), val = flat(g);
  const add = (i) => out.add(Math.floor(i / n) * 64 + (i % n));
  for (let i = 0; i < ctx.NN; i++) {
    const v = val[i]; if (!v) continue;
    if (!(ctx.parity[i] & (1 << (v - 1)))) add(i);
    for (const q of ctx.peers[i]) if (val[q] === v) { add(i); break; }
  }
  for (const cg of ctx.cages) {
    let s = 0, full = true; for (const i of cg.cells) { s += val[i]; if (!val[i]) full = false; }
    if (s > cg.sum || (full && s !== cg.sum)) cg.cells.forEach((i) => { if (val[i]) add(i); });
  }
  return out;
}
/** v allowed in (r,c) by units, cage-mates and parity (ignores the cell's own value). */
export function canPlace(p, g, r, c, v) {
  const ctx = ctxOf(p), n = p.n, i = r * n + c;
  if (!(ctx.parity[i] & (1 << (v - 1)))) return false;
  for (const q of ctx.peers[i]) if (g[Math.floor(q / n)][q % n] === v) return false;
  return true;
}
export function candidates(p, g, r, c) { const out = []; for (let v = 1; v <= p.n; v++) if (canPlace(p, g, r, c, v)) out.push(v); return out; }
/** Cells sharing a unit (row/col/region/extra) with (r,c); with cage=true also the cage-mates. */
export function peersOf(p, r, c, cage = false) {
  const ctx = ctxOf(p), n = p.n;
  return (cage ? ctx.peers : ctx.unitPeers)[r * n + c].map((i) => [Math.floor(i / n), i % n]);
}

// ---------- hints with explanations (LinkedIn style) ----------
const U = {
  Zeile: { this: "dieser Zeile", the: "der Zeile", poss: "ihrer Zeile", same: "derselben Zeile" },
  Spalte: { this: "dieser Spalte", the: "der Spalte", poss: "ihrer Spalte", same: "derselben Spalte" },
  Region: { this: "dieser Region", the: "der Region", poss: "ihrer Region", same: "derselben Region" },
  Diagonale: { this: "dieser Diagonale", the: "der Diagonale", poss: "ihrer Diagonale", same: "derselben Diagonale" },
  Fenster: { this: "diesem Fenster", the: "des Fensters", poss: "ihrem Fenster", same: "demselben Fenster" },
  Käfig: { this: "diesem Käfig", the: "des Käfigs", poss: "ihrem Käfig", same: "demselben Käfig" },
};
const NUM = ["null", "einem", "zwei", "drei", "vier", "fünf", "sechs"];
const listJoin = (xs, w) => (xs.length <= 1 ? String(xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${w} ${xs[xs.length - 1]}`);
const listOr = (xs) => listJoin(xs, "oder"), listAnd = (xs) => listJoin(xs, "und");
const comboStr = (m) => digitsOf(m).join("+");
const uniq = (xs) => [...new Set(xs)];

function elimText(ctx, s) {
  const u = (k) => U[ctx.units[k].type];
  if (s.kind === "cage" || s.kind === "cageUnit") {
    const cg = ctx.cages[s.cage], E = s.E, all = E.length === cg.cells.length;
    const byDigits = (a, b) => { const x = digitsOf(a), y = digitsOf(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
    const poss = s.combos.slice().sort(byDigits).map(comboStr);
    if (s.kind === "cageUnit") {
      const must = digitsOf(s.must);
      return `Der Käfig ${cg.sum} geht hier nur mit ${listOr(poss)} und liegt ganz in ${u(s.unit).this} – ${listAnd(must)} ${must.length > 1 ? "können" : "kann"} dort sonst nirgends stehen.`;
    }
    const pure = comboList(s.rem, E.length, ctx.FULL & ~s.used).map(comboStr);
    const head = all ? `Der Käfig ${cg.sum} auf ${NUM[E.length]} Feldern geht nur mit` : `Im Käfig ${cg.sum} fehlen noch ${s.rem} auf ${NUM[E.length]} Feldern. Das geht nur mit`;
    if (pure.length <= 6) {
      const tail = poss.length < pure.length ? ` – mit den Zahlen in Zeile, Spalte und Region ${poss.length > 1 ? "bleiben" : "bleibt"} nur ${listOr(poss)}` : "";
      return `${head} ${listOr(pure)}${tail}.`;
    }
    if (poss.length <= 6) return `${all ? `Der Käfig ${cg.sum} auf ${NUM[E.length]} Feldern` : `Der Rest von Käfig ${cg.sum} (${s.rem} auf ${NUM[E.length]} Feldern)`} lässt mit den Zahlen in Zeile, Spalte und Region nur ${listOr(poss)} zu.`;
    return `Die Summe von Käfig ${cg.sum} schränkt zusammen mit Zeile, Spalte und Region die möglichen Zahlen seiner Felder ein.`;
  }
  if (s.kind === "pointing")
    return `In ${u(s.a).this} kann die ${s.v} nur in Feldern stehen, die auch zu ${u(s.b).this} gehören – im Rest ${u(s.b).the} ist die ${s.v} damit ausgeschlossen.`;
  if (s.kind === "pair") {
    const [a, b] = digitsOf(s.mask);
    return `Zwei Felder in ${u(s.unit).this} können nur ${a} oder ${b} enthalten und teilen sich diese beiden Zahlen – in den übrigen Feldern ${u(s.unit).the} sind ${a} und ${b} ausgeschlossen.`;
  }
  return "";
}
function elimFocus(ctx, s) {
  if (s.kind === "cage") return ctx.cages[s.cage].cells;
  if (s.kind === "cageUnit") return uniq([...ctx.cages[s.cage].cells, ...ctx.units[s.unit].cells]);
  if (s.kind === "pointing") return ctx.units[s.a].cells;
  if (s.kind === "pair") return ctx.units[s.unit].cells;
  return [];
}

/**
 * Explained next step for the hint button → { type, r, c, v, old?, text: "Warum.\nWas.", focus:[[r,c]], target:[[r,c]], strike:[[r,c]] } | null.
 * type ∈ fix | full | cageLast | naked | hidden | innie | any.
 */
export function explainHint(p, g) {
  const ctx = ctxOf(p), n = p.n, rc = (i) => [Math.floor(i / n), i % n], val = flat(g);
  const parName = (i) => (ctx.parity[i] === (ctx.FULL & EVEN) ? "gerade" : "ungerade");
  // 1. wrong entries first
  for (let i = 0; i < ctx.NN; i++) {
    const [r, c] = rc(i), v = val[i];
    if (!v || p.givens[r][c] || v === p.solution[r][c]) continue;
    const hits = ctx.peers[i].filter((q) => val[q] === v);
    let why;
    if (!(ctx.parity[i] & (1 << (v - 1)))) why = `Dieses Feld ist als ${parName(i)} markiert – die ${v} ist ${v % 2 ? "ungerade" : "gerade"}.`;
    else if (hits.length) {
      const where = uniq(hits.flatMap((q) => [...ctx.cellUnits[i].filter((u) => ctx.cellUnits[q].includes(u)).map((u) => U[ctx.units[u].type].same), ...(ctx.cageOf[q] >= 0 && ctx.cageOf[q] === ctx.cageOf[i] ? [U.Käfig.same] : [])]));
      why = `Die ${v} kollidiert mit der ${v} in ${listAnd(where)} – dort darf jede Zahl nur einmal vorkommen.`;
    } else if (ctx.cageOf[i] >= 0) {
      const cg = ctx.cages[ctx.cageOf[i]], s = cg.cells.reduce((a, q) => a + val[q], 0);
      why = s > cg.sum ? `Mit der ${v} ergeben die Zahlen im Käfig ${cg.sum} schon ${s} – zu viel.`
        : `Dieser Eintrag widerspricht der Lösung: Mit der ${v} an dieser Stelle lässt sich das Rätsel nicht mehr widerspruchsfrei lösen.`;
    } else why = `Dieser Eintrag widerspricht der Lösung: Mit der ${v} an dieser Stelle lässt sich das Rätsel nicht mehr widerspruchsfrei lösen.`;
    return { type: "fix", r, c, v: p.solution[r][c], old: v, text: `${why}\nEntfernen Sie ihn.`, focus: hits.map(rc), target: [], strike: [[r, c]] };
  }
  const st = newState(ctx, val);
  if (!st.empty) return null;
  const base = newState(ctx, val); // candidates before any elimination (for "why" of singles)
  const trail = [];
  for (let guard = 0; guard < 2000; guard++) {
    const s = nextStep(ctx, st, { advanced: true });
    if (!s) break;
    if (s.elims) { trail.push(s); applyStep(ctx, st, s); continue; }
    return describe(ctx, p, s, trail, base, val);
  }
  // fallback: cell with the fewest candidates
  let best = -1, bc = 99;
  for (let i = 0; i < ctx.NN; i++) if (!val[i]) { const c = pc(st.cand[i]) || 99; if (c < bc) { bc = c; best = i; } }
  const [r, c] = rc(best), v = p.solution[r][c], cands = digitsOf(st.cand[best] || base.cand[best]), others = cands.filter((d) => d !== v);
  const text = others.length
    ? `Für dieses Feld lassen die Regeln nur noch ${listOr(cands)} zu. Mit ${others.length > 1 ? "den anderen Zahlen" : `der ${others[0]}`} lässt sich das Rätsel nicht widerspruchsfrei lösen – es bleibt die ${v}.\nTragen Sie ${v} ein.`
    : `Für dieses Feld ist ${v} die einzige verbleibende Option.\nTragen Sie ${v} ein.`;
  return { type: "any", r, c, v, text, focus: ctx.peers[best].map(rc), target: [[r, c]], strike: [] };
}

function describe(ctx, p, s, trail, base, val) {
  const n = p.n, rc = (i) => [Math.floor(i / n), i % n], { i, v } = s, b = 1 << (v - 1);
  const ut = (k) => U[ctx.units[k].type];
  const act = `Tragen Sie ${v} in die hervorgehobene Zelle ein.`;
  const out = (why, focusIdx) => ({ type: s.kind, r: rc(i)[0], c: rc(i)[1], v, text: `${why}\n${act}`, focus: uniq(focusIdx).filter((q) => q !== i).map(rc), target: [rc(i)], strike: [] });
  if (s.kind === "full") return out(`In ${ut(s.unit).this} fehlt nur noch die ${v}.`, ctx.units[s.unit].cells);
  if (s.kind === "cageLast") {
    const cg = ctx.cages[s.cage], others = cg.cells.filter((q) => q !== i).map((q) => val[q]);
    return out(`Im Käfig ${cg.sum} ist nur noch dieses Feld frei: ${cg.sum} − ${others.join(" − ")} = ${v}.`, cg.cells);
  }
  if (s.kind === "innie") {
    const u = ut(s.unit);
    const rest = s.restSum ? `, die übrigen Zahlen ${u.the} ${s.restSum}` : "";
    return out(`Alle Zahlen ${u.the} ergeben zusammen ${ctx.TOTAL}. Die Käfige ganz in ${u.this} ergeben ${s.inSum}${rest} – es bleibt ${ctx.TOTAL} − ${s.inSum}${s.restSum ? ` − ${s.restSum}` : ""} = ${v}.`, ctx.units[s.unit].cells);
  }
  const relevant = s.kind === "naked"
    ? trail.filter((t) => t.elims.some(([q]) => q === i))
    : trail.filter((t) => t.elims.some(([q, m]) => q !== i && (m & b) && ctx.units[s.unit].cells.includes(q)));
  const lastRel = [];
  for (const t of relevant.slice().reverse()) { if (lastRel.length >= 2) break; const key = (x) => (x.cage != null ? `k${x.cage}` : elimText(ctx, x)); if (!lastRel.some((x) => key(x) === key(t))) lastRel.unshift(t); }
  if (s.kind === "naked") {
    if (lastRel.length) return out(`${lastRel.map((t) => elimText(ctx, t)).join(" ")} Damit bleibt für das hervorgehobene Feld nur die ${v}.`, [...lastRel.flatMap((t) => elimFocus(ctx, t)), ...ctx.peers[i]]);
    // which units / marks exclude the other digits?
    const names = [], focus = []; let par = false;
    for (let d = 1; d <= n; d++) {
      if (d === v) continue; const bd = 1 << (d - 1);
      if (!(ctx.parity[i] & bd)) { par = true; continue; }
      for (const u of ctx.cellUnits[i]) { const hit = ctx.units[u].cells.find((q) => val[q] === d); if (hit != null) { names.push(ctx.units[u].type); focus.push(...ctx.units[u].cells); break; } }
      const k = ctx.cageOf[i];
      if (k >= 0 && !ctx.cellUnits[i].some((u) => ctx.units[u].cells.some((q) => val[q] === d)) && ctx.cages[k].cells.some((q) => val[q] === d)) { names.push("Käfig"); focus.push(...ctx.cages[k].cells); }
    }
    const order = ["Zeile", "Spalte", "Region", "Diagonale", "Fenster", "Käfig"];
    const nm = order.filter((x) => names.includes(x));
    let why;
    if (par) why = nm.length
      ? `Das Feld ist als ${ctx.parity[i] === (ctx.FULL & EVEN) ? "gerade" : "ungerade"} markiert, und ${listAnd(nm)} ${nm.length > 1 ? "schließen" : "schließt"} die übrigen ${ctx.parity[i] === (ctx.FULL & EVEN) ? "geraden" : "ungeraden"} Zahlen aus – nur die ${v} bleibt.`
      : `Das Feld ist als ${ctx.parity[i] === (ctx.FULL & EVEN) ? "gerade" : "ungerade"} markiert – nur die ${v} bleibt.`;
    else if (nm.every((x) => x === "Zeile" || x === "Spalte" || x === "Region")) why = `In der sich kreuzenden Zeile, Spalte und Region ist ${v} die einzige verbleibende Option.`;
    else why = `${listAnd(nm)} dieses Feldes schließen alle anderen Zahlen aus – ${v} ist die einzige verbleibende Option.`;
    return out(why, focus.length ? focus : ctx.peers[i]);
  }
  // hidden single
  const u = ut(s.unit), unitCells = ctx.units[s.unit].cells;
  if (lastRel.length) return out(`${lastRel.map((t) => elimText(ctx, t)).join(" ")} Damit kann die ${v} in ${u.this} nur noch im hervorgehobenen Feld stehen.`, [...lastRel.flatMap((t) => elimFocus(ctx, t)), ...unitCells]);
  const phrases = [], blockers = []; let par = false;
  for (const q of unitCells) {
    if (q === i || val[q]) continue;
    if (!(ctx.parity[q] & b)) { par = true; continue; }
    let found = false;
    for (const w of ctx.cellUnits[q]) { if (w === s.unit) continue; const hit = ctx.units[w].cells.find((x) => val[x] === v); if (hit != null) { phrases.push(U[ctx.units[w].type].poss); blockers.push(hit); found = true; break; } }
    if (!found && ctx.cageOf[q] >= 0) { const hit = ctx.cages[ctx.cageOf[q]].cells.find((x) => val[x] === v); if (hit != null) { phrases.push(U.Käfig.poss); blockers.push(hit); } }
  }
  const ph = uniq(phrases);
  const blockedBy = ph.length ? `durch eine ${v} in ${listOr(ph)} blockiert` : "";
  const parTxt = par ? `als ${v % 2 ? "gerade" : "ungerade"} markiert` : "";
  return out(`In ${u.this} kann die ${v} nur noch im hervorgehobenen Feld stehen – alle anderen freien Felder sind ${[blockedBy, parTxt].filter(Boolean).join(" oder ")}.`, [...unitCells, ...blockers]);
}
