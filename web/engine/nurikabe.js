// Nurikabe („Inseln“) – Generator, Solver (Eindeutigkeit), Konflikt- und Tipp-Logik. Kein DOM.
// Puzzle: { kind:"nurikabe", n, diff, clues: number[][] (0 = keine Zahl), solution: number[][] (1 = Wasser, 0 = Insel) }
// Spielzustand g: 0 unbekannt, 1 Wasser, 2 Insel-Markierung.
import { Rng, resolveDiff, DIRS4, key, grid } from "./core.js";

const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 10 };
const MAX_ISLAND = 6;
const ISO = 0.5; // Wahrscheinlichkeit, isolierende Wasserzellen (→ 1er-Inseln) trotzdem zuzulassen
const BUDGET = 60000; // Solver-Knoten pro Eindeutigkeitsprüfung

// ---------- Hilfen ----------
const neigh = (n, i) => {
  const r = Math.floor(i / n), c = i % n, out = [];
  if (r > 0) out.push(i - n); if (r < n - 1) out.push(i + n); if (c > 0) out.push(i - 1); if (c < n - 1) out.push(i + 1);
  return out;
};
const buildNeigh = (n) => Array.from({ length: n * n }, (_, i) => neigh(n, i));
const buildBlocks = (n) => { const b = []; for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++) b.push([r * n + c, r * n + c + 1, (r + 1) * n + c, (r + 1) * n + c + 1]); return b; };

/** Alle zusammenhängenden Zellmengen der Größe k, die `start` enthalten und nur `allowed`-Zellen nutzen. */
function shapesFrom(start, k, allowed, NB) {
  let level = [[start]];
  for (let s = 1; s < k; s++) {
    const seen = new Set(), next = [];
    for (const sh of level) {
      const inSh = new Set(sh);
      for (const cell of sh) for (const nb of NB[cell]) {
        if (inSh.has(nb) || !allowed[nb]) continue;
        const ns = [...sh, nb].sort((a, b) => a - b), k2 = ns.join(",");
        if (seen.has(k2)) continue; seen.add(k2); next.push(ns);
      }
    }
    level = next;
  }
  return level;
}

/** Solver: Backtracking über Hinweise (Insel-Formen) mit Pruning (2×2-Wasser, Wasser-Zusammenhang, Formen ohne Platz).
 *  Rückgabe { count (max. limit, -1 = Budget erschöpft), sols: Int16Array[] (Insel-Index je Zelle, -1 = Wasser), clueCells }. */
