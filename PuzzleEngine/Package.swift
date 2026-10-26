// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PuzzleEngine",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "PuzzleEngine", targets: ["PuzzleEngine"])
    ],
    targets: [
        .target(name: "PuzzleEngine"),
        .testTarget(name: "PuzzleEngineTests", dependencies: ["PuzzleEngine"])
    ]
)
