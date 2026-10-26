import SwiftUI
import PuzzleEngine

struct TangoView: View {
    let puzzle: TangoPuzzle
    let onSolved: () -> Void

    @State private var grid: [[Int]]          // -1 empty, 0 Sonne, 1 Mond
    @State private var conflicts: Set<Cell> = []

    private let n = TangoPuzzle.n

    init(puzzle: TangoPuzzle, onSolved: @escaping () -> Void) {
        self.puzzle = puzzle
        self.onSolved = onSolved
        _grid = State(initialValue: puzzle.givens)
    }

    var body: some View {
        VStack(spacing: 12) {
            Board(n: n) { cell in
                ZStack(alignment: .topLeading) {
                    ForEach(0..<n, id: \.self) { r in
                        ForEach(0..<n, id: \.self) { c in
                            let me = Cell(r, c)
                            ZStack {
                                Rectangle().fill(puzzle.isGiven(r, c) ? Color.primary.opacity(0.07) : Color.clear)
                                symbol(grid[r][c], size: cell * 0.55)
                                    .foregroundStyle(conflicts.contains(me) ? Palette.conflict : symbolColor(grid[r][c]))
                            }
                            .frame(width: cell, height: cell)
                            .offset(x: CGFloat(c) * cell, y: CGFloat(r) * cell)
                            .contentShape(Rectangle())
                            .onTapGesture { tap(me) }
                        }
                    }
                    GridLines(n: n, cell: cell)
                    constraintLabels(cell: cell)
                }
            }
            Text("Tippen: leer → ☀︎ → ☾").font(.caption).foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func symbol(_ v: Int, size: CGFloat) -> some View {
        switch v {
        case 0: Image(systemName: "sun.max.fill").font(.system(size: size))
        case 1: Image(systemName: "moon.fill").font(.system(size: size * 0.9))
        default: EmptyView()
        }
    }

    private func symbolColor(_ v: Int) -> Color { v == 0 ? .orange : .indigo }

    private func constraintLabels(cell: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(Array(puzzle.constraints.enumerated()), id: \.offset) { _, k in
                let x = (CGFloat(k.edge.a.c) + CGFloat(k.edge.b.c)) / 2 * cell + cell / 2
                let y = (CGFloat(k.edge.a.r) + CGFloat(k.edge.b.r)) / 2 * cell + cell / 2
                Text(k.equal ? "=" : "×")
                    .font(.system(size: cell * 0.3, weight: .heavy, design: .rounded))
                    .frame(width: cell * 0.36, height: cell * 0.36)
                    .background(Color(uiColor: .systemBackground), in: Circle())
                    .overlay(Circle().stroke(Palette.gridStrong, lineWidth: 1))
                    .position(x: x, y: y)
            }
        }
        .allowsHitTesting(false)
    }

    private func tap(_ me: Cell) {
        guard !puzzle.isGiven(me.r, me.c) else { return }
        grid[me.r][me.c] = grid[me.r][me.c] == 1 ? -1 : grid[me.r][me.c] + 1
        conflicts = puzzle.conflicts(grid)
        Haptics.tap()
        if puzzle.isSolved(grid) { onSolved() }
    }
}
