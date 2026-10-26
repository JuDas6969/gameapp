import Foundation

/// Star-battle style: one queen per row, column and region; no two queens touch (incl. diagonally).
public struct QueensPuzzle: Codable, Sendable, Equatable {
    public let n: Int
    public let regions: [[Int]]          // region id per cell, 0..<n
    public let solution: [Int]           // row -> column
    public let difficulty: Difficulty

    /// `queens`: set of cells the player marked as queens.
    public func isSolved(_ queens: Set<Cell>) -> Bool {
        guard queens.count == n else { return false }
        return queens.allSatisfy { solution[$0.r] == $0.c }
    }

    /// Queens that currently violate a rule (for live feedback).
    public func conflicts(_ queens: Set<Cell>) -> Set<Cell> {
        var out = Set<Cell>()
        let qs = Array(queens)
        for (i, a) in qs.enumerated() {
            for b in qs[(i + 1)...] {
                if a.r == b.r || a.c == b.c || regions[a.r][a.c] == regions[b.r][b.c] || a.adjacent8(to: b) {
                    out.insert(a); out.insert(b)
                }
            }
        }
        return out
    }
}

public enum QueensGenerator {
    static let sizes: [Difficulty: Int] = [.leicht: 6, .mittel: 7, .schwer: 8, .experte: 9]

    public static func generate(difficulty: Difficulty, seed: UInt64) -> QueensPuzzle {
        var rng = SeededRNG(seed: seed)
        let diff = difficulty.resolved(using: &rng)
        let n = sizes[diff] ?? 7
        while true {
            guard let q = randomQueens(n, &rng) else { continue }
            var reg = growRegions(n, q, &rng)
            if repair(n, &reg, q, &rng) {
                return QueensPuzzle(n: n, regions: reg.rows, solution: q, difficulty: diff)
            }
        }
    }

    static func randomQueens(_ n: Int, _ rng: inout SeededRNG) -> [Int]? {
        for _ in 0..<2000 {
            let p = rng.shuffled(Array(0..<n))
            var ok = true
            for i in 0..<(n - 1) where abs(p[i] - p[i + 1]) < 2 { ok = false; break }
            if ok { return p }
        }
        return nil
    }

    static func growRegions(_ n: Int, _ queens: [Int], _ rng: inout SeededRNG) -> Grid2D<Int> {
        var reg = Grid2D(n: n, fill: -1)
        var sizes = Array(repeating: 1, count: n)
        for (r, c) in queens.enumerated() { reg[r, c] = r }
        var left = n * n - n
        while left > 0 {
            var cands: [(g: Int, cell: Cell)] = []
            for r in 0..<n { for c in 0..<n where reg[r, c] >= 0 {
                for nb in Cell(r, c).neighbours4 where nb.inside(n) && reg[nb] < 0 {
                    cands.append((reg[r, c], nb))
                }
            } }
            let choice: (g: Int, cell: Cell)
            if rng.chance(0.6) {
                let minSize = cands.map { sizes[$0.g] }.min()!
                choice = rng.pick(cands.filter { sizes[$0.g] == minSize })
            } else {
                choice = rng.pick(cands)
            }
            reg[choice.cell] = choice.g
            sizes[choice.g] += 1
            left -= 1
        }
        return reg
    }

    /// Up to `limit` solutions (row -> col).
    static func solutions(_ n: Int, _ reg: Grid2D<Int>, limit: Int) -> [[Int]] {
        var cols = Array(repeating: false, count: n)
        var regs = Array(repeating: false, count: n)
        var placed = Array(repeating: -1, count: n)
        var out: [[Int]] = []
        func rec(_ r: Int) {
            if out.count >= limit { return }
            if r == n { out.append(placed); return }
            for c in 0..<n {
                if cols[c] || regs[reg[r, c]] { continue }
                if r > 0 && abs(placed[r - 1] - c) <= 1 { continue }
                cols[c] = true; regs[reg[r, c]] = true; placed[r] = c
                rec(r + 1)
                cols[c] = false; regs[reg[r, c]] = false; placed[r] = -1
            }
        }
        rec(0)
        return out
    }

    static func connectedWithout(_ n: Int, _ reg: Grid2D<Int>, _ g: Int, _ removed: Cell) -> Bool {
        var cells: [Cell] = []
        for r in 0..<n { for c in 0..<n where reg[r, c] == g && Cell(r, c) != removed { cells.append(Cell(r, c)) } }
        guard let first = cells.first else { return false }
        var seen: Set<Cell> = [first]
        var stack = [first]
        while let cur = stack.popLast() {
            for nb in cur.neighbours4 where nb.inside(n) && nb != removed && reg[nb] == g && !seen.contains(nb) {
                seen.insert(nb); stack.append(nb)
            }
        }
        return seen.count == cells.count
    }

    /// Move cells between regions until the intended queens are the unique solution.
    static func repair(_ n: Int, _ reg: inout Grid2D<Int>, _ q: [Int], _ rng: inout SeededRNG) -> Bool {
        for _ in 0..<400 {
            let sols = solutions(n, reg, limit: 2)
            if sols.count == 1 { return true }
            if sols.isEmpty { return false }
            let alt = sols[0] == q ? sols[1] : sols[0]
            let rows = rng.shuffled((0..<n).filter { alt[$0] != q[$0] })
            var moved = false
            for r in rows {
                let cell = Cell(r, alt[r])
                let g = reg[cell]
                for nb in rng.shuffled(cell.neighbours4) where nb.inside(n) && reg[nb] != g {
                    if connectedWithout(n, reg, g, cell) {
                        reg[cell] = reg[nb]; moved = true; break
                    }
                }
                if moved { break }
            }
            if !moved { return false }
        }
        return false
    }
}
