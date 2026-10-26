import Foundation

/// Numbered Hamiltonian path puzzle: draw a path through every cell visiting the numbers in order.
public struct ZipPuzzle: Codable, Sendable, Equatable {
    public let n: Int
    public let waypoints: [Cell: Int]   // cell -> number (1-based)
    public let walls: Set<Edge>
    public let solution: [Cell]         // full path, solution[0] is waypoint 1
    public let difficulty: Difficulty

    public var maxNumber: Int { waypoints.values.max() ?? 0 }
    public func number(at cell: Cell) -> Int? { waypoints[cell] }
    public func wall(between a: Cell, _ b: Cell) -> Bool { walls.contains(Edge(a, b)) }

    /// Validates a player path: covers all cells, is connected, respects walls and visits numbers in order.
    public func isSolved(_ path: [Cell]) -> Bool {
        guard path.count == n * n, Set(path).count == n * n else { return false }
        var expect = 1
        for (i, cell) in path.enumerated() {
            if i > 0 {
                let prev = path[i - 1]
                if abs(prev.r - cell.r) + abs(prev.c - cell.c) != 1 || wall(between: prev, cell) { return false }
            }
            if let w = waypoints[cell] {
                if w != expect { return false }
                expect += 1
            }
        }
        return expect == maxNumber + 1
    }

    /// Whether `next` may be appended to the current `path` (legal single step; nil = ok).
    public func stepError(path: [Cell], next: Cell) -> String? {
        guard next.inside(n) else { return "Außerhalb" }
        if path.isEmpty { return waypoints[next] == 1 ? nil : "Starte bei 1" }
        let last = path[path.count - 1]
        if abs(last.r - next.r) + abs(last.c - next.c) != 1 { return "Nicht benachbart" }
        if wall(between: last, next) { return "Wand" }
        if path.contains(next) { return "Schon besucht" }
        if let w = waypoints[next] {
            let seen = path.compactMap { waypoints[$0] }.max() ?? 0
            if w != seen + 1 { return "Falsche Reihenfolge" }
        }
        return nil
    }
}

public enum ZipGenerator {
    static let sizes: [Difficulty: Int] = [.leicht: 5, .mittel: 6, .schwer: 7, .experte: 8]
    static let targetWaypoints: [Difficulty: Int] = [.leicht: 7, .mittel: 7, .schwer: 6, .experte: 5]
    static let wallCount: [Difficulty: Int] = [.leicht: 0, .mittel: 2, .schwer: 4, .experte: 6]

    public static func generate(difficulty: Difficulty, seed: UInt64) -> ZipPuzzle {
        var rng = SeededRNG(seed: seed)
        let diff = difficulty.resolved(using: &rng)
        let n = sizes[diff] ?? 6
        while true {
            let path = backbitePath(n, &rng)
            var pos = Grid2D(n: n, fill: 0)
            for (i, cell) in path.enumerated() { pos[cell] = i }
            var cand: [Edge] = []
            for r in 0..<n { for c in 0..<n {
                let a = Cell(r, c)
                for b in [Cell(r + 1, c), Cell(r, c + 1)] where b.inside(n) && abs(pos[a] - pos[b]) != 1 { cand.append(Edge(a, b)) }
            } }
            let walls = Set(rng.shuffled(cand).prefix(wallCount[diff] ?? 0))
            let solver = Solver(n: n, walls: walls)
            var idxs = Array(stride(from: 0, to: n * n, by: 3))
            if idxs.last != n * n - 1 { idxs.append(n * n - 1) }
            func wps(_ idxs: [Int]) -> [Cell: Int] {
                var d: [Cell: Int] = [:]
                for (j, i) in idxs.enumerated() { d[path[i]] = j + 1 }
                return d
            }
            if solver.countPaths(wps(idxs), limit: 2) != 1 { continue }
            let target = targetWaypoints[diff] ?? 6
            for i in rng.shuffled(Array(idxs[1..<(idxs.count - 1)])) {
                if idxs.count <= target { break }
                let trial = idxs.filter { $0 != i }
                if solver.countPaths(wps(trial), limit: 2) == 1 { idxs = trial }
            }
            return ZipPuzzle(n: n, waypoints: wps(idxs), walls: walls, solution: path, difficulty: diff)
        }
    }

