import SwiftUI
import PuzzleEngine

struct NonogramView: View {
    let puzzle: NonogramPuzzle
    let onSolved: () -> Void

    /// 0 unknown, 1 filled, 2 marked ×
    @State private var grid: [[Int]]
    @State private var tool: Int = 1               // 1 = füllen, 2 = markieren
    @State private var dragValue: Int? = nil       // value being painted during a drag
    @State private var dragVisited: Set<Cell> = []
    @State private var lockRow: Int? = nil        // painting locked to this row …
    @State private var lockCol: Int? = nil        // … or this column

    init(puzzle: NonogramPuzzle, onSolved: @escaping () -> Void) {
        self.puzzle = puzzle
        self.onSolved = onSolved
        _grid = State(initialValue: Array(repeating: Array(repeating: 0, count: puzzle.n), count: puzzle.n))
    }

    private var n: Int { puzzle.n }
    private var maxRowClues: Int { puzzle.rows.map(\.count).max() ?? 1 }
    private var maxColClues: Int { puzzle.cols.map(\.count).max() ?? 1 }

    var body: some View {
        let satRows = puzzle.satisfiedRows(grid)
        let satCols = puzzle.satisfiedCols(grid)
        VStack(spacing: 12) {
            GeometryReader { geo in
                // clue area scales with cell size: each clue number needs ~0.6 cell
                let clueW = CGFloat(maxRowClues) * 0.62, clueH = CGFloat(maxColClues) * 0.62
                let cell = max(10, floor(min(geo.size.width / (CGFloat(n) + clueW), geo.size.height / (CGFloat(n) + clueH))))
                let ox = clueW * cell, oy = clueH * cell
                let total = CGSize(width: ox + CGFloat(n) * cell, height: oy + CGFloat(n) * cell)
                ZStack(alignment: .topLeading) {
                    // row clues
                    ForEach(0..<n, id: \.self) { r in
                        Text(puzzle.rows[r].map(String.init).joined(separator: " "))
                            .font(.system(size: cell * 0.42, weight: .semibold, design: .monospaced))
                            .foregroundStyle(satRows.contains(r) ? Color.secondary.opacity(0.5) : Color.primary)
                            .frame(width: ox - 4, height: cell, alignment: .trailing)
                            .background(r % 2 == 0 ? Color.primary.opacity(0.04) : Color.clear)
                            .offset(x: 0, y: oy + CGFloat(r) * cell)
                    }
                    // column clues
                    ForEach(0..<n, id: \.self) { c in
                        VStack(spacing: 0) {
                            Spacer(minLength: 0)
                            ForEach(Array(puzzle.cols[c].enumerated()), id: \.offset) { _, v in
                                Text("\(v)").font(.system(size: cell * 0.42, weight: .semibold, design: .monospaced))
                            }
                        }
                        .foregroundStyle(satCols.contains(c) ? Color.secondary.opacity(0.5) : Color.primary)
                        .frame(width: cell, height: oy - 4, alignment: .bottom)
                        .background(c % 2 == 0 ? Color.primary.opacity(0.04) : Color.clear)
                        .offset(x: ox + CGFloat(c) * cell, y: 0)
                    }
                    // cells
                    cellsLayer(cell: cell)
                        .offset(x: ox, y: oy)
                    GridLines(n: n, cell: cell, strongEvery: (rows: 5, cols: 5))
                        .frame(width: CGFloat(n) * cell, height: CGFloat(n) * cell)
                        .offset(x: ox, y: oy)
                }
                .frame(width: total.width, height: total.height)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { g in
                            guard let me = cellAt(g.location, cell: cell, n: n, originX: ox, originY: oy) else { return }
                            paint(me)
                        }
                        .onEnded { _ in
                            dragValue = nil; dragVisited = []; lockRow = nil; lockCol = nil
                            if puzzle.isSolved(grid) { onSolved() }
                        }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            HStack {
                Picker("Werkzeug", selection: $tool) {
                    Text("Füllen").tag(1)
                    Text("Markieren ×").tag(2)
                }
                .pickerStyle(.segmented).frame(maxWidth: 260)
                Spacer()
                Button {
                    grid = Array(repeating: Array(repeating: 0, count: n), count: n)
                } label: { Label("Löschen", systemImage: "trash") }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal)
        }
    }

    private func cellsLayer(cell: CGFloat) -> some View {
        Canvas { ctx, _ in
            for r in 0..<n { for c in 0..<n {
                let rect = CGRect(x: CGFloat(c) * cell + 1, y: CGFloat(r) * cell + 1, width: cell - 2, height: cell - 2)
                switch grid[r][c] {
                case 1:
                    ctx.fill(Path(roundedRect: rect, cornerRadius: 2), with: .color(.primary))
                case 2:
                    var p = Path()
                    let i = cell * 0.3
                    p.move(to: CGPoint(x: rect.minX + i, y: rect.minY + i)); p.addLine(to: CGPoint(x: rect.maxX - i, y: rect.maxY - i))
                    p.move(to: CGPoint(x: rect.maxX - i, y: rect.minY + i)); p.addLine(to: CGPoint(x: rect.minX + i, y: rect.maxY - i))
                    ctx.stroke(p, with: .color(.secondary), lineWidth: max(1, cell * 0.08))
                default: break
                }
            } }
        }
        .frame(width: CGFloat(n) * cell, height: CGFloat(n) * cell)
        .allowsHitTesting(false)
    }

    private func paint(_ me: Cell) {
        if dragValue == nil {
            // first cell decides: toggle off if it already has the tool's value, else set it
            dragValue = grid[me.r][me.c] == tool ? 0 : tool
            dragVisited = [me]
            lockRow = nil; lockCol = nil
            grid[me.r][me.c] = dragValue!
            Haptics.tap()
            return
        }
        guard !dragVisited.contains(me), let first = dragVisited.first else { return }
        // lock to the row or column of the first cell once the direction is clear
        if lockRow == nil && lockCol == nil {
            if me.r == first.r { lockRow = first.r } else if me.c == first.c { lockCol = first.c } else { return }
        }
        if let lr = lockRow, me.r != lr { return }
        if let lc = lockCol, me.c != lc { return }
        dragVisited.insert(me)
        grid[me.r][me.c] = dragValue!
    }
}
