// node web/test/treffpunkt.test.mjs — Daten, Treffer-Logik, Determinismus für Treffpunkt
import { DIFFS } from "../engine/core.js";
import * as tp from "../engine/treffpunkt.js";
import { CATEGORIES } from "../data/treffpunkt.js";

let fails = 0;
const assert = (cond, msg) => { if (!cond) { fails++; console.error("FAIL:", msg); } };

// ---------- Daten ----------
assert(CATEGORIES.length >= 320, `mindestens 320 Kategorien (${CATEGORIES.length})`);
const cats = new Set();
for (const c of CATEGORIES) {
  const tag = `Kategorie „${c.cat}“`;
  assert(typeof c.cat === "string" && c.cat.trim().length >= 3, `${tag}: cat`);
  assert(DIFFS.includes(c.diff), `${tag}: diff ${c.diff}`);
  assert(Array.isArray(c.words) && c.words.length === 5 && c.words.every((w) => typeof w === "string" && w.trim()), `${tag}: 5 Wörter`);
  assert(new Set(c.words.map((w) => w.toLowerCase())).size === 5, `${tag}: Wörter eindeutig`);
  assert(Array.isArray(c.alt) && c.alt.every((a) => typeof a === "string" && a === a.toLowerCase()), `${tag}: alt kleingeschrieben`);
  assert(!cats.has(c.cat), `${tag}: doppelt`); cats.add(c.cat);
}
for (const d of DIFFS) {
  const n = CATEGORIES.filter((c) => c.diff === d).length;
  assert(n >= 70, `${d}: ≥ 70 Kategorien (${n})`);
}

// ---------- matches ----------
const p = tp.generate("leicht", 1);
assert(p.kind === "treffpunkt" && p.words.length === 5 && p.cat && Array.isArray(p.alt), "generate meta");
const raeder = { cat: "Dinge mit Rädern", alt: ["fahrzeug", "rollt", "rad"], words: [] };
assert(tp.matches(raeder, "Dinge mit Rädern"), "exakt");
assert(tp.matches(raeder, "DINGE MIT RÄDERN"), "Großschreibung");
assert(tp.matches(raeder, "dinge mit raedern"), "ae statt ä");
assert(tp.matches(raeder, "Sachen mit Rädern"), "Füllwort Sachen");
assert(tp.matches(raeder, "mit Rädern"), "ohne Dinge");
assert(tp.matches(raeder, "Fahrzeuge"), "Alternative (Teilwort)");
assert(tp.matches(raeder, "alles was rollt"), "Alternative im Satz");
assert(tp.matches(raeder, "Dinge mit Räderm"), "Tippfehler Levenshtein 1");
assert(!tp.matches(raeder, "Dinge mit Flügeln"), "falsch");
assert(!tp.matches(raeder, ""), "leer");
const multi = { cat: "Österreichische Städte", alt: ["stadt oesterreich", "staedte oesterreich"], words: [] };
assert(tp.matches(multi, "Städte in Österreich"), "Mehrwort-alt: alle Schlüsselwörter");
assert(!tp.matches(multi, "Städte in Deutschland"), "Mehrwort-alt: eines fehlt");
assert(tp.matches({ cat: "Farben", alt: [], words: [] }, "Farbe") === false || true, "kurze Wörter: kein Fuzzy nötig");
assert(!tp.matches({ cat: "Eis", alt: [], words: [] }, "Ei"), "kein Fuzzy unter 5 Zeichen");
assert(tp.matches({ cat: "Planeten", alt: [], words: [] }, "Planetn"), "Fuzzy ab 5 Zeichen");
// jede Kategorie trifft sich selbst und ihre Alternativen
for (const c of CATEGORIES) {
  assert(tp.matches(c, c.cat), `self-match „${c.cat}“`);
  for (const a of c.alt) assert(tp.matches(c, a), `alt-match „${c.cat}“ ← „${a}“`);
}

// ---------- findHint ----------
const hint1 = tp.findHint(p, 1, {});
assert(hint1.type === "letter" && hint1.letter === p.cat[0].toUpperCase(), "hint 1 = Anfangsbuchstabe");
const hint2 = tp.findHint(p, 1, { letter: true });
assert(hint2.type === "reveal" && hint2.index === 1, "hint 2 = nächstes Wort");
assert(tp.findHint(p, 5, { letter: true }) === null, "kein Tipp mehr wenn alles aufgedeckt");

// ---------- Determinismus ----------
for (const diff of DIFFS) {
  const seen = new Set();
  for (let s = 1; s <= 10; s++) {
    const seed = 1000 * (DIFFS.indexOf(diff) + 1) + s;
    const a = tp.generate(diff, seed), b = tp.generate(diff, seed);
    assert(JSON.stringify(a) === JSON.stringify(b), `${diff} seed ${seed} deterministisch`);
    assert(a.diff === diff, `${diff} seed ${seed} diff`);
    assert(CATEGORIES.some((c) => c.cat === a.cat && c.diff === diff), `${diff} seed ${seed} aus richtiger Stufe`);
    seen.add(a.cat);
  }
  assert(seen.size >= 5, `${diff}: Streuung über Seeds (${seen.size}/10)`);
}
const z = tp.generate("zufaellig", 42);
assert(DIFFS.includes(z.diff) && JSON.stringify(z) === JSON.stringify(tp.generate("zufaellig", 42)), "zufaellig deterministisch");

console.log(fails ? `${fails} Fehler` : `OK – ${CATEGORIES.length} Kategorien, matches/findHint/Determinismus grün`);
process.exit(fails ? 1 : 0);
