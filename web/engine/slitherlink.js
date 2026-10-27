// Slitherlink („Rundweg“): draw one closed loop along grid lines; a number says how many
// of the four edges around that cell belong to the loop. Pure logic, no DOM.
//
// Edge keys: "h,r,c" = horizontal edge on top of cell (r,c)   (r in 0..n, c in 0..n-1)
//            "v,r,c" = vertical edge on the left of cell (r,c) (r in 0..n-1, c in 0..n)
import { Rng, resolveDiff, key } from "./core.js";

const SIZE = { leicht: 5, mittel: 7, schwer: 8, experte: 10 };
const CLUE_FRAC = { leicht: 0.70, mittel: 0.55, schwer: 0.45, experte: 0.38 };
const SOLVE_BUDGET = 10000;

/* ---------- geometry ---------- */
export class Geo {
  constructor(n) {
    this.n = n; this.E = 2 * n * (n + 1); this.N = (n + 1) * (n + 1); this.C = n * n;
    const E = this.E, N = this.N, C = this.C;
    this.edgeNodes = new Int32Array(E * 2);        // node a, node b
    this.edgeCells = new Int32Array(E * 2).fill(-1); // up to 2 cells
    this.nodeEdges = new Int32Array(N * 4).fill(-1);
    this.nodeDeg = new Int32Array(N);
    this.cellEdges = new Int32Array(C * 4);
    this.keys = new Array(E);
    const node = (r, c) => r * (n + 1) + c;
    const addNodeEdge = (nd, e) => { this.nodeEdges[nd * 4 + this.nodeDeg[nd]++] = e; };
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) {
      const e = this.h(r, c); this.keys[e] = `h,${r},${c}`;
      this.edgeNodes[e * 2] = node(r, c); this.edgeNodes[e * 2 + 1] = node(r, c + 1);
      addNodeEdge(node(r, c), e); addNodeEdge(node(r, c + 1), e);
      if (r < n) { this.edgeCells[e * 2] = r * n + c; this.cellEdges[(r * n + c) * 4] = e; }
      if (r > 0) { this.edgeCells[e * 2 + 1] = (r - 1) * n + c; this.cellEdges[((r - 1) * n + c) * 4 + 1] = e; }
    }
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) {
      const e = this.v(r, c); this.keys[e] = `v,${r},${c}`;
      this.edgeNodes[e * 2] = node(r, c); this.edgeNodes[e * 2 + 1] = node(r + 1, c);
      addNodeEdge(node(r, c), e); addNodeEdge(node(r + 1, c), e);
      if (c < n) { this.edgeCells[e * 2] = r * n + c; this.cellEdges[(r * n + c) * 4 + 2] = e; }
      if (c > 0) { this.edgeCells[e * 2 + 1] = r * n + c - 1; this.cellEdges[(r * n + c - 1) * 4 + 3] = e; }
    }
    this.index = new Map(this.keys.map((k, i) => [k, i]));
  }
  h(r, c) { return r * this.n + c; }
  v(r, c) { return this.n * (this.n + 1) + r * (this.n + 1) + c; }
  idx(k) { const i = this.index.get(k); return i == null ? -1 : i; }
  /** node index → [r,c] */
  nodeRC(nd) { return [Math.floor(nd / (this.n + 1)), nd % (this.n + 1)]; }
  /** edge index → endpoints as [[r,c],[r,c]] */
  edgeEnds(e) { return [this.nodeRC(this.edgeNodes[e * 2]), this.nodeRC(this.edgeNodes[e * 2 + 1])]; }
}
const geoCache = new Map();
export const geo = (n) => { let g = geoCache.get(n); if (!g) { g = new Geo(n); geoCache.set(n, g); } return g; };

