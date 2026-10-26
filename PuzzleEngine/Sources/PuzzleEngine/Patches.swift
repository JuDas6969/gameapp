import Foundation

/// Shikaku: partition the grid into rectangles, each containing exactly one clue equal to its area.
public struct PatchesPuzzle: Codable, Sendable, Equatable {
    public struct Rect: Codable, Sendable, Equatable, Hashable {
        public var r: Int, c: Int, w: Int, h: Int
        public init(r: Int, c: Int, w: Int, h: Int) { self.r = r; self.c = c; self.w = w; self.h = h }
        public var area: Int { w * h }
        public func contains(_ cell: Cell) -> Bool { cell.r >= r && cell.r < r + h && cell.c >= c && cell.c < c + w }
        public func overlaps(_ o: Rect) -> Bool { r < o.r + o.h && o.r < r + h && c < o.c + o.w && o.c < c + w }
        public var cells: [Cell] { (r..<(r + h)).flatMap { rr in (c..<(c + w)).map { Cell(rr, $0) } } }
    }

    public let n: Int
    public let clues: [Cell: Int]
    public let solution: [Rect]
    public let difficulty: Difficulty

    /// Rect is valid in isolation: inside grid, exactly one clue, area matches.
    public func isValid(_ rect: Rect) -> Bool {
        guard rect.r >= 0, rect.c >= 0, rect.r + rect.h <= n, rect.c + rect.w <= n else { return false }
        let inside = clues.filter { rect.contains($0.key) }
        return inside.count == 1 && inside.first!.value == rect.area
    }

    public func isSolved(_ rects: [Rect]) -> Bool {
        guard rects.count == clues.count, rects.allSatisfy(isValid) else { return false }
        for (i, a) in rects.enumerated() { for b in rects[(i + 1)...] where a.overlaps(b) { return false } }
        return rects.reduce(0) { $0 + $1.area } == n * n
    }
}

public enum PatchesGenerator {
    static let sizes: [Difficulty: Int] = [.leicht: 5, .mittel: 7, .schwer: 9, .experte: 11]
    static let maxArea: [Difficulty: Int] = [.leicht: 6, .mittel: 8, .schwer: 10, .experte: 12]
    typealias Rect = PatchesPuzzle.Rect

    public static func generate(difficulty: Difficulty, seed: UInt64) -> PatchesPuzzle {
        var rng = SeededRNG(seed: seed)
        let diff = difficulty.resolved(using: &rng)
        let n = sizes[diff] ?? 7
        while true {
            let rects = partition(n, &rng, maxArea: maxArea[diff] ?? 8)
            for _ in 0..<8 {
                var clues: [Cell: Int] = [:]
                for rc in rects {
                    clues[Cell(rc.r + rng.int(rc.h), rc.c + rng.int(rc.w))] = rc.area
                }
                if countSolutions(n, clues, limit: 2) == 1 {
                    return PatchesPuzzle(n: n, clues: clues, solution: rects, difficulty: diff)
                }
            }
        }
    }

    static func partition(_ n: Int, _ rng: inout SeededRNG, maxArea: Int) -> [Rect] {
        var owner = Grid2D(n: n, fill: -1)
        var rects: [Rect] = []
        for r in 0..<n { for c in 0..<n where owner[r, c] == -1 {
            var opts: [(w: Int, h: Int)] = []
            for h in 1...(n - r) {
                for w in 1...(n - c) {
                    if w * h > maxArea { break }
                    var free = true
                    outer: for i in 0..<h { for j in 0..<w where owner[r + i, c + j] != -1 { free = false; break outer } }
                    if free { opts.append((w, h)) }
                }
            }
            let nonTrivial = opts.filter { $0.w != 1 || $0.h != 1 }
            let choice = rng.pick(nonTrivial.isEmpty ? opts : nonTrivial)
            let idx = rects.count
            rects.append(Rect(r: r, c: c, w: choice.w, h: choice.h))
            for i in 0..<choice.h { for j in 0..<choice.w { owner[r + i, c + j] = idx } }
        } }
        return rects
    }

    /// All rectangles of `area` containing `clue` and no other clue.
    static func placements(_ n: Int, _ clue: Cell, _ area: Int, _ clues: Set<Cell>) -> [Rect] {
        var out: [Rect] = []
        for h in 1...min(area, n) where area % h == 0 {
            let w = area / h
            if w > n { continue }
            for r in (clue.r - h + 1)...clue.r {
                for c in (clue.c - w + 1)...clue.c {
                    if r < 0 || c < 0 || r + h > n || c + w > n { continue }
                    let rect = Rect(r: r, c: c, w: w, h: h)
                    if clues.contains(where: { $0 != clue && rect.contains($0) }) { continue }
                    out.append(rect)
                }
            }
        }
        return out
    }

    static func countSolutions(_ n: Int, _ clues: [Cell: Int], limit: Int) -> Int {
        let cells = Set(clues.keys)
        let keys = Array(clues.keys).sorted()
        let opts = keys.map { placements(n, $0, clues[$0]!, cells) }
        var cover = Grid2D(n: n, fill: false)
        var done = Array(repeating: false, count: keys.count)
        var count = 0

        func free(_ rect: Rect) -> Bool {
            for r in rect.r..<(rect.r + rect.h) { for c in rect.c..<(rect.c + rect.w) where cover[r, c] { return false } }
            return true
        }
        func set(_ rect: Rect, _ v: Bool) {
            for r in rect.r..<(rect.r + rect.h) { for c in rect.c..<(rect.c + rect.w) { cover[r, c] = v } }
        }
        func rec(_ remaining: Int) {
            if count >= limit { return }
            if remaining == 0 { count += 1; return }
            var best = -1
            var bestOpts: [Rect] = []
            for i in 0..<keys.count where !done[i] {
                let valid = opts[i].filter(free)
                if valid.isEmpty { return }
                if best < 0 || valid.count < bestOpts.count { best = i; bestOpts = valid }
            }
            for o in bestOpts {
                set(o, true); done[best] = true
                rec(remaining - 1)
                done[best] = false; set(o, false)
            }
        }
        rec(keys.count)
        return count
    }
}