export function solve(n, clues, limit = 2) {
  const N = n * n, NB = buildNeigh(n), BLOCKS = buildBlocks(n);
  const clueAt = new Int16Array(N).fill(-1), list = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (clues[r][c] > 0) { clueAt[r * n + c] = list.length; list.push({ cell: r * n + c, k: clues[r][c] }); }
  const C = list.length;
  const empty = { count: 0, sols: [], clueCells: list.map((x) => x.cell) };
  if (C === 0) return empty;
  // erlaubte Zellen pro Hinweis: keine fremde Zahl, nicht orthogonal neben fremder Zahl
  for (let j = 0; j < C; j++) {
    const allowed = new Uint8Array(N).fill(1);
    for (let i = 0; i < N; i++) if (clueAt[i] >= 0 && clueAt[i] !== j) { allowed[i] = 0; for (const nb of NB[i]) allowed[nb] = 0; }
    allowed[list[j].cell] = 1;
    const shapes = shapesFrom(list[j].cell, list[j].k, allowed, NB);
    list[j].shapes = shapes;
    if (!shapes.length) return empty;
  }
  const owner = new Int16Array(N).fill(-1), adj = new Uint8Array(N); // adj: Anzahl angrenzender Inselzellen
  const placed = new Uint8Array(C);
  let nodes = 0, found = 0, aborted = false; const sols = [];
  const possible = new Uint8Array(N), seenBfs = new Int32Array(N); let stamp = 0;

  const viable = (sh) => { for (const c of sh) if (owner[c] !== -1 || adj[c]) return false; return true; };
  const prune = () => {
    for (const [a, b, c, d] of BLOCKS) if (!possible[a] && !possible[b] && !possible[c] && !possible[d]) return false;
    // sicheres Wasser muss über Nicht-Inselzellen verbunden sein
    let startCell = -1, need = 0;
    for (let i = 0; i < N; i++) if (!possible[i]) { need++; if (startCell < 0) startCell = i; }
    if (need <= 1) return true;
    stamp++; const stack = [startCell]; seenBfs[startCell] = stamp; let got = 1;
    while (stack.length) { const x = stack.pop(); for (const nb of NB[x]) if (seenBfs[nb] !== stamp && owner[nb] === -1) { seenBfs[nb] = stamp; if (!possible[nb]) got++; stack.push(nb); } }
    return got === need;
  };
  const finalCheck = () => {
    for (const [a, b, c, d] of BLOCKS) if (owner[a] === -1 && owner[b] === -1 && owner[c] === -1 && owner[d] === -1) return false;
    let startCell = -1, need = 0;
    for (let i = 0; i < N; i++) if (owner[i] === -1) { need++; if (startCell < 0) startCell = i; }
    if (need === 0) return false;
    stamp++; const stack = [startCell]; seenBfs[startCell] = stamp; let got = 1;
    while (stack.length) { const x = stack.pop(); for (const nb of NB[x]) if (seenBfs[nb] !== stamp && owner[nb] === -1) { seenBfs[nb] = stamp; got++; stack.push(nb); } }
    return got === need;
  };
  // optsIn[j]: noch gültige Formen je Hinweis (werden pro Ebene nur weiter eingeschränkt)
  const rec = (left, optsIn) => {
    if (aborted) return;
    if (++nodes > BUDGET) { aborted = true; return; }
    if (left === 0) { if (finalCheck()) { found++; sols.push(Int16Array.from(owner)); } return; }
    // Hinweis mit den wenigsten Optionen; dabei mögliche Inselzellen = Vereinigung aller noch gültigen Formen
    for (let i = 0; i < N; i++) possible[i] = owner[i] !== -1 ? 1 : 0;
    const opts = new Array(C); let best = -1;
    for (let j = 0; j < C; j++) {
      if (placed[j]) { opts[j] = null; continue; }
      const o = optsIn[j].filter(viable);
      if (o.length === 0) return;
      for (const sh of o) for (const c of sh) possible[c] = 1;
      opts[j] = o;
      if (best < 0 || o.length < opts[best].length) best = j;
    }
    if (!prune()) return;
    placed[best] = 1;
    for (const sh of opts[best]) {
      for (const c of sh) { owner[c] = best; for (const nb of NB[c]) adj[nb]++; }
      rec(left - 1, opts);
      for (const c of sh) { owner[c] = -1; for (const nb of NB[c]) adj[nb]--; }
      if (found >= limit || aborted) break;
    }
    placed[best] = 0;
  };
  rec(C, list.map((x) => x.shapes));
  return { count: aborted ? -1 : found, sols, clueCells: list.map((x) => x.cell) };
}

/** Anzahl Lösungen (max. `limit`), -1 bei erschöpftem Budget. */
export function countSolutions(n, clues, limit = 2) { return solve(n, clues, limit).count; }

// ---------- Generator ----------
/** Entsteht durch Wasser auf Zelle i ein komplett gefüllter 2×2-Wasserblock? */
function makesBlockAt(water, n, i) {
  const r = Math.floor(i / n), c = i % n;
  for (const [dr, dc] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
    const r0 = r + dr, c0 = c + dc; if (r0 < 0 || c0 < 0 || r0 + 1 >= n || c0 + 1 >= n) continue;
    let all = true;
    for (const j of [r0 * n + c0, r0 * n + c0 + 1, (r0 + 1) * n + c0, (r0 + 1) * n + c0 + 1]) if (j !== i && !water[j]) { all = false; break; }
    if (all) return true;
  }
  return false;
}
/** Inselkomponenten eines Wasser-Arrays: { isl (Index je Zelle, -1 = Wasser), sizes, members } */
function components(water, n, NB) {
  const N = n * n, isl = new Int16Array(N).fill(-1), sizes = [], members = [];
  for (let i = 0; i < N; i++) {
    if (water[i] || isl[i] !== -1) continue;
    const id = sizes.length, st = [i], cells = []; isl[i] = id;
    while (st.length) { const x = st.pop(); cells.push(x); for (const nb of NB[x]) if (!water[nb] && isl[nb] === -1) { isl[nb] = id; st.push(nb); } }
    sizes.push(cells.length); members.push(cells);
  }
  return { isl, sizes, members };
}

/** Lösung: Wasser als zusammenhängende Fläche ohne 2×2-Block wachsen lassen; die Restkomponenten sind die Inseln (automatisch nicht berührend).
 *  Zu große Inseln werden durch weiteres Wasser verkleinert. Rückgabe: Uint8Array water oder null. */
