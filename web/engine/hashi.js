// Hashiwokakero („Brücken“) – Generator, Solver, Status- und Tipp-Logik. Pure JS, kein DOM.
import { Rng, resolveDiff, DIRS4, grid } from "./core.js";

const SIZE = { leicht: 7, mittel: 9, schwer: 11, experte: 13 };
const DENSITY = { leicht: 0.22, mittel: 0.24, schwer: 0.25, experte: 0.26 };
const EXTRA_P = { leicht: 0.25, mittel: 0.3, schwer: 0.35, experte: 0.4 };

const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** All straight-line, mutually visible island pairs. Returns { edges:[{a,b,cells:[r*64+c]}], byPair:Map, cross:[[edgeIdx]] , at:grid(islandIdx|-1) }. */
export function buildEdges(p) {
  const n = p.n, at = grid(n, -1);
  p.islands.forEach((is, i) => { at[is.r][is.c] = i; });
  const edges = [], byPair = new Map(), cellEdges = new Map();
  for (let i = 0; i < p.islands.length; i++) {
    const { r, c } = p.islands[i];
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const cells = []; let rr = r + dr, cc = c + dc;
      while (rr < n && cc < n && at[rr][cc] < 0) { cells.push(rr * 64 + cc); rr += dr; cc += dc; }
      if (rr < n && cc < n) {
        const j = at[rr][cc], idx = edges.length;
        edges.push({ a: i, b: j, cells }); byPair.set(pairKey(i, j), idx);
        for (const k of cells) { if (!cellEdges.has(k)) cellEdges.set(k, []); cellEdges.get(k).push(idx); }
      }
    }
  }
  const cross = edges.map(() => []);
  for (const list of cellEdges.values()) if (list.length > 1) for (const e of list) for (const f of list) if (e !== f && !cross[e].includes(f)) cross[e].push(f);
  return { edges, byPair, cross, at };
}

/** Counts solutions (≤ limit). Returns -1 if the node budget was exceeded. */
export function countSolutions(p, limit = 2, budget = 150000) {
  const { edges, cross } = buildEdges(p);
  const N = p.islands.length, E = edges.length, nums = p.islands.map((x) => x.num);
  const inc = Array.from({ length: N }, () => []);
  edges.forEach((e, i) => { inc[e.a].push(i); inc[e.b].push(i); });
  const LO = [0, 0, 1, 0, 2, 0, 1, 0], HI = [0, 0, 1, 1, 2, 2, 2, 2]; // bitmask → min/max value
  let nodes = 0, found = 0, over = false;

  const propagate = (dom) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (let e = 0; e < E; e++) {
        if (!dom[e]) return false;
        if (LO[dom[e]] > 0) for (const f of cross[e]) { if (dom[f] & 6) { dom[f] &= 1; changed = true; } if (!dom[f]) return false; }
      }
      for (let i = 0; i < N; i++) {
        let sLo = 0, sHi = 0;
        for (const e of inc[i]) { sLo += LO[dom[e]]; sHi += HI[dom[e]]; }
        if (sLo > nums[i] || sHi < nums[i]) return false;
        for (const e of inc[i]) {
          const lo = LO[dom[e]], hi = HI[dom[e]]; let d = dom[e];
          for (let v = 0; v <= 2; v++) if ((d >> v) & 1) { if (v + sLo - lo > nums[i] || v + sHi - hi < nums[i]) d &= ~(1 << v); }
          if (d !== dom[e]) { if (!d) return false; dom[e] = d; changed = true; }
        }
      }
    }
    return true;
  };
  const connected = (dom) => {
    const seen = new Uint8Array(N), st = [0]; seen[0] = 1; let cnt = 1;
    while (st.length) { const i = st.pop(); for (const e of inc[i]) if (LO[dom[e]] > 0) { const j = edges[e].a === i ? edges[e].b : edges[e].a; if (!seen[j]) { seen[j] = 1; cnt++; st.push(j); } } }
    return cnt === N;
  };
  const rec = (dom) => {
    if (over || ++nodes > budget) { over = true; return; }
    if (!propagate(dom)) return;
    let pick = -1, best = 9;
    for (let e = 0; e < E; e++) { const sz = (dom[e] & 1) + ((dom[e] >> 1) & 1) + ((dom[e] >> 2) & 1); if (sz > 1 && sz < best) { best = sz; pick = e; } }
    if (pick < 0) { if (connected(dom)) found++; return; }
    for (let v = 2; v >= 0; v--) {
      if (!((dom[pick] >> v) & 1)) continue;
      const d2 = dom.slice(); d2[pick] = 1 << v; rec(d2);
      if (found >= limit || over) return;
    }
  };
  const dom = new Uint8Array(E).fill(7);
  // connectivity-implied shortcuts: 1–1 never joined, 2–2 never doubly joined (if more than two islands)
  if (N > 2) edges.forEach((e, i) => { if (nums[e.a] === 1 && nums[e.b] === 1) dom[i] = 1; else if (nums[e.a] === 2 && nums[e.b] === 2) dom[i] &= 3; });
  if (N === 0) return 0;
  rec(dom);
  return over ? -1 : found;
}

