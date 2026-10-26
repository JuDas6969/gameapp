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
