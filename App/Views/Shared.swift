import SwiftUI
import PuzzleEngine

enum Palette {
    /// Region colours for Queens / Patches.
    static let regions: [Color] = [
        Color(red: 0.98, green: 0.80, blue: 0.80), Color(red: 0.80, green: 0.90, blue: 0.98),
        Color(red: 0.82, green: 0.95, blue: 0.82), Color(red: 0.99, green: 0.92, blue: 0.75),
        Color(red: 0.90, green: 0.82, blue: 0.97), Color(red: 0.98, green: 0.85, blue: 0.95),
        Color(red: 0.80, green: 0.95, blue: 0.95), Color(red: 0.92, green: 0.92, blue: 0.80),
        Color(red: 0.86, green: 0.86, blue: 0.86), Color(red: 0.99, green: 0.84, blue: 0.70),
        Color(red: 0.78, green: 0.88, blue: 0.80), Color(red: 0.90, green: 0.78, blue: 0.78),
    ]
    static func region(_ i: Int) -> Color { regions[i % regions.count] }
    static let accent = Color.accentColor
    static let grid = Color.primary.opacity(0.25)
    static let gridStrong = Color.primary.opacity(0.7)
    static let conflict = Color.red
}

/// Square board that fills the available space; `content` receives the cell size.
struct Board<Content: View>: View {
    let n: Int
    let extraLeading: CGFloat   // reserved space for clue columns (nonogram)
    let extraTop: CGFloat
    @ViewBuilder let content: (CGFloat) -> Content

    init(n: Int, extraLeading: CGFloat = 0, extraTop: CGFloat = 0, @ViewBuilder content: @escaping (CGFloat) -> Content) {
        self.n = n; self.extraLeading = extraLeading; self.extraTop = extraTop; self.content = content
    }

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width - extraLeading, geo.size.height - extraTop)
            let cell = max(8, floor(side / CGFloat(n)))
            content(cell)
                .frame(width: cell * CGFloat(n) + extraLeading, height: cell * CGFloat(n) + extraTop)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }
}

func cellAt(_ location: CGPoint, cell: CGFloat, n: Int, originX: CGFloat = 0, originY: CGFloat = 0) -> Cell? {
    let c = Int(floor((location.x - originX) / cell))
    let r = Int(floor((location.y - originY) / cell))
    guard r >= 0, c >= 0, r < n, c < n else { return nil }
    return Cell(r, c)
}

/// Thin grid lines over an n×n board.
struct GridLines: View {
    let n: Int
    let cell: CGFloat
    var strongEvery: (rows: Int, cols: Int)? = nil

    var body: some View {
        Canvas { ctx, _ in
            for i in 0...n {
                let strongRow = strongEvery.map { i % $0.rows == 0 } ?? false
                let strongCol = strongEvery.map { i % $0.cols == 0 } ?? false
                let edge = i == 0 || i == n
                var h = Path(); h.move(to: CGPoint(x: 0, y: CGFloat(i) * cell)); h.addLine(to: CGPoint(x: CGFloat(n) * cell, y: CGFloat(i) * cell))
                ctx.stroke(h, with: .color(strongRow || edge ? Palette.gridStrong : Palette.grid), lineWidth: strongRow || edge ? 2 : 1)
                var v = Path(); v.move(to: CGPoint(x: CGFloat(i) * cell, y: 0)); v.addLine(to: CGPoint(x: CGFloat(i) * cell, y: CGFloat(n) * cell))
                ctx.stroke(v, with: .color(strongCol || edge ? Palette.gridStrong : Palette.grid), lineWidth: strongCol || edge ? 2 : 1)
            }
        }
        .allowsHitTesting(false)
    }
}

enum Haptics {
    static func tap() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func error() { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}