function buildSolution(n, rng, NB) {
  const N = n * n;
  const water = new Uint8Array(N);
  const makesBlock = (i) => makesBlockAt(water, n, i);
  const target = Math.round(N * (0.40 + rng.float() * 0.1));
  let count = 1; water[rng.int(N)] = 1;
  const wn = (i) => NB[i].reduce((a, nb) => a + water[nb], 0);
  // würde Wasser auf i eine Nachbarzelle zur isolierten 1er-Insel machen?
  const isolates = (i) => NB[i].some((nb) => !water[nb] && NB[nb].every((x) => x === i || water[x]));
  // Bevorzugt Zellen mit genau einem Wassernachbarn (dünnes, verästeltes Wasser) und ohne Isolation → größere Inseln
  const frontier = () => {
    const f1 = [], f = [];
    for (let i = 0; i < N; i++) if (!water[i] && !makesBlock(i)) { const w = wn(i); if (!w) continue; f.push(i); if (w === 1 && (!isolates(i) || rng.chance(ISO))) f1.push(i); }
    return (f1.length && rng.chance(0.85)) ? f1 : f;
  };
  while (count < target) {
    const f = frontier(); if (!f.length) break;
    water[rng.pick(f)] = 1; count++;
  }
  for (let round = 0; round < N; round++) {
    const { isl, sizes } = components(water, n, NB);
    const big = sizes.findIndex((s) => s > MAX_ISLAND);
    if (big < 0) return sizes.length ? water : null;
    const cand = [], cand1 = []; for (let i = 0; i < N; i++) if (isl[i] === big && !makesBlock(i)) { const w = wn(i); if (w) cand.push(i); if (w === 1 && !isolates(i)) cand1.push(i); }
    if (!cand.length) return null;
    water[rng.pick(cand1.length && rng.chance(0.85) ? cand1 : cand)] = 1;
  }
  return null;
}

export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff], N = n * n, NB = buildNeigh(n);
  for (;;) {
    const water = buildSolution(n, rng, NB);
    if (!water) continue;
    const clueCell = new Set(); // Zellen mit Zahl
    for (let attempt = 0; attempt < 12; attempt++) {
      const { isl, sizes, members } = components(water, n, NB);
      // je Insel genau eine Zahl: vorhandene behalten, sonst zufällig
      const pos = members.map((cells) => { const have = cells.filter((c) => clueCell.has(c)); return have.length === 1 ? have[0] : rng.pick(cells); });
      clueCell.clear(); pos.forEach((c) => clueCell.add(c));
      const clues = grid(n, 0);
      pos.forEach((c, id) => { clues[Math.floor(c / n)][c % n] = sizes[id]; });
      const res = solve(n, clues, 2);
      if (res.count === 1) {
        const solution = grid(n, 1);
        for (let i = 0; i < N; i++) if (!water[i]) solution[Math.floor(i / n)][i % n] = 0;
        const p = { kind: "nurikabe", n, diff, clues, solution };
        if (logicSolvable(p)) return p;
        // eindeutig, aber nicht ohne Rückfall-Tipp lösbar: Zahl einer Insel versetzen und erneut prüfen
        const big = members.map((m, id) => id).filter((id) => members[id].length > 1);
        if (!big.length) break;
        const id = rng.pick(big); clueCell.delete(pos[id]); clueCell.add(rng.pick(members[id].filter((c) => c !== pos[id])));
        continue;
      }
      if (res.count !== 2) break;
      // Alternativlösung und Inseln, deren Zellmenge abweicht
      const [a, b] = res.sols;
      const isOurs = (x) => { for (let i = 0; i < N; i++) if ((x[i] === -1) !== !!water[i]) return false; return true; };
      const other = isOurs(a) ? b : a;
      const differ = new Set();
      for (let i = 0; i < N; i++) if ((other[i] === -1) !== !!water[i] || (other[i] !== -1 && res.clueCells[other[i]] !== pos[isl[i]])) {
        if (!water[i]) differ.add(isl[i]); if (other[i] !== -1) differ.add(isl[res.clueCells[other[i]]]);
      }
      let changed = false;
      if (attempt % 2 === 0) {
        // Zahl auf eine Zelle setzen, die in der Alternativlösung nicht zu dieser Insel gehört
        for (const id of differ) {
          if (members[id].length < 2) continue;
          const kill = members[id].filter((c) => c !== pos[id] && (other[c] === -1 || res.clueCells[other[c]] !== pos[id]));
          if (!kill.length) continue;
          clueCell.delete(pos[id]); clueCell.add(rng.pick(kill)); changed = true;
        }
      }
      if (!changed) {
        // strukturell: eine Inselzelle, die in der Alternative Wasser ist, wird auch bei uns Wasser (Zusammenhang bleibt, 2×2 wird geprüft)
        for (const id of differ) {
          if (members[id].length < 2) continue;
          const cand = members[id].filter((c) => other[c] === -1 && c !== pos[id] && NB[c].some((nb) => water[nb]) && !makesBlockAt(water, n, c));
          if (!cand.length) continue;
          water[rng.pick(cand)] = 1; changed = true;
        }
      }
      if (!changed) break;
    }
  }
}

