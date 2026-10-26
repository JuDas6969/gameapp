import SwiftUI
import PuzzleEngine

struct ZipView: View {
    let puzzle: ZipPuzzle
    let onSolved: () -> Void

    @State private var path: [Cell] = []
    @State private var hint: String? = nil

    init(puzzle: ZipPuzzle, onSolved: @escaping () -> Void) {
        self.puzzle = puzzle
        self.onSolved = onSolved
    }

    var body: some View {
        VStack(spacing: 12) {
            Board(n: puzzle.n) { cell in
                ZStack(alignment: .topLeading) {
                    Rectangle().fill(Color.primary.opacity(0.04))
                    GridLines(n: puzzle.n, cell: cell)
                    pathLayer(cell: cell)
                    numbers(cell: cell)
                    walls(cell: cell)
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { g in
                            guard let me = cellAt(g.location, cell: cell, n: puzzle.n) else { return }
                            extend(to: me)
                        }
                        .onEnded { _ in
                            hint = nil
                            if puzzle.isSolved(path) { onSolved() }
                        }
                )
            }
            HStack {
                Text(hint ?? "Von 1 aus über jedes Feld ziehen.").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button { undo() } label: { Label("Zurück", systemImage: "arrow.uturn.backward") }
                    .buttonStyle(.bordered).disabled(path.isEmpty)
                Button { path = [] } label: { Label("Löschen", systemImage: "trash") }
                    .buttonStyle(.bordered).disabled(path.isEmpty)
            }
            .padding(.horizontal)
        }
    }

    private func extend(to me: Cell) {
        if let last = path.last, last == me { return }
        // backtracking: dragging onto the previous cell removes the head
        if path.count >= 2 && path[path.count - 2] == me { path.removeLast(); return }
        // allow jumping to an earlier cell of the path to truncate there
        if let idx = path.firstIndex(of: me), idx < path.count - 1 {
            path.removeSubrange((idx + 1)...)
            return
        }
        // fast drags skip cells: ignore non-adjacent positions silently
        if let last = path.last, abs(last.r - me.r) + abs(last.c - me.c) != 1 { return }
        if let err = puzzle.stepError(path: path, next: me) {
            if hint != err { hint = err; Haptics.error() }
            return
        }
        path.append(me)
        hint = nil
        if puzzle.waypoints[me] != nil { Haptics.tap() }
    }

    private func undo() { if !path.isEmpty { path.removeLast() } }

    private func center(_ c: Cell, _ cell: CGFloat) -> CGPoint {
        CGPoint(x: CGFloat(c.c) * cell + cell / 2, y: CGFloat(c.r) * cell + cell / 2)
    }

    private func pathLayer(cell: CGFloat) -> some View {
        Canvas { ctx, _ in
            guard let first = path.first else { return }
            var p = Path()
            p.move(to: center(first, cell))
            for c in path.dropFirst() { p.addLine(to: center(c, cell)) }
            ctx.stroke(p, with: .color(Palette.accent.opacity(0.85)), style: StrokeStyle(lineWidth: cell * 0.45, lineCap: .round, lineJoin: .round))
            if let last = path.last {
                let r = cell * 0.18
                ctx.fill(Path(ellipseIn: CGRect(x: center(last, cell).x - r, y: center(last, cell).y - r, width: 2 * r, height: 2 * r)), with: .color(.white))
            }
        }
        .allowsHitTesting(false)
    }

    private func numbers(cell: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(Array(puzzle.waypoints.keys).sorted(), id: \.self) { c in
                let num = puzzle.waypoints[c]!
                let visited = path.contains(c)
                Text("\(num)")
                    .font(.system(size: cell * 0.36, weight: .bold, design: .rounded))
                    .foregroundStyle(visited ? Color.white : Color.primary)
                    .frame(width: cell * 0.68, height: cell * 0.68)
                    .background(visited ? Palette.accent : Color(uiColor: .systemBackground), in: Circle())
                    .overlay(Circle().stroke(Palette.gridStrong, lineWidth: 2))
                    .position(center(c, cell))
            }
        }
        .allowsHitTesting(false)
    }

    private func walls(cell: CGFloat) -> some View {
        Canvas { ctx, _ in
            var p = Path()
            for e in puzzle.walls {
                if e.a.r == e.b.r {   // vertical wall between horizontally adjacent cells
                    let x = CGFloat(e.b.c) * cell, y = CGFloat(e.a.r) * cell
                    p.move(to: CGPoint(x: x, y: y)); p.addLine(to: CGPoint(x: x, y: y + cell))
                } else {
                    let x = CGFloat(e.a.c) * cell, y = CGFloat(e.b.r) * cell
                    p.move(to: CGPoint(x: x, y: y)); p.addLine(to: CGPoint(x: x + cell, y: y))
                }
            }
            ctx.stroke(p, with: .color(.primary), style: StrokeStyle(lineWidth: 5, lineCap: .round))
        }
        .allowsHitTesting(false)
    }
}