    /// Random Hamiltonian path via the backbite move.
    static func backbitePath(_ n: Int, _ rng: inout SeededRNG) -> [Cell] {
        var path: [Cell] = []
        for r in 0..<n {
            let cols = r % 2 == 0 ? Array(0..<n) : Array((0..<n).reversed())
            for c in cols { path.append(Cell(r, c)) }
        }
        for _ in 0..<(n * n * 10) {
            if rng.chance(0.5) { path.reverse() }
            let head = path[0]
            let nbs = head.neighbours4.filter { $0.inside(n) && $0 != path[1] }
            let nb = rng.pick(nbs)
            if let i = path.firstIndex(of: nb) {
                path[0..<i].reverse()
            }
        }
        return path
    }

    // MARK: solver (counts Hamiltonian paths honouring waypoint order and walls)

    struct Solver {
        let n: Int
        let total: Int
        /// adjacency per cell index (walls removed)
        let adj: [[Int]]

        init(n: Int, walls: Set<Edge>) {
            self.n = n
            total = n * n
            var a: [[Int]] = Array(repeating: [], count: n * n)
            for r in 0..<n { for c in 0..<n {
                let me = Cell(r, c)
                for nb in me.neighbours4 where nb.inside(n) && !walls.contains(Edge(me, nb)) {
                    a[r * n + c].append(nb.r * n + nb.c)
                }
            } }
            adj = a
        }

        /// Returns number of valid paths (capped at `limit`), or -1 if the node budget was exceeded.
        func countPaths(_ waypoints: [Cell: Int], limit: Int, budget: Int = 400_000) -> Int {
            var wp = Array(repeating: 0, count: total)
            var k = 0
            var start = -1
            for (cell, num) in waypoints {
                wp[cell.r * n + cell.c] = num
                k = max(k, num)
                if num == 1 { start = cell.r * n + cell.c }
            }
            if start < 0 { return 0 }
            var visited = Array(repeating: false, count: total)
            var nodes = 0
            var found = 0
            var seenStamp = Array(repeating: 0, count: total)
            var stamp = 0

            func reachableAll(_ cur: Int, _ remaining: Int) -> Bool {
                stamp += 1
                var stack = [cur]
                seenStamp[cur] = stamp
                var cnt = 0
                while let x = stack.popLast() {
                    for y in adj[x] where !visited[y] && seenStamp[y] != stamp {
                        seenStamp[y] = stamp; stack.append(y); cnt += 1
                    }
                }
                return cnt == remaining
            }

            func deadEndFree(_ cur: Int) -> Bool {
                for cell in 0..<total where !visited[cell] {
                    var free = 0
                    var adjHead = false
                    for y in adj[cell] {
                        if y == cur { adjHead = true } else if !visited[y] { free += 1 }
                    }
                    let need = wp[cell] == k ? 1 : 2
                    if free + (adjHead ? 1 : 0) < need { return false }
                }
                return true
            }

            // returns false when budget exceeded
            func rec(_ cur: Int, _ depth: Int, _ nextWP: Int) -> Bool {
                nodes += 1
                if nodes > budget { return false }
                if depth == total {
                    if nextWP > k { found += 1 }
                    return true
                }
                if !reachableAll(cur, total - depth) { return true }
                if !deadEndFree(cur) { return true }
                for nb in adj[cur] where !visited[nb] {
                    let w = wp[nb]
                    if w != 0 && w != nextWP { continue }
                    if w == 0 && nextWP == k && depth + 1 == total { continue }
                    visited[nb] = true
                    let ok = rec(nb, depth + 1, w != 0 ? nextWP + 1 : nextWP)
                    visited[nb] = false
                    if !ok { return false }
                    if found >= limit { return true }
                }
                return true
            }

            visited[start] = true
            if !rec(start, 1, 2) { return -1 }
            return found
        }
    }
}
