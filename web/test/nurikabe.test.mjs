// node web/test/nurikabe.test.mjs — Eindeutigkeit, Konsistenz und Zeiten für Nurikabe („Inseln“)
import { DIFFS } from "../engine/core.js";
import * as nk from "../engine/nurikabe.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SEEDS = [1, 2, 3, 4, 5];

// Unabhängige Prüfung der Lösung gegen die Regeln
function validSolution(p) {
  const n = p.n, w = p.solution, inb = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
  // kein 2×2 Wasser
  for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++) if (w[r][c] && w[r][c + 1] && w[r + 1][c] && w[r + 1][c + 1]) return "2x2 Wasser";
  // Wasser zusammenhängend
  let start = null, total = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (w[r][c] === 1) { total++; start ??= [r, c]; }
  if (!start) return "kein Wasser";
  const seen = new Set([start.join(",")]), st = [start];
  while (st.length) { const [r, c] = st.pop(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (inb(rr, cc) && w[rr][cc] === 1 && !seen.has(`${rr},${cc}`)) { seen.add(`${rr},${cc}`); st.push([rr, cc]); } } }
  if (seen.size !== total) return "Wasser nicht zusammenhängend";
  // Inseln: genau eine Zahl, Größe = Zahl
  const vis = new Set();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (w[r][c] === 1 || vis.has(`${r},${c}`)) continue;
    const cells = [], clues = [], st2 = [[r, c]]; vis.add(`${r},${c}`);
    while (st2.length) { const [y, x] = st2.pop(); cells.push([y, x]); if (p.clues[y][x]) clues.push(p.clues[y][x]); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = y + dr, cc = x + dc; if (inb(rr, cc) && w[rr][cc] === 0 && !vis.has(`${rr},${cc}`)) { vis.add(`${rr},${cc}`); st2.push([rr, cc]); } } }
    if (clues.length !== 1) return `Insel mit ${clues.length} Zahlen`;
    if (clues[0] !== cells.length) return `Inselgröße ${cells.length} ≠ ${clues[0]}`;
    if (cells.length > 6) return "Insel > 6";
  }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.clues[r][c] && w[r][c] === 1) return "Zahl auf Wasser";
  return null;
}

const SIZE = { leicht: 5, mittel: 7, schwer: 9, experte: 10 };
let worst = 0;
for (const diff of DIFFS) {
  const times = [];
  for (const seed of SEEDS) {
    const t0 = performance.now();
    const p = nk.generate(diff, seed);
    const ms = performance.now() - t0; times.push(ms); worst = Math.max(worst, ms);
    assert(p.kind === "nurikabe" && p.diff === diff && p.n === SIZE[diff], `${diff}/${seed} meta`);
    const err = validSolution(p); assert(!err, `${diff}/${seed} Lösung ungültig: ${err}`);
    assert(nk.countSolutions(p.n, p.clues, 2) === 1, `${diff}/${seed} nicht eindeutig`);
    const g = p.solution.map((row) => row.map((v) => (v === 1 ? 1 : 2)));
    assert(nk.isSolved(p, g), `${diff}/${seed} isSolved(solution)`);
    assert(nk.conflicts(p, g).size === 0, `${diff}/${seed} conflicts(solution) leer`);
    assert(nk.completeIslands(p, g).size === p.solution.flat().filter((v) => v === 0).length, `${diff}/${seed} alle Inseln vollständig`);
    const g2 = p.solution.map((row) => row.map((v) => (v === 1 ? 1 : 0))); // Wasser gesetzt, Inseln unmarkiert
    assert(nk.isSolved(p, g2), `${diff}/${seed} isSolved(nur Wasser)`);
    assert(nk.findHint(p, g2) === null || nk.findHint(p, g2).v === 2, `${diff}/${seed} Hint bei fertigem Wasser`);
    // Leeres Gitter: Hint existiert und stimmt mit Lösung überein
    const g0 = p.solution.map((row) => row.map(() => 0));
    const hnt = nk.findHint(p, g0);
    assert(hnt && ((hnt.v === 1) === (p.solution[hnt.r][hnt.c] === 1)), `${diff}/${seed} Hint auf leerem Gitter`);
    // Fehler-Hint: falsches Wasser wird korrigiert
    const bad = g0.map((r) => r.slice()); outer: for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (p.solution[r][c] === 0 && !p.clues[r][c]) { bad[r][c] = 1; const h2 = nk.findHint(p, bad); assert(h2 && h2.r === r && h2.c === c && h2.v === 2, `${diff}/${seed} Fehler-Hint`); break outer; }
    // Konflikt: 2×2 Wasser wird erkannt
    const g3 = g0.map((r) => r.slice()); g3[0][0] = g3[0][1] = g3[1][0] = g3[1][1] = 1;
    assert(nk.conflicts(p, g3).size >= 4, `${diff}/${seed} 2x2-Konflikt`);
    // JSON-Roundtrip (Worker)
    assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${diff}/${seed} json`);
  }
  console.log(`${diff.padEnd(8)} ${String(SIZE[diff]).padStart(2)}×${SIZE[diff]}  ${times.map((t) => String(Math.round(t)).padStart(5)).join(" ")} ms`);
}
// LinkedIn-Stil: jedes Rätsel ist vom leeren Gitter aus ohne Rückfall-Tipp lösbar (10 Seeds je Stufe)
for (const diff of DIFFS) for (let s = 1; s <= 10; s++) assert(nk.logicSolvable(nk.generate(diff, 1000 + s)), `${diff}/${1000 + s} logicSolvable`);
assert(worst <= 1000, `Worst Case ${Math.round(worst)} ms > 1 s`);
console.log(fails ? `\n${fails} FAILURES` : `\nall ok (worst ${Math.round(worst)} ms)`);
process.exit(fails ? 1 : 0);
