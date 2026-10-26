import XCTest
@testable import PuzzleEngine

final class PuzzleEngineTests: XCTestCase {

    func testRNGIsDeterministic() {
        var a = SeededRNG(seed: 42), b = SeededRNG(seed: 42)
        for _ in 0..<100 { XCTAssertEqual(a.next(), b.next()) }
    }

    func testDailySeedStable() {
        let d = Date(timeIntervalSince1970: 1_700_000_000)
        XCTAssertEqual(DailySeed.seed(for: d, game: .zip), DailySeed.seed(for: d, game: .zip))
        XCTAssertNotEqual(DailySeed.seed(for: d, game: .zip), DailySeed.seed(for: d, game: .queens))
    }

    func testSudokuAllTiers() {
        for diff in Difficulty.concrete {
            let p = SudokuGenerator.generate(difficulty: diff, seed: 7)
            XCTAssertEqual(p.difficulty, diff)
            XCTAssertTrue(p.isSolved(p.solution))
            XCTAssertTrue(SudokuPuzzle.conflicts(in: p.solution).isEmpty)
            var g = Grid2D(n: 6, fill: 0)
            for r in 0..<6 { for c in 0..<6 { g[r, c] = p.givens[r][c] } }
            XCTAssertEqual(SudokuGenerator.countSolutions(&g, limit: 2), 1, "\(diff) must be unique")
        }
    }

    func testQueensAllTiers() {
        for diff in Difficulty.concrete {
            let p = QueensGenerator.generate(difficulty: diff, seed: 11)
            let queens = Set((0..<p.n).map { Cell($0, p.solution[$0]) })
            XCTAssertTrue(p.isSolved(queens))
            XCTAssertTrue(p.conflicts(queens).isEmpty)
            var reg = Grid2D(n: p.n, fill: 0)
            for r in 0..<p.n { for c in 0..<p.n { reg[r, c] = p.regions[r][c] } }
            XCTAssertEqual(QueensGenerator.solutions(p.n, reg, limit: 2).count, 1, "\(diff) must be unique")
            XCTAssertEqual(Set(p.regions.flatMap { $0 }).count, p.n)
        }
    }

    func testTangoAllTiers() {
        for diff in Difficulty.concrete {
            let p = TangoGenerator.generate(difficulty: diff, seed: 3)
            XCTAssertTrue(p.isSolved(p.solution))
            XCTAssertTrue(p.conflicts(p.solution).isEmpty)
            var g = Grid2D(n: 6, fill: -1)
            for r in 0..<6 { for c in 0..<6 { g[r, c] = p.givens[r][c] } }
            XCTAssertEqual(TangoGenerator.countSolutions(&g, p.constraints, limit: 2, idx: 0), 1)
        }
    }

    func testZipAllTiers() {
        for diff in Difficulty.concrete {
            let p = ZipGenerator.generate(difficulty: diff, seed: 9)
            XCTAssertTrue(p.isSolved(p.solution), "\(diff)")
            XCTAssertEqual(p.waypoints[p.solution.first!], 1)
            XCTAssertEqual(p.waypoints[p.solution.last!], p.maxNumber)
            let solver = ZipGenerator.Solver(n: p.n, walls: p.walls)
            XCTAssertEqual(solver.countPaths(p.waypoints, limit: 2), 1, "\(diff) must be unique")
            XCTAssertNil(p.stepError(path: [], next: p.solution[0]))
            XCTAssertNotNil(p.stepError(path: [], next: p.solution[1]))
        }
    }

    func testPatchesAllTiers() {
        for diff in Difficulty.concrete {
            let p = PatchesGenerator.generate(difficulty: diff, seed: 4)
            XCTAssertTrue(p.isSolved(p.solution), "\(diff)")
            XCTAssertEqual(PatchesGenerator.countSolutions(p.n, p.clues, limit: 2), 1)
        }
    }

    func testNonogramAllTiers() {
        for diff in Difficulty.concrete {
            let p = NonogramGenerator.generate(difficulty: diff, seed: 1)
            let grid = p.solution.map { $0.map { $0 ? 1 : 0 } }
            XCTAssertTrue(p.isSolved(grid))
            XCTAssertEqual(p.satisfiedRows(grid).count, p.n)
            XCTAssertEqual(p.satisfiedCols(grid).count, p.n)
            let solved = NonogramGenerator.lineSolve(p.n, p.rows, p.cols)!
            XCTAssertEqual(solved, grid, "\(diff) must be line-solvable")
        }
    }

    func testFactoryRoundTripsThroughCodable() throws {
        for kind in GameKind.allCases {
            let p = PuzzleFactory.make(kind, difficulty: .leicht, seed: 5)
            let data = try JSONEncoder().encode(p)
            let back = try JSONDecoder().decode(AnyPuzzle.self, from: data)
            XCTAssertEqual(p, back)
        }
    }

    func testPerformanceExperte() {
        measure {
            _ = ZipGenerator.generate(difficulty: .experte, seed: 123)
            _ = QueensGenerator.generate(difficulty: .experte, seed: 123)
        }
    }
}
