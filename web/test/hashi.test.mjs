// node web/test/hashi.test.mjs — Eindeutigkeit, Konsistenz, Zeiten für Hashiwokakero
import { DIFFS } from "../engine/core.js";
import * as hashi from "../engine/hashi.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SIZE = { leicht: 7, mittel: 9, schwer: 11, experte: 13 };

for (const diff of DIFFS) {
  const times = [];
  for (let s = 1; s <= 5; s++) {
    const seed = 100 * (DIFFS.indexOf(diff) + 1) + s;
    const t0 = performance.now();
    const p = hashi.generate(diff, seed);
    const ms = performance.now() - t0; times.push(ms);
    const tag = `${diff} seed ${seed}`;
    assert(p.kind === "hashi" && p.diff === diff && p.n === SIZE[diff], `${tag} meta`);
    const frac = p.islands.length / (p.n * p.n);
    assert(frac >= 0.15 && frac <= 0.32, `${tag} island density ${frac.toFixed(2)}`);
    assert(p.islands.every((i) => i.num >= 1 && i.num <= 8), `${tag} island numbers 1–8`);
    assert(hashi.countSolutions(p, 2, 400000) === 1, `${tag} unique`);
    assert(hashi.isSolved(p, p.solution), `${tag} isSolved(solution)`);
    const st = hashi.status(p, p.solution);
    assert(st.connected && !st.crossing && st.over.size === 0, `${tag} status(solution)`);
    assert(!hashi.isSolved(p, []), `${tag} empty not solved`);
    assert(hashi.findHint(p, p.solution) === null, `${tag} no hint when solved`);
    const hint = hashi.findHint(p, []);
    assert(hint && hint.count > 0 && p.solution.some((b) => b.count === hint.count && ((b.a === hint.a && b.b === hint.b) || (b.a === hint.b && b.b === hint.a))), `${tag} hint matches solution`);
    // wrong bridge gets removed by hint
    const sol = new Set(p.solution.map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}`));
    const { edges } = hashi.buildEdges(p);
    const wrong = edges.find((e) => !sol.has(`${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`));
    if (wrong) { const h2 = hashi.findHint(p, [{ a: wrong.a, b: wrong.b, count: 1 }]); assert(h2 && h2.count === 0 && h2.a === wrong.a && h2.b === wrong.b, `${tag} hint removes wrong bridge`); }
    assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${tag} json`);
    console.log(`${diff.padEnd(8)} seed ${String(seed).padStart(3)}  ${p.islands.length.toString().padStart(2)} Inseln  ${ms.toFixed(0).padStart(5)} ms`);
  }
  console.log(`${diff.padEnd(8)} max ${Math.max(...times).toFixed(0)} ms, avg ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)} ms\n`);
  assert(Math.max(...times) <= 1000, `${diff} worst case ≤ 1 s`);
}

// LinkedIn-Stil: jedes Rätsel ist ohne Rückfall-Tipp lösbar (10 Seeds je Stufe)
for (const diff of DIFFS) for (let s = 1; s <= 10; s++) assert(hashi.logicSolvable(hashi.generate(diff, 900 + s)), `${diff} seed ${900 + s} logicSolvable`);

console.log(fails ? `\n${fails} FAILURES` : "\nall ok");
process.exit(fails ? 1 : 0);
