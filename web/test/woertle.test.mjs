// node web/test/woertle.test.mjs — Lösungswörter, Längen, Score-Logik für Wörtle
import { DIFFS } from "../engine/core.js";
import * as w from "../engine/woertle.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const diff of DIFFS) {
  const seen = new Set();
  for (let s = 1; s <= 20; s++) {
    const seed = 1000 * (DIFFS.indexOf(diff) + 1) + s;
    const t0 = performance.now();
    const p = w.generate(diff, seed);
    const ms = performance.now() - t0;
    const tag = `${diff} seed ${seed} (${p.solution})`;
    assert(p.kind === "woertle" && p.diff === diff && p.maxGuesses === 6, `${tag} meta`);
    assert(p.length === w.LENGTH[diff] && p.solution.length === p.length, `${tag} length`);
    assert(w.isValidGuess(p.solution) && w.isValidGuess(p.solution.toUpperCase()), `${tag} solution is a word`);
    assert(!/[ßy]/.test(p.solution), `${tag} no ß/y`);
    assert(w.score(p.solution, p.solution).every((x) => x === "ok"), `${tag} score(sol,sol) all ok`);
    assert(eq(w.generate(diff, seed), p), `${tag} deterministic`);
    assert(ms < 1000, `${tag} time ${ms.toFixed(0)}ms`);
    const hint = w.findHint(p, []);
    assert(hint && p.solution[hint.pos] === hint.letter, `${tag} hint matches solution`);
    assert(w.findHint(p, [p.solution]) === null, `${tag} no hint when solved`);
    seen.add(p.solution);
  }
  assert(seen.size >= 15, `${diff}: zu wenig Varianz (${seen.size}/20 verschiedene Wörter)`);
}

// Doppelbuchstaben-Logik
assert(eq(w.score("ALLEE", "ALLES"), ["ok", "ok", "ok", "ok", "miss"]), "ALLEE/ALLES");
assert(eq(w.score("ELLEN", "ALLEE"), ["near", "ok", "ok", "ok", "miss"]), "ELLEN/ALLEE");
assert(eq(w.score("EEEEE", "ALLEE"), ["miss", "miss", "miss", "ok", "ok"]), "EEEEE/ALLEE: nur 2 E");
assert(eq(w.score("LEBEN", "ALLEE"), ["near", "near", "miss", "ok", "miss"]), "LEBEN/ALLEE");
assert(eq(w.score("abcde", "EDCBA"), ["near", "near", "ok", "near", "near"]), "case-insensitive");
assert(eq(w.score("ÖFEN", "OFEN"), ["miss", "ok", "ok", "ok"]), "Umlaut ≠ Vokal");
assert(eq(w.score("TAAL", "ALTA"), ["near", "near", "near", "near"]), "TAAL/ALTA");
assert(eq(w.score("AAXX", "XAAA"), ["near", "ok", "near", "miss"]), "AAXX/XAAA: X nur einmal near");
assert(w.isValidGuess("haus") && w.isValidGuess("HAUS") && !w.isValidGuess("qqqq"), "isValidGuess");
// Hint nach Teilversuch: bekannte Position wird nicht erneut vorgeschlagen
{
  const p = { solution: "haus", length: 4 };
  const hnt = w.findHint(p, ["maus"]);
  assert(hnt && hnt.pos === 0 && hnt.letter === "h", "hint skips known positions");
}

console.log(fails ? `${fails} Fehler` : "Wörtle: alle Tests grün");
process.exit(fails ? 1 : 0);
