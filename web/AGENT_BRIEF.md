# Brief für Agenten – Rätsel-PWA

Projekt: `/home/claude/gameapp/web/` – Vanilla-JS-PWA (ES-Module, kein Build-Step), deutschsprachige Logik-Rätsel-App für iPhone/iPad (Safari, „Zum Home-Bildschirm“). Live: https://judas6969.github.io/gameapp/

## Struktur
- `engine/<game>.js` – Generator + Solver, reine Logik, kein DOM. `generate(diff, seed)` → Puzzle-Objekt (JSON-serialisierbar, läuft im Web Worker). `diff` ∈ leicht|mittel|schwer|experte|zufaellig; `resolveDiff(diff, rng)` aus `engine/core.js`. RNG: `new Rng(seed)` (SplitMix64 auf BigInt), nie `Math.random`.
- `engine/core.js` – `GAMES` (Titel/Icon/Regeln), `Rng`, `grid`, `clone`, `DIRS4`, `edgeKey`, Cell-Keys `r*64+c`.
- `boards/<game>.js` – UI als SVG. `export function Name(puzzle, { onSolved, tools, haptic })` → `{ el, aspect, lock, hint }`. Helfer in `boards/_shared.js`: `base(n, {ox, oy, strong, bg})` liefert `svg`, `layers.{bg,cells,mid,lines,top}`, `cellAt(ev)`, `drag({onStart,onMove,onEnd})`, `S = 100` (viewBox-Einheiten pro Zelle). `txt(x,y,s,size,cls,extra)`, `svgEl`, `h` (DOM-Helper), `msgBar(tools, text)` → Setter, `REGION(i)` Farbvariable.
- `app.js` – Home, Launch-Sheet, Game-Screen. Ruft `board.hint()` beim Tipp-Button; Rückgabe = kurzer deutscher String (Toast) oder `null`. Jeder Tipp kostet +30 s. `toast(text)` ist exportiert.
- `style.css` – CSS-Variablen: `--ink --bg --card --muted --line --line-strong --accent --accent-soft --ok --bad --sun --moon --r1..--r12`. Light + Dark Mode über `prefers-color-scheme`. Klasse `.hintcell` (grüne Füllung) existiert für Tipp-Hervorhebung.
- `test/engine.test.mjs` – Eindeutigkeits-/Konsistenztests (Node). `test/smoke.mjs` – Playwright (iPhone-Viewport), Screenshots nach `/tmp/shots/`. Start: `node test/smoke.mjs` aus `web/`. Playwright ist unter `/opt/npm-tools/node_modules/playwright/index.mjs`.

## Konventionen
- Deutsch in allen UI-Texten. Touch-first: Pointer Events, `touch-action: none` ist auf `.board` gesetzt. Mindest-Tap-Ziel ≈ 44 px.
- Keine Dependencies, kein Build. Alles muss offline funktionieren.
- Jedes Puzzle muss **genau eine Lösung** haben (per Solver geprüft) – ausgenommen Spiele, bei denen Eindeutigkeit per Definition unüblich ist (dann im Brief erwähnt).
- Generierung darf pro Puzzle im Worst Case ≤ 1 s dauern (Node-Messung); sonst Größe/Parameter reduzieren.
- Keine fremden Dateien anfassen (außer explizit erlaubt). Insbesondere NICHT: `app.js`, `style.css`, `engine/core.js`, `engine/index.js`, `boards/index.js`, `sw.js`, `boards/_shared.js`. Brauchst du etwas Neues in `_shared.js` oder CSS, kopiere es lokal in deine Datei bzw. nutze Inline-Styles/`<style>`-freie SVG-Attribute.
- Am Ende: `node test/engine.test.mjs` (bzw. dein eigener Test) grün, und einmal `node test/smoke.mjs` – es darf nichts kaputtgehen.

## Wörterbuch (für Wortspiele)
`web/data/words.js` exportiert `WORDS[len] = { all, common, nouns }` (Arrays, Kleinschreibung, Umlaute als Buchstaben, Längen 3–9) und `isWord(w)`. `all` = Gültigkeitsprüfung (inkl. flektierter Formen), `common` = häufige Wörter ohne ß (für Lösungswörter), `nouns` = häufige großgeschriebene Wörter (Substantive; Heuristik, enthält auch Eigennamen – bei Bedarf filtern). Für Gitter-Spiele Buchstaben in Großschreibung anzeigen (`w.toUpperCase()`), ß vermeiden (common/nouns sind ß-frei). Wortspiel-Puzzles sind wie Logik-Puzzles deterministisch aus `(diff, seed)` zu erzeugen; wo kuratierte Daten nötig sind (Kategorien, Hinweise), liegen sie als `web/data/<game>.js` (ES-Modul, deutsch, von dir verfasst, mindestens die im Brief genannte Menge).

## Tastatur
`boards/_keyboard.js`: `keyboard(container, onKey, {enter})` → `{ el, mark(k, "ok"|"near"|"miss"|""), reset(), destroy() }`. Tasten: A–Z, Ä, Ö, Ü, „⌫“, „⏎“. Hört auch auf die Hardware-Tastatur. CSS-Klassen `.kb*` existieren in style.css. In `tools` einhängen (`keyboard(tools, …)`), beim Verlassen nicht nötig zu zerstören (Game-Screen ersetzt `tools`-Inhalt), aber `destroy()` beim Neuladen aufrufen ist sauberer – gib daher im Board-Objekt `destroy()` zurück, app.js ruft es beim Verlassen auf (falls vorhanden).
Wortspiel-Boards müssen kein SVG sein: ein DOM-Board (`h("div", { class: "board dom" }, …)`) ist erlaubt; `aspect` dann z. B. `[1, 1]` oder passend zur Fläche. Das Board wird von app.js auf das Quadrat aus Breite/Höhe des `.board-wrap` skaliert – für hohe Boards `aspect: [w, h]` setzen.
