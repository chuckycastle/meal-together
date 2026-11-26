import SwiftUI

/// Chooses between sign-in, the hub, and the states in between
struct RootView: View {
    let chime: Chime
    @Environment(Session.self) private var session
    @Environment(AppSettings.self) private var settings

    var body: some View {
        let palette = settings.palette
        ZStack {
            palette.counter.ignoresSafeArea()
            content
        }
        .environment(\.palette, palette)
        .environment(\.chime, chime)
        .foregroundStyle(palette.ink)
        .font(.text(29))
        .preferredColorScheme(settings.theme == .dark ? .dark : .light)
        .task { await session.start() }
        .onAppear {
            // A kitchen display stays on; the screen saver would hide running timers
            UIApplication.shared.isIdleTimerDisabled = true
        }
    }

    @ViewBuilder
    private var content: some View {
        switch session.phase {
        case .launching:
            ProgressView()
        case .signedOut:
            SignInView()
        case .signedIn:
            if let family = session.activeFamily {
                HubView(family: family, api: session.api, chime: chime)
                    .id(family.id)
            } else if session.hasLoaded {
                NoticeView(
                    title: "No family yet",
                    message: "This account is not in a family. Create or join one at mealtogether.chuckycastle.io, then check again.",
                    actionLabel: "Check again"
                )
            } else if let error = session.loadError {
                NoticeView(title: "Cannot load the kitchen", message: error, actionLabel: "Try again")
            } else {
                // Signed in with nothing loaded yet: load, so this state cannot last
                ProgressView()
                    .task { await session.load() }
            }
        }
    }
}

/// A message with a retry button and sign-out, for states where the hub cannot show
private struct NoticeView: View {
    let title: String
    let message: String
    let actionLabel: String
    @Environment(Session.self) private var session
    @Environment(\.palette) private var palette
    @State private var working = false

    var body: some View {
        VStack(spacing: 28) {
            Text(title)
                .font(.marker(67))
            Text(message)
                .font(.text(31))
                .foregroundStyle(palette.ink2)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 1000)
            HStack(spacing: 28) {
                Button(actionLabel) {
                    Task {
                        working = true
                        await session.load()
                        working = false
                    }
                }
                .buttonStyle(PillButtonStyle(kind: .primary))
                .disabled(working)

                Button("Sign out") { session.signOut() }
                    .buttonStyle(PillButtonStyle())
            }
            .padding(.top, 20)
        }
    }
}

/// Owns the family's live state and the navigation between hub screens
struct HubView: View {
    enum Route: Hashable {
        case shopping
        case recipes
        case recipe(Int)
        case settings
    }

    let family: Family
    @State private var store: KitchenStore
    @State private var path: [Route] = []
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.palette) private var palette

    init(family: Family, api: APIClient, chime: Chime) {
        self.family = family
        _store = State(initialValue: KitchenStore(familyID: family.id, api: api, chime: chime))
        #if DEBUG && targetEnvironment(simulator)
        // Open a screen directly for simulator screenshots: MT_SCREEN=shopping|recipes|settings
        switch ProcessInfo.processInfo.environment["MT_SCREEN"] {
        case "shopping": _path = State(initialValue: [.shopping])
        case "recipes": _path = State(initialValue: [.recipes])
        case "settings": _path = State(initialValue: [.settings])
        case let value? where value.hasPrefix("recipe:"):
            _path = State(initialValue: [.recipes, .recipe(Int(value.dropFirst(7)) ?? 0)])
        default: break
        }
        #endif
    }

    var body: some View {
        NavigationStack(path: $path) {
            DashboardView(family: family, open: { path.append($0) })
                .navigationDestination(for: Route.self) { route in
                    ZStack {
                        palette.counter.ignoresSafeArea()
                        switch route {
                        case .shopping: ShoppingView()
                        case .recipes: RecipesView(open: { path.append(.recipe($0)) })
                        case .recipe(let id): RecipeDetailView(recipeID: id)
                        case .settings: SettingsView(family: family)
                        }
                    }
                }
        }
        .environment(store)
        .onAppear { store.start() }
        .onDisappear { store.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { store.start() } else if phase == .background { store.stop() }
        }
    }
}
