import Foundation

/// Type-erased puzzle so the app can store "the current puzzle" per game.
public enum AnyPuzzle: Codable, Sendable, Equatable {
    case sudoku(SudokuPuzzle)
    case queens(QueensPuzzle)
    case tango(TangoPuzzle)
    case zip(ZipPuzzle)
    case patches(PatchesPuzzle)
    case nonogram(NonogramPuzzle)

    public var kind: GameKind {
        switch self {
        case .sudoku: return .sudoku
        case .queens: return .queens
        case .tango: return .tango
        case .zip: return .zip
        case .patches: return .patches
        case .nonogram: return .nonogram
        }
    }

    public var difficulty: Difficulty {
        switch self {
        case .sudoku(let p): return p.difficulty
        case .queens(let p): return p.difficulty
        case .tango(let p): return p.difficulty
        case .zip(let p): return p.difficulty
        case .patches(let p): return p.difficulty
        case .nonogram(let p): return p.difficulty
        }
    }
}

public enum PuzzleFactory {
    /// Generates a puzzle. Deterministic for (kind, difficulty, seed). Run off the main thread for large puzzles.
    public static func make(_ kind: GameKind, difficulty: Difficulty, seed: UInt64) -> AnyPuzzle {
        switch kind {
        case .sudoku: return .sudoku(SudokuGenerator.generate(difficulty: difficulty, seed: seed))
        case .queens: return .queens(QueensGenerator.generate(difficulty: difficulty, seed: seed))
        case .tango: return .tango(TangoGenerator.generate(difficulty: difficulty, seed: seed))
        case .zip: return .zip(ZipGenerator.generate(difficulty: difficulty, seed: seed))
        case .patches: return .patches(PatchesGenerator.generate(difficulty: difficulty, seed: seed))
        case .nonogram: return .nonogram(NonogramGenerator.generate(difficulty: difficulty, seed: seed))
        }
    }

    /// Today's puzzle for a game (difficulty ramps Mo→So).
    public static func daily(_ kind: GameKind, date: Date = Date()) -> AnyPuzzle {
        make(kind, difficulty: DailySeed.difficulty(for: date), seed: DailySeed.seed(for: date, game: kind))
    }

    /// Fresh random puzzle.
    public static func random(_ kind: GameKind, difficulty: Difficulty) -> AnyPuzzle {
        make(kind, difficulty: difficulty, seed: UInt64.random(in: 0...UInt64.max))
    }
}
