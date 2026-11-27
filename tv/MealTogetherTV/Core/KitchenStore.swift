import Foundation
import Observation

/// One family's live kitchen state: meals, the timer board, and shopping lists.
/// Polls the API on the same intervals as the web app and counts timers
/// locally each second against the server clock.
@Observable
final class KitchenStore {
    let familyID: Int

    private(set) var meals: [Meal] = []
    private(set) var mealsLoaded = false
    private(set) var boardTimers: [BoardTimer] = []
    private(set) var timersLoaded = false
    private(set) var shoppingLists: [ShoppingList] = []
    private(set) var shoppingLoaded = false
    /// Device time, updated each second
    private(set) var now = Date()
    /// Set while requests are failing
    private(set) var offline = false
    /// The latest failed action, shown briefly
    var notice: String?

    /// Fixed at launch so the chosen meal does not change while the screen is up
    let openedAt = Date()

    private let api: APIClient
    private let chime: Chime
    /// Server clock minus this device's clock
    private var clockOffset: TimeInterval = 0
    private var loops: [Task<Void, Never>] = []
    private var rung: Set<Int> = []
    private var firstTimerLoad = true

    init(familyID: Int, api: APIClient, chime: Chime) {
        self.familyID = familyID
        self.api = api
        self.chime = chime
    }

    private var base: String { "/api/families/\(familyID)" }

    // MARK: Lifecycle

    func start() {
        guard loops.isEmpty else { return }
        loops = [
            Task { [weak self] in
                while !Task.isCancelled {
                    guard let delay = self?.tick() else { return }
                    try? await Task.sleep(for: delay)
                }
            },
            poll(every: 5) { await $0.refreshTimers() },
            poll(every: 15) { await $0.refreshMeals() },
            poll(every: 10) { await $0.refreshShopping() },
        ]
    }

    func stop() {
        loops.forEach { $0.cancel() }
        loops = []
    }

    /// Advance the clock and return the wait until just after the next whole second
    private func tick() -> Duration {
        now = Date()
        ringFinishedTimers()
        let fraction = now.timeIntervalSince1970.truncatingRemainder(dividingBy: 1)
        return .milliseconds(Int((1 - fraction) * 1000) + 15)
    }

    /// Repeat a request. Holds the store only while the request runs, so the
    /// loop ends when the store is released.
    private func poll(every seconds: Int, _ work: @escaping (KitchenStore) async -> Void) -> Task<Void, Never> {
        Task { [weak self] in
            while !Task.isCancelled {
                do {
                    guard let store = self else { return }
                    await work(store)
                }
                try? await Task.sleep(for: .seconds(seconds))
            }
        }
    }

    // MARK: Reads

    func refreshTimers() async {
        do {
            let response: TimersResponse = try await api.request("GET", "\(base)/timers")
            boardTimers = response.timers
            clockOffset = response.serverTime.timeIntervalSinceNow
            timersLoaded = true
            offline = false
            if firstTimerLoad {
                // Timers that finished before the app opened do not chime
                firstTimerLoad = false
                rung = Set(timers.filter { $0.state == .done }.map(\.id))
            }
        } catch {
            noteFailure(error)
        }
    }

    func refreshMeals() async {
        do {
            let response: MealsResponse = try await api.request("GET", "\(base)/meals")
            meals = response.meals
            mealsLoaded = true
        } catch {
            noteFailure(error)
        }
    }

    func refreshShopping() async {
        do {
            let response: ShoppingListsResponse = try await api.request("GET", "\(base)/shopping-lists")
            shoppingLists = response.shoppingLists
            shoppingLoaded = true
        } catch {
            noteFailure(error)
        }
    }

    /// A failed poll: a network failure marks the store offline; anything else
    /// (a refused request, a reply that cannot be read) is shown on the dashboard.
    private func noteFailure(_ error: Error) {
        if error is CancellationError { return }
        if let urlError = error as? URLError {
            if urlError.code != .cancelled { offline = true }
        } else if (error as? APIError)?.status != 401 {
            notice = Session.describe(error)
        }
    }

    // MARK: Derived state

    var serverNow: Date { now.addingTimeInterval(clockOffset) }

    var timers: [KitchenTimer] {
        let serverNow = serverNow
        return boardTimers.map { KitchenTimer($0, serverNow: serverNow) }
    }

    /// Running, paused, and finished timers, in order of urgency
    var activeTimers: [KitchenTimer] {
        timers.filter { $0.state != .idle }.sorted(by: KitchenTimer.byUrgency)
    }

    /// Timers on the board that are not running
    var idleTimers: [KitchenTimer] {
        timers.filter { $0.state == .idle }
    }

    /// The meal on the dashboard: the chosen one, or the next one coming
    func meal(selected id: Int?) -> Meal? {
        if let id, let chosen = meals.first(where: { $0.id == id }) { return chosen }
        return Schedule.currentMeal(in: meals, at: openedAt)
    }

    func item(_ id: Int) -> MealItem? {
        for meal in meals {
            if let item = meal.items.first(where: { $0.id == id }) { return item }
        }
        return nil
    }

