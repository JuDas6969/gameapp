import Foundation

/// 6×6 Sudoku with 2-row × 3-column boxes. 0 = empty.
public struct SudokuPuzzle: Codable, Sendable, Equatable {
    public static let n = 6
    public let givens: [[Int]]      // 0 = empty
    public let solution: [[Int]]
    public let difficulty: Difficulty

    public func isGiven(_ r: Int, _ c: Int) -> Bool { givens[r][c] != 0 }

    /// True when `grid` equals the solution.
    public func isSolved(_ grid: [[Int]]) -> Bool { grid == solution }

    /// Cells whose current value conflicts with the rules (for live feedback).
    public static func conflicts(in grid: [[Int]]) -> Set<Cell> {
        var out = Set<Cell>()
        let n = SudokuPuzzle.n
        for r in 0..<n {
            for c in 0..<n {
                let v = grid[r][c]
                if v == 0 { continue }
                for i in 0..<n where i != c && grid[r][i] == v { out.insert(Cell(r, c)) }
                for i in 0..<n where i != r && grid[i][c] == v { out.insert(Cell(r, c)) }
                let br = (r / 2) * 2, bc = (c / 3) * 3
                for i in 0..<2 { for j in 0..<3 {
                    let rr = br + i, cc = bc + j
                    if (rr != r || cc != c) && grid[rr][cc] == v { out.insert(Cell(r, c)) }
                } }
            }
        }
        return out
    }
}

public enum SudokuGenerator {
    static let n = 6
    static let targetGivens: [Difficulty: Int] = [.leicht: 20, .mittel: 16, .schwer: 12, .experte: 0]

    public static func generate(difficulty: Difficulty, seed: UInt64) -> SudokuPuzzle {
        var rng = SeededRNG(seed: seed)
        let diff = difficulty.resolved(using: &rng)
        var sol = Grid2D(n: n, fill: 0)
        _ = fill(&sol, &rng, 0)
        var g = sol
        var givens = n * n
        let target = targetGivens[diff] ?? 0
        let order = rng.shuffled((0..<(n * n)).map { Cell($0 / n, $0 % n) })
        for cell in order {
            if givens <= target { break }
            let v = g[cell]
            g[cell] = 0
            var copy = g
            if countSolutions(&copy, limit: 2) == 1 { givens -= 1 } else { g[cell] = v }
        }
        return SudokuPuzzle(givens: g.rows, solution: sol.rows, difficulty: diff)
    }

    static func valid(_ g: Grid2D<Int>, _ r: Int, _ c: Int, _ v: Int) -> Bool {
        for i in 0..<n where g[r, i] == v || g[i, c] == v { return false }
        let br = (r / 2) * 2, bc = (c / 3) * 3
        for i in 0..<2 { for j in 0..<3 where g[br + i, bc + j] == v { return false } }
        return true
    }

    static func fill(_ g: inout Grid2D<Int>, _ rng: inout SeededRNG, _ idx: Int) -> Bool {
        if idx == n * n { return true }
        let r = idx / n, c = idx % n
        if g[r, c] != 0 { return fill(&g, &rng, idx + 1) }
        for v in rng.shuffled(Array(1...n)) where valid(g, r, c, v) {
            g[r, c] = v
            if fill(&g, &rng, idx + 1) { return true }
            g[r, c] = 0
        }
        return false
    }

    static func countSolutions(_ g: inout Grid2D<Int>, limit: Int) -> Int {
        var best: (r: Int, c: Int, cands: [Int])? = nil
        for r in 0..<n {
            for c in 0..<n where g[r, c] == 0 {
                let cands = (1...n).filter { valid(g, r, c, $0) }
                if cands.isEmpty { return 0 }
                if best == nil || cands.count < best!.cands.count { best = (r, c, cands) }
            }
        }
        guard let b = best else { return 1 }
        var total = 0
        for v in b.cands {
            g[b.r, b.c] = v
            total += countSolutions(&g, limit: limit)
            g[b.r, b.c] = 0
            if total >= limit { break }
        }
        return total
    }
}
