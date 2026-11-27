import Foundation
import Testing
@testable import MealTogether

@Suite struct TimeTextTests {
    @Test func countdownFormats() {
        #expect(TimeText.countdown(754) == "12:34")
        #expect(TimeText.countdown(3725) == "1:02:05")
        #expect(TimeText.countdown(0.2) == "0:01")
        #expect(TimeText.countdown(-5) == "0:00")
    }

    @Test func durationFormats() {
        #expect(TimeText.duration(minutes: 195) == "3 hr 15 min")
        #expect(TimeText.duration(minutes: 60) == "1 hr")
        #expect(TimeText.duration(minutes: 0) == "0 min")
        #expect(TimeText.seconds(8) == "8 sec")
        #expect(TimeText.seconds(90) == "1 min 30 sec")
        #expect(TimeText.seconds(600) == "10 min")
    }

    @Test func untilMealSwitchesAtOneDay() {
        #expect(TimeText.untilMeal(86400 * 2 + 3 * 3600 + 5) == "2 days 3 hr")
        #expect(TimeText.untilMeal(86400) == "1 day 0 hr")
        #expect(TimeText.untilMeal(3725) == "1:02:05")
    }

    @Test func clockWritesTheHourAlone() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let six = Date(timeIntervalSince1970: 18 * 3600)
        let halfPastEleven = Date(timeIntervalSince1970: 11 * 3600 + 30 * 60)
        let midnight = Date(timeIntervalSince1970: 0)
        #expect(TimeText.clock(six, calendar: calendar) == "6 pm")
        #expect(TimeText.clock(halfPastEleven, calendar: calendar) == "11:30 am")
        #expect(TimeText.clock(midnight, calendar: calendar) == "12 am")
    }
}

@Suite struct KitchenTimerTests {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    private func timer(
        id: Int = 1,
        kind: TimerKind = .countdown,
        duration: Double = 600,
        status: TimerStatus,
        anchor: TimeInterval? = nil,
        held: Double = 0
    ) -> BoardTimer {
        BoardTimer(
            id: id, name: "Timer \(id)", kind: kind, duration: duration, color: .ink, recipeId: nil, recipeName: nil,
            status: status, anchorAt: anchor.map { now.addingTimeInterval($0) }, heldSeconds: held)
    }

    @Test func runningCountdownCountsToItsAnchor() {
        let view = KitchenTimer(timer(status: .running, anchor: 150), serverNow: now)
        #expect(view.state == .running)
        #expect(view.seconds == 150)
        #expect(view.fraction == 0.25)
        #expect(view.overtime == 0)
    }

    @Test func countdownPastItsAnchorIsDone() {
        let view = KitchenTimer(timer(status: .running, anchor: -42), serverNow: now)
        #expect(view.state == .done)
        #expect(view.seconds == 0)
        #expect(view.overtime == 42)
        #expect(view.detail == "over by 0:42")
    }

    @Test func pausedCountdownHoldsItsPlace() {
        let view = KitchenTimer(timer(status: .paused, held: 300), serverNow: now)
        #expect(view.state == .paused)
        #expect(view.seconds == 300)
        #expect(view.fraction == 0.5)
    }

    @Test func runningStopwatchCountsFromItsAnchor() {
        let view = KitchenTimer(timer(kind: .stopwatch, duration: 0, status: .running, anchor: -75), serverNow: now)
        #expect(view.state == .running)
        #expect(view.seconds == 75)
        #expect(view.detail == "counting up")
    }

    @Test func urgencyPutsFinishedThenSoonestFirst() {
        let views = [
            KitchenTimer(timer(id: 1, status: .paused, held: 10), serverNow: now),
            KitchenTimer(timer(id: 2, status: .running, anchor: 500), serverNow: now),
            KitchenTimer(timer(id: 3, status: .running, anchor: -5), serverNow: now),
            KitchenTimer(timer(id: 4, status: .running, anchor: 30), serverNow: now),
            KitchenTimer(timer(id: 5, status: .running, anchor: -90), serverNow: now),
        ]
        #expect(views.sorted(by: KitchenTimer.byUrgency).map(\.id) == [5, 3, 4, 2, 1])
    }
}