/* ---------- solver ---------- */
/** clues: flat Int8Array/array of length n*n, -1 = none. */
export class Solver {
  constructor(n, clues) {
    this.g = geo(n); this.clues = clues;
    const { E, N, C } = this.g;
    this.state = new Int8Array(E); this.trail = new Int32Array(E); this.queue = new Int32Array(E);
    this.nodeOn = new Int32Array(N); this.nodeUnk = new Int32Array(N);
    this.cellOn = new Int32Array(C); this.cellUnk = new Int32Array(C);
  }
  /** Number of solutions (≤ limit), or -1 if the budget was exhausted. */
  count(limit = 2, budget = SOLVE_BUDGET) {
    const g = this.g;
    this.state.fill(-1); this.trailLen = 0; this.qLen = 0; this.onCount = 0;
    this.nodeOn.fill(0); this.nodeUnk.set(g.nodeDeg); this.cellOn.fill(0); this.cellUnk.fill(4);
    this.found = 0; this.nodes = 0; this.budget = budget; this.over = false; this.limit = limit;
    this.rec(true);
    return this.over ? -1 : this.found;
  }
  set(e, v) {
    const s = this.state[e];
    if (s !== -1) return s === v;
    this.state[e] = v; this.trail[this.trailLen++] = e; this.queue[this.qLen++] = e;
    const g = this.g, a = g.edgeNodes[e * 2], b = g.edgeNodes[e * 2 + 1];
    this.nodeUnk[a]--; this.nodeUnk[b]--;
    const c0 = g.edgeCells[e * 2], c1 = g.edgeCells[e * 2 + 1];
    if (c0 >= 0) this.cellUnk[c0]--; if (c1 >= 0) this.cellUnk[c1]--;
    if (v === 1) { this.nodeOn[a]++; this.nodeOn[b]++; this.onCount++; if (c0 >= 0) this.cellOn[c0]++; if (c1 >= 0) this.cellOn[c1]++; }
    return true;
  }
  undo(mark) {
    const g = this.g;
    while (this.trailLen > mark) {
      const e = this.trail[--this.trailLen], v = this.state[e]; this.state[e] = -1;
      const a = g.edgeNodes[e * 2], b = g.edgeNodes[e * 2 + 1];
      this.nodeUnk[a]++; this.nodeUnk[b]++;
      const c0 = g.edgeCells[e * 2], c1 = g.edgeCells[e * 2 + 1];
      if (c0 >= 0) this.cellUnk[c0]++; if (c1 >= 0) this.cellUnk[c1]++;
      if (v === 1) { this.nodeOn[a]--; this.nodeOn[b]--; this.onCount--; if (c0 >= 0) this.cellOn[c0]--; if (c1 >= 0) this.cellOn[c1]--; }
    }
    this.qLen = 0;
  }
  /** returns 0 = contradiction, 1 = consistent/open, 2 = single closed loop satisfying all clues */
  propagate() {
    const g = this.g, st = this.state;
    let cycleLen = -1;
    while (this.qLen) {
      const e = this.queue[--this.qLen], v = st[e];
      for (let k = 0; k < 2; k++) {
        const nd = g.edgeNodes[e * 2 + k], on = this.nodeOn[nd], unk = this.nodeUnk[nd];
        if (on > 2 || (on === 1 && unk === 0)) return 0;
        let force = -1;
        if (on === 2) force = 0; else if ((on === 1 && unk === 1) || (on === 0 && unk === 1)) force = on === 1 ? 1 : 0;
        if (force >= 0) for (let i = 0; i < g.nodeDeg[nd]; i++) { const f = g.nodeEdges[nd * 4 + i]; if (st[f] === -1 && !this.set(f, force)) return 0; }
      }
      for (let k = 0; k < 2; k++) {
        const c = g.edgeCells[e * 2 + k]; if (c < 0) continue;
        const cl = this.clues[c]; if (cl < 0) continue;
        const on = this.cellOn[c], unk = this.cellUnk[c];
        if (on > cl || on + unk < cl) return 0;
        let force = -1;
        if (on === cl) force = 0; else if (on + unk === cl) force = 1;
        if (force >= 0) for (let i = 0; i < 4; i++) { const f = g.cellEdges[c * 4 + i]; if (st[f] === -1 && !this.set(f, force)) return 0; }
      }
      if (v === 1) {
        // walk from a away from e; if we arrive at b the chain is closed
        const a = g.edgeNodes[e * 2], b = g.edgeNodes[e * 2 + 1];
        let cur = a, prev = e, len = 1;
        for (;;) {
          let nxt = -1;
          for (let i = 0; i < g.nodeDeg[cur]; i++) { const f = g.nodeEdges[cur * 4 + i]; if (f !== prev && st[f] === 1) { nxt = f; break; } }
          if (nxt < 0 || len > this.onCount) break; // len guard: a degree-3 node (caught later in the queue) could otherwise trap the walk
          cur = g.edgeNodes[nxt * 2] === cur ? g.edgeNodes[nxt * 2 + 1] : g.edgeNodes[nxt * 2]; prev = nxt; len++;
          if (cur === b) { cycleLen = len; break; }
        }
        if (cycleLen > 0 && cycleLen < this.onCount) return 0; // premature loop
      }
    }
    if (cycleLen > 0) {
      if (cycleLen !== this.onCount) return 0;
      for (let c = 0; c < g.C; c++) { const cl = this.clues[c]; if (cl >= 0 && this.cellOn[c] !== cl) return 0; }
      return 2;
    }
    return 1;
  }
  pickEdge() {
    const g = this.g, st = this.state;
    // 1) extend an open path end
    for (let nd = 0; nd < g.N; nd++) if (this.nodeOn[nd] === 1) {
      for (let i = 0; i < g.nodeDeg[nd]; i++) { const f = g.nodeEdges[nd * 4 + i]; if (st[f] === -1) return f; }
    }
    // 2) most constrained clue cell
    let best = -1, bestScore = 99;
    for (let c = 0; c < g.C; c++) {
      const cl = this.clues[c]; if (cl < 0 || this.cellUnk[c] === 0) continue;
      const score = this.cellUnk[c] - (cl - this.cellOn[c]); // slack; 0 would be forced already
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (best >= 0) for (let i = 0; i < 4; i++) { const f = g.cellEdges[best * 4 + i]; if (st[f] === -1) return f; }
    for (let e = 0; e < g.E; e++) if (st[e] === -1) return e;
    return -1;
  }
  rec(first) {
    if (this.over) return;
    if (++this.nodes > this.budget) { this.over = true; return; }
    const r = this.propagate();
    if (r === 0) return;
    if (r === 2) { this.found++; return; }
    const e = this.pickEdge();
    if (e < 0) return; // everything decided without a loop → no solution
    const mark = this.trailLen;
    for (const v of [1, 0]) {
      this.set(e, v); this.rec(false); this.undo(mark);
      if (this.found >= this.limit || this.over) return;
    }
  }
}

/* ---------- loop generation ---------- */
function growLoop(n, rng) {
  const g = geo(n), inn = new Uint8Array(n * n);
  const at = (r, c) => (r < 0 || c < 0 || r >= n || c >= n) ? 0 : inn[r * n + c];
  // degree of node (r,c) = number of differing adjacent pairs around it (NW,NE,SE,SW)
  const deg = (r, c) => { const a = at(r - 1, c - 1), b = at(r - 1, c), d = at(r, c), e = at(r, c - 1); return (a !== b) + (b !== d) + (d !== e) + (e !== a); };
  const target = Math.round(n * n * (0.35 + rng.float() * 0.25));
  const r0 = rng.int(n), c0 = rng.int(n); inn[r0 * n + c0] = 1; let count = 1;
  const frontier = new Set(); const addF = (r, c) => { if (r >= 0 && c >= 0 && r < n && c < n && !inn[r * n + c]) frontier.add(r * n + c); };
  const pushNb = (r, c) => { addF(r - 1, c); addF(r + 1, c); addF(r, c - 1); addF(r, c + 1); };
  const nbIn = (cell) => { const r = Math.floor(cell / n), c = cell % n; return at(r - 1, c) + at(r + 1, c) + at(r, c - 1) + at(r, c + 1); };
  pushNb(r0, c0);
  while (count < target && frontier.size) {
    // sample two frontier cells, prefer the one with fewer set neighbours → snakier loops, fewer 0-regions
    const arr = [...frontier]; let cell = arr[rng.int(arr.length)];
    if (arr.length > 1) { const alt = arr[rng.int(arr.length)]; if (nbIn(alt) < nbIn(cell)) cell = alt; }
    frontier.delete(cell);
    const r = Math.floor(cell / n), c = cell % n;
    inn[cell] = 1;
    if (deg(r, c) > 2 || deg(r, c + 1) > 2 || deg(r + 1, c) > 2 || deg(r + 1, c + 1) > 2) { inn[cell] = 0; continue; }
    count++; pushNb(r, c);
  }
  // fill holes: flood the complement from outside
  const seen = new Uint8Array(n * n), stack = [];
  for (let i = 0; i < n; i++) for (const cell of [i, (n - 1) * n + i, i * n, i * n + n - 1]) if (!inn[cell] && !seen[cell]) { seen[cell] = 1; stack.push(cell); }
  while (stack.length) {
    const cell = stack.pop(), r = Math.floor(cell / n), c = cell % n;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue; const k = rr * n + cc; if (!inn[k] && !seen[k]) { seen[k] = 1; stack.push(k); } }
  }
  for (let k = 0; k < n * n; k++) if (!inn[k] && !seen[k]) inn[k] = 1;
  // boundary edges
  const on = new Uint8Array(g.E); let m = 0;
  for (let e = 0; e < g.E; e++) {
    const c0 = g.edgeCells[e * 2], c1 = g.edgeCells[e * 2 + 1];
    const a = c0 >= 0 ? inn[c0] : 0, b = c1 >= 0 ? inn[c1] : 0;
    if (a !== b) { on[e] = 1; m++; }
  }
  if (m < 2 * n) return null;
  // validate: every node degree 0/2 and single component
  const nd = new Int32Array(g.N);
  for (let e = 0; e < g.E; e++) if (on[e]) { nd[g.edgeNodes[e * 2]]++; nd[g.edgeNodes[e * 2 + 1]]++; }
  for (let i = 0; i < g.N; i++) if (nd[i] !== 0 && nd[i] !== 2) return null;
  let start = -1; for (let e = 0; e < g.E; e++) if (on[e]) { start = e; break; }
  let cur = g.edgeNodes[start * 2 + 1], prev = start, len = 1;
  while (cur !== g.edgeNodes[start * 2]) {
    let nxt = -1; for (let i = 0; i < g.nodeDeg[cur]; i++) { const f = g.nodeEdges[cur * 4 + i]; if (f !== prev && on[f]) { nxt = f; break; } }
    if (nxt < 0) return null;
    cur = g.edgeNodes[nxt * 2] === cur ? g.edgeNodes[nxt * 2 + 1] : g.edgeNodes[nxt * 2]; prev = nxt; len++;
  }
  if (len !== m) return null;
  return on;
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff], g = geo(n);
  for (;;) {
    const on = growLoop(n, rng); if (!on) continue;
    const clues = new Int8Array(n * n);
    for (let c = 0; c < n * n; c++) { let k = 0; for (let i = 0; i < 4; i++) k += on[g.cellEdges[c * 4 + i]]; clues[c] = k; }
    const solver = new Solver(n, clues);
    if (solver.count(2) !== 1) continue;
    const target = Math.ceil(CLUE_FRAC[diff] * n * n);
    let visible = n * n;
    const order = rng.shuffle([...Array(n * n).keys()]);
    for (const c of order) {
      if (visible <= target) break;
      const old = clues[c]; clues[c] = -1;
      if (solver.count(2) === 1) visible--; else clues[c] = old;
    }
    const clues2 = []; for (let r = 0; r < n; r++) clues2.push(Array.from(clues.subarray(r * n, r * n + n)));
    const solution = []; for (let e = 0; e < g.E; e++) if (on[e]) solution.push(g.keys[e]);
    return { kind: "slitherlink", n, diff, clues: clues2, solution };
  }
}

