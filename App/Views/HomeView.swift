import SwiftUI
import PuzzleEngine

struct HomeView: View {
    @Environment(StatsStore.self) private var store
    @State private var launching: GameKind? = nil

    private let columns = [GridItem(.adaptive(minimum: 160), spacing: 14)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    dailyHeader
                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(GameKind.allCases) { kind in
                            Button { launching = kind } label: { GameCard(kind: kind) }
                                .buttonStyle(.plain)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Rätsel")
            .sheet(item: $launching) { kind in
                LaunchSheet(kind: kind)
                    .presentationDetents([.medium, .large])
            }
        }
    }

    private var dailyHeader: some View {
        let done = GameKind.allCases.filter { store.isDailySolved($0) }.count
        let best = GameKind.allCases.map { store.stats(for: $0).streak }.max() ?? 0
        return HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Tagesrätsel").font(.headline)
                Text("\(done) von \(GameKind.allCases.count) gelöst · \(DailySeed.difficulty().title)")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            if best > 0 {
                Label("\(best)", systemImage: "flame.fill")
                    .font(.headline).foregroundStyle(.orange)
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
    }
}

struct GameCard: View {
    @Environment(StatsStore.self) private var store
    let kind: GameKind

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: kind.systemImage).font(.title2)
                Spacer()
                if store.isDailySolved(kind) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                }
            }
            Text(kind.title).font(.headline)
            Text(kind.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            Spacer(minLength: 0)
            Text("\(store.stats(for: kind).solved) gelöst").font(.caption2).foregroundStyle(.tertiary)
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

/// Difficulty picker + Daily / Random launch.
struct LaunchSheet: View {
    @Environment(StatsStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let kind: GameKind
    @State private var difficulty: Difficulty = .mittel
    @State private var session: GameSession? = nil

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text(kind.rules).font(.callout).foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Schwierigkeit").font(.headline)
                    Picker("Schwierigkeit", selection: $difficulty) {
                        ForEach(Difficulty.allCases) { d in Text(d.title).tag(d) }
                    }
                    .pickerStyle(.segmented)
                }

                let s = store.stats(for: kind)
                if !s.bestSeconds.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Bestzeiten").font(.headline)
                        ForEach(Difficulty.concrete.filter { s.bestSeconds[$0] != nil }) { d in
                            HStack { Text(d.title); Spacer(); Text(s.bestSeconds[d]!.clockString).monospacedDigit() }
                                .font(.subheadline)
                        }
                    }
                }

                Spacer()

                Button {
                    session = GameSession(kind: kind, mode: .random(difficulty))
                } label: {
                    Label("Neues Rätsel", systemImage: "shuffle").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).controlSize(.large)

                Button {
                    session = GameSession(kind: kind, mode: .daily)
                } label: {
                    Label(store.isDailySolved(kind) ? "Tagesrätsel (gelöst) nochmal" : "Tagesrätsel – \(DailySeed.difficulty().title)",
                          systemImage: "calendar")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered).controlSize(.large)
            }
            .padding()
            .navigationTitle(kind.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Schließen") { dismiss() } } }
            .navigationDestination(item: $session) { s in GameScreen(session: s) }
            .onAppear { difficulty = store.lastDifficulty[kind] ?? .mittel }
            .onChange(of: difficulty) { _, new in store.lastDifficulty[kind] = new }
        }
    }
}

/// What the player asked for; the puzzle itself is generated by GameScreen.
struct GameSession: Hashable, Identifiable {
    enum Mode: Hashable {
        case daily
        case random(Difficulty)
    }
    let id = UUID()
    let kind: GameKind
    let mode: Mode

    var isDaily: Bool { if case .daily = mode { return true } else { return false } }
}