@Suite struct ScheduleTests {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    private func item(_ id: Int, kind: ItemKind = .dish, start: TimeInterval?, done: Bool = false) -> MealItem {
        MealItem(
            id: id, mealId: 1, kind: kind, title: "Item \(id)", recipeId: nil, recipe: nil,
            startAt: start.map { now.addingTimeInterval($0) }, color: .ink, assignedToId: nil, cook: nil, done: done)
    }

    private func meal(_ id: Int, serveIn hours: Double) -> Meal {
        Meal(id: id, name: "Meal \(id)", serveAt: now.addingTimeInterval(hours * 3600), notes: nil, items: [])
    }

    @Test func groupsItemsByStartMinuteWithUnscheduledLast() {
        let base = -now.timeIntervalSince1970.truncatingRemainder(dividingBy: 60)
        let groups = Schedule.groups(for: [
            item(1, start: nil),
            item(2, start: base + 3600),
            item(3, start: base + 60),
            item(4, start: base + 3620),
        ])
        #expect(groups.map { $0.items.map(\.id) } == [[3], [2, 4], [1]])
    }

    @Test func groupIsOverWhenDishesAreDoneAndEventsHaveStarted() {
        let done = TimeGroup(id: "a", start: now.addingTimeInterval(-60), items: [
            item(1, start: -60, done: true), item(2, kind: .event, start: -60),
        ])
        let open = TimeGroup(id: "b", start: now.addingTimeInterval(-60), items: [item(3, start: -60)])
        let futureEvent = TimeGroup(id: "c", start: now.addingTimeInterval(60), items: [item(4, kind: .event, start: 60)])
        #expect(done.isOver(at: now))
        #expect(!open.isOver(at: now))
        #expect(!futureEvent.isOver(at: now))
    }

    @Test func currentMealIsTheNextOneOrTheLast() {
        let meals = [meal(1, serveIn: -48), meal(2, serveIn: -3), meal(3, serveIn: 24)]
        #expect(Schedule.currentMeal(in: meals, at: now)?.id == 2)
        #expect(Schedule.currentMeal(in: [meal(1, serveIn: -48), meal(2, serveIn: -7)], at: now)?.id == 2)
        #expect(Schedule.currentMeal(in: [], at: now) == nil)
    }
}

@Suite struct DecodingTests {
    @Test func decodesTimersWithFractionalSecondDates() throws {
        let json = """
        {"timers":[{"id":7,"family_id":1,"name":"Gravy","kind":"countdown","duration":600,"color":"brown",
          "recipe_id":null,"recipe_name":null,"status":"running","anchor_at":"2026-11-26T21:05:00.000Z",
          "held_seconds":600,"created_by_id":1,"created_at":"2026-11-26T20:55:00.000Z","updated_at":"2026-11-26T20:55:00.000Z"}],
         "server_time":"2026-11-26T20:55:00.250Z"}
        """
        let response = try APIClient.makeDecoder().decode(TimersResponse.self, from: Data(json.utf8))
        #expect(response.timers.first?.color == .brown)
        #expect(response.timers.first?.anchorAt?.timeIntervalSince(response.serverTime) == 599.75)
    }

    @Test func decodesMealItemsAndFallsBackOnUnknownColors() throws {
        let json = """
        {"meals":[{"id":1,"family_id":1,"name":"Thanksgiving","serve_at":"2026-11-26T22:00:00.000Z","notes":null,
          "items":[{"id":3,"meal_id":1,"kind":"dish","title":"Turkey","recipe_id":4,
            "recipe":{"id":4,"name":"Turkey","prep_time":30,"cook_time":210,"total_time":240,"servings":12,
              "assigned_to_id":null,"timers":[{"id":9,"name":"Baste","duration":1800,"step_order":null}]},
            "start_at":"2026-11-26T18:00:00Z","color":"purple","assigned_to_id":null,"assigned_to":null,
            "cook":{"id":2,"email":"a@example.com","first_name":"Ana","last_name":"Diaz","full_name":"Ana Diaz",
              "is_active":true,"created_at":"x","updated_at":"x"},
            "cook_source":"recipe","done":false,"done_at":null,"done_by_id":null,
            "created_at":"x","updated_at":"x"}],
          "created_at":"x","updated_at":"x"}]}
        """
        let meals = try APIClient.makeDecoder().decode(MealsResponse.self, from: Data(json.utf8)).meals
        let item = try #require(meals.first?.items.first)
        #expect(item.color == .ink)
        #expect(item.cook?.firstName == "Ana")
        #expect(item.recipe?.timers.first?.duration == 1800)
        #expect(item.startAt != nil)
    }