/** Count solutions of a puzzle object (for tests). */
export function countSolutions(p, budget = 2_000_000) {
  return new Solver(p.n, Int8Array.from(p.clues.flat())).count(2, budget);
}

/* ---------- state helpers for the board ---------- */
/** number[][] of loop edges around each cell */
export function cellCounts(p, edges) {
  const n = p.n, g = geo(n), out = [];
  for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) { let k = 0; for (let i = 0; i < 4; i++) if (edges.has(g.keys[g.cellEdges[(r * n + c) * 4 + i]])) k++; row.push(k); } out.push(row); }
  return out;
}
function nodeDegrees(p, edges) {
  const g = geo(p.n), deg = new Int32Array(g.N);
  for (const k of edges) { const e = g.idx(k); if (e < 0) continue; deg[g.edgeNodes[e * 2]]++; deg[g.edgeNodes[e * 2 + 1]]++; }
  return deg;
}
/** { cells: Set<r*64+c> with too many edges, nodes: Set<r*64+c> with degree ≥ 3, ends: Set<r*64+c> with degree 1 } (node coords 0..n) */
export function conflicts(p, edges) {
  const n = p.n, g = geo(n), cnt = cellCounts(p, edges), cells = new Set(), nodes = new Set(), ends = new Set();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.clues[r][c] >= 0 && cnt[r][c] > p.clues[r][c]) cells.add(key(r, c));
  const deg = nodeDegrees(p, edges);
  for (let i = 0; i < g.N; i++) { const [r, c] = g.nodeRC(i); if (deg[i] >= 3) nodes.add(key(r, c)); else if (deg[i] === 1) ends.add(key(r, c)); }
  return { cells, nodes, ends };
}
export function isSolved(p, edges) {
  if (!edges.size) return false;
  const n = p.n, g = geo(n), cnt = cellCounts(p, edges);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.clues[r][c] >= 0 && cnt[r][c] !== p.clues[r][c]) return false;
  const deg = nodeDegrees(p, edges);
  for (let i = 0; i < g.N; i++) if (deg[i] !== 0 && deg[i] !== 2) return false;
  // single cycle
  const on = new Uint8Array(g.E); for (const k of edges) { const e = g.idx(k); if (e < 0) return false; on[e] = 1; }
  let start = -1; for (let e = 0; e < g.E; e++) if (on[e]) { start = e; break; }
  let cur = g.edgeNodes[start * 2 + 1], prev = start, len = 1;
  while (cur !== g.edgeNodes[start * 2]) {
    let nxt = -1; for (let i = 0; i < g.nodeDeg[cur]; i++) { const f = g.nodeEdges[cur * 4 + i]; if (f !== prev && on[f]) { nxt = f; break; } }
    if (nxt < 0) return false;
    cur = g.edgeNodes[nxt * 2] === cur ? g.edgeNodes[nxt * 2 + 1] : g.edgeNodes[nxt * 2]; prev = nxt; len++;
  }
  return len === edges.size;
}

