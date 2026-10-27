import { Rng, resolveDiff } from "./core.js";
const SIZE = { leicht: 5, mittel: 10, schwer: 15, experte: 20 };
const DENSITY = { leicht: 0.6, mittel: 0.6, schwer: 0.58, experte: 0.55 };
const UNK = -1, FILL = 1, EMPTY = 0;
export const LINE = { UNK, FILL, EMPTY };

export function cluesOf(line) {
  const out = []; let run = 0;
  for (const v of line) { if (v) run++; else if (run) { out.push(run); run = 0; } }
  if (run) out.push(run);
  return out;
}
// Line solver via memoised recursion with BigInt bitmasks (n ≤ 20 so Number would do, but keep it simple & safe).
export function solveLine(cells, clues) {
  const L = cells.length, all = (1n << BigInt(L)) - 1n, W = clues.length + 1;
  const memo = new Map();
  const rec = (i, j) => {
    const k = i * W + j; if (memo.has(k)) return memo.get(k);
    let okAny = false, fm = 0n, em = 0n;
    if (j === clues.length) {
      let ok = true; for (let x = i; x < L; x++) if (cells[x] === FILL) { ok = false; break; }
      if (ok) { okAny = true; em = (all >> BigInt(i)) << BigInt(i); }
    } else {
      if (i < L && cells[i] !== FILL) { const [ok, f, e] = rec(i + 1, j); if (ok) { okAny = true; fm |= f; em |= e | (1n << BigInt(i)); } }
      const blk = clues[j];
      if (i + blk <= L) {
        let fits = true; for (let x = i; x < i + blk; x++) if (cells[x] === EMPTY) { fits = false; break; }
        if (fits && i + blk < L && cells[i + blk] === FILL) fits = false;
        if (fits) {
          const [ok, f, e] = rec(i + blk < L ? i + blk + 1 : L, j + 1);
          if (ok) { okAny = true; fm |= f | (((1n << BigInt(blk)) - 1n) << BigInt(i)); em |= e | (i + blk < L ? 1n << BigInt(i + blk) : 0n); }
        }
      }
    }
    const res = [okAny, fm, em]; memo.set(k, res); return res;
  };
  const [ok, fm, em] = rec(0, 0);
  if (!ok) return null;
  const out = cells.slice();
  for (let x = 0; x < L; x++) if (out[x] === UNK) {
    const f = (fm >> BigInt(x)) & 1n, e = (em >> BigInt(x)) & 1n;
    if (f && !e) out[x] = FILL; else if (e && !f) out[x] = EMPTY;
  }
  return out;
}
export function lineSolve(n, rows, cols) {
  const g = Array.from({ length: n }, () => Array(n).fill(UNK));
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n; r++) { const nw = solveLine(g[r], rows[r]); if (!nw) return null; if (nw.some((v, i) => v !== g[r][i])) { g[r] = nw; changed = true; } }
    for (let c = 0; c < n; c++) {
      const col = g.map((row) => row[c]); const nw = solveLine(col, cols[c]); if (!nw) return null;
      if (nw.some((v, i) => v !== col[i])) { for (let r = 0; r < n; r++) g[r][c] = nw[r]; changed = true; }
    }
  }
  return g;
}
/** grid values: 0 unknown, 1 filled, 2 marked */
export function isSolved(p, g) {
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if ((g[r][c] === 1) !== !!p.solution[r][c]) return false;
  return true;
}
export function satisfied(p, g) {
  const rows = new Set(), cols = new Set();
  for (let i = 0; i < p.n; i++) {
    if (JSON.stringify(cluesOf(g[i].map((v) => v === 1))) === JSON.stringify(p.rows[i])) rows.add(i);
    if (JSON.stringify(cluesOf(g.map((row) => row[i] === 1))) === JSON.stringify(p.cols[i])) cols.add(i);
  }
  return { rows, cols };
}
export function generate(diff, seed) {
  const rng = new Rng(seed); diff = resolveDiff(diff, rng);
  const n = SIZE[diff], d = DENSITY[diff];
  for (;;) {
    const sol = Array.from({ length: n }, () => Array.from({ length: n }, () => (rng.chance(d) ? 1 : 0)));
    const rows = sol.map(cluesOf), cols = [...Array(n).keys()].map((c) => cluesOf(sol.map((row) => row[c])));
    const g = lineSolve(n, rows, cols);
    if (g && !g.some((row) => row.includes(UNK))) return { kind: "nonogram", n, diff, rows, cols, solution: sol };
  }
}

