import SwiftUI
import PuzzleEngine

struct PatchesView: View {
    typealias Rect = PatchesPuzzle.Rect
    let puzzle: PatchesPuzzle
    let onSolved: () -> Void

    @State private var rects: [Rect] = []
    @State private var dragStart: Cell? = nil
    @State private var dragCurrent: Cell? = nil

    init(puzzle: PatchesPuzzle, onSolved: @escaping () -> Void) {
        self.puzzle = puzzle
        self.onSolved = onSolved
    }

    private var preview: Rect? {
        guard let a = dragStart, let b = dragCurrent else { return nil }
        return Rect(r: min(a.r, b.r), c: min(a.c, b.c), w: abs(a.c - b.c) + 1, h: abs(a.r - b.r) + 1)
    }

    var body: some View {
        VStack(spacing: 12) {
            Board(n: puzzle.n) { cell in
                ZStack(alignment: .topLeading) {
                    Rectangle().fill(Color.primary.opacity(0.04))
                    ForEach(Array(rects.enumerated()), id: \.offset) { i, rc in
                        rectView(rc, cell: cell, color: Palette.region(i), valid: true)
                    }
                    if let p = preview {
                        rectView(p, cell: cell, color: Palette.accent.opacity(0.35), valid: puzzle.isValid(p) && !overlaps(p))
                    }
                    GridLines(n: puzzle.n, cell: cell)
                    clues(cell: cell)
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { g in
                            guard let me = cellAt(g.location, cell: cell, n: puzzle.n) else { return }
                            if dragStart == nil { dragStart = me }
                            dragCurrent = me
                        }
                        .onEnded { _ in
                            defer { dragStart = nil; dragCurrent = nil }
                            guard let p = preview else { return }
                            if p.area == 1 {
                                // tap: remove the rectangle under the finger
                                if let i = rects.firstIndex(where: { $0.contains(Cell(p.r, p.c)) }) {
                                    rects.remove(at: i); Haptics.tap()
                                }
                                return
                            }
                            // drop rectangles overlapped by the new one, then add if valid
                            if puzzle.isValid(p) {
                                rects.removeAll { $0.overlaps(p) }
                                rects.append(p)
                                Haptics.tap()
                                if puzzle.isSolved(rects) { onSolved() }
                            } else {
                                Haptics.error()
                            }
                        }
                )
            }
            HStack {
                Text("Ziehen: Rechteck aufspannen. Tippen: entfernen.").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button { rects = [] } label: { Label("Löschen", systemImage: "trash") }
                    .buttonStyle(.bordered).disabled(rects.isEmpty)
            }
            .padding(.horizontal)
        }
    }

    private func overlaps(_ p: Rect) -> Bool { rects.contains { $0.overlaps(p) } }

    private func rectView(_ rc: Rect, cell: CGFloat, color: Color, valid: Bool) -> some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(valid ? color : Palette.conflict.opacity(0.35))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(valid ? Palette.gridStrong : Palette.conflict, lineWidth: 2))
            .frame(width: CGFloat(rc.w) * cell - 3, height: CGFloat(rc.h) * cell - 3)
            .offset(x: CGFloat(rc.c) * cell + 1.5, y: CGFloat(rc.r) * cell + 1.5)
    }

    private func clues(cell: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(Array(puzzle.clues.keys).sorted(), id: \.self) { c in
                let covered = rects.contains { $0.contains(c) }
                Text("\(puzzle.clues[c]!)")
                    .font(.system(size: cell * 0.42, weight: .bold, design: .rounded))
                    .foregroundStyle(covered ? Color.primary.opacity(0.6) : Color.primary)
                    .frame(width: cell, height: cell)
                    .offset(x: CGFloat(c.c) * cell, y: CGFloat(c.r) * cell)
            }
        }
        .allowsHitTesting(false)
    }
}
