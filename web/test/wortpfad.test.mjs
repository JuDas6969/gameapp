// node web/test/wortpfad.test.mjs — Konsistenz und Zeiten für Wortpfad (Wend-Klon)
import { DIFFS } from "../engine/core.js";
import * as wp from "../engine/wortpfad.js";
import { isWord } from "../data/words.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SIZE = { leicht: 4, mittel: 5, schwer: 6, experte: 6 };
let worst = 0;

for (const diff of DIFFS) {
  const times = [];
  for (const seed of SEEDS) {
    const t0 = performance.now();
    const p = wp.generate(diff, seed);
    const dt = performance.now() - t0; times.push(dt); worst = Math.max(worst, dt);
    const tag = `${diff}/${seed}`;
    assert(p.n === SIZE[diff], `${tag}: Größe ${p.n}`);
    assert(dt < 1000, `${tag}: ${dt.toFixed(0)} ms`);
    // alle Felder genau einmal
    const cover = new Set();
    for (const w of p.words) for (const [r, c] of w.path) { const k = r * p.n + c; assert(!cover.has(k), `${tag}: Feld doppelt ${r},${c}`); cover.add(k); }
    assert(cover.size === p.n * p.n, `${tag}: ${cover.size} von ${p.n * p.n} Feldern belegt`);
    for (const w of p.words) {
      assert(isWord(w.word), `${tag}: ungültiges Wort ${w.word}`);
      assert(wp.isValidPath(p, w.path), `${tag}: Pfad ungültig für ${w.word}`);
      for (let i = 1; i < w.path.length; i++) assert(wp.adjacent(w.path[i - 1], w.path[i]), `${tag}: Pfad nicht benachbart (${w.word})`);
      assert(wp.wordOf(p, w.path) === w.word, `${tag}: Buchstaben passen nicht zu ${w.word}`);
      assert(!/[qyß]/.test(w.word), `${tag}: unerwünschter Buchstabe in ${w.word}`);
      if (diff === "experte") assert(w.word.length >= 6, `${tag}: Experte-Wort zu kurz ${w.word}`);
      else assert(w.word.length >= 4 && w.word.length <= 8, `${tag}: Länge ${w.word.length}`);
    }
    assert(p.letters.every((row) => row.every((ch) => /^[A-ZÄÖÜ]$/.test(ch))), `${tag}: Buchstaben nicht groß`);
    assert(wp.isSolved(p, p.words.map((w) => w.path)), `${tag}: Lösung nicht als gelöst erkannt`);
    assert(!wp.isSolved(p, p.words.slice(1).map((w) => w.path)), `${tag}: unvollständig als gelöst erkannt`);
    // Determinismus
    assert(JSON.stringify(wp.generate(diff, seed)) === JSON.stringify(p), `${tag}: nicht deterministisch`);
    // Hinweis
    const h0 = wp.findHint(p, []);
    assert(h0 && h0.index === 0 && !h0.blocked, `${tag}: Tipp am Anfang`);
    const h1 = wp.findHint(p, [], h0.path.slice(0, 2));
    assert(h1 && h1.index === 2 && h1.next[0] === h0.path[2][0] && h1.next[1] === h0.path[2][1], `${tag}: Tipp als Präfix`);
    assert(wp.findHint(p, p.words.map((w) => w.path)) === null, `${tag}: Tipp bei gelöstem Rätsel`);
    if (diff === "leicht") assert(p.words.length >= 2 && p.words.length <= 4, `${tag}: ${p.words.length} Wörter bei leicht`);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${diff.padEnd(8)} n=${SIZE[diff]}  Ø ${avg.toFixed(1)} ms, max ${Math.max(...times).toFixed(1)} ms`);
}
// isValidPath Negativfälle
{
  const p = wp.generate("leicht", 1);
  assert(!wp.isValidPath(p, [[0, 0], [0, 2]]), "Sprung erlaubt");
  assert(!wp.isValidPath(p, [[0, 0], [0, 1], [0, 0]]), "Wiederholung erlaubt");
  assert(wp.isValidPath(p, [[0, 0], [1, 1], [2, 1]]), "Diagonale verboten");
  assert(!wp.isValidPath(p, [[0, 0], [-1, 0]]), "außerhalb erlaubt");
}
console.log(`Worst case ${worst.toFixed(0)} ms`);
if (fails) { console.error(`${fails} Fehler`); process.exit(1); } else console.log("Wortpfad: alle Tests grün");
