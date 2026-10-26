import SwiftUI
import PuzzleEngine

@main
struct RaetselApp: App {
    @State private var store = StatsStore()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environment(store)
        }
    }
}
