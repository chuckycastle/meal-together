import Foundation

/// A board timer counted against the server clock
nonisolated struct KitchenTimer: Identifiable, Hashable, Sendable {
    enum State: Sendable { case idle, running, paused, done }

    let id: Int
    let name: String
    let kind: TimerKind
    let color: MarkerColor
    let recipeName: String?
    /// Seconds set on the timer
    let duration: Double
    let state: State
    /// Countdown: seconds left. Stopwatch: seconds elapsed.
    let seconds: Double
    /// Seconds past zero for a finished countdown
    let overtime: Double
    /// 0 to 1, how much of a countdown is left
    let fraction: Double

    init(_ timer: BoardTimer, serverNow: Date) {
        id = timer.id
        name = timer.name
        kind = timer.kind
        color = timer.color
        recipeName = timer.recipeName
        duration = timer.duration

        let running = timer.status == .running
        switch timer.kind {
        case .stopwatch:
            let elapsed = running && timer.anchorAt != nil
                ? serverNow.timeIntervalSince(timer.anchorAt!)
                : timer.heldSeconds
            state = Self.resting(timer.status)
            seconds = max(0, elapsed)
            overtime = 0
            fraction = 0

        case .countdown:
            let left = running && timer.anchorAt != nil
                ? timer.anchorAt!.timeIntervalSince(serverNow)
                : timer.heldSeconds
            let total = max(timer.duration, left, 1)
            let done = running && left <= 0
            state = done ? .done : Self.resting(timer.status)
            seconds = max(0, left)
            overtime = done ? -left : 0
            fraction = min(1, max(0, left / total))
        }
    }

    private static func resting(_ status: TimerStatus) -> State {
        switch status {
        case .idle: .idle
        case .running: .running
        case .paused: .paused
        }
    }

    var isUrgent: Bool { state == .running && kind == .countdown && seconds <= 60 }
    var isLong: Bool { state != .done && seconds >= 3600 }

    /// Line under the time
    var detail: String {
        switch state {
        case .done:
            return "over by \(TimeText.countdown(overtime))"
        case .paused:
            return recipeName.map { "\($0), paused" } ?? "paused"
        default:
            if let recipeName { return recipeName }
            return kind == .stopwatch ? "counting up" : "\(TimeText.seconds(duration)) timer"
        }
    }

    /// Timers that need attention first: finished, then soonest to finish, then the rest
    static func byUrgency(_ a: KitchenTimer, _ b: KitchenTimer) -> Bool {
        func rank(_ timer: KitchenTimer) -> Int {
            switch timer.state {
            case .done: 0
            case .running: 1
            case .paused: 2
            case .idle: 3
            }
        }
        if rank(a) != rank(b) { return rank(a) < rank(b) }
        if a.state == .done { return a.overtime > b.overtime }
        if a.kind != b.kind { return a.kind == .countdown }
        if a.kind == .countdown, a.seconds != b.seconds { return a.seconds < b.seconds }
        if a.name != b.name { return a.name.localizedCompare(b.name) == .orderedAscending }
        return a.id < b.id
    }
}

/// Meal items that start in the same minute
nonisolated struct TimeGroup: Identifiable, Hashable, Sendable {
    let id: String
    let start: Date?
    var items: [MealItem]

    /// Every dish is done and every event has started
    func isOver(at now: Date) -> Bool {
        items.allSatisfy { item in
            item.kind == .dish ? item.done : (start.map { $0 <= now } ?? false)
        }
    }
}

nonisolated enum Schedule {
    /// The meal to show first: the next one coming, or the latest one
    static func currentMeal(in meals: [Meal], at now: Date) -> Meal? {
        let cutoff = now.addingTimeInterval(-6 * 3600)
        return meals.first { $0.serveAt >= cutoff } ?? meals.last
    }

    /// Items grouped by start minute, in start order, unscheduled last
    static func groups(for items: [MealItem]) -> [TimeGroup] {
        var order: [String] = []
        var byKey: [String: TimeGroup] = [:]
        for item in items {
            let key = item.startAt.map { String(Int($0.timeIntervalSince1970 / 60)) } ?? "unscheduled"
            if byKey[key] == nil {
                order.append(key)
                byKey[key] = TimeGroup(id: key, start: item.startAt, items: [])
            }
            byKey[key]?.items.append(item)
        }
        return order.compactMap { byKey[$0] }.sorted { a, b in
            guard let aStart = a.start else { return false }
            guard let bStart = b.start else { return true }
            return aStart < bStart
        }
    }
}