/** Alle erlaubten Vervollständigungen je Zahlen-Insel (für Tipps). → [{ i, shapes: number[][] }] oder null (zu viele Formen).
 *  Erlaubt = zusammenhängend, enthält die bisherigen Inselfelder, kein Wasser, berührt keine fremde Insel,
 *  erzwingt keinen 2×2-Wasserblock (Felder, die keine andere Insel erreichen kann, zählen als Wasser) und schneidet kein Wasser ab. */
function shapeOptions(p, g, isls, compOf, LIMIT = 3000) {
  const n = p.n, N = n * n, NB = buildNeigh(n), BLOCKS = buildBlocks(n);
  const isl2 = new Uint8Array(N), water = new Uint8Array(N), comp = new Int16Array(N).fill(-1);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const x = r * n + c; if (g[r][c] === 1) water[x] = 1; else if (g[r][c] === 2 || p.clues[r][c]) isl2[x] = 1; comp[x] = compOf[r][c]; }
  const clued = (j) => j >= 0 && isls[j].clues.length === 1;
  const per = [];
  for (let i = 0; i < isls.length; i++) {
    if (isls[i].clues.length >= 2) return null;
    if (!clued(i)) continue;
    const isl = isls[i], k = isl.clues[0];
    if (isl.cells.length > k) return null;
    const ok = (x) => !water[x] && !(comp[x] >= 0 && comp[x] !== i && clued(comp[x])) && !NB[x].some((y) => comp[y] >= 0 && comp[y] !== i && clued(comp[y]));
    let level = [isl.cells.map(([r, c]) => r * n + c).sort((a, b) => a - b)];
    for (let s = level[0].length; s < k && level.length; s++) {
      const seen = new Set(), next = [];
      for (const sh of level) {
        for (const x of sh) for (const nb of NB[x]) {
          if (sh.includes(nb) || !ok(nb)) continue;
          const ns = [...sh, nb].sort((a, b) => a - b), k2 = ns.join(",");
          if (seen.has(k2)) continue; seen.add(k2); next.push(ns);
        }
      }
      if (next.length > LIMIT) return null;
      level = next;
    }
    per.push({ i, shapes: level.filter((sh) => sh.every((x) => NB[x].every((y) => sh.includes(y) || !isl2[y]))) });
  }
  // Filter mit Abdeckung durch andere Inseln (zweimal, damit sich Einschränkungen fortpflanzen)
  const inSh = new Int32Array(N), bord = new Int32Array(N), seenB = new Int32Array(N); let stamp = 0;
  const wTotal = water.reduce((a, v) => a + v, 0);
  // Inselfelder ohne Zahl müssen zu einer Zahlen-Insel gehören: kann nur eine Insel sie erreichen, muss jede ihrer Formen sie enthalten
  const orphans = isls.map((isl, j) => (isl.clues.length ? null : isl.cells[0][0] * n + isl.cells[0][1])).filter((x) => x !== null);
  const needOrphans = () => {
    for (const x of orphans) {
      const who = per.filter((e) => e.shapes.some((sh) => sh.includes(x)));
      if (who.length === 1) who[0].shapes = who[0].shapes.filter((sh) => sh.includes(x));
    }
  };
  needOrphans();
  for (let pass = 0; pass < 2; pass++) {
    const cover = new Int16Array(N);
    const mine = per.map((e) => { const m = new Uint8Array(N); for (const sh of e.shapes) for (const x of sh) m[x] = 1; for (let x = 0; x < N; x++) cover[x] += m[x]; return m; });
    per.forEach((e, ei) => {
      const m = mine[ei];
      e.shapes = e.shapes.filter((sh) => {
        stamp++;
        for (const x of sh) inSh[x] = stamp;
        for (const x of sh) for (const y of NB[x]) if (inSh[y] !== stamp) bord[y] = stamp;
        // Feld wird sicher Wasser: Wasser, Rand der Form oder von keiner anderen Insel erreichbar
        const wet = (x) => inSh[x] !== stamp && (water[x] || bord[x] === stamp || (!isl2[x] && cover[x] - m[x] <= 0));
        for (const x of sh) for (const y of NB[x]) if (bord[y] === stamp)
          for (const b of BLOCKS) if (b.includes(y) && wet(b[0]) && wet(b[1]) && wet(b[2]) && wet(b[3])) return false;
        // Wasser darf nicht abgeschnitten werden: alles Wasser über Nicht-Insel-Felder verbunden
        if (wTotal > 1) {
          let s0 = -1; for (let x = 0; x < N; x++) if (water[x]) { s0 = x; break; }
          stamp++; const mark = stamp; const st = [s0]; seenB[s0] = mark; let got = 1;
          while (st.length) { const x = st.pop(); for (const y of NB[x]) if (seenB[y] !== mark && inSh[y] !== mark - 1 && !isl2[y]) { seenB[y] = mark; if (water[y]) got++; st.push(y); } }
          if (got < wTotal) return false;
        }
        return true;
      });
    });
    needOrphans();
  }
  return per;
}