// ---------- Tipp-Erklärung (reine Logik) ----------
/** Anzahl möglicher Lagen der Blöcke in einer Zeile (gedeckelt bei cap). cells: UNK/FILL/EMPTY. */
export function countPlacements(cells, clues, cap = 2) {
  const L = cells.length, memo = new Map();
  const rec = (i, j) => {
    const k = i * 64 + j; if (memo.has(k)) return memo.get(k);
    let cnt = 0;
    if (j === clues.length) { cnt = 1; for (let x = i; x < L; x++) if (cells[x] === FILL) { cnt = 0; break; } }
    else {
      if (i < L && cells[i] !== FILL) cnt += rec(i + 1, j);
      const blk = clues[j];
      if (i + blk <= L) {
        let fits = true; for (let x = i; x < i + blk; x++) if (cells[x] === EMPTY) { fits = false; break; }
        if (fits && i + blk < L && cells[i + blk] === FILL) fits = false;
        if (fits) cnt += rec(i + blk < L ? i + blk + 1 : L, j + 1);
      }
      cnt = Math.min(cnt, cap);
    }
    memo.set(k, cnt); return cnt;
  };
  return rec(0, 0);
}
const fmtClues = (cl) => (cl.length === 1 ? String(cl[0]) : cl.slice(0, -1).join(", ") + " und " + cl[cl.length - 1]);
const nFelder = (k, adj = "") => (k === 1 ? `1 ${adj ? adj + "s " : ""}Feld` : `${k} ${adj ? adj + "en " : ""}Felder`);

/** Erklärter Tipp für den Spielstand g (0 unbekannt, 1 gefüllt, 2 ×).
 *  → { kind, line: {r}|{c}|null, cells: [[r,c,v]] (v 0 leeren, 1 füllen, 2 ×), text, wrong?: true } oder null (gelöst). */
