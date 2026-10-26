import SwiftUI
import PuzzleEngine

struct SudokuView: View {
    let puzzle: SudokuPuzzle
    let onSolved: () -> Void

    @State private var grid: [[Int]]
    @State private var selected: Cell? = nil
    @State private var conflicts: Set<Cell> = []

    init(puzzle: SudokuPuzzle, onSolved: @escaping () -> Void) {
        self.puzzle = puzzle
        self.onSolved = onSolved
        _grid = State(initialValue: puzzle.givens)
    }

    private let n = SudokuPuzzle.n

    var body: some View {
        VStack(spacing: 16) {
            Board(n: n) { cell in
                ZStack(alignment: .topLeading) {
                    ForEach(0..<n, id: \.self) { r in
                        ForEach(0..<n, id: \.self) { c in
                            let me = Cell(r, c)
                            let v = grid[r][c]
                            ZStack {
                                Rectangle().fill(background(me))
                                if v != 0 {
                                    Text("\(v)")
                                        .font(.system(size: cell * 0.5, weight: puzzle.isGiven(r, c) ? .bold : .regular, design: .rounded))
                                        .foregroundStyle(conflicts.contains(me) ? Palette.conflict : (puzzle.isGiven(r, c) ? .primary : Palette.accent))
                                }
                            }
                            .frame(width: cell, height: cell)
                            .offset(x: CGFloat(c) * cell, y: CGFloat(r) * cell)
                            .contentShape(Rectangle())
                            .onTapGesture { selected = me; Haptics.tap() }
                        }
                    }
                    GridLines(n: n, cell: cell, strongEvery: (rows: 2, cols: 3))
                }
            }
            numberPad
        }
    }

    private func background(_ me: Cell) -> Color {
        if selected == me { return Palette.accent.opacity(0.3) }
        if let s = selected {
            if s.r == me.r || s.c == me.c || (s.r / 2 == me.r / 2 && s.c / 3 == me.c / 3) { return Palette.accent.opacity(0.08) }
            if grid[s.r][s.c] != 0 && grid[s.r][s.c] == grid[me.r][me.c] { return Palette.accent.opacity(0.18) }
        }
        return Color.clear
    }

    private var numberPad: some View {
        HStack(spacing: 10) {
            ForEach(1...n, id: \.self) { v in
                Button { enter(v) } label: {
                    Text("\(v)").font(.title2.bold()).frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.bordered)
            }
            Button { enter(0) } label: {
                Image(systemName: "delete.left").font(.title2).frame(maxWidth: .infinity, minHeight: 48)
            }
            .buttonStyle(.bordered)
        }
        .padding(.horizontal)
    }

    private func enter(_ v: Int) {
        guard let s = selected, !puzzle.isGiven(s.r, s.c) else { return }
        grid[s.r][s.c] = v
        conflicts = SudokuPuzzle.conflicts(in: grid)
        Haptics.tap()
        if puzzle.isSolved(grid) { onSolved() }
    }
}
