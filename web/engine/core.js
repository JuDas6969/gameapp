// Shared primitives for all puzzle engines. Pure JS, no DOM.

export const DIFFS = ["leicht", "mittel", "schwer", "experte"];
export const DIFF_TITLE = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer", experte: "Experte", zufaellig: "Zufällig" };

const UNIQUE = "Jedes Rätsel hat genau eine Lösung und ist ohne Raten lösbar.";
export const GAMES = {
  sudoku:   { title: "Mini-Sudoku", icon: "#",  subtitle: "6×6 – jede Zahl einmal pro Zeile, Spalte und Block",
              rules: `Fülle das 6×6-Gitter mit den Zahlen 1 bis 6.
Jede Zeile, jede Spalte und jeder 2×3-Block enthält jede Zahl genau einmal.
Feld antippen, dann Zahl wählen. ✎ schaltet Notizen ein, ⌫ löscht.
${UNIQUE}` },
  queens:   { title: "Königinnen", icon: "♛", subtitle: "Eine Königin pro Zeile, Spalte und Farbfeld",
              rules: `Setze in jede Zeile, jede Spalte und jedes Farbfeld genau eine 👑.
Zwei 👑 dürfen sich nicht berühren – auch nicht diagonal.
Einmal tippen setzt ×, zweimal tippen setzt 👑. Ziehen malt × über mehrere Felder.
${UNIQUE}` },
  tango:    { title: "Duo", icon: "☀", subtitle: "Sonne & Mond – nie drei gleiche in Folge",
              rules: `Fülle jedes Feld mit 🌞 oder 🌚. Tippen wechselt: leer → 🌞 → 🌚.
Nie mehr als zwei gleiche direkt nebeneinander oder untereinander.
Jede Zeile und jede Spalte enthält gleich viele 🌞 und 🌚.
= verbundene Felder sind gleich, × verbundene Felder sind verschieden.
${UNIQUE}` },
  zip:      { title: "Pfad", icon: "↯", subtitle: "Verbinde die Zahlen der Reihe nach über jedes Feld",
              rules: `Verbinde die Zahlen der Reihe nach: Ziehe einen Pfad von 1 bis zur höchsten Zahl.
Der Pfad besucht jedes Feld genau einmal und darf keine Wand kreuzen.
Zurückziehen löscht den Pfad bis zu diesem Feld.
${UNIQUE}` },
  patches:  { title: "Flicken", icon: "▦", subtitle: "Fülle das Raster mit Quadraten und Rechtecken",
              rules: "Vervollständige jede Form, um das Raster auszufüllen. Jeder Flicken ist ein Rechteck mit genau einem Hinweis: Quadrat, hohes Rechteck, breites Rechteck oder beliebig (gestrichelt).\nHat eine Form eine Zahl, muss sie diese Größe haben.\nVon einem Hinweis aus ziehen spannt einen Flicken auf, Antippen entfernt ihn." },
  nonogram: { title: "Nonogramm", icon: "▚", subtitle: "Male das Bild anhand der Zahlenhinweise",
              rules: `Die Zahlen am Rand nennen die Längen der gefüllten Blöcke in jeder Zeile und Spalte – in dieser Reihenfolge.
Zwischen zwei Blöcken bleibt mindestens ein Feld leer.
Werkzeug unten wählen (füllen oder ×), dann tippen oder ziehen.
Ist eine Zeile oder Spalte vollständig, werden ihre restlichen Felder automatisch mit × markiert.
${UNIQUE}` },
  hashi: { title: "Brücken", icon: "⊶", subtitle: "Verbinde die Inseln mit Brücken – die Zahl zählt",
    rules: "Verbinde alle Inseln mit waagrechten oder senkrechten Brücken, sodass jede Insel genau so viele Brücken hat, wie ihre Zahl angibt. Zwischen zwei Inseln liegen höchstens zwei Brücken, Brücken dürfen sich nicht kreuzen, und am Ende müssen alle Inseln zusammenhängen.\nZiehen von Insel zu Insel oder Tippen auf eine Brücke schaltet 0 → 1 → 2 → 0." },
  slitherlink: { title: "Rundweg", icon: "◌", subtitle: "Zeichne eine geschlossene Schleife entlang der Zahlen",
    rules: "Zeichne entlang der Gitterlinien einen einzigen geschlossenen Rundweg, der sich nicht kreuzt oder verzweigt. Jede Zahl gibt an, wie viele der vier Kanten um dieses Feld zum Rundweg gehören.\nTippen: leer → Linie → × → leer. Ziehen von Punkt zu Punkt zeichnet Linien." },
  nurikabe: { title: "Inseln", icon: "▞", subtitle: "Umfließe nummerierte Inseln mit zusammenhängendem Wasser",
    rules: "Jedes Feld ist Wasser oder Insel. Jede Zahl gehört zu genau einer Insel mit so vielen Feldern, und Inseln dürfen sich nicht berühren. Alles Wasser hängt zusammen und bildet nie einen 2×2-Block.\nWerkzeug wählen, dann tippen oder entlang einer Zeile/Spalte ziehen." },
  kakuro: { title: "Kreuzsumme", icon: "Σ", subtitle: "Ziffern 1–9, die Summen am Rand müssen stimmen",
    rules: "Fülle die weißen Felder mit den Ziffern 1 bis 9, sodass jede waagrechte und senkrechte Reihe die Summe ergibt, die im schwarzen Feld davor steht. Innerhalb einer Reihe darf keine Ziffer doppelt vorkommen." },
  woertle: { title: "Wörtle", icon: "W", subtitle: "Errate das Wort in 6 Versuchen – 4 bis 7 Buchstaben",
    rules: "Errate das gesuchte deutsche Wort in höchstens 6 Versuchen. Jeder Versuch muss ein gültiges Wort gleicher Länge sein (⏎ schickt ab).\nGrün: Buchstabe stimmt und steht richtig. Gelb: kommt vor, steht aber woanders. Grau: kommt nicht vor.\nLeicht 4, Mittel 5, Schwer 6, Experte 7 Buchstaben. Umlaute sind eigene Buchstaben, kein ß." },
  wortpfad: { title: "Wortpfad", icon: "≈", subtitle: "Ziehe Wörter durch das Buchstabengitter – jedes Feld einmal",
    rules: "Verbinde waagrecht oder senkrecht benachbarte Buchstaben zu Wörtern, indem du einen Pfad durch das Gitter ziehst. Graue Felder sind gesperrt. Jedes Buchstabenfeld gehört am Ende zu genau einem Wort; die Kacheln unter dem Gitter zeigen Anzahl und Längen der Wörter.\nEin gültiges Wort bleibt farbig stehen, Tippen auf einen Pfad entfernt ihn. Jede Zerlegung aus gültigen Wörtern zählt." },
  treffpunkt: { title: "Treffpunkt", icon: "◎", subtitle: "Fünf Wörter, eine Kategorie – je früher, desto besser",
    rules: "Fünf Wörter haben etwas gemeinsam. Das erste siehst du sofort – rate die Kategorie!\nJeder Fehlversuch deckt das nächste Wort auf. Du hast fünf Versuche; je weniger Wörter du brauchst, desto besser.\nSchreibweise ist egal, Alternativen und kleine Tippfehler werden erkannt." },
  wortleiter: { title: "Wortleiter", icon: "≡", subtitle: "Fünf Wörter erraten, zur Leiter sortieren, Anfang und Ende finden",
    rules: "Gib zu jedem Hinweis das passende Wort ein – alle Wörter sind gleich lang. Zeilen antippen zum Bearbeiten, am ═ ziehen zum Sortieren, jederzeit.\nOrdne die Wörter so, dass sich benachbarte Zeilen in genau einem Buchstaben unterscheiden.\nSind die mittleren Zeilen richtig und sortiert, öffnen sich die oberste und unterste Zeile mit einem gemeinsamen Hinweis." },
  kreuzwort: { title: "Kreuzwort", icon: "⊞", subtitle: "Klassisches Kreuzworträtsel mit schwarzen Feldern",
    rules: "Trage zu jedem Hinweis das gesuchte Wort waagrecht oder senkrecht ins Gitter ein – ein Buchstabe pro Feld, Umlaute als Ä, Ö, Ü.\nFeld antippen wählt das Wort, nochmal tippen wechselt zwischen waagrecht und senkrecht; ‹ › springt zum nächsten Hinweis. Auto-Check markiert falsche Buchstaben rot." },
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
/** Running daily-puzzle number: days since the launch day (local calendar) + 1. */
export const DAILY_START = [2026, 9, 26]; // 2026-10-26
export function dailyNumber(date = new Date()) {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(...DAILY_START);
  return Math.max(1, Math.round((a - b) / 86400000) + 1);
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
