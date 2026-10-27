// Wortleiter: 4 Stufen × 10 Seeds – Leiter gültig, Hinweise vorhanden, keine Dopplungen, Zeit < 1 s.
import { generate, isOrderValid, isSolved, findHint, uniqueMiddleOrder, LENGTH, TOTAL } from "../engine/wortleiter.js";
import { CLUES } from "../data/wortleiter.js";
import { WORDS } from "../data/words.js";

let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.error("FAIL:", msg); } };

// Daten
const n4 = Object.keys(CLUES).filter((w) => w.length === 4).length, n5 = Object.keys(CLUES).filter((w) => w.length === 5).length;
ok(n4 >= 1200, `zu wenige 4er-Hinweise: ${n4}`); ok(n5 >= 600, `zu wenige 5er-Hinweise: ${n5}`);
for (const [w, c] of Object.entries(CLUES)) {
  ok(w === w.toUpperCase() && !/ß/.test(w), `Schlüssel nicht normiert: ${w}`);
  ok(typeof c === "string" && c.length >= 3, `leerer Hinweis: ${w}`);
  ok(WORDS[w.length]?.common.includes(w.toLowerCase()), `nicht in common: ${w}`);
}

let worst = 0;
for (const diff of ["leicht", "mittel", "schwer", "experte"]) {
  for (let s = 1; s <= 10; s++) {
    const seed = `${s * 104729 + 17}`;
    const t0 = performance.now();
    const p = generate(diff, seed);
    const dt = performance.now() - t0; worst = Math.max(worst, dt);
    ok(dt < 1000, `${diff}/${seed}: ${dt.toFixed(0)} ms`);
    ok(p.kind === "wortleiter" && p.diff === diff && p.length === LENGTH[diff], `${diff}: Meta`);
    ok(p.ladder.length === TOTAL && p.ladder.every((w) => w.length === p.length), `${diff}: Länge`);
    ok(isOrderValid(p.ladder), `${diff}/${seed}: Hamming ≠ 1 in ${p.ladder.join(" ")}`);
    ok(new Set(p.ladder).size === TOTAL, `${diff}/${seed}: Dopplung in ${p.ladder.join(" ")}`);
    ok(p.ladder.every((w) => CLUES[w] && p.clues[w] === CLUES[w]), `${diff}/${seed}: Hinweis fehlt`);
    ok(uniqueMiddleOrder(p.ladder.slice(1, 6)), `${diff}/${seed}: Mittelreihenfolge mehrdeutig`);
    const shuffled = p.shuffle.map((i) => p.ladder[1 + i]);
    ok(p.shuffle.length === 5 && new Set(p.shuffle).size === 5 && !isOrderValid(shuffled), `${diff}/${seed}: Mischung`);
    // Determinismus
    ok(JSON.stringify(generate(diff, seed)) === JSON.stringify(p), `${diff}/${seed}: nicht deterministisch`);
    // isSolved vor- und rückwärts
    ok(isSolved(p, p.ladder) && isSolved(p, [...p.ladder].reverse()), `${diff}/${seed}: isSolved`);
    ok(!isSolved(p, [null, ...p.ladder.slice(1)]), `${diff}/${seed}: isSolved falsch positiv`);
    // Tipps: Phase 2 führt per Tausch zur Lösung
    const order = [...shuffled]; let steps = 0;
    while (!isOrderValid(order) && steps < 10) { const hnt = findHint(p, { phase: 2, order }); if (!hnt) break; [order[hnt.i], order[hnt.j]] = [order[hnt.j], order[hnt.i]]; steps++; }
    ok(isOrderValid(order), `${diff}/${seed}: Tausch-Tipps führen nicht zum Ziel`);
    const lh = findHint(p, { phase: 1, word: p.ladder[1], buffer: [p.ladder[1][0], "?"] });
    ok(lh && lh.type === "letter" && lh.pos === 1 && lh.letter === p.ladder[1][1], `${diff}/${seed}: Buchstaben-Tipp`);
  }
}
console.log(`Wortleiter: ${n4} Hinweise (4), ${n5} Hinweise (5); schlechteste Generierung ${worst.toFixed(1)} ms; ${fails ? fails + " Fehler" : "alles ok"}`);
process.exit(fails ? 1 : 0);