/** bridges: [{a,b,count}] → { counts, over:Set, crossing, connected, invalid } */
export function status(p, bridges) {
  const { edges, byPair } = buildEdges(p);
  const N = p.islands.length, counts = new Array(N).fill(0), over = new Set();
  const used = new Map(); let crossing = false, invalid = false;
  const adj = Array.from({ length: N }, () => []);
  for (const b of bridges) {
    if (!b.count) continue;
    const ei = byPair.get(pairKey(b.a, b.b));
    if (ei == null) { invalid = true; continue; }
    counts[b.a] += b.count; counts[b.b] += b.count; adj[b.a].push(b.b); adj[b.b].push(b.a);
    for (const k of edges[ei].cells) { if (used.has(k) && used.get(k) !== ei) crossing = true; used.set(k, ei); }
  }
  counts.forEach((c, i) => { if (c > p.islands[i].num) over.add(i); });
  const seen = new Uint8Array(N), st = [0]; seen[0] = 1; let cnt = 1;
  while (st.length) { const i = st.pop(); for (const j of adj[i]) if (!seen[j]) { seen[j] = 1; cnt++; st.push(j); } }
  return { counts, over, crossing, connected: cnt === N, invalid };
}

export function isSolved(p, bridges) {
  const s = status(p, bridges);
  return !s.invalid && !s.crossing && s.connected && s.counts.every((c, i) => c === p.islands[i].num);
}

/** Cells (r*64+c) between two islands if they are mutually visible in a straight line, else null. */
export function segment(p, a, b) {
  const { edges, byPair } = buildEdges(p);
  const ei = byPair.get(pairKey(a, b)); return ei == null ? null : edges[ei].cells;
}

const place = (p, is) => {
  const n = p.n, edgeR = is.r === 0 || is.r === n - 1, edgeC = is.c === 0 || is.c === n - 1;
  return edgeR && edgeC ? "in der Ecke" : edgeR || edgeC ? "am Rand" : `in Zeile ${is.r + 1}`;
};

