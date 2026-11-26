import SwiftUI

/// The kitchen board: the meal, the time left, the schedule sheet, and running
/// timers. Readable from across the room; the remote reaches every dish and timer.
struct DashboardView: View {
    enum Target: Hashable {
        case dish(Int)
        case timer(Int)
        case newTimer, shopping, recipes, settings
    }

    private struct DishRef: Identifiable {
        let id: Int
    }

    let family: Family
    let open: (HubView.Route) -> Void

    @Environment(KitchenStore.self) private var store
    @Environment(AppSettings.self) private var settings
    @Environment(Activity.self) private var activity
    @Environment(\.palette) private var palette
    @FocusState private var focus: Target?
    @State private var dish: DishRef?
    @State private var addingTimer = false
    @State private var shift = CGSize.zero

    // Apple TV always lays out at 1920 by 1080 points, so the board uses fixed bands:
    // header, schedule and timers, action bar.
    private static let contentSize = CGSize(width: 1792, height: 990)
    private static let spacing: CGFloat = 26
    private static let headerHeight: CGFloat = 108
    private static let barHeight: CGFloat = 64
    private static let boardHeight = contentSize.height - headerHeight - barHeight - spacing * 2

    var body: some View {
        let meal = store.meal(selected: settings.selectedMealID)

        VStack(alignment: .leading, spacing: Self.spacing) {
            DashboardHeader(meal: meal, now: store.now)
                .frame(height: Self.headerHeight, alignment: .bottom)

            HStack(alignment: .top, spacing: 42) {
                Group {
                    if let meal {
                        ScheduleSheet(meal: meal, now: store.now, focus: $focus) { item in
                            dish = DishRef(id: item.id)
                        }
                    } else if store.mealsLoaded {
                        QuietPanel(text: "No meal is planned yet. Plan one from the app and the schedule shows here.")
                            .frame(maxHeight: .infinity, alignment: .top)
                    } else {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
                .frame(width: 1070)

                TimersColumn(focus: $focus)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(height: Self.boardHeight)

            actionBar
                .frame(height: Self.barHeight)
        }
        .frame(width: Self.contentSize.width, height: Self.contentSize.height, alignment: .topLeading)
        .padding(.leading, 64)
        .padding(.top, 45)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .ignoresSafeArea()
        .offset(shift)
        .environment(\.subdued, activity.isIdle)
        .defaultFocus($focus, .newTimer)
        .toolbar(.hidden, for: .navigationBar)
        .fullScreenCover(item: $dish) { ref in
            DishDetailView(itemID: ref.id, family: family)
                .environment(\.palette, palette)
        }
        .sheet(isPresented: $addingTimer) {
            NewTimerView()
        }
        .onAppear { activity.bump() }
        #if DEBUG && targetEnvironment(simulator)
        .task {
            // Open a sheet directly for simulator screenshots: MT_SCREEN=newtimer|dish
            let screen = ProcessInfo.processInfo.environment["MT_SCREEN"]
            guard screen == "newtimer" || screen == "dish" else { return }
            while !store.mealsLoaded { try? await Task.sleep(for: .milliseconds(200)) }
            if screen == "newtimer" {
                addingTimer = true
            } else if let item = store.meals.first?.items.first(where: { $0.recipe != nil && !$0.done }) {
                dish = DishRef(id: item.id)
            }
        }
        #endif
        .task { await driftLoop() }
        .task(id: store.notice) {
            guard store.notice != nil else { return }
            try? await Task.sleep(for: .seconds(6))
            if !Task.isCancelled { store.notice = nil }
        }
    }

    private var actionBar: some View {
        HStack(spacing: 22) {
            Button {
                addingTimer = true
            } label: {
                Label("New timer", systemImage: "plus")
            }
            .focused($focus, equals: .newTimer)

            Button(shoppingLabel) { open(.shopping) }
                .focused($focus, equals: .shopping)
            Button("Recipes") { open(.recipes) }
                .focused($focus, equals: .recipes)
            Button("Settings") { open(.settings) }
                .focused($focus, equals: .settings)

            Spacer(minLength: 20)

            status
        }
        .buttonStyle(PillButtonStyle(size: 27))
        .opacity(activity.isIdle ? 0.35 : 1)
        .animation(.easeInOut(duration: 0.6), value: activity.isIdle)
    }

    private var shoppingLabel: String {
        let left = store.shoppingRemaining
        return left > 0 ? "Shopping, \(left) left" : "Shopping"
    }

    /// One line at the right of the action bar: a problem, a hint for the focused control, or the family
    @ViewBuilder
    private var status: some View {
        if store.offline {
            Text("Offline. Trying again.")
                .font(.text(25, weight: .semibold))
                .foregroundStyle(palette.hot)
        } else if let notice = store.notice {
            Text(notice)
                .font(.text(25, weight: .semibold))
                .foregroundStyle(palette.hot)
                .lineLimit(1)
        } else {
            Text(hint ?? family.name)
                .font(.text(25))
                .foregroundStyle(palette.ink3)
                .lineLimit(1)
        }
    }

    private var hint: String? {
        guard !activity.isIdle else { return nil }
        switch focus {
        case .timer(let id):
            guard let timer = store.timers.first(where: { $0.id == id }) else { return nil }
            let action = switch timer.state {
            case .running: "pause"
            case .paused: "resume"
            case .idle: "start"
            case .done: "clear"
            }
            return "Click to \(action). Hold for more."
        case .dish:
            return "Click for the dish, its cook, and its timers."
        default:
            return nil
        }
    }

    /// Move the picture a few points each minute so nothing stays lit in one place
    private func driftLoop() async {
        let offsets: [CGSize] = [
            .zero,
            CGSize(width: 5, height: 3),
            CGSize(width: -4, height: 5),
            CGSize(width: 3, height: -4),
            CGSize(width: -5, height: -2),
        ]
        var step = 0
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(60))
            step = (step + 1) % offsets.count
            withAnimation(.easeInOut(duration: 2)) { shift = offsets[step] }
        }
    }
}

/// Meal name and serve time, time left until the meal, and the wall clock
private struct DashboardHeader: View {
    let meal: Meal?
    let now: Date
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(alignment: .bottom, spacing: 58) {
            VStack(alignment: .leading, spacing: 4) {
                Text(meal?.name ?? "MealTogether")
                    .font(.marker(50))
                    .lineLimit(1)
                Group {
                    if let meal {
                        Text("\(TimeText.longDate(meal.serveAt)), on the table at \(Text(TimeText.clock(meal.serveAt)).foregroundStyle(palette.hot))")
                    } else {
                        Text("No meal is planned yet")
                    }
                }
                .font(.text(29))
                .foregroundStyle(palette.ink2)
                .lineLimit(1)
            }

            Spacer(minLength: 0)

            if let meal {
                countdown(to: meal.serveAt)
            }

            ClockText(date: now, size: 96)
                .tightLine(96)
        }
    }