/** true, wenn das Rätsel vom leeren Gitter aus nur mit begründeten Tipps (nie „fallback“) lösbar ist. Tipps werden wie bei „Anzeigen“ angewandt. */
export function logicSolvable(p) {
  const g = grid(p.n, 0);
  for (let step = 0; step < p.n * p.n + 5; step++) {
    const h = explainHint(p, g);
    if (!h) return true;
    if (h.kind === "fallback" || h.kind === "wrong") return false;
    for (const [r, c, v] of h.set) g[r][c] = v;
  }
  return false;
}

// ---------- Spielzustand ----------
/** Inselkomponenten: Zellen mit g==2 oder Zahl. Liefert [{cells:[[r,c]], clues:[number], enclosed:boolean}] */
export function islands(p, g) {
  const n = p.n, seen = grid(n, false), out = [];
  const isIsl = (r, c) => g[r][c] === 2 || p.clues[r][c] > 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (seen[r][c] || !isIsl(r, c)) continue;
    const cells = [], clues = [], st = [[r, c]]; seen[r][c] = true; let enclosed = true;
    while (st.length) {
      const [y, x] = st.pop(); cells.push([y, x]); if (p.clues[y][x] > 0) clues.push(p.clues[y][x]);
      for (const [dy, dx] of DIRS4) {
        const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= n || xx >= n) continue;
        if (isIsl(yy, xx)) { if (!seen[yy][xx]) { seen[yy][xx] = true; st.push([yy, xx]); } }
        else if (g[yy][xx] !== 1) enclosed = false;
      }
    }
    out.push({ cells, clues, enclosed });
  }
  return out;
}

export function isSolved(p, g) {
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if ((g[r][c] === 1) !== (p.solution[r][c] === 1)) return false;
  return true;
}

/** Vollständige Inseln (Größe = Zahl, komplett eingeschlossen) als Set von Zell-Keys. */
export function completeIslands(p, g) {
  const out = new Set();
  for (const isl of islands(p, g)) if (isl.clues.length === 1 && isl.cells.length === isl.clues[0] && isl.enclosed) for (const [r, c] of isl.cells) out.add(key(r, c));
  return out;
}

export function conflicts(p, g) {
  const n = p.n, bad = new Set();
  for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++)
    if (g[r][c] === 1 && g[r][c + 1] === 1 && g[r + 1][c] === 1 && g[r + 1][c + 1] === 1) { bad.add(key(r, c)); bad.add(key(r, c + 1)); bad.add(key(r + 1, c)); bad.add(key(r + 1, c + 1)); }
  for (const isl of islands(p, g)) {
    let wrong = false;
    if (isl.clues.length >= 2) wrong = true;
    else if (isl.clues.length === 1 && isl.cells.length > isl.clues[0]) wrong = true;
    else if (isl.clues.length === 1 && isl.cells.length < isl.clues[0] && isl.enclosed) wrong = true;
    else if (isl.clues.length === 0 && isl.enclosed) wrong = true;
    if (wrong) for (const [r, c] of isl.cells) bad.add(key(r, c));
  }
  return bad;
}

