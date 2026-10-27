// node web/test/kreuzwort.test.mjs — Gittergültigkeit, Hinweise, Konsistenz, Zeiten für Kreuzwort
import { DIFFS } from "../engine/core.js";
import * as kw from "../engine/kreuzwort.js";
import { CLUES } from "../data/kreuzwort.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };

const nClues = Object.keys(CLUES).length, nShort = Object.keys(CLUES).filter((w) => w.length <= 4).length;
console.log(`${nClues} Wörter mit Hinweis, davon ${nShort} mit Länge 3–4\n`);
assert(nClues >= 1500, "mindestens 1500 Hinweise");
assert(nShort >= 400, "mindestens 400 kurze Wörter");
assert(Object.keys(CLUES).every((w) => /^[A-ZÄÖÜ]{3,8}$/.test(w) && CLUES[w].length), "Wortformat");

for (const diff of DIFFS) {
  const times = [];
  for (let s = 1; s <= 5; s++) {
    const seed = 100 * (DIFFS.indexOf(diff) + 1) + s;
    const t0 = performance.now();
    const p = kw.generate(diff, seed);
    const ms = performance.now() - t0; times.push(ms);
    const tag = `${diff} seed ${seed}`, n = p.n;
    assert(p.kind === "kreuzwort" && p.diff === diff && n === kw.SIZE[diff], `${tag} meta`);
    // Symmetrie
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) assert(p.black[r][c] === p.black[n - 1 - r][n - 1 - c], `${tag} symmetrie`);
    // Slots: Länge ≥ 3, Wort passt zur Lösung, Hinweis vorhanden, Nummern
    const covered = new Set();
    for (const sl of p.slots) {
      assert(sl.len >= 3 && sl.len <= 8, `${tag} slotlänge ${sl.len}`);
      assert(sl.word.length === sl.len && CLUES[sl.word]?.includes(sl.clue), `${tag} slot ${sl.num} ${sl.dir} hat Hinweis`);
      kw.slotCells(sl).forEach(([r, c], i) => { covered.add(r * 64 + c); assert(p.solution[r][c] === sl.word[i] && !p.black[r][c], `${tag} lösung ${sl.word}`); });
      assert(Number.isInteger(sl.num) && sl.num >= 1, `${tag} nummer`);
    }
    // jedes weiße Feld in mind. einem Slot, Läufe der Länge 2 verboten
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (p.black[r][c]) assert(p.solution[r][c] === "", `${tag} schwarz leer`);
      else assert(covered.has(r * 64 + c) && /^[A-ZÄÖÜ]$/.test(p.solution[r][c]), `${tag} weiß abgedeckt (${r},${c})`);
    }
    const words = p.slots.map((x) => x.word);
    assert(new Set(words).size === words.length, `${tag} keine Wortdoppelung`);
    // Nummerierung: aufsteigend in Leserichtung, gleiche Startzelle → gleiche Nummer
    const byStart = new Map();
    for (const sl of p.slots) { const k = sl.r * 64 + sl.c; if (byStart.has(k)) assert(byStart.get(k) === sl.num, `${tag} nummer pro startzelle`); byStart.set(k, sl.num); }
    const sorted = [...byStart.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    assert(sorted.every((v, i) => v === i + 1), `${tag} nummern lückenlos in leserichtung`);
    // isSolved / conflicts / findHint
    const empty = Array.from({ length: n }, () => Array(n).fill(""));
    assert(kw.isSolved(p, p.solution), `${tag} isSolved(solution)`);
    assert(!kw.isSolved(p, empty), `${tag} leer nicht gelöst`);
    assert(kw.conflicts(p, p.solution).size === 0, `${tag} keine Konflikte in Lösung`);
    assert(kw.findHint(p, p.solution) === null, `${tag} kein Tipp wenn gelöst`);
    const h = kw.findHint(p, empty);
    assert(h && p.solution[h.r][h.c] === h.letter && h.slot && !h.wrong, `${tag} Tipp auf leerem Gitter`);
    const g2 = p.solution.map((row) => row.slice());
    const w = p.slots[0], [wr, wc] = kw.slotCells(w)[0];
    g2[wr][wc] = p.solution[wr][wc] === "X" ? "Y" : "X";
    const h2 = kw.findHint(p, g2);
    assert(h2 && h2.r === wr && h2.c === wc && h2.wrong && h2.letter === p.solution[wr][wc], `${tag} Tipp korrigiert falschen Buchstaben`);
    assert(kw.conflicts(p, g2).has(wr * 64 + wc) && kw.conflicts(p, g2).size === 1, `${tag} conflicts`);
    assert(JSON.stringify(JSON.parse(JSON.stringify(p))) === JSON.stringify(p), `${tag} json`);
    const blacks = p.black.flat().filter(Boolean).length;
    console.log(`${diff.padEnd(8)} seed ${String(seed).padStart(3)}  ${n}×${n}  ${String(p.slots.length).padStart(2)} Wörter  ${String(blacks).padStart(2)} schwarz  ${ms.toFixed(0).padStart(5)} ms`);
  }
  console.log(`${diff.padEnd(8)} max ${Math.max(...times).toFixed(0)} ms, avg ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)} ms\n`);
  assert(Math.max(...times) <= 1000, `${diff} worst case ≤ 1 s`);
}

// Determinismus
assert(JSON.stringify(kw.generate("schwer", 42)) === JSON.stringify(kw.generate("schwer", 42)), "deterministisch");

if (fails) { console.error(`\n${fails} Fehler`); process.exit(1); } else console.log("Kreuzwort: alle Tests bestanden");
