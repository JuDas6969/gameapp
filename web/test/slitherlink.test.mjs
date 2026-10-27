// node web/test/slitherlink.test.mjs — uniqueness, solution validity, hints, timing (4 tiers × 5 seeds)
import { DIFFS } from "../engine/core.js";
import * as sl from "../engine/slitherlink.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SIZE = { leicht: 5, mittel: 7, schwer: 8, experte: 10 };

for (const diff of DIFFS) {
  let max = 0, sum = 0;
  for (let seed = 1; seed <= 5; seed++) {
    const t0 = performance.now();
    const p = sl.generate(diff, seed * 7919 + 3);
    const ms = performance.now() - t0; max = Math.max(max, ms); sum += ms;
    const tag = `slitherlink ${diff} seed ${seed}`;
    assert(p.kind === "slitherlink" && p.diff === diff && p.n === SIZE[diff], `${tag} meta`);
    assert(p.clues.length === p.n && p.clues.every((row) => row.length === p.n && row.every((v) => v >= -1 && v <= 3)), `${tag} clues shape`);
    assert(sl.countSolutions(p) === 1, `${tag} unique`);
    const sol = new Set(p.solution);
    assert(sol.size === p.solution.length && sl.isSolved(p, sol), `${tag} isSolved(solution)`);
    const conf = sl.conflicts(p, sol); assert(conf.cells.size === 0 && conf.nodes.size === 0 && conf.ends.size === 0, `${tag} solution conflict-free`);
    const cnt = sl.cellCounts(p, sol);
    assert(p.clues.every((row, r) => row.every((v, c) => v < 0 || v === cnt[r][c])), `${tag} clue counts match`);
    assert(!sl.isSolved(p, new Set([...sol].slice(1))), `${tag} partial not solved`);
    // hints walk from empty to solved, including recovering from a wrong edge/cross
    const edges = new Set(), crosses = new Set();
    const wrong = sl.geo(p.n).keys.find((k) => !sol.has(k)); edges.add(wrong);
    const wrongCross = p.solution[0]; crosses.add(wrongCross);
    let steps = 0, hnt;
    while ((hnt = sl.findHint(p, edges, crosses)) && steps++ < 4 * p.n * (p.n + 1) + 10) {
      if (hnt.type === "add" || hnt.type === "uncross") { edges.add(hnt.edge); crosses.delete(hnt.edge); }
      else if (hnt.type === "remove") edges.delete(hnt.edge);
      else if (hnt.type === "cross") { crosses.add(hnt.edge); edges.delete(hnt.edge); }
      assert(typeof hnt.reason === "string" && hnt.reason.length > 0, `${tag} hint reason`);
    }
    assert(sl.isSolved(p, edges) && sl.findHint(p, edges, crosses) === null, `${tag} hints reach solution`);
    assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${tag} json`);
  }
  const vis = (() => { const p = sl.generate(diff, 7919 + 3); const f = p.clues.flat(); return (f.filter((v) => v >= 0).length / f.length * 100).toFixed(0); })();
  console.log(`${diff.padEnd(8)} n=${SIZE[diff]}  max ${max.toFixed(0).padStart(5)} ms  avg ${(sum / 5).toFixed(0).padStart(5)} ms  clues ~${vis} %`);
  assert(max < 1000, `${diff} generation under 1 s (max ${max.toFixed(0)} ms)`);
}

// LinkedIn-Stil: jedes Rätsel ist vom leeren Stand aus ohne Rückfall-Tipp lösbar (10 Seeds je Stufe)
for (const diff of DIFFS) for (let s = 1; s <= 10; s++) assert(sl.logicSolvable(sl.generate(diff, 500 + s)), `slitherlink ${diff} seed ${500 + s} logicSolvable`);

console.log(fails ? `\n${fails} FAILURES` : "\nall ok");
process.exit(fails ? 1 : 0);
