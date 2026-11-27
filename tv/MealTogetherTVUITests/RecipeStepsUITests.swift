import XCTest

/// Drives the app with the Siri Remote against a local API server.
/// Skipped unless the server and a test account are given:
/// TEST_RUNNER_MT_API_BASE, TEST_RUNNER_MT_EMAIL, TEST_RUNNER_MT_PASSWORD, TEST_RUNNER_MT_RECIPE.
final class RecipeStepsUITests: XCTestCase {
    @MainActor
    func testMarkingAStepDoneWithTheRemote() throws {
        let environment = ProcessInfo.processInfo.environment
        guard let base = environment["MT_API_BASE"],
              let email = environment["MT_EMAIL"],
              let password = environment["MT_PASSWORD"],
              let recipe = environment["MT_RECIPE"]
        else {
            throw XCTSkip("Set MT_API_BASE, MT_EMAIL, MT_PASSWORD, and MT_RECIPE to run against a local server")
        }

        let app = XCUIApplication()
        app.launchEnvironment = [
            "MT_API_BASE": base,
            "MT_EMAIL": email,
            "MT_PASSWORD": password,
            "MT_SCREEN": "recipe:\(recipe)",
        ]
        app.launch()

        let step = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Step 3,")).firstMatch
        XCTAssertTrue(step.waitForExistence(timeout: 30), "The recipe's steps did not load")
        XCTAssertTrue(step.label.contains("not done"), "Step 3 should start open: \(step.label)")

        // From the timer buttons: down into the lists, right to the steps, then down to step 3
        let remote = XCUIRemote.shared
        remote.press(.down)
        remote.press(.right)
        for _ in 0..<8 where !step.hasFocus {
            remote.press(.down)
        }
        XCTAssertTrue(step.hasFocus, "The remote did not reach step 3")

        remote.press(.select)
        let done = NSPredicate(format: "label BEGINSWITH %@", "Step 3, done")
        expectation(for: done, evaluatedWith: step)
        waitForExpectations(timeout: 10)

        // The mark survives the next refresh from the server
        sleep(7)
        XCTAssertTrue(step.label.hasPrefix("Step 3, done"), "The mark did not hold: \(step.label)")
    }
}
