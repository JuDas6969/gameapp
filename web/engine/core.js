// Shared primitives for all puzzle engines. Pure JS, no DOM.

export const DIFFS = ["leicht", "mittel", "schwer", "experte"];
export const DIFF_TITLE = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer", experte: "Experte", zufaellig: "Zufällig" };

export const GAMES = {
  sudoku:   { title: "Mini-Sudoku", icon: "#",  subtitle: "6×6 – jede Zahl einmal pro Zeile, Spalte und Block",
              rules: "Fülle das 6×6-Gitter so, dass jede Zeile, jede Spalte und jeder 2×3-Block die Zahlen 1 bis 6 genau einmal enthält." },
  queens:   { title: "Königinnen", icon: "♛", subtitle: "Eine Königin pro Zeile, Spalte und Farbfeld",
              rules: "Setze in jede Zeile, jede Spalte und jedes Farbfeld genau eine Königin. Königinnen dürfen sich nicht berühren – auch nicht diagonal. Tippen: leer → × → Königin. Ziehen malt ×." },
  tango:    { title: "Duo", icon: "☀", subtitle: "Sonne & Mond – nie drei gleiche in Folge",
              rules: "Fülle jedes Feld mit Sonne oder Mond. Jede Zeile und Spalte enthält gleich viele von beiden. Nie mehr als zwei gleiche nebeneinander. = bedeutet gleich, × bedeutet verschieden." },
  zip:      { title: "Pfad", icon: "↯", subtitle: "Verbinde die Zahlen der Reihe nach über jedes Feld",
              rules: "Zeichne einen Pfad von 1 bis zur höchsten Zahl, der jedes Feld genau einmal besucht und die Zahlen in aufsteigender Reihenfolge durchläuft. Wände können nicht gekreuzt werden. Zurückziehen löscht." },
  patches:  { title: "Flicken", icon: "▦", subtitle: "Teile das Gitter in Rechtecke mit passender Fläche",
              rules: "Teile das Gitter vollständig in Rechtecke. Jedes Rechteck enthält genau eine Zahl, und diese Zahl entspricht seiner Fläche. Ziehen spannt ein Rechteck auf, Tippen entfernt es." },
  nonogram: { title: "Nonogramm", icon: "▚", subtitle: "Male das Bild anhand der Zahlenhinweise",
              rules: "Die Zahlen beschreiben die Längen zusammenhängender Blöcke in jeder Zeile und Spalte, in Reihenfolge und durch mindestens ein leeres Feld getrennt. Werkzeug unten wählen, dann tippen oder ziehen." },
};
export const GAME_KEYS = Object.keys(GAMES);

// SplitMix64 on BigInt for cross-platform determinism; cheap enough for puzzle generation.
const MASK = (1n << 64n) - 1n;
export class Rng {
  constructor(seed) { this.s = BigInt.asUintN(64, BigInt(seed)); }
  next() {
    this.s = (this.s + 0x9E3779B97F4A7C15n) & MASK;
    let z = this.s;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & MASK;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & MASK;
    return z ^ (z >> 31n);
  }
  /** uniform int in [0, n) */
  int(n) { return Number(this.next() % BigInt(n)); }
  float() { return Number(this.next() >> 11n) / 9007199254740992; }
  chance(p) { return this.float() < p; }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  pick(a) { return a[this.int(a.length)]; }
}

export function resolveDiff(diff, rng) { return diff === "zufaellig" ? DIFFS[rng.int(4)] : diff; }

/** Stable seed for a local calendar day + game. */
export function dailySeed(game, date = new Date()) {
  const day = BigInt(date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate());
  let h = 0xCBF29CE484222325n;
  for (const ch of game) h = ((h ^ BigInt(ch.charCodeAt(0))) * 0x100000001B3n) & MASK;
  return (h ^ ((day * 0x9E3779B97F4A7C15n) & MASK)).toString();
}
export function dailyDiff(date = new Date()) {
  const wd = date.getDay(); // 0 = Sunday
  if (wd === 1 || wd === 2) return "leicht";
  if (wd === 3 || wd === 4) return "mittel";
  if (wd === 5 || wd === 6) return "schwer";
  return "experte";
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const key = (r, c) => r * 64 + c;          // cell key for Sets/Maps (n ≤ 63)
export const unkey = (k) => [Math.floor(k / 64), k % 64];
export const edgeKey = (r1, c1, r2, c2) => (key(r1, c1) < key(r2, c2)) ? `${key(r1, c1)}-${key(r2, c2)}` : `${key(r2, c2)}-${key(r1, c1)}`;
export const grid = (n, v) => Array.from({ length: n }, () => Array(n).fill(v));
export const clone = (g) => g.map((row) => row.slice());
