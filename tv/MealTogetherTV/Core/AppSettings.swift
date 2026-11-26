import Foundation
import Observation

/// Choices kept on this Apple TV
@Observable
final class AppSettings {
    enum Theme: String, CaseIterable {
        case dark, light

        var label: String { self == .dark ? "Dark" : "Light" }
    }

    var theme: Theme {
        didSet { defaults.set(theme.rawValue, forKey: "theme") }
    }

    var soundEnabled: Bool {
        didSet { defaults.set(soundEnabled, forKey: "soundEnabled") }
    }

    /// The meal pinned to the dashboard; nil follows the next meal coming
    var selectedMealID: Int? {
        didSet { defaults.set(selectedMealID ?? 0, forKey: "selectedMealID") }
    }

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        theme = Theme(rawValue: defaults.string(forKey: "theme") ?? "") ?? .dark
        soundEnabled = defaults.object(forKey: "soundEnabled") as? Bool ?? true
        let meal = defaults.integer(forKey: "selectedMealID")
        selectedMealID = meal > 0 ? meal : nil
    }

    var palette: Palette { theme == .dark ? .dark : .light }
}

/// Dims the dashboard's focus highlight and controls after the remote has been still
@Observable
final class Activity {
    private(set) var isIdle = false
    private var timer: Task<Void, Never>?

    static let idleAfter: Duration = .seconds(25)

    /// Call on any remote input
    func bump() {
        if isIdle { isIdle = false }
        timer?.cancel()
        timer = Task { [weak self] in
            try? await Task.sleep(for: Self.idleAfter)
            guard !Task.isCancelled else { return }
            self?.isIdle = true
        }
    }
}
