import Foundation
import Observation
import PuzzleEngine

struct GameStats: Codable {
    var solved: Int = 0
    var bestSeconds: [Difficulty: Int] = [:]
    var dailyDays: Set<String> = []      // "yyyy-MM-dd" of solved daily puzzles

    /// Consecutive days up to today (or yesterday) with a solved daily puzzle.
    var streak: Int {
        let cal = Calendar.current
        var day = Date()
        if !dailyDays.contains(StatsStore.key(day)) {
            day = cal.date(byAdding: .day, value: -1, to: day)!
            if !dailyDays.contains(StatsStore.key(day)) { return 0 }
        }
        var n = 0
        while dailyDays.contains(StatsStore.key(day)) {
            n += 1
            day = cal.date(byAdding: .day, value: -1, to: day)!
        }
        return n
    }
}

@Observable
final class StatsStore {
    private(set) var stats: [GameKind: GameStats] = [:]
    var lastDifficulty: [GameKind: Difficulty] = [:] { didSet { save() } }

    private static let statsKey = "raetsel.stats.v1"
    private static let diffKey = "raetsel.lastDifficulty.v1"

    init() { load() }

    static func key(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    func stats(for kind: GameKind) -> GameStats { stats[kind] ?? GameStats() }

    func isDailySolved(_ kind: GameKind, date: Date = Date()) -> Bool {
        stats(for: kind).dailyDays.contains(Self.key(date))
    }

    func recordSolve(kind: GameKind, difficulty: Difficulty, seconds: Int, isDaily: Bool) {
        var s = stats(for: kind)
        s.solved += 1
        if let best = s.bestSeconds[difficulty] { s.bestSeconds[difficulty] = min(best, seconds) }
        else { s.bestSeconds[difficulty] = seconds }
        if isDaily { s.dailyDays.insert(Self.key(Date())) }
        stats[kind] = s
        save()
    }

    private func load() {
        let d = UserDefaults.standard
        if let data = d.data(forKey: Self.statsKey), let s = try? JSONDecoder().decode([GameKind: GameStats].self, from: data) { stats = s }
        if let data = d.data(forKey: Self.diffKey), let s = try? JSONDecoder().decode([GameKind: Difficulty].self, from: data) { lastDifficulty = s }
    }

    private func save() {
        let d = UserDefaults.standard
        if let data = try? JSONEncoder().encode(stats) { d.set(data, forKey: Self.statsKey) }
        if let data = try? JSONEncoder().encode(lastDifficulty) { d.set(data, forKey: Self.diffKey) }
    }
}

extension Int {
    var clockString: String {
        let m = self / 60, s = self % 60
        return String(format: "%d:%02d", m, s)
    }
}