/** Suggests { a, b, count, reason } or null when solved. */
export function findHint(p, bridges) {
  const sol = new Map(p.solution.map((s) => [pairKey(s.a, s.b), s.count]));
  const cur = new Map(); for (const b of bridges) if (b.count) cur.set(pairKey(b.a, b.b), b.count);
  // 1) wrong bridge
  for (const b of bridges) {
    if (!b.count) continue;
    const want = sol.get(pairKey(b.a, b.b)) || 0;
    if (b.count > want) return { a: b.a, b: b.b, count: want, reason: want ? "Hier liegt eine Brücke zu viel" : "Diese Brücke gehört nicht zur Lösung" };
  }
  if (isSolved(p, bridges)) return null;
  // 2) island where every remaining bridge is forced
  const { edges, cross } = buildEdges(p);
  const st = status(p, bridges), N = p.islands.length;
  const val = edges.map((e) => cur.get(pairKey(e.a, e.b)) || 0);
  const inc = Array.from({ length: N }, () => []); edges.forEach((e, i) => { inc[e.a].push(i); inc[e.b].push(i); });
  for (let i = 0; i < N; i++) {
    const is = p.islands[i], rem = is.num - st.counts[i];
    if (rem <= 0) continue;
    const caps = [];
    for (const e of inc[i]) {
      const j = edges[e].a === i ? edges[e].b : edges[e].a;
      let cap = Math.min(2 - val[e], rem, p.islands[j].num - st.counts[j]);
      if (cross[e].some((f) => val[f] > 0)) cap = 0;
      if (N > 2 && !val[e]) { if (is.num === 1 && p.islands[j].num === 1) cap = 0; if (is.num === 2 && p.islands[j].num === 2) cap = Math.min(cap, 1); }
      caps.push([e, Math.max(0, cap)]);
    }
    const sum = caps.reduce((s, [, c]) => s + c, 0), free = caps.filter(([, c]) => c > 0);
    if (sum !== rem) continue;
    for (const [e, cap] of free) {
      const want = sol.get(pairKey(edges[e].a, edges[e].b)) || 0;
      if (want !== val[e] + cap) continue; // safety – should not happen
      const reason = free.length === 1 ? `Die ${is.num} ${place(p, is)} hat nur noch einen freien Nachbarn` : `Die ${is.num} ${place(p, is)} braucht zu jedem freien Nachbarn ${cap === 2 ? "zwei Brücken" : "eine Brücke"}`;
      return { a: edges[e].a, b: edges[e].b, count: want, reason };
    }
  }
  // 3) fallback: any missing solution bridge
  for (const s of p.solution) { const have = cur.get(pairKey(s.a, s.b)) || 0; if (have < s.count) return { a: s.a, b: s.b, count: s.count, reason: "Hier fehlt eine Brücke" }; }
  return null;
}

function build(n, target, extraP, rng) {
  const at = grid(n, -1), occ = grid(n, 0), islands = [], bridges = new Map();
  const addIsland = (r, c) => { at[r][c] = islands.length; islands.push({ r, c, num: 0 }); return islands.length - 1; };
  const addBridge = (a, b, cnt, cells) => { const k = pairKey(a, b); bridges.set(k, (bridges.get(k) || 0) + cnt); islands[a].num += cnt; islands[b].num += cnt; for (const [r, c] of cells) occ[r][c] = 1; };
  const adjacentIsland = (r, c) => DIRS4.some(([dr, dc]) => { const rr = r + dr, cc = c + dc; return rr >= 0 && cc >= 0 && rr < n && cc < n && at[rr][cc] >= 0; });
  addIsland(1 + rng.int(n - 2), 1 + rng.int(n - 2));
  for (let tries = 0; islands.length < target && tries < target * 60; tries++) {
    const i = rng.int(islands.length), [dr, dc] = rng.pick(DIRS4);
    const d = rng.chance(0.7) ? 2 + rng.int(2) : 2 + rng.int(n - 2);
    const { r, c } = islands[i]; const cells = []; let ok = true;
    for (let k = 1; k < d && ok; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || cc < 0 || rr >= n || cc >= n || at[rr][cc] >= 0 || occ[rr][cc]) ok = false; else cells.push([rr, cc]); }
    const tr = r + dr * d, tc = c + dc * d;
    if (!ok || tr < 0 || tc < 0 || tr >= n || tc >= n || at[tr][tc] >= 0 || occ[tr][tc] || adjacentIsland(tr, tc)) continue;
    const j = addIsland(tr, tc);
    addBridge(i, j, rng.chance(0.5) ? 2 : 1, cells);
  }
  // extra bridges between visible islands (no crossing)
  const p = { n, islands };
  const { edges } = buildEdges(p);
  for (const e of rng.shuffle(edges.slice())) {
    if (bridges.has(pairKey(e.a, e.b)) || !rng.chance(extraP)) continue;
    const cells = e.cells.map((k) => [Math.floor(k / 64), k % 64]);
    if (cells.some(([r, c]) => occ[r][c])) continue;
    const cnt = rng.chance(0.5) ? 2 : 1;
    if (islands[e.a].num + cnt > 8 || islands[e.b].num + cnt > 8) continue;
    addBridge(e.a, e.b, cnt, cells);
  }
  const solution = [...bridges].map(([k, count]) => { const [a, b] = k.split("-").map(Number); return { a, b, count }; });
  return { islands, solution };
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff], target = Math.round(n * n * DENSITY[diff]);
  for (;;) {
    const { islands, solution } = build(n, target, EXTRA_P[diff], rng);
    if (islands.length < target * 0.8) continue;
    const p = { kind: "hashi", n, diff, islands, solution };
    if (countSolutions(p, 2, 60000) === 1) return p;
  }
}

