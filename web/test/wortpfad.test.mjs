// node web/test/wortpfad.test.mjs — Konsistenz und Zeiten für Wortpfad (Wend-Klon, 4er-Nachbarschaft, Löcher)
import { DIFFS } from "../engine/core.js";
import * as wp from "../engine/wortpfad.js";
import { isWord } from "../data/words.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const SIZE = { leicht: 4, mittel: 5, schwer: 6, experte: 6 };
const HOLES = { leicht: [0, 0], mittel: [1, 1], schwer: [1, 2], experte: [2, 2] };
let worst = 0;

for (const diff of DIFFS) {
  const times = [];
  for (const seed of SEEDS) {
    const t0 = performance.now();
    const p = wp.generate(diff, seed);
    const dt = performance.now() - t0; times.push(dt); worst = Math.max(worst, dt);
    const tag = `${diff}/${seed}`, n = p.n;
    assert(n === SIZE[diff], `${tag}: Größe ${n}`);
    assert(dt < 1000, `${tag}: ${dt.toFixed(0)} ms`);
    // Löcher: Anzahl je Stufe, nur im Inneren (nie am Rand), Buchstabe leer
    assert(Array.isArray(p.holes) && p.holes.length >= HOLES[diff][0] && p.holes.length <= HOLES[diff][1], `${tag}: ${p.holes?.length} Löcher`);
    const mask = wp.holeMask(n, p.holes);
    for (const { r, c, w, h } of p.holes) assert(r >= 1 && c >= 1 && r + h <= n - 1 && c + w <= n - 1 && w >= 1 && h >= 1, `${tag}: Loch am Rand ${JSON.stringify({ r, c, w, h })}`);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (mask[r * n + c]) assert(p.letters[r][c] === "", `${tag}: Loch mit Buchstabe ${r},${c}`);
      else assert(/^[A-ZÄÖÜ]$/.test(p.letters[r][c]), `${tag}: Buchstabe nicht groß ${r},${c}`);
    }
    const free = n * n - mask.reduce((a, b) => a + b, 0);
    assert(wp.freeCount(p) === free, `${tag}: freeCount`);
    // freie Felder zusammenhängend
    {
      const start = p.words[0].path[0], seen = new Set([start[0] * n + start[1]]), st = [start];
      while (st.length) { const [r, c] = st.pop(); for (const [rr, cc] of wp.neighbors(p, r, c)) if (!seen.has(rr * n + cc)) { seen.add(rr * n + cc); st.push([rr, cc]); } }
      assert(seen.size === free, `${tag}: freie Felder nicht zusammenhängend`);
    }
    // alle freien Felder genau einmal
    const cover = new Set();
    for (const w of p.words) for (const [r, c] of w.path) { const k = r * n + c; assert(!cover.has(k), `${tag}: Feld doppelt ${r},${c}`); assert(!mask[k], `${tag}: Pfad durch Loch`); cover.add(k); }
    assert(cover.size === free, `${tag}: ${cover.size} von ${free} Feldern belegt`);
    for (const w of p.words) {
      assert(isWord(w.word), `${tag}: ungültiges Wort ${w.word}`);
      assert(wp.isValidPath(p, w.path), `${tag}: Pfad ungültig für ${w.word}`);
      for (let i = 1; i < w.path.length; i++) assert(Math.abs(w.path[i - 1][0] - w.path[i][0]) + Math.abs(w.path[i - 1][1] - w.path[i][1]) === 1, `${tag}: Pfad nicht orthogonal benachbart (${w.word})`);
      assert(wp.wordOf(p, w.path) === w.word, `${tag}: Buchstaben passen nicht zu ${w.word}`);
      assert(!/[qyß]/.test(w.word), `${tag}: unerwünschter Buchstabe in ${w.word}`);
      if (diff === "experte") assert(w.word.length >= 6, `${tag}: Experte-Wort zu kurz ${w.word}`);
      else assert(w.word.length >= 4 && w.word.length <= 8, `${tag}: Länge ${w.word.length}`);
    }
    assert(wp.isSolved(p, p.words.map((w) => w.path)), `${tag}: Lösung nicht als gelöst erkannt`);
    assert(!wp.isSolved(p, p.words.slice(1).map((w) => w.path)), `${tag}: unvollständig als gelöst erkannt`);
    p.words.forEach((w, i) => assert(wp.solutionIndex(p, w.path) === i, `${tag}: solutionIndex`));
    // Determinismus
    assert(JSON.stringify(wp.generate(diff, seed)) === JSON.stringify(p), `${tag}: nicht deterministisch`);
    if (diff === "leicht") assert(p.words.length >= 2 && p.words.length <= 4, `${tag}: ${p.words.length} Wörter bei leicht`);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${diff.padEnd(8)} n=${SIZE[diff]}  Ø ${avg.toFixed(1)} ms, max ${Math.max(...times).toFixed(1)} ms`);
}
// isValidPath / Nachbarschaft / startReason
{
  const p = wp.generate("leicht", 1);
  assert(!wp.isValidPath(p, [[0, 0], [0, 2]]), "Sprung erlaubt");
  assert(!wp.isValidPath(p, [[0, 0], [0, 1], [0, 0]]), "Wiederholung erlaubt");
  assert(!wp.isValidPath(p, [[0, 0], [1, 1]]), "Diagonale erlaubt");
  assert(wp.isValidPath(p, [[0, 0], [0, 1], [1, 1]]), "orthogonaler Pfad verboten");
  assert(!wp.isValidPath(p, [[0, 0], [-1, 0]]), "außerhalb erlaubt");
  assert(wp.startReason(p, [0, 0]) === "corner", "Ecke nicht erkannt");
  assert(wp.startReason(p, [0, 1]) === null, "Randfeld als Ecke erkannt");
  const q = wp.generate("mittel", 1), { r, c } = q.holes[0];
  assert(!wp.isValidPath(q, [[r, c]]), "Loch begehbar");
  assert(!wp.isValidPath(q, [[r - 1, c], [r, c]]), "Pfad ins Loch erlaubt");
  // Feld mit nur einem freien Nachbarn → deadend
  const mini = { n: 3, letters: [["A", "B", "C"], ["D", "", "E"], ["F", "G", "H"]] };
  assert(wp.startReason(mini, [0, 1]) === null && wp.startReason(mini, [0, 0]) === "corner", "Ecke/gerade Kante neben Loch");
  const dead = { n: 3, letters: [["A", "", ""], ["D", "E", "F"], ["G", "H", "I"]] };
  assert(wp.startReason(dead, [0, 0]) === "deadend", "deadend nicht erkannt");
}
console.log(`Worst case ${worst.toFixed(0)} ms`);
if (fails) { console.error(`${fails} Fehler`); process.exit(1); } else console.log("Wortpfad: alle Tests grün");
