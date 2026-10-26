import SwiftUI
import PuzzleEngine

struct QueensView: View {
    let puzzle: QueensPuzzle
    let onSolved: () -> Void

    /// 0 = empty, 1 = ×, 2 = queen
    @State private var marks: [[Int]]
    @State private var conflicts: Set<Cell> = []
    @State private var dragMode: Int? = nil       // mark being painted by a drag (0 or 1 only)
    @State private var dragVisited: Set<Cell> = []

    init(puzzle: QueensPuzzle, onSolved: @escaping () -> Void) {
        self.puzzle = puzzle
        self.onSolved = onSolved
        _marks = State(initialValue: Array(repeating: Array(repeating: 0, count: puzzle.n), count: puzzle.n))
    }

    var body: some View {
        VStack(spacing: 12) {
            Board(n: puzzle.n) { cell in
                ZStack(alignment: .topLeading) {
                    ForEach(0..<puzzle.n, id: \.self) { r in
                        ForEach(0..<puzzle.n, id: \.self) { c in
                            let me = Cell(r, c)
                            ZStack {
                                Rectangle().fill(Palette.region(puzzle.regions[r][c]))
                                switch marks[r][c] {
                                case 1:
                                    Image(systemName: "xmark").font(.system(size: cell * 0.28)).foregroundStyle(.secondary)
                                case 2:
                                    Image(systemName: "crown.fill")
                                        .font(.system(size: cell * 0.5))
                                        .foregroundStyle(conflicts.contains(me) ? Palette.conflict : Color.primary)
                                default:
                                    EmptyView()
                                }
                            }
                            .frame(width: cell, height: cell)
                            .offset(x: CGFloat(c) * cell, y: CGFloat(r) * cell)
                        }
                    }
                    regionBorders(cell: cell)
                    GridLines(n: puzzle.n, cell: cell)
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { g in
                            guard let me = cellAt(g.location, cell: cell, n: puzzle.n) else { return }
                            if dragMode == nil {
                                // first touch: decide. Tap cycles later in onEnded; drag paints ×/clear.
                                dragVisited = [me]
                                dragMode = marks[me.r][me.c] == 0 ? 1 : 0
                            } else if !dragVisited.contains(me) && dragVisited.count >= 1 && g.translation != .zero {
                                // painting across cells: apply mode to first cell too
                                if dragVisited.count == 1, let first = dragVisited.first, marks[first.r][first.c] != 2 {
                                    marks[first.r][first.c] = dragMode!
                                }
                                dragVisited.insert(me)
                                if marks[me.r][me.c] != 2 { marks[me.r][me.c] = dragMode! }
                            }
                        }
                        .onEnded { g in
                            defer { dragMode = nil; dragVisited = [] }
                            if dragVisited.count == 1, let me = dragVisited.first, abs(g.translation.width) < 8, abs(g.translation.height) < 8 {
                                cycle(me)
                            }
                            update()
                        }
                )
            }
            Text("Tippen: leer → × → Königin. Ziehen: × malen.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private func cycle(_ me: Cell) {
        marks[me.r][me.c] = (marks[me.r][me.c] + 1) % 3
        Haptics.tap()
    }

    private func update() {
        var queens = Set<Cell>()
        for r in 0..<puzzle.n { for c in 0..<puzzle.n where marks[r][c] == 2 { queens.insert(Cell(r, c)) } }
        conflicts = puzzle.conflicts(queens)
        if puzzle.isSolved(queens) { onSolved() }
    }

    /// Thick borders between different regions.
    private func regionBorders(cell: CGFloat) -> some View {
        Canvas { ctx, _ in
            var path = Path()
            for r in 0..<puzzle.n { for c in 0..<puzzle.n {
                let x = CGFloat(c) * cell, y = CGFloat(r) * cell
                if c + 1 < puzzle.n && puzzle.regions[r][c] != puzzle.regions[r][c + 1] {
                    path.move(to: CGPoint(x: x + cell, y: y)); path.addLine(to: CGPoint(x: x + cell, y: y + cell))
                }
                if r + 1 < puzzle.n && puzzle.regions[r][c] != puzzle.regions[r + 1][c] {
                    path.move(to: CGPoint(x: x, y: y + cell)); path.addLine(to: CGPoint(x: x + cell, y: y + cell))
                }
            } }
            ctx.stroke(path, with: .color(Palette.gridStrong), lineWidth: 3)
        }
        .allowsHitTesting(false)
    }
}
