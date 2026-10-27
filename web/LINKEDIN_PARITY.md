# LinkedIn-Parität – Queens, Tango, Zip, Mini Sudoku, Patches

Stand: 2026-10-27. Recherche per Web (LinkedIn-Pressemitteilungen, GM Puzzles/Thomas Snyder, Reviews, Guides, Fan-/Solver-Seiten). Die offizielle LinkedIn-Hilfeseite (help/answer/a6863543) ist per Fetch gesperrt (robots) – Angaben daraus sind indirekt über Guides belegt. Punkte mit „(unsicher)“ stammen aus Spielerfahrung/Erinnerung und sind nicht durch eine Quelle gedeckt.

„Unsere App“ = Stand des Codes in `app.js`, `engine/core.js`, `boards/*.js`, `engine/*.js`.

---

## Allgemein

| Merkmal | LinkedIn | Unsere App | Abweichung / To-do |
|---|---|---|---|
| Tagesrätsel | 1 Rätsel pro Spiel und Tag, neues Rätsel 0:00 Pacific; alte Rätsel verfallen (keine Archive). Nummerierung `#NNN` fortlaufend (z. B. Queens #909, Tango #749, Zip #588, Mini Sudoku #441, Patches #223 am 26.10.2026). | `dailySeed(game, date)` pro lokalem Kalendertag; zusätzlich unbegrenzt „Neues Rätsel“ mit wählbarer Schwierigkeit. Keine Nummer. | Optional: laufende Nummer (`Tage seit Startdatum`) im Titel/Share anzeigen. Lokaler Tag statt PT ist für uns richtig – so lassen. |
| Schwierigkeit über die Woche | Steigt Mo → So („starting easier on Mondays and becoming more challenging by Sunday“, Mini-Sudoku-PM; Zip-Guide: Mo leichtest, So am schwersten; Patches: „difficulty increases throughout the week“). Queens-Guide: Mo „medium“, Sa/So am schwersten. | `dailyDiff()`: Mo/Di leicht, Mi/Do mittel, Fr/Sa schwer, So experte. | Entspricht dem Prinzip. Feinjustierung optional: Mo leicht, Di–Mi mittel, Do–Fr schwer, Sa–So experte (näher an „Sa/So am härtesten“). |
| Timer | Läuft ab Spielstart, mm:ss, wird im Ergebnis gezeigt und im Share-Text verwendet. Pausiert bei Verlassen (unsicher). | `setInterval` ab Laden, mm:ss; pausiert nicht bei Tab-Wechsel/Hintergrund. | `app.js`: Timer bei `visibilitychange`/`pagehide` pausieren (Zeitstempel-basiert statt Tick-Zähler). |
| Hint („Tipp“) | Button „Hint“ in jedem Spiel, unbegrenzt. Zeigt je Spiel einen konkreten Schritt (Region/Zelle hervorheben, Fehler markieren, bei Zip Pfad bis zum Fehler kürzen). Kein Zeitaufschlag; stattdessen verliert das Ergebnis das Label „flawless“ (Ergebnis-Karte protokolliert „mistakes and hints“). Hint bricht Streak nicht. | `board.hint()` unbegrenzt, +30 s pro Tipp, Zähler im Button, Toast-Text. Tipps führen Schritt tatsächlich aus. | Zeitstrafe ist eine bewusste Abweichung – beibehalten oder auf „kein Aufschlag, aber Tipp-Zähler im Ergebnis/Share“ umstellen (LinkedIn-Logik). Mindestens: Ergebnis als „flawless“ markieren, wenn 0 Tipps **und** 0 Fehler. |
| Fehler/Auto-Check | Spiele mit Auto-Check: Queens (rote Schraffur bei Konflikt), Tango (rote Markierung bei Regelbruch), Mini Sudoku (Auto-Check an/aus in Settings). Zip/Patches haben kein Rot – ungültige Züge werden einfach nicht angenommen. Auto-Check abschaltbar (Mini Sudoku belegt). | Queens: sofort rot; Tango: 700 ms verzögert; Sudoku: sofort rot (`.bad`), nicht abschaltbar; Zip/Patches: Zug abgelehnt + Meldung/Shake. | Globaler Schalter „Fehler anzeigen“ (localStorage) für Queens/Tango/Sudoku. Fehler-Zähler („mistakes“) für Share. |
| Undo / Clear | Queens, Tango, Mini Sudoku, Zip: „Undo“ + „Clear“. Patches: Flicken antippen = entfernen, kein klassisches Undo belegt. | Zip: Undo+Löschen. Patches: Löschen. Queens/Tango/Sudoku: **kein Undo, kein Clear**. | Undo-Stack + Clear in Queens, Tango, Sudoku ergänzen (siehe To-do). |
| Streak | Pro Spiel; aufeinanderfolgende Tage mit gelöstem Tagesrätsel. **Streak Freeze**: alle 5 Siege einen verdient, max. 2 gespeichert, greift automatisch bei verpasstem Tag (Streak wächst dabei nicht). Bonus-Rätsel zählen nicht. | `Stats.streak(kind)`: pro Spiel, gestern/heute-Toleranz; Home zeigt max. Streak über alle Spiele. Kein Freeze. | Streak pro Spiel auf der Karte anzeigen; Freeze-Logik (Zähler `freezes`, `wins`) in `Stats` – optional, M. |
| Ergebnis-Karte | Zeit, „flawless“-Label, Vergleich mit Netzwerk/CEOs/Top-%-Leaderboard, Streak-Anzeige, Share. Metriken je Spiel: Queens = Zeit + Farben der ersten 3 richtigen Königinnen + Fehler/Hints; Tango = erste 5 richtige Platzierungen; Zip = Backtracks; Mini Sudoku = Fehler; Patches = Redraws. | Overlay „Gelöst!“: Schwierigkeit · Zeit · n Tipps, „Neue Bestzeit“. Kein Share. | Share-Button (Web Share API / Clipboard) mit LinkedIn-ähnlichem Text, siehe nächste Zeile. |
| Share-Text-Format | Belegt (Medium): `Queens #211 \| 0:10 and flawless` / `First 👑s: 🟨 ⬜ 🟩` / `🏅 I'm in the Top 1% of all players today!` / `lnkd.in/queens`. Analog (unsicher, aus Erinnerung): `Tango #N \| m:ss and flawless 🌗` + `First 5 placements: 🌞🌚🌚🌞🌞`; `Zip #N \| m:ss 🏁` + `With no backtracks 🟢` bzw. `With N backtracks`; `Mini Sudoku #N \| m:ss and flawless`; `Patches #N \| m:ss …`. Ohne „flawless“, wenn Fehler/Hint. | – | `app.js` + je Board ein `summary()`-Hook, der die spielspezifische Zeile liefert (Farben der ersten 3 Königinnen, erste 5 Tango-Symbole, Backtracks, Fehler, Redraws). |
| „How to play“ | Kurztexte mit Emojis, zusätzlich Tutorial-Overlay beim ersten Spielen. Queens (sinngemäß): „Exactly one 👑ich in each row, column and color region. Tap once to place X, tap twice for 👑. Two 👑 cannot touch, not even diagonally.“ Tango: „Fill with 🌞/🌚. No more than 2 identical next to each other. Equal number per row/column. = same, × opposite. Each puzzle has one right answer and can be solved via deduction.“ Zip: „Connect the dots in order. Fill every cell. Backtrack to erase.“ Patches: „Fill the grid with rectangular and square patches. Each patch contains exactly one clue; number = area.“ | `GAMES[k].rules` – ein Absatz pro Spiel, teils mit Bedienhinweis. | Satz „Jedes Rätsel hat genau eine Lösung und ist ohne Raten lösbar“ aufnehmen. Texte in 3–4 kurze Zeilen gliedern. |

---

## Queens → „Königinnen“ (`boards/queens.js`, `engine/queens.js`)

| Merkmal | LinkedIn | Unsere App | Abweichung / To-do |
|---|---|---|---|
| Regeln | Genau eine 👑 pro Zeile, Spalte und Farbregion; 👑 dürfen sich nicht berühren (auch diagonal nicht) – **nur Nachbarschaft**, keine vollen Diagonalen. | Identisch (`queens.conflicts`, `attacked`). | – |
| Gittergröße | 7×7 bis 11×11, typisch 8–9; Regionen = n (eine pro 👑). | leicht 6, mittel 7, schwer 8, experte 9. | Experte auf 10 (ggf. 11) anheben, wenn Generator ≤ 1 s bleibt. |
| Eingabe | Tap 1× = ×, Tap 2× = 👑, Tap 3× = leer. Ziehen über Zellen malt × (bzw. löscht ×). | Identisch: leer → × → ♛ → leer; Drag malt ×/löscht ×. | – |
| Auto-× | Setting „Auto-place X's“: nach jeder 👑 werden Zeile, Spalte, Region und Nachbarn automatisch mit × markiert; beim Entfernen der 👑 verschwinden diese × wieder. | `autoX` (localStorage), `placeQueen` markiert `attacked()`-Zellen, `autoBy` räumt bei Entfernen auf. **`attacked()` (engine/queens.js:85) liefert nur Zeile, Spalte und Diagonal-Nachbarn – die Farbregion fehlt.** | Regionszellen der gesetzten 👑 in `placeQueen`/`removeQueen` (boards/queens.js) zusätzlich mit × belegen (gleiche `autoBy`-Buchführung); Hint-Schritt (d) „Ausgeschlossene Felder markiert“ ebenso. |
| Fehleranzeige | Auto-Check: Zelle/Zeile mit zu vielen 👑 bekommt rote Schraffur; sofort. | Konflikt-👑 sofort rot (`--bad`), Meldung „Konflikt“. | Parität ausreichend; optional Schraffur-Pattern statt roter Krone. |
| Hint | Hebt eine Region hervor, in die eine 👑 muss, oder zeigt falsche Platzierungen; erklärt die Technik kurz. Setzt die 👑 **nicht** selbst (unsicher – Guides sagen „highlights“). | Führt Schritt aus (entfernt falsche 👑, setzt 👑, markiert ×) + Flash + Toast. | Zweistufig machen: 1. Tipp = nur hervorheben (Region/Zeile/Spalte gelb), 2. Tipp auf gleiche Situation = ausführen. |
| Undo/Clear | Vorhanden. | Fehlt. | Undo-Stack (Snapshot von `marks` + `autoBy` je Zug), Clear-Button in `tools`. |
| Ergebnis/Share | `Queens #N \| m:ss and flawless` + `First 👑s: 🟨 ⬜ 🟩` (Farben der ersten drei korrekt gesetzten 👑). | Overlay ohne Share. | Reihenfolge der korrekt gesetzten 👑 mitschreiben, Regionsfarbe → Emoji-Quadrat mappen (`--r1..r12` → 🟥🟧🟨🟩🟦🟪🟫⬜⬛…). |
| Shading | Zeile/Spalte einer 👑 leicht abgedunkelt (unsicher, nur mit Auto-× sichtbar). | 10 % Schattierung in Zeile/Spalte einer 👑. | – |

## Tango → „Duo“ (`boards/tango.js`, `engine/tango.js`)

| Merkmal | LinkedIn | Unsere App | Abweichung / To-do |
|---|---|---|---|
| Regeln | 6×6; jede Zeile/Spalte 3 🌞 + 3 🌚; nie mehr als 2 gleiche nebeneinander (horizontal/vertikal); `=` gleich, `×` verschieden; immer eindeutig, ohne Raten lösbar. | Identisch (6×6, Sonne/Mond, `=`/`×`). | Regeltext um „ohne Raten lösbar“ ergänzen. |
| Vorgaben | Einige Zellen vorbelegt (grau hinterlegt, nicht änderbar), 2–10 Vorgaben plus mehrere Zeichen; Experte oft 0–2 Vorgaben, dafür viele Zeichen. | `TARGET` Vorgaben leicht 10 / mittel 7 / schwer 4 / experte 0; `CONS` Zeichen 7/6/5/4. Vorgaben grau hinterlegt. | Experte: 0 Vorgaben mit nur 4 Zeichen ist härter als LinkedIn-Sonntag; ggf. `CONS.experte` = 6. Vorgabe-Zellen weniger stark abdunkeln (LinkedIn: dezentes Grau). |
| Eingabe | Tap: leer → 🌞 → 🌚 → leer. Kein Drag. | Identisch; Drag ignoriert. | – |
| Zeichen-Darstellung | `=` und `×` als kleine Symbole **auf der Zelltrennlinie**, ohne Kreis-Hintergrund, grau. | Weißer Kreis mit Rand + fettes Zeichen auf der Linie. | Kosmetik: Kreis kleiner/ohne Rand, Zeichen dünner (S). |
| Fehleranzeige | Auto-Check: betroffene Zellen (Dreierreihe, Zeile/Spalte mit >3 gleichen, verletztes Zeichen) sofort rot umrandet/rot hinterlegt. | Rot umrandet, **700 ms verzögert** (damit das Durchklicken nicht flackert). Reihen, die fertig+richtig sind, werden abgedunkelt (0.6). | Verzögerung ist Verbesserung – beibehalten. Abdunkeln fertiger Linien gibt es bei LinkedIn nicht (gibt Lösungsinfo preis!) → entfernen oder optional machen. |
| Hint | Hebt eine Zelle hervor und nennt Regel („row needs 3 moons“ o. ä.); setzt nicht selbst (unsicher). | Setzt Zelle + erklärt Regel (pair/gap/count/constraint) + Flash. | Wie Queens: erst hervorheben + erklären, zweiter Tipp setzt. |
| Undo/Clear | Vorhanden. | Fehlt. | Undo-Stack über `g`, Clear setzt auf `p.givens`. |
| Share | `Tango #N \| m:ss and flawless 🌗` + `First 5 placements: 🌞🌚🌞🌚🌚` (unsicher). | – | Erste 5 **korrekten** Platzierungen protokollieren. |

## Zip → „Pfad“ (`boards/zip.js`, `engine/zip.js`)

| Merkmal | LinkedIn | Unsere App | Abweichung / To-do |
|---|---|---|---|
| Regeln | Ein Pfad von 1 bis zur höchsten Zahl, Zahlen aufsteigend, **jede Zelle genau einmal**, orthogonal; dicke Wände nicht überquerbar. Keine Notation möglich (nur Pfad zeichnen). | Identisch. | – |
| Gittergröße | 6×6 Standard, bis 7×7/8×8 später in der Woche (unsicher); Zahlen typisch 6–10; Wände ab Mitte der Woche. | leicht 5 / mittel 6 / schwer 7 / experte 8; Wegpunkte 7/7/6/5; Wände 0/2/4/6. | Passend. Leicht ggf. 6×6 (LinkedIn startet nie bei 5×5). |
| Eingabe | Drag ab der 1 (Start muss bei 1 sein); Pfad folgt dem Finger; Zurückziehen auf vorherige Zelle löscht; Tap auf frühere Zelle schneidet Pfad dort ab; Fortsetzen durch Antippen des Pfadendes. Schnelles Ziehen füllt auch übersprungene Zellen auf gerader Linie auf (unsicher). | Drag; Rückwärts löscht; Tap/Drag auf besuchte Zelle schneidet ab; übersprungene Zellen werden ignoriert; Fehler (Wand, falsche Zahl) → rote Meldung + Haptik. Start nur bei 1 (`stepError`). | Lückenfüllung auf gerader Linie bei schnellem Drag (zwischen `last` und `cell` interpolieren, wenn gleiche Zeile/Spalte und alle Zwischenzellen frei & ohne Wand). |
| Undo/Clear | „Undo“ (letzter Zug) und „Clear“. | ↶ Zurück (1 Zelle) + Löschen. | Undo pro **Drag-Geste** statt pro Zelle (LinkedIn-Gefühl). |
| Backtracks | Ergebnis zählt „backtracks“ (Zurückziehen/Undo/Löschen); Share: „With no backtracks“ bzw. Anzahl. | Nicht gezählt. | Zähler: jedes Kürzen des Pfads (Rückwärtsziehen, Undo, Löschen, Hint-Cut) = 1 Backtrack. |
| Hint | „Removes the route up to the first error and reveals the next correct step“ – also Pfad bis zum Fehler kürzen und nächsten Schritt/Abschnitt (bis zur nächsten Zahl) hervorheben. | `hintStep(p, path, 6)`: Cut bei Fehler („Ab hier war's falsch“), sonst bis zu 6 Schritte/bis zur nächsten Zahl **ausführen** und grün flashen. | Sehr nah dran. Option: nur hervorheben statt ausführen (pulsierende Punkte), Ausführen beim 2. Tipp. |
| Fehleranzeige | Kein Rot; ungültiger Zug wird nicht angenommen. Abgeschlossener Pfad ohne alle Zellen → „Fill every cell“-Hinweis. | Rote Meldung in `msgBar` + Haptik 20 ms. | OK. |
| Darstellung | Zahlen in schwarzen Kreisen mit weißer Ziffer; Pfad breit, abgerundet; Wände dicke schwarze Striche. | Zahlen in Karten-Kreisen (besucht → Akzent), Pfad breit, Wände dick. | – |
| Share | `Zip #N \| m:ss 🏁` + `With no backtracks 🟢` (unsicher). | – | s. Allgemein. |

## Mini Sudoku → „Mini-Sudoku“ (`boards/sudoku.js`, `engine/sudoku.js`)

| Merkmal | LinkedIn | Unsere App | Abweichung / To-do |
|---|---|---|---|
| Regeln/Größe | 6×6, Blöcke **2 Zeilen × 3 Spalten**, Ziffern 1–6 je Zeile/Spalte/Block einmal. Von Nikoli handgemacht, Ziel < 3 min. | 6×6, `strong: [2, 3]` → Blöcke 2×3, `TARGET` Vorgaben leicht 20 / mittel 16 / schwer 12 / experte 0 (= minimal). | Blöcke stimmen. |
| Eingabe | Zelle antippen → Ziffernleiste 1–6 unten; Notizen-Modus (Stift); Löschen; Zelle erneut antippen hebt Auswahl nicht auf. Tastatur am Desktop. | Identisch (Numpad 1–6, ✎ Notizen, ⌫). Keine Tastatur. | Tastatur 1–6/Backspace/Pfeile für iPad-Tastatur ergänzen (S). |
| Highlighting | Setting „Highlight sections“: Zeile/Spalte/Block der Auswahl hervorheben; gleiche Ziffern hervorheben. | Immer an (Zeile/Spalte/Block grau, gleiche Ziffer akzent). | OK; optional Schalter. |
| Settings | „Auto-check“ (Fehler sofort rot, abschaltbar), „Remaining number count“ (Zähler je Ziffer), „Show available placements“ (zeigt Kandidaten). | Auto-Check immer an; Ziffer-Button wird bei 6× gesetzt deaktiviert (≈ Remaining count, ohne Zahl); keine Kandidaten-Anzeige. | Settings-Sheet im Board: Auto-Check an/aus, Restzähler als kleine Zahl im Button, „Mögliche Felder zeigen“ (Zellen graut, in denen gewählte Ziffer nicht mehr geht). |
| Fehleranzeige | Auto-Check: falsche Ziffer sofort rot (Konflikt **oder** Abweichung von Lösung – unsicher welches). | Nur echte Konflikte (`sudoku.conflicts`) rot. | OK. Fehlerzähler („mistakes“) für Share: jede gesetzte Ziffer ≠ Lösung zählt. |
| Hint | Füllt eine Zelle korrekt aus und hebt sie hervor (unsicher ob mit Erklärung). | Setzt Zelle, erklärt Technik (fix/naked/hidden), grüner Flash 1,2 s. | Besser als LinkedIn – lassen. |
| Undo/Clear | Vorhanden. | Fehlt. | Undo-Stack (g + notes), Clear. |
| Notizen | Kandidaten klein in 3×2-Raster; beim Setzen einer Ziffer werden Peer-Notizen gelöscht (unsicher). | Identisch inkl. Peer-Clearing. | – |

## Patches → „Flicken“ (`boards/patches.js`, `engine/patches.js`)

| Merkmal | LinkedIn | Unsere App | Abweichung / To-do |
|---|---|---|---|
| Regeln | Gitter vollständig in Rechtecke/Quadrate teilen; jeder Flicken enthält **genau einen Hinweis**; Zahl = Fläche. Seit Mitte 2026 zusätzlich **Form-Badges** (Quadrat / breit / hoch / beliebig) und **Hinweise ohne Zahl** (nur Form). Verwandt mit Shikaku + Tatamibari. | Reines Shikaku: nur Zahlen, Rechtecke, eine Zahl pro Rechteck. | Form-Hinweise als Erweiterung (Generator + Clue-Typ `{n, shape}` + Darstellung als Icon) – L. Zunächst nur dokumentieren. |
| Gittergröße | 6×6 belegt („EASY · 6×6“), vermutlich bis 8×8 später in der Woche (unsicher). | leicht 5 / mittel 7 / schwer 9 / experte 11; max. Fläche 6/8/10/12. | 11×11 ist deutlich größer als LinkedIn; Experte ggf. 9×9 mit größeren Flächen/Formen statt 11×11 (Touch-Ziele!). |
| Eingabe | „Tap on the source [Zahl] and drag“ – Ziehen beginnt am Hinweis, Rechteck spannt sich vom Hinweis zum Finger auf. Fertige Flicken antippen = entfernen. Ziehen in bestehenden Flicken = neu ziehen (unsicher). | Identisch (Drag ab Hinweis oder aus bestehendem Rechteck = aufnehmen; Tap entfernt; Tap auf offenen Hinweis zeigt Möglichkeiten). Vorschau mit Fläche/Ziel-Pill und grün/gestrichelt. | Sehr nah; „Möglichkeiten anzeigen“ bei Tap ist ein Extra (gibt Hilfe gratis) – evtl. als Setting. |
| Ungültiger Zug | Wird nicht angenommen, kein Rot. | Nicht angenommen, Hinweis wackelt + rot, Haptik. | OK. |
| Fläche 1 | Tap auf „1“ setzt 1×1 (unsicher). | Tap auf 1 setzt 1×1. | – |
| Redraws | Ergebnis zählt „redraws“ (Flicken entfernt/neu gezogen). | Nicht gezählt. | Zähler: jedes Entfernen/Aufnehmen eines Flickens = 1 Redraw. |
| Hint | Hebt eine Zelle/Region hervor („highlights a cell or region“), Streak bleibt. | Entfernt falsches Rechteck oder setzt ein fehlendes (bevorzugt eindeutig platzierbares) + Flash. | Erst Hinweis hervorheben (pulsierender Rahmen um den Hinweis, dessen Flicken eindeutig ist), beim 2. Tipp setzen. |
| Undo/Clear | Antippen entfernt; Clear vorhanden. | Löschen vorhanden; kein Undo. | Undo (letzter Flicken) – S. |
| Farben | Jeder Flicken bekommt eine eigene Pastellfarbe. | `REGION(idx)` pro Hinweis. | – |

---

## Priorisierte To-do-Liste

1. **Undo + Clear für Queens, Tango, Sudoku** – `boards/queens.js`, `boards/tango.js`, `boards/sudoku.js`: Snapshot-Stack (`marks`+`autoBy` / `g` / `g`+`notes`), Buttons „↶“ und „Löschen“ in `tools`. Aufwand: **M**.
2. **Ergebnis-Share** – `app.js`: Share-Button im „Gelöst!“-Overlay (`navigator.share` → Fallback Clipboard + Toast). Text: `Königinnen #N | m:ss und fehlerfrei` + spielspezifische Zeile. Boards liefern `summary()`; Rätselnummer = Tage seit festem Startdatum. Aufwand: **M**.
3. **Fehler-/Tipp-Metriken** – `boards/*.js` + `app.js`: Zähler `mistakes` (Queens/Tango/Sudoku: Eintrag ≠ Lösung), `backtracks` (Zip: jedes Kürzen), `redraws` (Patches: Entfernen/Aufnehmen); „fehlerfrei“ nur bei 0 Fehler & 0 Tipps. Aufwand: **M**.
4. **Zweistufiger Tipp (erst zeigen, dann ausführen)** – `boards/queens.js`, `tango.js`, `patches.js`, `zip.js`: `hint()` merkt letzten Vorschlag; 1. Aufruf hebt hervor + Toast, 2. Aufruf auf gleichen Zustand führt aus. Aufwand: **M**.
5. **Timer pausieren im Hintergrund** – `app.js`: Zeit über `performance.now()`-Differenzen, Pause bei `document.hidden`. Aufwand: **S**.
6. **Tango: fertige Linien nicht abdunkeln** – `boards/tango.js` (`dim`-Logik entfernen oder hinter Schalter). Gibt sonst Lösungsinfo preis, die LinkedIn nicht gibt. Aufwand: **S**.
7. **Zip: Backtracks zählen + Undo pro Geste + Lückenfüllung bei schnellem Drag** – `boards/zip.js`: Geste-Marker im Pfad, Interpolation gerader Strecken in `extend`. Aufwand: **M**.
8. **Sudoku-Settings** – `boards/sudoku.js`: Auto-Check an/aus, Restzähler im Ziffern-Button, „Mögliche Felder“ (Zellen ausgrauen, wo gewählte Ziffer nicht mehr geht), Tastatur 1–6. localStorage-Keys `raetsel.sudoku.*`. Aufwand: **M**.
9. **Streak pro Spiel + Streak-Freeze** – `app.js` (`Stats`): `wins`, `freezes` (max 2, +1 je 5 Siege), Freeze bei Lücke von 1 Tag verbrauchen; Streak auf jeder Karte. Aufwand: **M**.
10. **Regeltexte nach LinkedIn-Muster** – `engine/core.js` (`GAMES.rules`): kurz, 3–4 Zeilen, „genau eine Lösung, ohne Raten lösbar“. Aufwand: **S**.
11. **Größen-Feinschliff** – `engine/queens.js` Experte 10×10; `engine/zip.js` leicht 6×6; `engine/patches.js` Experte ≤ 9×9. Generator-Zeit (≤ 1 s) prüfen. Aufwand: **S–M**.
12. **Queens Auto-×: Region fehlt** – `engine/queens.js:85` `attacked()` deckt nur Zeile/Spalte/Diagonal-Nachbarn ab. In `boards/queens.js` `placeQueen` (und Hint-Schritt d) alle Zellen von `p.regions[r][c]` zusätzlich mit × belegen; `removeQueen` räumt sie über `autoBy` wieder ab. Aufwand: **S**. (Eigentlich Prio 1–2: LinkedIn-Auto-× markiert die Region immer.)
13. **Patches Form-Hinweise (Quadrat/breit/hoch/beliebig, Hinweise ohne Zahl)** – `engine/patches.js` + `boards/patches.js`: neuer Clue-Typ, Solver-Erweiterung, Icon-Rendering. Aufwand: **L** (später).
14. **Tango-Zeichen dezenter** – `boards/tango.js`: kleinerer Kreis ohne Rand, dünnere Glyphe. Aufwand: **S**.

---

## Quellen

1. TheWordFinder – „How to Play LinkedIn Games: Mechanics, Edge Cases, and Hidden Constraints“: https://www.thewordfinder.com/blog/?p=1993
2. TheWordFinder – Patches Hints (Regeln, Form-Badges, 6×6, Wochendifficulty): https://www.thewordfinder.com/linkedin-games-hub/patches-hints/
3. TheWordFinder – Tango Hints (6×6, Mo leichtest): https://www.thewordfinder.com/linkedin-games-hub/tango-hints/
4. Lilach Bullock – „LinkedIn Queens: Rules, How to Play and Solving Tips“ (Tap-Zyklus, Auto-place X's, Auto-check, Hint, Undo/Clear, Ergebnis-Screen): https://www.lilachbullock.com/linkedin-queens/
5. Tycoonstory – LinkedIn Games (Ergebnis-Metriken je Spiel, Streak-Freeze-Regeln, Share-Wege): https://www.tycoonstory.com/linkedin-games/
6. Medium – „My Favorite LinkedIn Game. Queens!“ (Share-Text-Beleg „Queens #211 | 0:10 and flawless / First 👑s: 🟨 ⬜ 🟩“): https://medium.com/mr-plan-publication/my-favorite-linkedin-game-26d7c9f8793c
7. gamebut.com – Zip (Hint = Pfad bis Fehler kürzen + nächsten Schritt zeigen, Backtracks, Undo/Clear, Wände): https://gamebut.com/zip
8. gamebut.com – Queens (Auto-place X's, Auto-check, Share-Labels): https://gamebut.com/queens
9. gamebut.com – Tango (Hint/Auto-check/Undo/Clear, erste 5 Platzierungen): https://gamebut.com/tango
10. Axeetech – „How to Play LinkedIn Patches“ (Drag, Tap zum Entfernen, Form-Badges, Hint ohne Streak-Verlust): https://axeetech.com/puzzles/how-to-play-linkedin-patches/
11. LinkedIn Pressroom – Patches-Ankündigung (18.3.2026, „difficulty increases throughout the week“): https://news.linkedin.com/2026/LinkedIn-Announces-Patches-A-New-Thinking-Oriented-Game-Inspired-by-Zip/LinkedIn-Announces-Patches-A-New-Thinking-Oriented-Game-Inspired-by-Zip
12. LinkedIn Pressroom – Mini-Sudoku-Ankündigung (Nikoli, 12.8.2025): https://news.linkedin.com/2025/linkedin-announces-minisudoku-
13. Business Standard – Mini Sudoku (Notizen, Hints, Auto-Error-Check, Highlighting, „easier on Mondays … by Sunday“): https://www.business-standard.com/technology/tech-news/linkedin-and-nikoli-bring-a-twist-to-sudoku-with-bite-sized-daily-puzzles-125081400700_1.html
14. GM Puzzles / Thomas Snyder – „Introducing Zip“ (Regeln, Wände, keine Notation auf LinkedIn): https://www.gmpuzzles.com/blog/2025/03/introducing-zip
15. GM Puzzles – Patches (Shikaku + Tatamibari, Form-/Größen-Hinweise): https://www.gmpuzzles.com/blog/?p=35368
16. Social Media Today – Zip-Launch (Hint-Tool, Streak-Freeze, Leaderboards): https://www.socialmediatoday.com/news/linkedin-adds-zip-puzzle-game/742847/
17. Social Media Today – Tango-Launch & Game-Improvements (Tap wechselt Sonne/Mond, Vergleichs-Scores, CEO-Vergleich): https://www.socialmediatoday.com/news/linkedin-puzzle-game-adds-game-improvements/729295/
18. Social Media Today – Patches (siebtes Spiel, Gametime-Newsletter): https://www.socialmediatoday.com/news/linkedin-adds-seventh-in-app-puzzle-game/815147/
19. AOL/Engadget – Zip (Mo leichtest/So schwerst, Streak Freeze: je 5 Siege, max. 2): https://www.aol.com/linkedin-game-zip-challenge-brain-140009846.html
20. PocketGamer.biz – Patches-Launch: https://www.pocketgamer.biz/linkedin-launches-new-logic-puzzle-game-patches
21. playqueensgame.com – Techniques (Auto X, Hint-Verhalten, Mo medium / Sa+So am schwersten): https://www.playqueensgame.com/techniques
22. StealthyGaming – Queens („Tap once to place an X … tap twice to place a crown“): https://stealthygaming.com/linkedin-queens-answer-today/
23. TechWiser – Alle LinkedIn-Antworten (Rätselnummern 26.10.2026, Patches-Formen): https://techwiser.com/linkedin-games-answers-today/
24. Guideflow – Mini-Sudoku-Settings (Auto-check, Remaining number count, Show available placements): https://www.guideflow.com/tutorial/how-to-disable-auto-check-in-mini-sudoku-in-linkedin , https://www.guideflow.com/tutorial/how-to-enable-remaining-number-count-in-mini-sudoku-in-linkedin , https://www.guideflow.com/et-ee/tutorial/how-to-show-available-placements-in-mini-sudoku-in-linkedin
25. Sportsdunia – Patches („Tap on the source and drag“, Entfernen durch erneutes Antippen): https://www.sportsdunia.com/gaming/linkedin-patches-answers-today-15-october-2026
26. LinkedIn Help – Games (nicht abrufbar, robots): https://www.linkedin.com/help/linkedin/answer/a6863543
