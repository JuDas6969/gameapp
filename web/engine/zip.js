import { Rng, resolveDiff, DIRS4, edgeKey } from "./core.js";
const SIZE = { leicht: 5, mittel: 6, schwer: 7, experte: 8 };
const TARGET_WP = { leicht: 7, mittel: 7, schwer: 6, experte: 5 };
const WALLS = { leicht: 0, mittel: 2, schwer: 4, experte: 6 };

function backbitePath(n, rng) {
  let path = [];
  for (let r = 0; r < n; r++) { for (let i = 0; i < n; i++) path.push([r, r % 2 === 0 ? i : n - 1 - i]); }
  for (let t = 0; t < n * n * 10; t++) {
    if (rng.chance(0.5)) path.reverse();
    const [hr, hc] = path[0];
    const nbs = DIRS4.map(([dr, dc]) => [hr + dr, hc + dc]).filter(([r, c]) => r >= 0 && c >= 0 && r < n && c < n && !(r === path[1][0] && c === path[1][1]));
    const [nr, nc] = rng.pick(nbs);
    const i = path.findIndex(([r, c]) => r === nr && c === nc);
    const head = path.slice(0, i).reverse();
    path = head.concat(path.slice(i));
  }
  return path;
}

/** Solver over cell indices (r*n+c). walls: Set of edgeKey strings. */
export class Solver {
  constructor(n, walls) {
    this.n = n; this.total = n * n; this.adj = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const a = [];
      for (const [dr, dc] of DIRS4) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < n && cc < n && !walls.has(edgeKey(r, c, rr, cc))) a.push(rr * n + cc); }
      this.adj.push(a);
    }
  }
  /** waypoints: Map cellIdx -> number. Returns count (≤ limit) or -1 if budget exceeded. */
  countPaths(waypoints, limit = 2, budget = 400000) {
    const { n, total, adj } = this;
    const wp = new Int32Array(total); let k = 0, start = -1;
    for (const [cell, num] of waypoints) { wp[cell] = num; if (num > k) k = num; if (num === 1) start = cell; }
    if (start < 0) return 0;
    const visited = new Uint8Array(total), seen = new Int32Array(total);
    let nodes = 0, found = 0, stamp = 0;
    const reachableAll = (cur, remaining) => {
      stamp++; const stack = [cur]; seen[cur] = stamp; let cnt = 0;
      while (stack.length) { const x = stack.pop(); for (const y of adj[x]) if (!visited[y] && seen[y] !== stamp) { seen[y] = stamp; stack.push(y); cnt++; } }
      return cnt === remaining;
    };
    const deadEndFree = (cur) => {
      for (let cell = 0; cell < total; cell++) {
        if (visited[cell]) continue;
        let free = 0, adjHead = false;
        for (const y of adj[cell]) { if (y === cur) adjHead = true; else if (!visited[y]) free++; }
        if (free + (adjHead ? 1 : 0) < (wp[cell] === k ? 1 : 2)) return false;
      }
      return true;
    };
    let over = false;
    const rec = (cur, depth, nextWP) => {
      if (over) return;
      if (++nodes > budget) { over = true; return; }
      if (depth === total) { if (nextWP > k) found++; return; }
      if (!reachableAll(cur, total - depth) || !deadEndFree(cur)) return;
      for (const nb of adj[cur]) {
        if (visited[nb]) continue;
        const w = wp[nb];
        if (w !== 0 && w !== nextWP) continue;
        if (w === 0 && nextWP === k && depth + 1 === total) continue;
        visited[nb] = 1; rec(nb, depth + 1, w ? nextWP + 1 : nextWP); visited[nb] = 0;
        if (found >= limit || over) return;
      }
    };
    visited[start] = 1; rec(start, 1, 2);
    return over ? -1 : found;
  }
}

/** Legal-step check for the UI. path: array of [r,c]. Returns null (ok) or German error. */
export function stepError(p, path, r, c) {
  const wpAt = (rr, cc) => p.waypoints[rr * p.n + cc] || 0;
  if (!path.length) return wpAt(r, c) === 1 ? null : "Starte bei 1";
  const [lr, lc] = path[path.length - 1];
  if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return "Nicht benachbart";
  if (p.walls.includes(edgeKey(lr, lc, r, c))) return "Wand";
  if (path.some(([a, b]) => a === r && b === c)) return "Schon besucht";
  const w = wpAt(r, c);
  if (w) { let seen = 0; for (const [a, b] of path) seen = Math.max(seen, wpAt(a, b)); if (w !== seen + 1) return "Falsche Reihenfolge"; }
  return null;
}
export function isSolved(p, path) {
  if (path.length !== p.n * p.n) return false;
  const seen = new Set(); let expect = 1;
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]; const k = r * p.n + c;
    if (seen.has(k)) return false; seen.add(k);
    if (i > 0) { const [pr, pc] = path[i - 1]; if (Math.abs(pr - r) + Math.abs(pc - c) !== 1 || p.walls.includes(edgeKey(pr, pc, r, c))) return false; }
    const w = p.waypoints[k] || 0; if (w) { if (w !== expect) return false; expect++; }
  }
  return expect === p.maxNumber + 1;
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff];
  for (;;) {
    const path = backbitePath(n, rng);
    const pos = new Int32Array(n * n); path.forEach(([r, c], i) => { pos[r * n + c] = i; });
    const cand = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (r + 1 < n && Math.abs(pos[r * n + c] - pos[(r + 1) * n + c]) !== 1) cand.push(edgeKey(r, c, r + 1, c));
      if (c + 1 < n && Math.abs(pos[r * n + c] - pos[r * n + c + 1]) !== 1) cand.push(edgeKey(r, c, r, c + 1));
    }
    const walls = new Set(rng.shuffle(cand).slice(0, WALLS[diff]));
    const solver = new Solver(n, walls);
    let idxs = []; for (let i = 0; i < n * n; i += 3) idxs.push(i); if (idxs[idxs.length - 1] !== n * n - 1) idxs.push(n * n - 1);
    const wps = (ix) => new Map(ix.map((i, j) => [path[i][0] * n + path[i][1], j + 1]));
    if (solver.countPaths(wps(idxs)) !== 1) continue;
    for (const i of rng.shuffle(idxs.slice(1, -1))) {
      if (idxs.length <= TARGET_WP[diff]) break;
      const trial = idxs.filter((x) => x !== i);
      if (solver.countPaths(wps(trial)) === 1) idxs = trial;
    }
    const waypoints = {}; for (const [cell, num] of wps(idxs)) waypoints[cell] = num;
    return { kind: "zip", n, diff, waypoints, maxNumber: idxs.length, walls: [...walls], solution: path };
  }
}
