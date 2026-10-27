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
    const solution = []; for (let e = 0; e < g.E; e++) if (on[e]) solution.push(g.keys[e]);
    const toP = () => { const clues2 = []; for (let r = 0; r < n; r++) clues2.push(Array.from(clues.subarray(r * n, r * n + n))); return { kind: "slitherlink", n, diff, clues: clues2, solution }; };
    // Jeder Schritt muss mit einem begründeten Tipp gehen (nie „fallback“) – das impliziert auch Eindeutigkeit.
    if (!logicSolvable(toP())) continue;
    for (const c of order) {
      if (visible <= target) break;
      const old = clues[c]; clues[c] = -1;
      if (logicSolvable(toP())) visible--; else clues[c] = old;
    }
    return toP();
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

/** Erklärter Tipp (LinkedIn-Stil). edges/crosses: Sets von Kanten-Keys.
 *  → { kind, text, cells:[[r,c]] (Begründungs-Zellen), focusEdges:[key], targetEdges:[key], strikeEdges:[key], nodes:[[r,c]],
 *      ops:[{ edge, to: "edge"|"cross"|"none" }] } oder null (gelöst). */
export function explainHint(p, edges, crosses = new Set()) {
  const n = p.n, g = geo(n), sol = new Set(p.solution);
  if (isSolved(p, edges)) return null;
  const NUM = ["keine", "eine", "zwei", "drei", "vier"];
  const base = (o) => ({ cells: [], focusEdges: [], targetEdges: [], strikeEdges: [], nodes: [], ...o });
  const deg = nodeDegrees(p, edges), cnt = cellCounts(p, edges);
  const isFree = (k) => !edges.has(k) && !crosses.has(k);
  const cellKeys = (r, c) => [0, 1, 2, 3].map((j) => g.keys[g.cellEdges[(r * n + c) * 4 + j]]);
  const nodeKeys = (nd) => { const out = []; for (let i = 0; i < g.nodeDeg[nd]; i++) out.push(g.keys[g.nodeEdges[nd * 4 + i]]); return out; };
  // 1) falsche Linien
  const wrongE = [...edges].filter((k) => !sol.has(k));
  if (wrongE.length) {
    const one = wrongE.length === 1; let why = null, cells = [], nodes = [];
    for (const k of wrongE) {
      if (why) break; const e = g.idx(k);
      for (let i = 0; i < 2 && !why; i++) { const ci = g.edgeCells[e * 2 + i]; if (ci < 0) continue; const r = Math.floor(ci / n), c = ci % n;
        if (p.clues[r][c] >= 0 && cnt[r][c] > p.clues[r][c]) { why = `Die ${p.clues[r][c]} hat schon ${NUM[cnt[r][c]] || cnt[r][c]} Kante${cnt[r][c] === 1 ? "" : "n"} – mehr als ihre Zahl erlaubt.`; cells = [[r, c]]; } }
      for (let i = 0; i < 2 && !why; i++) { const nd = g.edgeNodes[e * 2 + i];
        if (deg[nd] >= 3) { why = "An diesem Punkt treffen sich drei Linien – der Rundweg darf sich nicht verzweigen."; nodes = [g.nodeRC(nd)]; } }
    }
    why ||= one ? "Diese Linie gehört nicht zum Rundweg – mit ihr lässt sich keine geschlossene Schleife bilden, die zu allen Zahlen passt."
      : "Diese Linien gehören nicht zum Rundweg – mit ihnen lässt sich keine geschlossene Schleife bilden, die zu allen Zahlen passt.";
    return base({ kind: "wrong", text: `${why}\n${one ? "Entfernen Sie die gestreifte Linie." : "Entfernen Sie die gestreiften Linien."}`, cells, nodes, strikeEdges: wrongE, ops: wrongE.map((k) => ({ edge: k, to: "none" })) });
  }
  const wrongX = [...crosses].filter((k) => sol.has(k));
  if (wrongX.length) {
    const one = wrongX.length === 1;
    return base({ kind: "wrongcross", text: `${one ? "Dieses × sperrt eine Kante" : "Diese × sperren Kanten"}, die der Rundweg braucht – sonst lässt er sich nicht passend zu den Zahlen schließen.\n${one ? "Entfernen Sie das gestreifte ×." : "Entfernen Sie die gestreiften ×."}`, strikeEdges: wrongX, ops: wrongX.map((k) => ({ edge: k, to: "none" })) });
  }
  const add = (ks) => ks.map((k) => ({ edge: k, to: "edge" })), cross = (ks) => ks.map((k) => ({ edge: k, to: "cross" }));
  const okAdd = (ks) => ks.every((k) => sol.has(k)), okCross = (ks) => ks.every((k) => !sol.has(k));
  // 2) 0 → alle vier Kanten ×
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (p.clues[r][c] !== 0) continue; const t = cellKeys(r, c).filter(isFree);
    if (t.length && okCross(t)) return base({ kind: "zero", text: `Um eine 0 herum liegen keine Kanten.\nMarkieren Sie ${t.length === 4 ? "alle vier" : t.length === 1 ? "die letzte" : "die übrigen"} mit ×.`, cells: [[r, c]], targetEdges: t, ops: cross(t) });
  }
  // 3) 3 in der Ecke → beide Außenkanten
  for (const [r, c] of [[0, 0], [0, n - 1], [n - 1, 0], [n - 1, n - 1]]) {
    if (p.clues[r][c] !== 3) continue;
    const outer = [g.keys[g.h(r === 0 ? 0 : n, c)], g.keys[g.v(r, c === 0 ? 0 : n)]], t = outer.filter((k) => !edges.has(k));
    if (t.length && okAdd(t)) return base({ kind: "corner3", text: `Eine 3 in der Ecke nutzt beide Außenkanten.\nZeichnen Sie ${t.length === 2 ? "die beiden hervorgehobenen Kanten" : "die hervorgehobene Kante"}.`, cells: [[r, c]], targetEdges: t, ops: add(t) });
  }
  // 4) Punkt mit einer Linie und nur einem freien Weg
  for (let nd = 0; nd < g.N; nd++) {
    if (deg[nd] !== 1) continue; const ks = nodeKeys(nd), fr = ks.filter(isFree);
    if (fr.length === 1 && okAdd(fr)) return base({ kind: "continue", text: "Dieser Punkt hat schon eine Linie und nur noch einen freien Weg.\nDie Linie muss hier weitergehen.", nodes: [g.nodeRC(nd)], focusEdges: ks.filter((k) => edges.has(k)), targetEdges: fr, ops: add(fr) });
  }
  // 5) Zahl, die alle freien Kanten braucht
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const v = p.clues[r][c]; if (v <= 0) continue; const fr = cellKeys(r, c).filter(isFree);
    if (fr.length && cnt[r][c] + fr.length === v && okAdd(fr)) {
      const text = cnt[r][c] === 0 ? `Die ${v} hat nur noch ${NUM[fr.length]} freie Kante${fr.length === 1 ? "" : "n"}.\n${fr.length === 1 ? "Sie gehört" : fr.length === 2 ? "Beide gehören" : "Alle gehören"} zum Rundweg.`
        : `Die ${v} hat schon ${NUM[cnt[r][c]]} Kante${cnt[r][c] > 1 ? "n" : ""} und nur noch ${NUM[fr.length]} freie.\n${fr.length === 1 ? "Sie gehört" : "Alle gehören"} zum Rundweg.`;
      return base({ kind: "clueall", text, cells: [[r, c]], focusEdges: cellKeys(r, c).filter((k) => edges.has(k)), targetEdges: fr, ops: add(fr) });
    }
  }
  // 6) Zahl ist erfüllt → übrige Kanten ×
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const v = p.clues[r][c]; if (v <= 0) continue; const fr = cellKeys(r, c).filter(isFree);
    if (fr.length && cnt[r][c] === v && okCross(fr)) return base({ kind: "cluefull", text: `Die ${v} hat schon ${v === 1 ? "ihre Kante" : `ihre ${NUM[v]} Kanten`}.\nMarkieren Sie die übrigen mit ×.`, cells: [[r, c]], focusEdges: cellKeys(r, c).filter((k) => edges.has(k)), targetEdges: fr, ops: cross(fr) });
  }
  // 7) Punkt mit zwei Linien → übrige Wege ×; Punkt ohne Linie mit nur einem freien Weg → ×
  for (let nd = 0; nd < g.N; nd++) {
    const ks = nodeKeys(nd), fr = ks.filter(isFree);
    if (deg[nd] === 2 && fr.length && okCross(fr)) return base({ kind: "node2", text: "Durch diesen Punkt laufen schon zwei Linien – der Rundweg geht hier nicht weiter.\nMarkieren Sie die übrigen Wege mit ×.", nodes: [g.nodeRC(nd)], focusEdges: ks.filter((k) => edges.has(k)), targetEdges: fr, ops: cross(fr) });
    if (deg[nd] === 0 && fr.length === 1 && okCross(fr)) return base({ kind: "deadend", text: "Von diesem Punkt führt nur noch ein Weg weg – eine Linie hier wäre eine Sackgasse.\nMarkieren Sie ihn mit ×.", nodes: [g.nodeRC(nd)], targetEdges: fr, ops: cross(fr) });
  }
  // 8) Zwei benachbarte 3er → gemeinsame Kante und beide äußeren Parallelkanten
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (p.clues[r][c] !== 3) continue;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc; if (r2 >= n || c2 >= n || p.clues[r2][c2] !== 3) continue;
      const ks = dr ? [g.keys[g.h(r, c)], g.keys[g.h(r + 1, c)], g.keys[g.h(r + 2, c)]] : [g.keys[g.v(r, c)], g.keys[g.v(r, c + 1)], g.keys[g.v(r, c + 2)]];
      const t = ks.filter((k) => !edges.has(k));
      if (t.length && t.every(isFree) && okAdd(t)) return base({ kind: "33", text: "Zwei 3er nebeneinander: Die Linie muss zwischen ihnen hindurch und an beiden Außenseiten entlang laufen.\nZeichnen Sie die hervorgehobenen Kanten.", cells: [[r, c], [r2, c2]], targetEdges: t, ops: add(t) });
    }
  }
  // 9) Ecke einer 1 oder 3: Wie viele Kanten der Zahl treffen sich an diesem Punkt?
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const v = p.clues[r][c]; if (v !== 1 && v !== 3) continue;
    const ck = cellKeys(r, c); if (!ck.some(isFree)) continue;
    // Ecken: [Knoten, Kanten der Zelle an diesem Knoten]
    const [top, bottom, left, right] = ck;
    const corners = [[r * (n + 1) + c, [top, left]], [r * (n + 1) + c + 1, [top, right]], [(r + 1) * (n + 1) + c, [bottom, left]], [(r + 1) * (n + 1) + c + 1, [bottom, right]]];
    for (const [nd, at] of corners) {
      if (!at.every(isFree)) continue;
      const outer = nodeKeys(nd).filter((k) => !at.includes(k));
      const rest = ck.filter((k) => !at.includes(k)), t = rest.filter(isFree);
      if (!t.length) continue;
      const lineIn = deg[nd] === 1 && outer.every((k) => edges.has(k) || crosses.has(k));
      const closed = deg[nd] === 0 && outer.every((k) => crosses.has(k));
      if (!lineIn && !closed) continue;
      const pt = [g.nodeRC(nd)], foc = outer.filter((k) => edges.has(k));
      if (lineIn && v === 1 && okCross(t)) return base({ kind: "corner1", text: "Die Linie muss an diesem Punkt in eine Kante der 1 weiterlaufen – damit ist die 1 dort schon verbraucht.\nMarkieren Sie die beiden gegenüberliegenden Kanten mit ×.", cells: [[r, c]], nodes: pt, focusEdges: foc, targetEdges: t, ops: cross(t) });
      if (lineIn && v === 3 && okAdd(t)) return base({ kind: "corner3in", text: "Die Linie läuft an diesem Punkt in genau eine Kante der 3 weiter. Die übrigen zwei Kanten braucht die 3 dann beide.\nZeichnen Sie die hervorgehobenen Kanten.", cells: [[r, c]], nodes: pt, focusEdges: foc, targetEdges: t, ops: add(t) });
      if (closed && v === 1 && okCross(at)) return base({ kind: "cornerout1", text: "An diesem Punkt kann die Linie nur um die Ecke der 1 laufen – das wären zwei Kanten, zu viele für eine 1.\nMarkieren Sie beide Kanten an dieser Ecke mit ×.", cells: [[r, c]], nodes: pt, targetEdges: at, ops: cross(at) });
      if (closed && v === 3 && okAdd(at)) return base({ kind: "cornerout3", text: "An diesem Punkt kann die Linie nur um die Ecke der 3 laufen – ohne diese Ecke blieben der 3 nur zwei Kanten.\nZeichnen Sie beide Kanten an dieser Ecke.", cells: [[r, c]], nodes: pt, targetEdges: at, ops: add(at) });
    }
  }
  // 10) Kante würde den Weg vorzeitig zu einer Schleife schließen
  {
    const endOf = new Map(); // Knoten mit Grad 1 → anderes Ende desselben Wegstücks
    for (let nd = 0; nd < g.N; nd++) {
      if (deg[nd] !== 1 || endOf.has(nd)) continue;
      let cur = nd, prev = -1, len = 0;
      for (;;) {
        let nxt = -1; for (let i = 0; i < g.nodeDeg[cur]; i++) { const f = g.nodeEdges[cur * 4 + i]; if (f !== prev && edges.has(g.keys[f])) { nxt = f; break; } }
        if (nxt < 0) break;
        cur = g.edgeNodes[nxt * 2] === cur ? g.edgeNodes[nxt * 2 + 1] : g.edgeNodes[nxt * 2]; prev = nxt; len++;
        if (len > edges.size) break;
      }
      if (cur !== nd && deg[cur] === 1) { endOf.set(nd, { other: cur, len }); endOf.set(cur, { other: nd, len }); }
    }
    for (const [a, { other: b, len }] of endOf) {
      if (a > b) continue;
      for (let i = 0; i < g.nodeDeg[a]; i++) {
        const f = g.nodeEdges[a * 4 + i], k = g.keys[f]; if (!isFree(k)) continue;
        const o = g.edgeNodes[f * 2] === a ? g.edgeNodes[f * 2 + 1] : g.edgeNodes[f * 2]; if (o !== b) continue;
        // Schließen wäre nur richtig, wenn danach alles passt
        if (len === edges.size) { const test = new Set(edges); test.add(k); if (isSolved(p, test)) continue; }
        if (okCross([k])) return base({ kind: "loop", text: "Diese Kante würde den Weg zu einer Schleife schließen – aber der Rundweg ist damit noch nicht fertig.\nMarkieren Sie sie mit ×.", nodes: [g.nodeRC(a), g.nodeRC(b)], targetEdges: [k], ops: cross([k]) });
      }
    }
  }
  // 11) Rückfall: Lösungskante, bevorzugt am gezeichneten Weg
  const missing = p.solution.filter((k) => !edges.has(k));
  const pick = missing.find((k) => { const e = g.idx(k); return deg[g.edgeNodes[e * 2]] > 0 || deg[g.edgeNodes[e * 2 + 1]] > 0; }) || missing[0];
  if (!pick) return null;
  return base({ kind: "fallback", text: "Wer weiter vorausdenkt, sieht: Nur mit dieser Kante lässt sich die Schleife passend zu allen Zahlen schließen.\nZeichnen Sie die hervorgehobene Kante.", targetEdges: [pick], ops: add([pick]) });
}

/** true, wenn das Rätsel vom leeren Stand aus nur mit begründeten Tipps (nie „fallback“) lösbar ist. Tipps werden wie bei „Anzeigen“ angewandt. */
export function logicSolvable(p) {
  const edges = new Set(), crosses = new Set(), E = geo(p.n).E;
  for (let step = 0; step <= E + 5; step++) {
    const h = explainHint(p, edges, crosses);
    if (!h) return true;
    if (h.kind === "fallback" || h.kind === "wrong" || h.kind === "wrongcross") return false;
    for (const { edge: k, to } of h.ops) { edges.delete(k); crosses.delete(k); if (to === "edge") edges.add(k); else if (to === "cross") crosses.add(k); }
  }
  return false;
}