export function explainHint(p, g) {
  const n = p.n;
  const name = (ln) => (ln.r != null ? `Zeile ${ln.r + 1}` : `Spalte ${ln.c + 1}`);
  const lineCells = (ln) => [...Array(n).keys()].map((i) => (ln.r != null ? [ln.r, i] : [i, ln.c]));
  const conv = (v) => (v === 1 ? FILL : v === 2 ? EMPTY : UNK);
  const lineOf = (ln) => lineCells(ln).map(([r, c]) => conv(g[r][c]));
  const cluesOfLine = (ln) => (ln.r != null ? p.rows[ln.r] : p.cols[ln.c]);
  // 1) falsche Eingaben
  const wrong = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const s = !!p.solution[r][c]; if ((g[r][c] === 1 && !s) || (g[r][c] === 2 && s)) wrong.push([r, c, 0]); }
  if (wrong.length) {
    const one = wrong.length === 1;
    let why = null, line = null;
    for (const [r, c] of wrong) for (const ln of [{ r }, { c }]) if (!why && !solveLine(lineOf(ln), cluesOfLine(ln))) {
      line = ln; const cl = cluesOfLine(ln);
      why = `${name(ln)}${cl.length ? ` mit ${fmtClues(cl)}` : ""} lässt sich so nicht mehr erfüllen.`;
    }
    why ||= one ? "Dieses Feld widerspricht dem Bild, das die Zahlen eindeutig vorgeben." : "Diese Felder widersprechen dem Bild, das die Zahlen eindeutig vorgeben.";
    return { kind: "wrong", wrong: true, line, cells: wrong, text: `${why}\n${one ? "Entfernen Sie das gestreifte Feld." : "Entfernen Sie die gestreiften Felder."}` };
  }
  if (isSolved(p, g)) return null;
  // 2) Linienlogik: sammle alle Zeilen/Spalten mit neuen Folgerungen, wähle die am leichtesten erklärbare
  const cands = [];
  for (let i = 0; i < n; i++) for (const ln of [{ r: i }, { c: i }]) {
    const line = lineOf(ln), cl = cluesOfLine(ln), nw = solveLine(line, cl); if (!nw) continue;
    const fills = [], marks = [];
    nw.forEach((v, x) => { if (line[x] !== UNK || v === UNK) return; (v === FILL ? fills : marks).push(x); });
    if (!fills.length && !marks.length) continue;
    const unknownAll = line.every((v) => v === UNK), filled = line.filter((v) => v === FILL).length;
    const sum = cl.reduce((a, b) => a + b, 0), minLen = sum + Math.max(0, cl.length - 1);
    const lc = lineCells(ln), at = (xs, v) => xs.map((x) => [...lc[x], v]);
    let kind, cells, text, pr;
    if (!cl.length) { pr = 4; kind = "empty"; cells = at(marks, 2); text = `${name(ln)} hat keine Zahl – hier ist kein Feld gefüllt.\nMarkieren Sie alle Felder mit ×.`; }
    else if (filled === sum && JSON.stringify(cluesOf(line.map((v) => v === FILL))) === JSON.stringify(cl)) {
      pr = 5; kind = "complete"; cells = at(marks, 2);
      text = `${name(ln)} ist mit ${fmtClues(cl)} bereits vollständig.\nMarkieren Sie die restlichen Felder mit ×.`;
    } else if (unknownAll && minLen === n) {
      pr = 0; kind = "exact"; cells = [...at(fills, 1), ...at(marks, 2)];
      text = cl.length === 1 ? `${name(ln)} braucht einen ${cl[0]}er-Block auf ${n} Feldern – er füllt die ganze Linie.\nFüllen Sie die hervorgehobenen Felder.`
        : `${name(ln)} braucht ${fmtClues(cl)} mit je einer Lücke – das sind genau ${n} Felder, es gibt nur eine Lage.\nFüllen Sie die Blöcke und markieren Sie die Lücken mit ×.`;
    } else if (countPlacements(line, cl) === 1) {
      pr = fills.length ? 1 : 6; kind = "unique"; cells = [...at(fills, 1), ...at(marks, 2)];
      text = `Mit den Feldern, die schon feststehen, passen ${fmtClues(cl)} in ${name(ln)} nur noch auf eine Weise.\n${fills.length && marks.length ? "Füllen Sie die hervorgehobenen Felder und markieren Sie die übrigen mit ×." : fills.length ? "Füllen Sie die hervorgehobenen Felder." : "Markieren Sie die übrigen Felder mit ×."}`;
    } else if (unknownAll && fills.length) {
      pr = 2; kind = "overlap"; cells = at(fills, 1);
      text = cl.length === 1
        ? `${name(ln)} braucht einen ${cl[0]}er-Block auf ${n} Feldern – egal wo er liegt, die mittleren ${nFelder(fills.length)} ${fills.length === 1 ? "ist" : "sind"} immer gefüllt.\nFüllen Sie die hervorgehobenen Felder.`
        : `${name(ln)} braucht für ${fmtClues(cl)} mit Lücken mindestens ${minLen} von ${n} Feldern – egal wie die Blöcke liegen, die hervorgehobenen Felder sind immer gefüllt.\nFüllen Sie die hervorgehobenen Felder.`;
    } else if (fills.length) {
      pr = 3; kind = "fill"; cells = at(fills, 1);
      text = `In ${name(ln)} (${fmtClues(cl)}) sind die hervorgehobenen Felder in jeder Lage gefüllt, die zu den schon gesetzten Feldern passt.\nFüllen Sie die hervorgehobenen Felder.`;
    } else {
      pr = 7; kind = "reach"; cells = at(marks, 2);
      text = `In ${name(ln)} (${fmtClues(cl)}) kann kein Block die hervorgehobenen Felder erreichen, ohne den schon gesetzten Feldern zu widersprechen.\nMarkieren Sie sie mit ×.`;
    }
    // Sicherheit: nur Folgerungen, die zur Lösung passen
    if (cells.some(([r, c, v]) => (v === 1) !== !!p.solution[r][c])) continue;
    cands.push({ pr, k: cells.length, kind, line: ln, cells, text });
  }
  if (cands.length) { cands.sort((a, b) => a.pr - b.pr || b.k - a.k); const { pr, k, ...best } = cands[0]; return best; }
  // 3) Rückfall (sollte bei zeilenlösbaren Rätseln nicht vorkommen)
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.solution[r][c] && g[r][c] !== 1)
    return { kind: "fallback", line: null, cells: [[r, c, 1]], text: "Zeilen und Spalten zusammen lassen nur ein Bild zu – dieses Feld gehört dazu.\nFüllen Sie das hervorgehobene Feld." };
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!p.solution[r][c] && g[r][c] === 0)
    return { kind: "fallback", line: null, cells: [[r, c, 2]], text: "Das Bild ist vollständig – dieses Feld bleibt leer.\nMarkieren Sie es mit ×." };
  return null;
}

/** true, wenn das Rätsel vom leeren Gitter aus nur mit begründeten Tipps (nie „fallback“) lösbar ist. Tipps werden wie bei „Anzeigen“ angewandt.
 *  Da generate() nur zeilenlogisch lösbare Bilder akzeptiert, gilt das für jedes erzeugte Rätsel. */
export function logicSolvable(p) {
  const g = Array.from({ length: p.n }, () => Array(p.n).fill(0));
  for (let step = 0; step < 2 * p.n * p.n + 5; step++) {
    const h = explainHint(p, g);
    if (!h) return true;
    if (h.kind === "fallback" || h.wrong) return false;
    for (const [r, c, v] of h.cells) g[r][c] = v;
  }
  return false;
}