    @ViewBuilder
    private func countdown(to serveAt: Date) -> some View {
        let left = serveAt.timeIntervalSince(now)
        if left <= 0 {
            Text("On the table")
                .font(.marker(96))
                .foregroundStyle(palette.hot)
                .tightLine(96)
        } else {
            HStack(alignment: .lastTextBaseline, spacing: 15) {
                Text(TimeText.untilMeal(left))
                    .font(.marker(96))
                    .monospacedDigit()
                    .tightLine(96)
                Text("to go")
                    .font(.text(29))
                    .foregroundStyle(palette.ink2)
            }
            .lineLimit(1)
            .fixedSize()
            .accessibilityElement(children: .combine)
        }
    }
}

/// Running, paused, and finished timers, in order of urgency
private struct TimersColumn: View {
    var focus: FocusState<DashboardView.Target?>.Binding
    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette

    private static let limit = 6

    var body: some View {
        let active = store.activeTimers
        let shown = Array(active.prefix(Self.limit))
        let big = shown.count <= 2

        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text("Timers")
                    .font(.marker(42))
                Spacer()
                if active.count > shown.count {
                    Text("\(active.count - shown.count) more running")
                        .font(.text(25))
                        .foregroundStyle(palette.ink2)
                }
            }

            if !store.timersLoaded {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else if shown.isEmpty {
                QuietPanel(text: "Nothing is timing. Start a timer here or from any phone and it shows on this screen.")
            } else {
                LazyVGrid(
                    columns: Array(repeating: GridItem(.flexible(), spacing: 9), count: big ? 1 : 2),
                    spacing: 9
                ) {
                    ForEach(shown) { timer in
                        TimerCard(timer: timer, big: big)
                            .focused(focus, equals: .timer(timer.id))
                    }
                }
                // The card style pads each card for its focus outline
                .padding(-7)
                .animation(.easeInOut(duration: 0.3), value: shown.map(\.id))
            }
        }
    }
}