/** Nächster Tipp: { r, c, v, reason } oder null. v: 1 Wasser, 2 Insel. */
export function findHint(p, g) {
  const n = p.n;
  // 1) falsches Feld korrigieren
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (g[r][c] === 1 && p.solution[r][c] === 0) return { r, c, v: 2, reason: "Hier ist kein Wasser" };
    if (g[r][c] === 2 && p.solution[r][c] === 1) return { r, c, v: 1, reason: "Hier ist Wasser" };
  }
  const inb = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
  const isls = islands(p, g);
  const compOf = grid(n, -1); isls.forEach((isl, i) => isl.cells.forEach(([r, c]) => { compOf[r][c] = i; }));
  // 2) Feld zwischen zwei Zahlen-Inseln
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (g[r][c] !== 0 || p.clues[r][c]) continue;
    const ids = new Set();
    for (const [dr, dc] of DIRS4) if (inb(r + dr, c + dc) && compOf[r + dr][c + dc] >= 0 && isls[compOf[r + dr][c + dc]].clues.length) ids.add(compOf[r + dr][c + dc]);
    if (ids.size >= 2) return { r, c, v: 1, reason: "Zwischen zwei Inseln muss Wasser liegen" };
  }
  // 3) 1er-Insel / vollständige Insel → Nachbarn Wasser
  for (const isl of isls) {
    if (isl.clues.length !== 1 || isl.cells.length !== isl.clues[0]) continue;
    for (const [r, c] of isl.cells) for (const [dr, dc] of DIRS4) {
      const rr = r + dr, cc = c + dc;
      if (inb(rr, cc) && g[rr][cc] === 0 && !p.clues[rr][cc]) return { r: rr, c: cc, v: 1, reason: isl.clues[0] === 1 ? "Eine 1er-Insel ist von Wasser umgeben" : "Diese Insel ist vollständig – rundherum Wasser" };
    }
  }
  // 4) 2×2-Block mit drei Wasser → viertes Insel
  for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++) {
    const cells = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
    const water = cells.filter(([y, x]) => g[y][x] === 1);
    if (water.length !== 3) continue;
    const [[y, x]] = cells.filter(([y, x]) => g[y][x] !== 1);
    if (g[y][x] === 0 && !p.clues[y][x]) return { r: y, c: x, v: 2, reason: "Kein 2×2-Block darf ganz Wasser sein" };
  }
  // 5) Fallback: Lösungsfeld (erst Wasser, dann Insel)
  for (const want of [1, 0]) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (g[r][c] === 0 && !p.clues[r][c] && p.solution[r][c] === want) return { r, c, v: want === 1 ? 1 : 2, reason: want === 1 ? "Hier ist Wasser" : "Hier ist Insel" };
  return null;
}

/** Erklärter Tipp (LinkedIn-Stil). → { kind, text, focus:[[r,c]], target:[[r,c]], strike:[[r,c]], set:[[r,c,v]] } oder null.
 *  v: 0 leeren, 1 Wasser, 2 Insel. Folgerungen werden gegen die Lösung abgesichert. */
