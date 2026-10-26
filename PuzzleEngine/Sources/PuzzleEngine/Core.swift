import Foundation

// MARK: - Difficulty

public enum Difficulty: String, CaseIterable, Codable, Sendable, Identifiable {
    case leicht, mittel, schwer, experte, zufaellig

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .leicht: return "Leicht"
        case .mittel: return "Mittel"
        case .schwer: return "Schwer"
        case .experte: return "Experte"
        case .zufaellig: return "Zufällig"
        }
    }

    /// The four concrete tiers (everything except `.zufaellig`).
    public static let concrete: [Difficulty] = [.leicht, .mittel, .schwer, .experte]

    /// Resolves `.zufaellig` to a concrete tier using the given RNG; concrete tiers return themselves.
    public func resolved(using rng: inout SeededRNG) -> Difficulty {
        self == .zufaellig ? Difficulty.concrete[rng.int(4)] : self
    }
}

// MARK: - Game kinds

public enum GameKind: String, CaseIterable, Codable, Sendable, Identifiable {
    case sudoku, queens, tango, zip, patches, nonogram

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .sudoku: return "Mini-Sudoku"
        case .queens: return "Königinnen"
        case .tango: return "Duo"
        case .zip: return "Pfad"
        case .patches: return "Flicken"
        case .nonogram: return "Nonogramm"
        }
    }

    public var subtitle: String {
        switch self {
        case .sudoku: return "6×6 – jede Zahl einmal pro Zeile, Spalte und Block"
        case .queens: return "Eine Königin pro Zeile, Spalte und Farbfeld"
        case .tango: return "Sonne & Mond – nie drei gleiche in Folge"
        case .zip: return "Verbinde die Zahlen der Reihe nach über jedes Feld"
        case .patches: return "Teile das Gitter in Rechtecke mit passender Fläche"
        case .nonogram: return "Male das Bild anhand der Zahlenhinweise"
        }
    }

    public var systemImage: String {
        switch self {
        case .sudoku: return "number.square"
        case .queens: return "crown"
        case .tango: return "sun.max"
        case .zip: return "point.topleft.down.to.point.bottomright.curvepath"
        case .patches: return "square.grid.3x1.below.line.grid.1x2"
        case .nonogram: return "paintbrush.pointed"
        }
    }

    public var rules: String {
        switch self {
        case .sudoku:
            return "Fülle das 6×6-Gitter so, dass jede Zeile, jede Spalte und jeder 2×3-Block die Zahlen 1 bis 6 genau einmal enthält."
        case .queens:
            return "Setze in jede Zeile, jede Spalte und jedes Farbfeld genau eine Königin. Königinnen dürfen sich nicht berühren – auch nicht diagonal. Tippe einmal für ein ×, zweimal für eine Königin."
        case .tango:
            return "Fülle jedes Feld mit Sonne oder Mond. Jede Zeile und Spalte enthält gleich viele von beiden. Nie mehr als zwei gleiche nebeneinander. = bedeutet gleich, × bedeutet verschieden."
        case .zip:
            return "Zeichne einen Pfad von 1 bis zur höchsten Zahl, der jedes Feld genau einmal besucht und die Zahlen in aufsteigender Reihenfolge durchläuft. Wände können nicht gekreuzt werden."
        case .patches:
            return "Teile das Gitter vollständig in Rechtecke. Jedes Rechteck enthält genau eine Zahl, und diese Zahl entspricht seiner Fläche. Ziehe von einer Zahl weg, um ein Rechteck aufzuspannen."
        case .nonogram:
            return "Die Zahlen beschreiben die Längen zusammenhängender Blöcke in jeder Zeile und Spalte, in Reihenfolge und durch mindestens ein leeres Feld getrennt. Tippe zum Füllen, lange tippen zum Markieren."
        }
    }
}

// MARK: - Cell

public struct Cell: Hashable, Codable, Sendable, Comparable {
    public var r: Int
    public var c: Int
    public init(_ r: Int, _ c: Int) { self.r = r; self.c = c }

    public static func < (a: Cell, b: Cell) -> Bool { a.r != b.r ? a.r < b.r : a.c < b.c }

    public var neighbours4: [Cell] { [Cell(r + 1, c), Cell(r - 1, c), Cell(r, c + 1), Cell(r, c - 1)] }
    public func inside(_ n: Int) -> Bool { r >= 0 && c >= 0 && r < n && c < n }
    public func adjacent8(to o: Cell) -> Bool { abs(r - o.r) <= 1 && abs(c - o.c) <= 1 && self != o }
}

/// Undirected edge between two orthogonally adjacent cells, normalised so a < b.
public struct Edge: Hashable, Codable, Sendable {
    public let a: Cell
    public let b: Cell
    public init(_ x: Cell, _ y: Cell) {
        if x < y { a = x; b = y } else { a = y; b = x }
    }
}

// MARK: - Seeded RNG (SplitMix64 — deterministic across platforms for daily puzzles)

public struct SeededRNG: RandomNumberGenerator, Sendable {
    private var state: UInt64

    public init(seed: UInt64) { state = seed }

    public mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }

    /// Uniform integer in 0..<n (n > 0).
    public mutating func int(_ n: Int) -> Int {
        precondition(n > 0)
        return Int(next() % UInt64(n))
    }

    public mutating func chance(_ p: Double) -> Bool {
        Double(next() >> 11) / Double(1 << 53) < p
    }

    public mutating func shuffled<T>(_ a: [T]) -> [T] {
        var out = a
        if out.count > 1 {
            for i in stride(from: out.count - 1, to: 0, by: -1) {
                out.swapAt(i, int(i + 1))
            }
        }
        return out
    }

    public mutating func pick<T>(_ a: [T]) -> T { a[int(a.count)] }
}

// MARK: - Daily seed

public enum DailySeed {
    /// Stable seed for a given calendar day (local time) and game.
    public static func seed(for date: Date = Date(), game: GameKind, calendar: Calendar = .current) -> UInt64 {
        let comps = calendar.dateComponents([.year, .month, .day], from: date)
        let y: Int = comps.year ?? 0
        let m: Int = comps.month ?? 0
        let d: Int = comps.day ?? 0
        let dayNumber: Int = y * 10000 + m * 100 + d
        let day = UInt64(dayNumber)
        var h: UInt64 = 0xCBF29CE484222325
        for byte in game.rawValue.utf8 { h = (h ^ UInt64(byte)) &* 0x100000001B3 }
        return h ^ (day &* 0x9E3779B97F4A7C15)
    }

    /// Daily difficulty ramps through the week: Mo/Di leicht … So experte.
    public static func difficulty(for date: Date = Date(), calendar: Calendar = .current) -> Difficulty {
        let weekday = calendar.component(.weekday, from: date) // 1 = Sunday
        switch weekday {
        case 2, 3: return .leicht
        case 4, 5: return .mittel
        case 6, 7: return .schwer
        default: return .experte
        }
    }
}

// MARK: - Shared helpers

struct Grid2D<T> {
    var n: Int
    var data: [T]
    init(n: Int, fill: T) { self.n = n; data = Array(repeating: fill, count: n * n) }
    subscript(r: Int, c: Int) -> T {
        get { data[r * n + c] }
        set { data[r * n + c] = newValue }
    }
    subscript(cell: Cell) -> T {
        get { data[cell.r * n + cell.c] }
        set { data[cell.r * n + cell.c] = newValue }
    }
    var rows: [[T]] { (0..<n).map { r in Array(data[(r * n)..<((r + 1) * n)]) } }
}
