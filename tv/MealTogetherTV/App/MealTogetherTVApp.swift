import SwiftUI

@main
struct MealTogetherTVApp: App {
    @State private var settings: AppSettings
    @State private var session: Session
    @State private var activity = Activity()
    private let chime: Chime

    init() {
        let settings = AppSettings()
        _settings = State(initialValue: settings)
        _session = State(initialValue: Session(api: APIClient(baseURL: Self.apiBaseURL)))
        chime = Chime(settings: settings)
    }

    var body: some Scene {
        WindowGroup {
            RootView(chime: chime)
                .environment(settings)
                .environment(session)
                .environment(activity)
        }
    }

    /// The server address from Info.plist. A simulator build can point at a
    /// local `wrangler dev` server with the MT_API_BASE environment variable.
    private static var apiBaseURL: URL {
        #if DEBUG && targetEnvironment(simulator)
        if let override = ProcessInfo.processInfo.environment["MT_API_BASE"], let url = URL(string: override) {
            return url
        }
        #endif
        let configured = Bundle.main.object(forInfoDictionaryKey: "MTAPIBaseURL") as? String
        return URL(string: configured ?? "") ?? URL(string: "https://mealtogether.chuckycastle.io")!
    }
}