/** Hint. edges/crosses: Sets of edge keys. Returns { type:"add"|"remove"|"cross"|"uncross", edge, reason } or null when solved. */
export function findHint(p, edges, crosses = new Set()) {
  const n = p.n, g = geo(n), sol = new Set(p.solution);
  if (isSolved(p, edges)) return null;
  for (const k of edges) if (!sol.has(k)) return { type: "remove", edge: k, reason: "Diese Kante gehört nicht zum Rundweg" };
  for (const k of crosses) if (sol.has(k)) return { type: "uncross", edge: k, reason: "Hier muss eine Kante hin" };
  const deg = nodeDegrees(p, edges);
  const missing = p.solution.filter((k) => !edges.has(k));
  const cellOf = (c) => [Math.floor(c / n), c % n];
  const mk = (k, reason) => ({ type: "add", edge: k, reason });
  // 1) node with one edge needs its second
  for (const k of missing) { const e = g.idx(k); if (deg[g.edgeNodes[e * 2]] === 1 || deg[g.edgeNodes[e * 2 + 1]] === 1) return mk(k, "Knoten braucht zweite Kante"); }
  // 2) 3 in a corner
  for (const k of missing) {
    const e = g.idx(k);
    for (let i = 0; i < 2; i++) {
      const c = g.edgeCells[e * 2 + i]; if (c < 0) continue; const [r, cc] = cellOf(c);
      if (p.clues[r][cc] === 3 && (r === 0 || r === n - 1) && (cc === 0 || cc === n - 1)) {
        const [[r1, c1], [r2, c2]] = g.edgeEnds(e); // outer edge of that corner cell?
        if ((r1 === r2 && (r1 === 0 || r1 === n)) || (c1 === c2 && (c1 === 0 || c1 === n))) return mk(k, "3-Feld in der Ecke: beide Außenkanten");
      }
    }
  }
  // 3) clue cell where all free edges are needed
  const cnt = cellCounts(p, edges);
  for (const k of missing) {
    const e = g.idx(k);
    for (let i = 0; i < 2; i++) {
      const c = g.edgeCells[e * 2 + i]; if (c < 0) continue; const [r, cc] = cellOf(c), cl = p.clues[r][cc]; if (cl < 0) continue;
      let free = 0; for (let j = 0; j < 4; j++) { const kk = g.keys[g.cellEdges[c * 4 + j]]; if (!edges.has(kk) && !crosses.has(kk)) free++; }
      if (free > 0 && cnt[r][cc] + free === cl) return mk(k, `${cl}-Feld: alle freien Kanten nötig`);
    }
  }
  // 4) 3 next to 0
  for (const k of missing) {
    const e = g.idx(k);
    for (let i = 0; i < 2; i++) {
      const c = g.edgeCells[e * 2 + i]; if (c < 0) continue; const [r, cc] = cellOf(c); if (p.clues[r][cc] !== 3) continue;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, c2 = cc + dc; if (rr >= 0 && c2 >= 0 && rr < n && c2 < n && p.clues[rr][c2] === 0) return mk(k, "3-Feld neben 0: drei Kanten um die 3"); }
    }
  }
  // 5) 0 cell with uncrossed edges
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.clues[r][c] === 0) {
    for (let j = 0; j < 4; j++) { const kk = g.keys[g.cellEdges[(r * n + c) * 4 + j]]; if (!crosses.has(kk) && !edges.has(kk)) return { type: "cross", edge: kk, reason: "0-Feld: keine Kanten drumherum" }; }
  }
  // 6) fallback: prefer an edge touching the drawn path
  for (const k of missing) { const e = g.idx(k); if (deg[g.edgeNodes[e * 2]] > 0 || deg[g.edgeNodes[e * 2 + 1]] > 0) return mk(k, "Eine Kante der Lösung"); }
  return missing.length ? mk(missing[0], "Eine Kante der Lösung") : null;
}
