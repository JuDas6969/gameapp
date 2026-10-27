// node web/test/kakuro.test.mjs — uniqueness, consistency & timing for Kakuro (all tiers, 5 seeds each)
import { DIFFS, grid } from "../engine/core.js";
import * as kakuro from "../engine/kakuro.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SEEDS = [1, 2, 3, 4, 5];

for (const diff of DIFFS) {
  const times = [];
  for (const seed of SEEDS) {
    const t0 = performance.now();
    const p = kakuro.generate(diff, seed * 1009 + DIFFS.indexOf(diff));
    const ms = performance.now() - t0; times.push(ms);
    const tag = `kakuro ${diff} seed ${seed}`;
    assert(p.kind === "kakuro" && p.diff === diff && p.n === p.black.length, `${tag} meta`);
    assert(kakuro.countSolutions(p) === 1, `${tag} unique`);
    assert(kakuro.isSolved(p, p.solution), `${tag} isSolved(solution)`);
    assert(kakuro.conflicts(p, p.solution).size === 0, `${tag} conflicts(solution) empty`);
    // structure: every white cell in exactly one across and one down run, runs 2..9, sums match solution
    const seenA = new Set(), seenD = new Set();
    for (const [table, seen] of [[p.across, seenA], [p.down, seenD]]) for (const [k, run] of Object.entries(table)) {
      assert(run.cells.length >= 2 && run.cells.length <= 9, `${tag} run ${k} length ${run.cells.length}`);
      assert(run.sum === run.cells.reduce((s, [r, c]) => s + p.solution[r][c], 0), `${tag} run ${k} sum`);
      for (const [r, c] of run.cells) { assert(!seen.has(r * 64 + c), `${tag} cell ${r},${c} in two runs`); seen.add(r * 64 + c); }
    }
    for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
      if (p.black[r][c]) assert(p.solution[r][c] === 0, `${tag} black cell ${r},${c} has value`);
      else assert(seenA.has(r * 64 + c) && seenD.has(r * 64 + c) && p.solution[r][c] >= 1 && p.solution[r][c] <= 9, `${tag} white cell ${r},${c} runs/value`);
    }
    // conflicts: duplicate in a run and wrong completed sum are flagged
    const g = grid(p.n, 0);
    const run = Object.values(p.across)[0], [[r0, c0], [r1, c1]] = run.cells;
    g[r0][c0] = 5; g[r1][c1] = 5;
    const bad = kakuro.conflicts(p, g); assert(bad.has(r0 * 64 + c0) && bad.has(r1 * 64 + c1), `${tag} conflicts duplicate`);
    // hints: wrong entry fixed first, then solving by hints reaches the solution
    const h = grid(p.n, 0); const wrong = p.solution[r0][c0] === 9 ? 1 : 9; h[r0][c0] = wrong;
    const fix = kakuro.findHint(p, h); assert(fix && fix.type === "fix" && fix.r === r0 && fix.c === c0 && fix.v === p.solution[r0][c0], `${tag} hint fix`);
    h[r0][c0] = 0; let steps = 0, naked = 0;
    for (;;) { const s = kakuro.findHint(p, h); if (!s) break; h[s.r][s.c] = s.v; steps++; if (s.type === "naked" || s.type === "deep") naked++; if (steps > 200) break; }
    assert(kakuro.isSolved(p, h) && JSON.stringify(h) === JSON.stringify(p.solution), `${tag} hints solve`);
    assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${tag} json`);
    console.log(`kakuro ${diff.padEnd(8)} seed ${seed}  ${p.n}×${p.n}  ${String(ms.toFixed(0)).padStart(5)} ms  hints ${steps} (${naked} logisch)`);
  }
  const max = Math.max(...times), avg = times.reduce((a, b) => a + b, 0) / times.length;
  assert(max <= 1000, `kakuro ${diff} generation too slow (${max.toFixed(0)} ms)`);
  console.log(`-- ${diff}: avg ${avg.toFixed(0)} ms, max ${max.toFixed(0)} ms\n`);
}

console.log(fails ? `\n${fails} FAILURES` : "\nall ok");
process.exit(fails ? 1 : 0);