/** Erklärter Tipp (LinkedIn-Stil).
 *  → { kind, text, focus:[islandIdx], target:[islandIdx], set:[{a,b,count}], remove:boolean } oder null (gelöst). */
export function explainHint(p, bridges) {
  const sol = new Map(p.solution.map((s) => [pairKey(s.a, s.b), s.count]));
  const cur = new Map(); for (const b of bridges) if (b.count) cur.set(pairKey(b.a, b.b), (cur.get(pairKey(b.a, b.b)) || 0) + b.count);
  const { edges, cross } = buildEdges(p);
  const N = p.islands.length, st = status(p, bridges);
  const brk = (k) => (k === 1 ? "eine Brücke" : "zwei Brücken");
  const word = (k) => ["keine", "einen", "zwei", "drei", "vier"][k] || String(k);
  const where = (is) => { const pl = place(p, is); return pl.startsWith("in Zeile") ? "" : ` ${pl}`; };
  // 1) falsche Brücken
  const wrong = [];
  for (const [k, c] of cur) { const want = sol.get(k) || 0; if (c > want) { const [a, b] = k.split("-").map(Number); wrong.push({ a, b, count: want }); } }
  if (wrong.length) {
    const one = wrong.length === 1, w = wrong[0];
    const overI = [w.a, w.b].find((i) => st.counts[i] > p.islands[i].num);
    const why = overI != null ? `Die ${p.islands[overI].num} hat schon ${st.counts[overI]} Brücken – mehr als ihre Zahl erlaubt.`
      : one ? (w.count ? "Zwischen diesen Inseln liegt eine Brücke zu viel – so lassen sich die übrigen Inseln nicht mehr passend verbinden." : "Diese Brücke gehört nicht zur Lösung – mit ihr lassen sich die übrigen Inseln nicht mehr passend verbinden.")
        : "Diese Brücken gehören nicht zur Lösung – mit ihnen lassen sich die übrigen Inseln nicht mehr passend verbinden.";
    return { kind: "wrong", remove: true, text: `${why}\n${one ? "Entfernen Sie die gestreifte Brücke." : "Entfernen Sie die gestreiften Brücken."}`, focus: overI != null ? [overI] : [], target: [], set: wrong };
  }
  if (isSolved(p, bridges)) return null;
  const val = edges.map((e) => cur.get(pairKey(e.a, e.b)) || 0);
  const inc = Array.from({ length: N }, () => []); edges.forEach((e, i) => { inc[e.a].push(i); inc[e.b].push(i); });
  const other = (e, i) => (edges[e].a === i ? edges[e].b : edges[e].a);
  const capsOf = (i) => {
    const rem = p.islands[i].num - st.counts[i];
    return inc[i].map((e) => {
      const j = other(e, i);
      let cap = Math.min(2 - val[e], rem, p.islands[j].num - st.counts[j]);
      if (cross[e].some((f) => val[f] > 0)) cap = 0;
      if (N > 2 && !val[e]) { if (p.islands[i].num === 1 && p.islands[j].num === 1) cap = 0; if (p.islands[i].num === 2 && p.islands[j].num === 2) cap = Math.min(cap, 1); }
      return [e, Math.max(0, cap)];
    });
  };
  const fits = (set) => set.every((s) => s.count <= (sol.get(pairKey(s.a, s.b)) || 0));
  // 2) Insel, deren restliche Brücken alle erzwungen sind
  const forced = [];
  for (let i = 0; i < N; i++) {
    const is = p.islands[i], rem = is.num - st.counts[i]; if (rem <= 0) continue;
    const caps = capsOf(i), free = caps.filter(([, c]) => c > 0), sum = free.reduce((s, [, c]) => s + c, 0);
    if (sum !== rem || !free.length) continue;
    const set = free.map(([e, c]) => ({ a: edges[e].a, b: edges[e].b, count: val[e] + c }));
    if (!fits(set)) continue;
    const tgt = free.map(([e]) => other(e, i)), k = free.length, fresh = st.counts[i] === 0;
    let text;
    if (k === 1) text = `Die ${is.num}${where(is)} hat nur ${fresh ? "einen möglichen Nachbarn" : "noch einen freien Nachbarn"}.\nVerbinden Sie sie ${free[0][1] === 2 ? "mit zwei Brücken " : ""}mit der hervorgehobenen Insel.`;
    else if (fresh && free.every(([, c]) => c === 2)) text = `Die ${is.num}${where(is)} hat nur ${word(k)} Nachbarn.\nSie braucht zu ${k === 2 ? "beiden" : `allen ${word(k)}`} je zwei Brücken.`;
    else if (free.every(([, c]) => c === 1)) text = `Die ${is.num}${where(is)} braucht noch ${brk(rem) === "eine Brücke" ? "eine Brücke" : `${rem} Brücken`} und hat genau ${word(k)} freie Nachbarn, die noch eine aufnehmen können.\nSie braucht zu jedem eine Brücke.`;
    else text = `Die ${is.num}${where(is)} braucht noch ${rem} Brücken – genau so viele passen noch zu ihren Nachbarn.\nSetzen Sie alle hervorgehobenen Brücken.`;
    forced.push({ kind: "forced", pr: k === 1 ? 0 : 1, text, focus: [i], target: tgt, set });
  }
  // 3) Mindestens eine Brücke zu jedem Nachbarn (Rest reicht sonst nicht)
  for (let i = 0; i < N; i++) {
    const is = p.islands[i], rem = is.num - st.counts[i]; if (rem <= 0) continue;
    const caps = capsOf(i), free = caps.filter(([, c]) => c > 0), sum = free.reduce((s, [, c]) => s + c, 0);
    if (sum <= rem) continue;
    const need = free.map(([e, c]) => [e, rem - (sum - c)]).filter(([, m]) => m > 0);
    if (!need.length) continue;
    const set = need.map(([e, m]) => ({ a: edges[e].a, b: edges[e].b, count: val[e] + m }));
    if (!fits(set)) continue;
    const tgt = need.map(([e]) => other(e, i)), all = need.length === free.length;
    const text = all
      ? `Die ${is.num}${where(is)} braucht noch ${rem} Brücken, hat aber nur ${word(free.length)} freie Nachbarn mit Platz für ${sum}.\nSie braucht zu ${free.length === 2 ? "beiden" : "jedem"} mindestens eine Brücke.`
      : `Die ${is.num}${where(is)} braucht noch ${rem} Brücken – ohne die hervorgehobene${need.length > 1 ? "n Inseln" : " Insel"} reichen die übrigen Nachbarn nicht aus.\nSetzen Sie dorthin mindestens eine Brücke.`;
    forced.push({ kind: "atleast", pr: 2, text, focus: [i], target: tgt, set });
  }
  if (forced.length) { forced.sort((x, y) => x.pr - y.pr); const { pr, ...h } = forced[0]; return { ...h, remove: false }; }
  // 4) Rückfall: fehlende Lösungsbrücke
  for (const s of p.solution) {
    const have = cur.get(pairKey(s.a, s.b)) || 0;
    if (have < s.count) return { kind: "fallback", remove: false, text: `Ohne ${s.count - have === 1 ? "diese Brücke" : "diese Brücken"} ließen sich nicht alle Inseln erfüllen und gleichzeitig zu einer Gruppe verbinden.\nVerbinden Sie die hervorgehobenen Inseln${s.count === 2 ? " mit zwei Brücken" : ""}.`, focus: [], target: [s.a, s.b], set: [{ a: s.a, b: s.b, count: s.count }] };
  }
  return null;
}
