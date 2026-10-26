// node web/test/engine.test.mjs — uniqueness & consistency for all tiers
import { ENGINES, DIFFS, GAME_KEYS, Rng, dailySeed, clone } from "../engine/index.js";
import * as sudoku from "../engine/sudoku.js";
import * as queens from "../engine/queens.js";
import * as tango from "../engine/tango.js";
import * as zip from "../engine/zip.js";
import * as patches from "../engine/patches.js";
import * as nonogram from "../engine/nonogram.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };

{ const a = new Rng(42), b = new Rng(42); for (let i = 0; i < 50; i++) assert(a.next() === b.next(), "rng deterministic"); }
assert(dailySeed("zip") === dailySeed("zip") && dailySeed("zip") !== dailySeed("queens"), "daily seed");

for (const diff of DIFFS) {
  for (const kind of GAME_KEYS) {
    const t0 = performance.now();
    const p = ENGINES[kind].generate(diff, 7 + DIFFS.indexOf(diff));
    const ms = (performance.now() - t0).toFixed(0);
    assert(p.diff === diff && p.kind === kind, `${kind} ${diff} meta`);
    switch (kind) {
      case "sudoku":
        assert(sudoku.countSolutions(clone(p.givens)) === 1, `${kind} ${diff} unique`);
        assert(sudoku.conflicts(p.solution).size === 0, `${kind} ${diff} solution clean`); break;
      case "queens": {
        assert(queens.solutions(p.n, p.regions).length === 1, `${kind} ${diff} unique`);
        const qs = new Set(p.solution.map((c, r) => r * 64 + c));
        assert(queens.isSolved(p, qs) && queens.conflicts(p, qs).size === 0, `${kind} ${diff} solution`); break; }
      case "tango":
        assert(tango.countSolutions(clone(p.givens), p.constraints) === 1, `${kind} ${diff} unique`);
        assert(tango.conflicts(p, p.solution).size === 0, `${kind} ${diff} solution clean`); break;
      case "zip": {
        const s = new zip.Solver(p.n, new Set(p.walls));
        assert(s.countPaths(new Map(Object.entries(p.waypoints).map(([k, v]) => [Number(k), v]))) === 1, `${kind} ${diff} unique`);
        assert(zip.isSolved(p, p.solution), `${kind} ${diff} solution valid`);
        assert(zip.stepError(p, [], ...p.solution[0]) === null && zip.stepError(p, [], ...p.solution[1]) !== null, `${kind} ${diff} stepError`); break; }
      case "patches":
        assert(patches.countSolutions(p.n, p.clues) === 1, `${kind} ${diff} unique`);
        assert(patches.isSolved(p, p.solution), `${kind} ${diff} solution valid`); break;
      case "nonogram": {
        const g = p.solution.map((row) => row.map((v) => (v ? 1 : 0)));
        assert(nonogram.isSolved(p, g), `${kind} ${diff} solution`);
        const s = nonogram.satisfied(p, g); assert(s.rows.size === p.n && s.cols.size === p.n, `${kind} ${diff} satisfied`); break; }
    }
    console.log(`${kind.padEnd(9)} ${diff.padEnd(8)} ${ms.padStart(6)} ms`);
  }
}
// JSON round trip (worker transfer)
for (const kind of GAME_KEYS) { const p = ENGINES[kind].generate("leicht", 5); assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${kind} json`); }

console.log(fails ? `\n${fails} FAILURES` : "\nall ok");
process.exit(fails ? 1 : 0);
