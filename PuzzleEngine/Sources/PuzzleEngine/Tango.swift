import Foundation

/// Binary grid (0 = Sonne, 1 = Mond), 6×6, with =/× constraints between neighbours.
public struct TangoPuzzle: Codable, Sendable, Equatable {
    public static let n = 6

    public struct Constraint: Codable, Sendable, Equatable, Hashable {
        public let edge: Edge
        public let equal: Bool   // true "=", false "×"
    }

    public let givens: [[Int]]        // -1 = empty
    public let solution: [[Int]]
    public let constraints: [Constraint]
    public let difficulty: Difficulty

    public func isGiven(_ r: Int, _ c: Int) -> Bool { givens[r][c] != -1 }
    public func isSolved(_ grid: [[Int]]) -> Bool { grid == solution }

    /// Cells that violate a rule in the current (possibly partial) grid.
    public func conflicts(_ grid: [[Int]]) -> Set<Cell> {
        var out = Set<Cell>()
        let n = TangoPuzzle.n
        for r in 0..<n {
            for c in 0..<n {
                let v = grid[r][c]
                if v == -1 { continue }
                if c >= 2 && grid[r][c - 1] == v && grid[r][c - 2] == v { out.insert(Cell(r, c)); out.insert(Cell(r, c - 1)); out.insert(Cell(r, c - 2)) }
                if r >= 2 && grid[r - 1][c] == v && grid[r - 2][c] == v { out.insert(Cell(r, c)); out.insert(Cell(r - 1, c)); out.insert(Cell(r - 2, c)) }
            }
            let row = grid[r]
            if row.filter({ $0 == 0 }).count > n / 2 || row.filter({ $0 == 1 }).count > n / 2 {
                for c in 0..<n where row[c] != -1 { out.insert(Cell(r, c)) }
            }
        }
        for c in 0..<n {
            let col = (0..<n).map { grid[$0][c] }
            if col.filter({ $0 == 0 }).count > n / 2 || col.filter({ $0 == 1 }).count > n / 2 {
                for r in 0..<n where col[r] != -1 { out.insert(Cell(r, c)) }
            }
        }
        for k in constraints {
            let a = grid[k.edge.a.r][k.edge.a.c], b = grid[k.edge.b.r][k.edge.b.c]
            if a != -1 && b != -1 && ((a == b) != k.equal) { out.insert(k.edge.a); out.insert(k.edge.b) }
        }
        return out
    }
}

public enum TangoGenerator {
    static let n = 6
    static let constraintCount: [Difficulty: Int] = [.leicht: 7, .mittel: 6, .schwer: 5, .experte: 4]
    static let targetGivens: [Difficulty: Int] = [.leicht: 10, .mittel: 7, .schwer: 4, .experte: 0]

    public static func generate(difficulty: Difficulty, seed: UInt64) -> TangoPuzzle {
        var rng = SeededRNG(seed: seed)
        let diff = difficulty.resolved(using: &rng)
        var sol = Grid2D(n: n, fill: -1)
        _ = fill(&sol, [], &rng, 0)
        var pairs: [Edge] = []
        for r in 0..<n { for c in 0..<n {
            if c + 1 < n { pairs.append(Edge(Cell(r, c), Cell(r, c + 1))) }
            if r + 1 < n { pairs.append(Edge(Cell(r, c), Cell(r + 1, c))) }
        } }
        let cons = rng.shuffled(pairs).prefix(constraintCount[diff] ?? 5).map {
            TangoPuzzle.Constraint(edge: $0, equal: sol[$0.a] == sol[$0.b])
        }
        var g = sol
        var givens = n * n
        let target = targetGivens[diff] ?? 0
        for cell in rng.shuffled((0..<(n * n)).map { Cell($0 / n, $0 % n) }) {
            if givens <= target { break }
            let v = g[cell]
            g[cell] = -1
            var copy = g
            if countSolutions(&copy, cons, limit: 2, idx: 0) == 1 { givens -= 1 } else { g[cell] = v }
        }
        return TangoPuzzle(givens: g.rows, solution: sol.rows, constraints: cons, difficulty: diff)
    }

    static func lineOK(_ line: [Int]) -> Bool {
        var zeros = 0, ones = 0
        for i in 0..<line.count {
            if line[i] == 0 { zeros += 1 } else if line[i] == 1 { ones += 1 }
            if i >= 2 && line[i] != -1 && line[i] == line[i - 1] && line[i] == line[i - 2] { return false }
        }
        return zeros <= n / 2 && ones <= n / 2
    }

    static func ok(_ g: Grid2D<Int>, _ cons: [TangoPuzzle.Constraint], _ r: Int, _ c: Int) -> Bool {
        let row = (0..<n).map { g[r, $0] }
        let col = (0..<n).map { g[$0, c] }
        if !lineOK(row) || !lineOK(col) { return false }
        let me = Cell(r, c)
        for k in cons where k.edge.a == me || k.edge.b == me {
            let a = g[k.edge.a], b = g[k.edge.b]
            if a != -1 && b != -1 && ((a == b) != k.equal) { return false }
        }
        return true
    }

    static func fill(_ g: inout Grid2D<Int>, _ cons: [TangoPuzzle.Constraint], _ rng: inout SeededRNG, _ idx: Int) -> Bool {
        if idx == n * n { return true }
        let r = idx / n, c = idx % n
        for v in rng.shuffled([0, 1]) {
            g[r, c] = v
            if ok(g, cons, r, c) && fill(&g, cons, &rng, idx + 1) { return true }
        }
        g[r, c] = -1
        return false
    }

    static func countSolutions(_ g: inout Grid2D<Int>, _ cons: [TangoPuzzle.Constraint], limit: Int, idx: Int) -> Int {
        var i = idx
        while i < n * n && g[i / n, i % n] != -1 { i += 1 }
        if i == n * n { return 1 }
        let r = i / n, c = i % n
        var total = 0
        for v in 0...1 {
            g[r, c] = v
            if ok(g, cons, r, c) { total += countSolutions(&g, cons, limit: limit, idx: i + 1) }
            g[r, c] = -1
            if total >= limit { break }
        }
        return total
    }
}