    @Test func parsesDatesWrittenByOtherTools() {
        let expected = Date(timeIntervalSince1970: 1_795_730_400)
        #expect(ISODate.parse("2026-11-26T22:00:00.000Z") == expected)
        #expect(ISODate.parse("2026-11-26T22:00:00Z") == expected)
        #expect(ISODate.parse("2026-11-26T22:00:00") == expected)
        #expect(ISODate.parse("2026-11-26 22:00:00") == expected)
        #expect(ISODate.parse("2026-11-26T22:00:00.000000+00:00") == expected)
        #expect(ISODate.parse("2026-11-26T17:00:00-05:00") == expected)
        #expect(ISODate.parse("not a date") == nil)
    }

    @Test func decodesDeviceSignIn() throws {
        let start = """
        {"device_code":"s3cret","user_code":"ABCD-EFGH","verification_url":"https://example.test/link",
         "verification_url_complete":"https://example.test/link?code=ABCD-EFGH","expires_in":600,"interval":3}
        """
        let login = try APIClient.makeDecoder().decode(DeviceLogin.self, from: Data(start.utf8))
        #expect(login.userCode == "ABCD-EFGH")
        #expect(login.verificationUrlComplete.hasSuffix("/link?code=ABCD-EFGH"))
        #expect(login.expiresIn == 600)

        let pending = try APIClient.makeDecoder().decode(DeviceLoginAnswer.self, from: Data(#"{"status":"pending"}"#.utf8))
        #expect(pending.status == "pending")
        #expect(pending.accessToken == nil)
    }

    @Test @MainActor func drawsAQRCodeForTheSignInAddress() throws {
        let image = try #require(QRCodeView.image(for: "https://example.test/link?code=ABCD-EFGH"))
        #expect(image.width == image.height)
        #expect(image.width >= 21)
    }

    @Test func decodesSharedStepProgress() throws {
        let json = """
        {"recipe":{"id":4,"name":"Turkey","description":null,"prep_time":30,"cook_time":210,"servings":12,
          "assigned_to":null,"ingredients":[],"timers":[],
          "steps":[
            {"id":1,"recipe_id":4,"instruction":"Heat the oven.","order":0,"estimated_time":10,"done":true,
             "done_at":"2026-11-26T18:00:00.000Z",
             "done_by":{"id":2,"email":"s@example.com","first_name":"Sam","last_name":"Okafor"}},
            {"id":2,"recipe_id":4,"instruction":"Roast.","order":1,"estimated_time":null,"done":false,
             "done_at":null,"done_by":null},
            {"id":3,"recipe_id":4,"instruction":"Rest.","order":2,"estimated_time":30}
          ]}}
        """
        let steps = try #require(try APIClient.makeDecoder().decode(RecipeResponse.self, from: Data(json.utf8)).recipe.steps)
        #expect(steps.map(\.isDone) == [true, false, false])
        #expect(steps[0].doneBy?.firstName == "Sam")
        #expect(steps[2].done == nil)
    }

    @Test func guessesMarkerColorsFromNames() {
        #expect(MarkerColor.guess(for: "Pumpkin pie") == .red)
        #expect(MarkerColor.guess(for: "Roast turkey") == .brown)
        #expect(MarkerColor.guess(for: "Brussels sprouts") == .green)
        #expect(MarkerColor.guess(for: "Water") == .ink)
    }
}
