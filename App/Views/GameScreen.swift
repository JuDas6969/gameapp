import SwiftUI
import PuzzleEngine

struct GameScreen: View {
    @Environment(StatsStore.self) private var store
    let session: GameSession

    @State private var puzzle: AnyPuzzle? = nil
    @State private var generation = 0          // bumps to reset the game view
    @State private var seconds = 0
    @State private var solved = false
    @State private var showRules = false
    @State private var showWin = false

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            if let puzzle {
                VStack(spacing: 12) {
                    header(puzzle)
                    gameView(puzzle)
                        .id(generation)
                        .padding(.horizontal, 8)
                        .disabled(solved)
                }
                .padding(.bottom, 8)
            } else {
                ProgressView("Rätsel wird erzeugt …")
            }

            if showWin, let puzzle { winOverlay(puzzle) }
        }
        .navigationTitle(session.kind.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showRules = true } label: { Image(systemName: "questionmark.circle") }
                if !session.isDaily {
                    Button { newPuzzle() } label: { Image(systemName: "arrow.clockwise") }
                }
            }
        }
        .sheet(isPresented: $showRules) {
            NavigationStack {
                ScrollView { Text(session.kind.rules).padding() }
                    .navigationTitle("Regeln")
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("OK") { showRules = false } } }
            }
            .presentationDetents([.medium])
        }
        .task(id: session.id) { await generate() }
        .onReceive(timer) { _ in if puzzle != nil && !solved { seconds += 1 } }
    }

    private func header(_ puzzle: AnyPuzzle) -> some View {
        HStack {
            Label(session.isDaily ? "Tagesrätsel" : puzzle.difficulty.title, systemImage: session.isDaily ? "calendar" : "dial.medium")
            Spacer()
            Label(seconds.clockString, systemImage: "timer").monospacedDigit()
        }
        .font(.subheadline).foregroundStyle(.secondary)
        .padding(.horizontal)
    }

    @ViewBuilder
    private func gameView(_ puzzle: AnyPuzzle) -> some View {
        switch puzzle {
        case .sudoku(let p): SudokuView(puzzle: p, onSolved: onSolved)
        case .queens(let p): QueensView(puzzle: p, onSolved: onSolved)
        case .tango(let p): TangoView(puzzle: p, onSolved: onSolved)
        case .zip(let p): ZipView(puzzle: p, onSolved: onSolved)
        case .patches(let p): PatchesView(puzzle: p, onSolved: onSolved)
        case .nonogram(let p): NonogramView(puzzle: p, onSolved: onSolved)
        }
    }

    private func winOverlay(_ puzzle: AnyPuzzle) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 48)).foregroundStyle(.green)
            Text("Gelöst!").font(.title.bold())
            Text("\(puzzle.difficulty.title) · \(seconds.clockString)").foregroundStyle(.secondary)
            if let best = store.stats(for: session.kind).bestSeconds[puzzle.difficulty], best == seconds {
                Text("Neue Bestzeit").font(.subheadline.bold()).foregroundStyle(.orange)
            }
            HStack {
                Button("Ansehen") { showWin = false }.buttonStyle(.bordered)
                if !session.isDaily {
                    Button("Nächstes") { newPuzzle() }.buttonStyle(.borderedProminent)
                }
            }
        }
        .padding(28)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
        .shadow(radius: 20)
        .transition(.scale.combined(with: .opacity))
    }

    private func onSolved() {
        guard !solved, let puzzle else { return }
        solved = true
        Haptics.success()
        store.recordSolve(kind: session.kind, difficulty: puzzle.difficulty, seconds: seconds, isDaily: session.isDaily)
        withAnimation(.spring) { showWin = true }
    }

    private func newPuzzle() {
        puzzle = nil
        showWin = false
        Task { await generate() }
    }

    @MainActor
    private func generate() async {
        solved = false; seconds = 0; showWin = false
        let kind = session.kind, mode = session.mode
        let p = await Task.detached(priority: .userInitiated) { () -> AnyPuzzle in
            switch mode {
            case .daily: return PuzzleFactory.daily(kind)
            case .random(let d): return PuzzleFactory.random(kind, difficulty: d)
            }
        }.value
        puzzle = p
        generation += 1
    }
}