export function explainHint(p, g) {
  const n = p.n, inb = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
  const nbs = (r, c) => DIRS4.map(([dr, dc]) => [r + dr, c + dc]).filter(([y, x]) => inb(y, x));
  const free = (r, c) => g[r][c] === 0 && !p.clues[r][c];
  const solV = (r, c) => (p.solution[r][c] === 1 ? 1 : 2);
  const ok = (list, v) => list.every(([r, c]) => solV(r, c) === v);
  const uniq = (list) => { const s = new Set(); return list.filter(([r, c]) => !s.has(key(r, c)) && s.add(key(r, c))); };
  const felder = (k) => (k === 1 ? "ein Feld" : k === 2 ? "zwei Felder" : k === 3 ? "drei Felder" : `${k} Felder`);
  // 1) falsche Eingaben
  const wrong = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((g[r][c] === 1 && p.solution[r][c] === 0) || (g[r][c] === 2 && p.solution[r][c] === 1)) wrong.push([r, c]);
  if (wrong.length) {
    const one = wrong.length === 1, isls0 = islands(p, g);
    let why = null, focus = [];
    for (const [r, c] of wrong) {
      if (why) break;
      if (g[r][c] === 1) for (const [y, x] of [[r - 1, c - 1], [r - 1, c], [r, c - 1], [r, c]]) {
        const blk = [[y, x], [y, x + 1], [y + 1, x], [y + 1, x + 1]];
        if (blk.every(([yy, xx]) => inb(yy, xx) && g[yy][xx] === 1)) { why = "Vier Wasserfelder bilden einen 2×2-Block – das ist nicht erlaubt."; focus = blk; break; }
      } else {
        const isl = isls0.find((i) => i.cells.some(([y, x]) => y === r && x === c));
        if (isl && isl.clues.length >= 2) { why = "Diese Insel verbindet zwei Zahlen – jede Insel hat genau eine."; focus = isl.cells; }
        else if (isl && isl.clues.length === 1 && isl.cells.length > isl.clues[0]) { why = `Diese Insel ist größer als ihre ${isl.clues[0]}.`; focus = isl.cells; }
      }
    }
    why ||= one ? "Dieses Feld widerspricht der einzig möglichen Lösung." : "Diese Felder widersprechen der einzig möglichen Lösung.";
    return { kind: "wrong", text: `${why}\n${one ? "Entfernen Sie das gestreifte Feld." : "Entfernen Sie die gestreiften Felder."}`, focus, target: [], strike: wrong, set: wrong.map(([r, c]) => [r, c, 0]) };
  }
  if (isSolved(p, g)) return null;
  const isls = islands(p, g), compOf = grid(n, -1);
  isls.forEach((isl, i) => isl.cells.forEach(([r, c]) => { compOf[r][c] = i; }));
  const clueIsl = (i) => i >= 0 && isls[i].clues.length === 1;
  const mk = (kind, text, focus, target, v) => ({ kind, text, focus, target, strike: [], set: target.map(([r, c]) => [r, c, v]) });
  // 2) vollständige Insel → angrenzende Felder Wasser
  for (const isl of isls) {
    if (isl.clues.length !== 1 || isl.cells.length !== isl.clues[0]) continue;
    const t = uniq(isl.cells.flatMap(([r, c]) => nbs(r, c)).filter(([y, x]) => free(y, x)));
    if (!t.length || !ok(t, 1)) continue;
    const text = isl.clues[0] === 1 ? "Eine 1er-Insel besteht nur aus ihrem Zahlenfeld.\nAlle angrenzenden Felder müssen Wasser sein."
      : `Diese Insel hat schon ihre ${isl.clues[0]} Felder.\nAlle angrenzenden Felder müssen Wasser sein.`;
    return mk("complete", text, isl.cells, t, 1);
  }
  // 3) Feld grenzt an zwei verschiedene Zahlen-Inseln
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!free(r, c)) continue;
    const ids = [...new Set(nbs(r, c).map(([y, x]) => compOf[y][x]).filter((i) => i >= 0 && isls[i].clues.length))];
    if (ids.length >= 2 && ok([[r, c]], 1)) return mk("between", "Dieses Feld grenzt an zwei verschiedene Zahlen-Inseln.\nEs muss Wasser sein.", ids.flatMap((i) => isls[i].cells), [[r, c]], 1);
  }
  // 4) drei Wasser im 2×2 → viertes Feld Insel
  for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++) {
    const blk = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]], water = blk.filter(([y, x]) => g[y][x] === 1);
    if (water.length !== 3) continue;
    const t = blk.filter(([y, x]) => g[y][x] !== 1);
    if (free(...t[0]) && ok(t, 2)) return mk("block", "Drei Wasserfelder bilden fast einen 2×2-Block.\nDas vierte Feld muss Insel sein.", water, t, 2);
  }
  // 5) Insel kann nur noch in eine Richtung wachsen
  for (let i = 0; i < isls.length; i++) {
    const isl = isls[i]; if (!clueIsl(i) || isl.cells.length >= isl.clues[0]) continue;
    const front = uniq(isl.cells.flatMap(([r, c]) => nbs(r, c)).filter(([y, x]) => free(y, x)
      && !nbs(y, x).some(([yy, xx]) => compOf[yy][xx] >= 0 && compOf[yy][xx] !== i && isls[compOf[yy][xx]].clues.length)));
    if (front.length === 1 && ok(front, 2)) {
      const rem = isl.clues[0] - isl.cells.length;
      return mk("grow", `Diese ${isl.clues[0]}er-Insel braucht noch ${felder(rem)} und kann nur in eine Richtung wachsen.\nDas hervorgehobene Feld muss Insel sein.`, isl.cells, front, 2);
    }
  }
  // 6) Feld, das keine Insel mehr erreichen kann → Wasser
  {
    const reach = grid(n, false);
    for (let i = 0; i < isls.length; i++) {
      if (!clueIsl(i)) continue;
      const rem = isls[i].clues[0] - isls[i].cells.length; if (rem <= 0) continue;
      const dist = grid(n, -1), q = isls[i].cells.map(([r, c]) => { dist[r][c] = 0; return [r, c]; });
      while (q.length) {
        const [r, c] = q.shift(); if (dist[r][c] >= rem) continue;
        for (const [y, x] of nbs(r, c)) if (dist[y][x] < 0 && g[y][x] !== 1 && !(p.clues[y][x] && compOf[y][x] !== i) && !nbs(y, x).some(([yy, xx]) => compOf[yy][xx] >= 0 && compOf[yy][xx] !== i && isls[compOf[yy][xx]].clues.length)) { dist[y][x] = dist[r][c] + 1; reach[y][x] = true; q.push([y, x]); }
      }
    }
    const t = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (free(r, c) && !reach[r][c]) t.push([r, c]);
    if (t.length && ok(t, 1)) {
      const one = t.length === 1;
      return mk("reach", `${one ? "Dieses Feld ist" : "Diese Felder sind"} zu weit von jeder Zahl entfernt – keine Insel reicht bis hierher.\n${one ? "Es muss" : "Sie müssen"} Wasser sein.`, [], t, 1);
    }
  }
  // 7) Wasser mit nur einem Ausweg
  {
    const totalW = p.solution.flat().filter((v) => v === 1).length, seen = grid(n, false);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (g[r][c] !== 1 || seen[r][c]) continue;
      const comp = [], st = [[r, c]]; seen[r][c] = true;
      while (st.length) { const [y, x] = st.pop(); comp.push([y, x]); for (const [yy, xx] of nbs(y, x)) if (g[yy][xx] === 1 && !seen[yy][xx]) { seen[yy][xx] = true; st.push([yy, xx]); } }
      if (comp.length >= totalW) continue;
      const exits = uniq(comp.flatMap(([y, x]) => nbs(y, x)).filter(([yy, xx]) => free(yy, xx)));
      if (exits.length === 1 && ok(exits, 1)) return mk("exit", "Alles Wasser muss zusammenhängen – dieses Wasser hat nur noch einen Ausweg.\nDas hervorgehobene Feld muss Wasser sein.", comp, exits, 1);
    }
  }
  // 8) Formen-Analyse: alle erlaubten Möglichkeiten, jede Zahlen-Insel zu vervollständigen
  //    (Form berührt keine fremde Insel, lässt keinen 2×2-Wasserblock zwingend entstehen und schneidet kein Wasser ab)
  {
    const N = n * n, per = shapeOptions(p, g, isls, compOf);
    if (per) {
      for (const e of per) {
        const isl = isls[e.i], k = isl.clues[0]; if (isl.cells.length >= k || !e.shapes.length) continue;
        const cnt = new Map(), bcnt = new Map();
        for (const sh of e.shapes) {
          const inSh = new Set(sh), bord = new Set();
          for (const x of sh) { cnt.set(x, (cnt.get(x) || 0) + 1); for (const [y, z] of nbs(Math.floor(x / n), x % n)) if (!inSh.has(y * n + z)) bord.add(y * n + z); }
          for (const x of bord) bcnt.set(x, (bcnt.get(x) || 0) + 1);
        }
        const S = e.shapes.length, rem = k - isl.cells.length;
        const must = [...cnt].filter(([x, v]) => v === S && free(Math.floor(x / n), x % n)).map(([x]) => [Math.floor(x / n), x % n]);
        if (must.length && ok(must, 2)) {
          const one = must.length === 1;
          const orph = [...cnt].filter(([x, v]) => v === S && g[Math.floor(x / n)][x % n] === 2 && compOf[Math.floor(x / n)][x % n] !== e.i).map(([x]) => [Math.floor(x / n), x % n]);
          if (orph.length)
            return mk("shape", `Das Inselfeld ohne Zahl muss zu einer Zahlen-Insel gehören – nur diese ${k}er-Insel kann es erreichen.\n${one ? "Das hervorgehobene Feld muss" : "Die hervorgehobenen Felder müssen"} Insel sein.`, [...isl.cells, ...orph], must, 2);
          return mk("shape", `Diese ${k}er-Insel braucht noch ${felder(rem)}. Jede Form, die keinen 2×2-Wasserblock erzwingt und kein Wasser abschneidet, nutzt ${one ? "das hervorgehobene Feld" : "die hervorgehobenen Felder"}.\n${one ? "Es muss" : "Sie müssen"} Insel sein.`, isl.cells, must, 2);
        }
        const edge = [...bcnt].filter(([x, v]) => v === S && !cnt.has(x) && free(Math.floor(x / n), x % n)).map(([x]) => [Math.floor(x / n), x % n]);
        if (edge.length && ok(edge, 1)) {
          const one = edge.length === 1;
          return mk("shapeEdge", `Egal, wie diese ${k}er-Insel fertig wird – ${one ? "das hervorgehobene Feld grenzt" : "die hervorgehobenen Felder grenzen"} immer an sie, ohne dazuzugehören.\n${one ? "Es muss" : "Sie müssen"} Wasser sein.`, isl.cells, edge, 1);
        }
      }
      const all = new Uint8Array(N);
      for (const e of per) for (const sh of e.shapes) for (const x of sh) all[x] = 1;
      const t = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (free(r, c) && !all[r * n + c]) t.push([r, c]);
      if (t.length && ok(t, 1)) {
        const one = t.length === 1;
        return mk("reach", `Keine Insel kann ${one ? "dieses Feld" : "diese Felder"} erreichen, ohne zu groß zu werden, eine andere Insel zu berühren oder einen 2×2-Wasserblock zu erzwingen.\n${one ? "Es muss" : "Sie müssen"} Wasser sein.`, [], t, 1);
      }
    }
  }
  // 9) Rückfall: Lösungsfeld (erst Wasser, dann Insel)
  for (const want of [1, 0]) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (free(r, c) && p.solution[r][c] === want)
      return mk("fallback", want === 1 ? "Nur so bleibt alles Wasser zusammenhängend und jede Insel bekommt genau ihre Größe – das Rätsel hat nur diese Lösung.\nDas hervorgehobene Feld muss Wasser sein."
        : "Nur so bekommt jede Insel genau ihre Größe – das Rätsel hat nur diese Lösung.\nDas hervorgehobene Feld muss Insel sein.", [], [[r, c]], want === 1 ? 1 : 2);
  return null;
}
