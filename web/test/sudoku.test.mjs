// node web/test/sudoku.test.mjs — Sudoku 6×6/9×9 × variants × tiers: uniqueness, logic-solvability, constraints, hints, timing
import * as S from "../engine/sudoku.js";
import { DIFFS } from "../engine/core.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SEEDS = Number(process.argv[2]) || 3;
const rows = [];

function checkSolution(p) {
  const n = p.n, s = p.solution, ok = (cells) => new Set(cells.map(([r, c]) => s[r][c])).size === cells.length;
  for (let i = 0; i < n; i++) {
    if (!ok(Array.from({ length: n }, (_, c) => [i, c])) || !ok(Array.from({ length: n }, (_, r) => [r, i]))) return "row/col";
  }
  const reg = new Map();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const id = p.boxes[r][c]; if (!reg.has(id)) reg.set(id, []); reg.get(id).push([r, c]); }
  if (reg.size !== n) return "region count";
  for (const cells of reg.values()) {
    if (cells.length !== n || !ok(cells)) return "region";
    // connected
    const key = new Set(cells.map(([r, c]) => r * 64 + c)), seen = new Set([key.values().next().value]), st = [...seen];
    while (st.length) { const k = st.pop(), r = k >> 6, c = k & 63; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (r + dr) * 64 + c + dc; if (r + dr >= 0 && c + dc >= 0 && c + dc < n && key.has(q) && !seen.has(q)) { seen.add(q); st.push(q); } } }
    if (seen.size !== n) return "region not connected";
  }
  for (const u of p.extraUnits) if (u.cells.length !== n || !ok(u.cells)) return "extra unit";
  const covered = new Set();
  for (const cg of p.cages) {
    if (!ok(cg.cells)) return "cage repeat";
    if (cg.cells.reduce((a, [r, c]) => a + s[r][c], 0) !== cg.sum) return "cage sum";
    if (cg.cells.length < 1 || cg.cells.length > (n === 9 ? 5 : 4)) return "cage size";
    cg.cells.forEach(([r, c]) => covered.add(r * 64 + c));
  }
  if (p.variant === "killer" && covered.size !== n * n) return "cages cover";
  for (const [k, t] of Object.entries(p.parity)) { const v = s[Math.floor(k / 64)][k % 64]; if ((v % 2 === 0) !== (t === "e")) return "parity"; }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.givens[r][c] && p.givens[r][c] !== s[r][c]) return "givens";
  if (S.conflicts(p, s).size) return "conflicts";
  return null;
}

for (const size of ["6", "9"]) for (const variant of S.VARIANTS) {
  if (variant === "fenster" && size === "6") continue;
  for (const diff of DIFFS) {
    let max = 0, sum = 0, giv = 0;
    for (let k = 0; k < SEEDS; k++) {
      const seed = 9000 + k * 7919 + DIFFS.indexOf(diff);
      const t0 = performance.now();
      const p = S.generate(diff, seed, { size, variant });
      const ms = performance.now() - t0; sum += ms; max = Math.max(max, ms);
      const tag = `${size} ${variant} ${diff} #${seed}`;
      giv += p.givens.flat().filter(Boolean).length;
      assert(p.n === +size && p.variant === variant && p.diff === diff, `${tag} meta`);
      assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${tag} json`);
      const bad = checkSolution(p); assert(!bad, `${tag} solution: ${bad}`);
      assert(S.countSolutions(p) === 1, `${tag} unique`);
      assert(S.logicSolvable(p), `${tag} logicSolvable`);
      // hint chain solves the puzzle and always explains (two parts, never the fallback)
      const g = p.givens.map((r) => r.slice());
      for (let i = 0; i < 200; i++) {
        const h = S.explainHint(p, g); if (!h) break;
        assert(h.type !== "any" && h.type !== "fix", `${tag} hint type ${h.type}`);
        assert(h.text.split("\n").length === 2 && h.text.length > 30, `${tag} hint text`);
        assert(h.v === p.solution[h.r][h.c], `${tag} hint value`);
        g[h.r][h.c] = h.v;
      }
      assert(JSON.stringify(g) === JSON.stringify(p.solution), `${tag} hints solve`);
      assert(ms < 1500, `${tag} time ${ms.toFixed(0)} ms`);
    }
    rows.push([size, variant, diff, sum / SEEDS, max, giv / SEEDS]);
  }
}
// wrong entry → fix hint first
{ const p = S.generate("mittel", 5, { size: "9", variant: "killer" }); const g = p.givens.map((r) => r.slice());
  outer: for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!g[r][c]) { g[r][c] = (p.solution[r][c] % 9) + 1; break outer; }
  assert(S.explainHint(p, g).type === "fix", "fix hint first"); }
// daily: opts {} → 6×6 klassisch
{ const p = S.generate("leicht", 1, {}); assert(p.n === 6 && p.variant === "klassisch", "default opts"); }
// show a few explanations
for (const [variant, size, diff] of [["killer", "9", "experte"], ["diagonal", "9", "mittel"], ["klassisch", "9", "experte"], ["paritaet", "6", "schwer"], ["fenster", "9", "schwer"]]) {
  const p = S.generate(diff, 77, { size, variant }); const g = p.givens.map((r) => r.slice()); const seen = new Set();
  for (let i = 0; i < 81; i++) { const h = S.explainHint(p, g); if (!h) break; if (!seen.has(h.type) || /Käfig|Diagonale|Fenster|markiert|ausgeschlossen/.test(h.text) && seen.size < 12) { seen.add(h.type); if (seen.size <= 12 && i % 3 === 0) console.log(`  [${variant} ${size} ${h.type}] ${h.text.replace("\n", " ⏎ ")}`); } g[h.r][h.c] = h.v; }
}
console.log("\nsize variant    diff      avg ms  max ms  givens");
for (const [s, v, d, a, m, gv] of rows) console.log(`${s}×${s}  ${v.padEnd(9)} ${d.padEnd(8)} ${a.toFixed(0).padStart(6)} ${m.toFixed(0).padStart(7)}  ${gv.toFixed(1).padStart(6)}`);
console.log(fails ? `\n${fails} FAILURES` : "\nall ok");
process.exit(fails ? 1 : 0);
