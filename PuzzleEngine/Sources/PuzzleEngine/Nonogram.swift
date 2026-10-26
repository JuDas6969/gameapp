import Foundation

/// Picross/Nonogram. Cell states for the player: 0 empty/unknown, 1 filled, 2 marked (×).
public struct NonogramPuzzle: Codable, Sendable, Equatable {
    public let n: Int
    public let rows: [[Int]]        // clues per row
    public let cols: [[Int]]        // clues per column
    public let solution: [[Bool]]
    public let difficulty: Difficulty

    public func isSolved(_ grid: [[Int]]) -> Bool {
        for r in 0..<n { for c in 0..<n where (grid[r][c] == 1) != solution[r][c] { return false } }
        return true
    }

    /// Row indices whose filled pattern currently matches their clues (for ticking clues off).
    public func satisfiedRows(_ grid: [[Int]]) -> Set<Int> {
        Set((0..<n).filter { NonogramGenerator.clues(of: grid[$0].map { $0 == 1 }) == rows[$0] })
    }
    public func satisfiedCols(_ grid: [[Int]]) -> Set<Int> {
        Set((0..<n).filter { c in NonogramGenerator.clues(of: (0..<n).map { grid[$0][c] == 1 }) == cols[c] })
    }
}

public enum NonogramGenerator {
    static let sizes: [Difficulty: Int] = [.leicht: 5, .mittel: 10, .schwer: 15, .experte: 20]
    static let density: [Difficulty: Double] = [.leicht: 0.6, .mittel: 0.6, .schwer: 0.58, .experte: 0.55]

    static let unknown = -1, fill = 1, empty = 0

    public static func generate(difficulty: Difficulty, seed: UInt64) -> NonogramPuzzle {
        var rng = SeededRNG(seed: seed)
        let diff = difficulty.resolved(using: &rng)
        let n = sizes[diff] ?? 10
        let d = density[diff] ?? 0.6
        while true {
            let sol = (0..<n).map { _ in (0..<n).map { _ in rng.chance(d) } }
            let rows = (0..<n).map { clues(of: sol[$0]) }
            let cols = (0..<n).map { c in clues(of: (0..<n).map { sol[$0][c] }) }
            if let g = lineSolve(n, rows, cols), !g.contains(where: { $0.contains(unknown) }) {
                return NonogramPuzzle(n: n, rows: rows, cols: cols, solution: sol, difficulty: diff)
            }
        }
    }

    public static func clues(of line: [Bool]) -> [Int] {
        var out: [Int] = []
        var run = 0
        for v in line {
            if v { run += 1 } else if run > 0 { out.append(run); run = 0 }
        }
        if run > 0 { out.append(run) }
        return out
    }

    /// Returns updated line or nil on contradiction. Masks are bit i = cell i (n ≤ 32).
    static func solveLine(_ cells: [Int], _ clues: [Int]) -> [Int]? {
        let L = cells.count
        let all: UInt64 = L >= 64 ? UInt64.max : (UInt64(1) << UInt64(L)) - 1
        // memo keyed by i * (clues.count + 1) + j
        var memoOK = Array(repeating: Int8(-1), count: (L + 1) * (clues.count + 1))
        var memoF = Array(repeating: UInt64(0), count: (L + 1) * (clues.count + 1))
        var memoE = Array(repeating: UInt64(0), count: (L + 1) * (clues.count + 1))

        func rec(_ i: Int, _ j: Int) -> (Bool, UInt64, UInt64) {
            let key = i * (clues.count + 1) + j
            if memoOK[key] >= 0 { return (memoOK[key] == 1, memoF[key], memoE[key]) }
            var okAny = false
            var fm: UInt64 = 0, em: UInt64 = 0
            if j == clues.count {
                var ok = true
                for x in i..<L where cells[x] == fill { ok = false; break }
                if ok { okAny = true; em = (all >> UInt64(i)) << UInt64(i) }
            } else {
                if i < L && cells[i] != fill {
                    let (ok, f, e) = rec(i + 1, j)
                    if ok { okAny = true; fm |= f; em |= e | (UInt64(1) << UInt64(i)) }
                }
                let blk = clues[j]
                if i + blk <= L {
                    var fits = true
                    for x in i..<(i + blk) where cells[x] == empty { fits = false; break }
                    if fits && i + blk < L && cells[i + blk] == fill { fits = false }
                    if fits {
                        let next = i + blk < L ? i + blk + 1 : L
                        let (ok, f, e) = rec(next, j + 1)
                        if ok {
                            okAny = true
                            fm |= f | (((UInt64(1) << UInt64(blk)) - 1) << UInt64(i))
                            em |= e | (i + blk < L ? UInt64(1) << UInt64(i + blk) : 0)
                        }
                    }
                }
            }
            memoOK[key] = okAny ? 1 : 0; memoF[key] = fm; memoE[key] = em
            return (okAny, fm, em)
        }

        let (ok, fm, em) = rec(0, 0)
        if !ok { return nil }
        var out = cells
        for x in 0..<L where out[x] == unknown {
            let f = (fm >> UInt64(x)) & 1, e = (em >> UInt64(x)) & 1
            if f == 1 && e == 0 { out[x] = fill } else if e == 1 && f == 0 { out[x] = empty }
        }
        return out
    }

    /// Pure line-logic propagation. Returns grid with -1 for undetermined cells, nil on contradiction.
    public static func lineSolve(_ n: Int, _ rows: [[Int]], _ cols: [[Int]]) -> [[Int]]? {
        var g = Array(repeating: Array(repeating: unknown, count: n), count: n)
        var changed = true
        while changed {
            changed = false
            for r in 0..<n {
                guard let new = solveLine(g[r], rows[r]) else { return nil }
                if new != g[r] { g[r] = new; changed = true }
            }
            for c in 0..<n {
                let col = (0..<n).map { g[$0][c] }
                guard let new = solveLine(col, cols[c]) else { return nil }
                if new != col {
                    for r in 0..<n { g[r][c] = new[r] }
                    changed = true
                }
            }
        }
        return g
    }
}