    var shoppingRemaining: Int {
        shoppingLists.reduce(0) { $0 + $1.remaining }
    }

    private func ringFinishedTimers() {
        guard timersLoaded else { return }
        var finished: Set<Int> = []
        var ring = false
        for timer in timers where timer.state == .done {
            finished.insert(timer.id)
            if !rung.contains(timer.id) { ring = true }
        }
        rung = finished
        if ring { chime.playIfEnabled() }
    }

    // MARK: Timer actions

    enum TimerAction: String { case start, pause, reset }

    func perform(_ action: TimerAction, on timerID: Int) async {
        await attempt {
            let response: TimerResponse = try await api.request("POST", "\(base)/timers/\(timerID)/\(action.rawValue)")
            put(response)
        }
    }

    /// The action a click performs on a timer in its current state
    func primaryAction(for timer: KitchenTimer) -> TimerAction {
        switch timer.state {
        case .running: .pause
        case .paused, .idle: .start
        case .done: .reset
        }
    }

    func addTime(_ seconds: Int, to timerID: Int) async {
        await attempt {
            let response: TimerResponse = try await api.request(
                "POST", "\(base)/timers/\(timerID)/add", body: ["seconds": seconds])
            put(response)
        }
    }

    func remove(timerID: Int) async {
        boardTimers.removeAll { $0.id == timerID }
        await attempt {
            let _: MessageResponse = try await api.request("DELETE", "\(base)/timers/\(timerID)")
        }
    }

    func createTimer(
        name: String,
        kind: TimerKind = .countdown,
        seconds: Int = 0,
        color: MarkerColor = .ink,
        recipeID: Int? = nil
    ) async {
        await attempt {
            var body: [String: Any] = ["name": name, "kind": kind.rawValue, "color": color.rawValue]
            if kind == .countdown { body["duration"] = seconds }
            if let recipeID { body["recipe_id"] = recipeID }
            let response: TimerResponse = try await api.request("POST", "\(base)/timers", body: body)
            put(response)
        }
    }

    private func put(_ response: TimerResponse) {
        clockOffset = response.serverTime.timeIntervalSinceNow
        if let index = boardTimers.firstIndex(where: { $0.id == response.timer.id }) {
            boardTimers[index] = response.timer
        } else {
            boardTimers.append(response.timer)
        }
    }

    // MARK: Meal actions

    func setDone(_ done: Bool, item: MealItem) async {
        await updateItem(item, body: ["done": done])
    }

    func assign(_ userID: Int?, to item: MealItem) async {
        await updateItem(item, body: ["assigned_to_id": userID ?? NSNull()])
    }

    private func updateItem(_ item: MealItem, body: [String: Any]) async {
        await attempt {
            let response: MealResponse = try await api.request(
                "PUT", "\(base)/meals/\(item.mealId)/items/\(item.id)", body: body)
            if let index = meals.firstIndex(where: { $0.id == response.meal.id }) {
                meals[index] = response.meal
            }
        }
    }

    // MARK: Shopping actions

    func toggle(_ item: ShoppingItem, in listID: Int) async {
        let checked = !item.checked
        mutate(itemID: item.id, in: listID) { $0.checked = checked }
        do {
            let response: ShoppingItemResponse = try await api.request(
                "PUT",
                "\(base)/shopping-lists/\(listID)/items/\(item.id)",
                body: ["checked": checked, "version": item.version]
            )
            mutate(itemID: item.id, in: listID) { $0 = response.item }
        } catch {
            // Someone else changed the item first, or the request failed: take the server's copy
            await refreshShopping()
            if (error as? APIError)?.status != 409 { notice = Session.describe(error) }
        }
    }

    private func mutate(itemID: Int, in listID: Int, _ change: (inout ShoppingItem) -> Void) {
        guard let list = shoppingLists.firstIndex(where: { $0.id == listID }),
              let index = shoppingLists[list].items.firstIndex(where: { $0.id == itemID })
        else { return }
        change(&shoppingLists[list].items[index])
    }

    // MARK: Recipes

    func recipes() async throws -> [Recipe] {
        let response: RecipesResponse = try await api.request(
            "GET", "\(base)/recipes", query: ["per_page": "100"])
        return response.recipes.sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
    }

    func recipe(_ id: Int) async throws -> Recipe {
        let response: RecipeResponse = try await api.request("GET", "\(base)/recipes/\(id)")
        return response.recipe
    }

    /// Mark a step done or not done for the whole family. Returns the recipe with everyone's progress.
    func setStep(_ stepID: Int, done: Bool, recipeID: Int) async throws -> Recipe {
        let response: RecipeResponse = try await api.request(
            "PUT", "\(base)/recipes/\(recipeID)/steps/\(stepID)", body: ["done": done])
        return response.recipe
    }

    /// Open every step again, to cook the recipe from the start
    func resetSteps(recipeID: Int) async throws -> Recipe {
        let response: RecipeResponse = try await api.request("POST", "\(base)/recipes/\(recipeID)/steps/reset")
        return response.recipe
    }

    private func attempt(_ work: () async throws -> Void) async {
        do {
            try await work()
            offline = false
        } catch {
            notice = Session.describe(error)
        }
    }
}
