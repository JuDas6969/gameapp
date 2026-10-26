# Rätsel – Offline-Puzzle-App für iPhone & iPad

Sechs Logik-Rätsel, komplett offline am Gerät generiert. Kein Backend, keine Daten, keine Dependencies.

| Spiel (App-Name) | Vorbild | Größen (leicht → experte) |
|---|---|---|
| Mini-Sudoku | Mini Sudoku | 6×6, 20 → minimale Vorgaben |
| Königinnen | Queens | 6×6 → 9×9 |
| Duo | Tango | 6×6, 10 → minimale Vorgaben |
| Pfad | Zip | 5×5 → 8×8, mit Wänden ab Mittel |
| Flicken | Patches (Shikaku) | 5×5 → 11×11 |
| Nonogramm | – | 5×5 → 20×20 |

Jedes Rätsel hat genau eine Lösung (per Solver verifiziert). Schwierigkeit pro Spiel wählbar: Leicht / Mittel / Schwer / Experte / Zufällig. Dazu ein Tagesrätsel pro Spiel (Seed = Datum, Schwierigkeit steigt Mo → So), Bestzeiten und Streak.

## Aufbau

```
Raetsel/
├── project.yml            XcodeGen-Definition (erzeugt Raetsel.xcodeproj)
├── PuzzleEngine/          Swift Package – Generatoren, Solver, Modelle (keine UI)
│   ├── Sources/PuzzleEngine/
│   │   ├── Core.swift     Difficulty, GameKind, Cell/Edge, SeededRNG, DailySeed
│   │   ├── Sudoku6.swift, Queens.swift, Tango.swift, Zip.swift, Patches.swift, Nonogram.swift
│   │   └── Factory.swift  AnyPuzzle + PuzzleFactory (daily / random)
│   └── Tests/PuzzleEngineTests/   XCTest – Eindeutigkeit & Konsistenz je Stufe
├── App/                   SwiftUI-App
│   ├── RaetselApp.swift
│   ├── Models/StatsStore.swift     Bestzeiten, Streak, letzte Schwierigkeit (UserDefaults)
│   └── Views/                      Home, LaunchSheet, GameScreen + ein View je Spiel
└── proto/                 Python-Referenzimplementierung der Algorithmen (nur zur Verifikation)
```

## Bauen

Voraussetzungen: Xcode 15+, [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

```bash
cd Raetsel
xcodegen generate          # erzeugt Raetsel.xcodeproj
open Raetsel.xcodeproj
```

In Xcode: Team unter *Signing & Capabilities* setzen, Gerät wählen, ▶. Bundle-ID ist `at.ju-da.raetsel` (in `project.yml` anpassbar).

Engine-Tests ohne Xcode-Projekt:

```bash
cd PuzzleEngine && swift test
```

Hinweis: Der Code wurde ohne Compiler geschrieben und statisch geprüft; die Algorithmen sind 1:1 aus den Python-Prototypen in `proto/` portiert und dort verifiziert. Beim ersten Build können Kleinigkeiten anfallen – `swift test` zuerst laufen lassen.

## Generatoren (Kurzfassung)

- **Sudoku**: Lösung per Backtracking füllen, Vorgaben zufällig entfernen solange eindeutig.
- **Königinnen**: zufällige Königinnen (keine Diagonal-Nachbarn), Regionen von den Königinnen aus wachsen lassen, dann *Repair-Loop*: solange eine zweite Lösung existiert, eine Zelle der Alternativlösung in eine Nachbarregion verschieben (Zusammenhang bleibt erhalten).
- **Duo**: Lösung füllen, k Constraints (=/×) ziehen, Vorgaben entfernen solange eindeutig.
- **Pfad**: Hamilton-Pfad per Backbite-Algorithmus, Wände zwischen nicht aufeinanderfolgenden Nachbarn, Wegpunkte alle 3 Zellen → entfernen solange eindeutig (Solver mit Erreichbarkeits- und Sackgassen-Pruning).
- **Flicken**: zufällige Rechteckzerlegung, Hinweis zufällig im Rechteck platzieren, Eindeutigkeit per Rechteck-Backtracking (MRV).
- **Nonogramm**: Zufallsbild, nur akzeptiert wenn rein per Zeilen-/Spaltenlogik lösbar (DP-Line-Solver, Bitmasken).

Zeiten (Python-Prototyp, Swift ist ~20–50× schneller): alle Stufen < 1 s außer Pfad Experte (~8 s Python → < 0,5 s Swift). Generierung läuft im Hintergrund-Task mit Spinner.

## Phase 2 (noch nicht enthalten)

- Wort-Spiele auf Deutsch: Crossclimb-, Pinpoint- und Wend-Varianten, Kreuzworträtsel – brauchen ein gebündeltes Wörterbuch bzw. vorgenerierte Puzzle-Pools (JSON).
- Weitere Logik-Rätsel: Kakuro, Slitherlink, Hashi, Nurikabe.
- Fortschritt eines angefangenen Rätsels speichern (`AnyPuzzle` ist bereits `Codable`).
