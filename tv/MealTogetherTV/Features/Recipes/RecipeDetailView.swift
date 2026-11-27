import SwiftUI

/// A recipe to cook from: ingredients on the left, steps on the right, timers on top.
/// A step marked done here shows as done on every device in the family, and the
/// other way around. Ingredient ticks stay on this screen.
struct RecipeDetailView: View {
    let recipeID: Int

    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @State private var recipe: Recipe?
    @State private var error: String?
    @State private var gathered: Set<Int> = []
    @State private var started: Set<Int> = []
    @State private var notice: String?
    /// Counts step changes sent from this screen, so a poll that started before one does not undo it
    @State private var edits = 0

    private static let syncInterval: Duration = .seconds(5)

    var body: some View {
        Group {
            if let recipe {
                content(recipe)
            } else if let error {
                VStack(alignment: .leading, spacing: 24) {
                    QuietPanel(text: error)
                    Button("Try again") {
                        Task { await load() }
                    }
                    .buttonStyle(PillButtonStyle(kind: .primary))
                }
                .frame(maxWidth: 1000)
            } else {
                ProgressView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(palette.ink)
        .toolbar(.hidden, for: .navigationBar)
        .task { await sync() }
    }

    private func load() async {
        error = nil
        do {
            recipe = try await store.recipe(recipeID)
        } catch {
            self.error = Session.describe(error)
        }
    }

    /// Load, then keep step progress current while this screen is up
    private func sync() async {
        await load()
        while !Task.isCancelled {
            try? await Task.sleep(for: Self.syncInterval)
            guard !Task.isCancelled else { return }
            let before = edits
            // A failed refresh keeps what is on screen
            if let fresh = try? await store.recipe(recipeID), before == edits {
                recipe = fresh
                error = nil
            }
        }
    }

    private func toggle(_ step: CookingStep) {
        let done = !step.isDone
        edits += 1
        notice = nil
        // Show the change at once; the reply carries everyone's progress
        if let index = recipe?.steps?.firstIndex(where: { $0.id == step.id }) {
            recipe?.steps?[index].done = done
        }
        Task {
            do {
                let updated = try await store.setStep(step.id, done: done, recipeID: recipeID)
                edits += 1
                recipe = updated
            } catch {
                notice = "That step was not saved. \(Session.describe(error))"
                if let fresh = try? await store.recipe(recipeID) { recipe = fresh }
            }
        }
    }

    private func startOver() {
        edits += 1
        notice = nil
        Task {
            do {
                recipe = try await store.resetSteps(recipeID: recipeID)
                edits += 1
            } catch {
                notice = "The steps were not reset. \(Session.describe(error))"
            }
        }
    }

    private func content(_ recipe: Recipe) -> some View {
        let tint = palette.marker(MarkerColor.guess(for: recipe.name))
        let timers = recipe.timers ?? []

        return VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 4) {
                Text(recipe.name)
                    .font(.marker(62))
                    .foregroundStyle(tint)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(RecipeFacts.line(for: recipe))
                    .font(.text(29))
                    .foregroundStyle(palette.ink2)
                if let notice {
                    Text(notice)
                        .font(.text(25, weight: .semibold))
                        .foregroundStyle(palette.hot)
                }
            }

            if !timers.isEmpty || anyStepDone(recipe) {
                ScrollView(.horizontal) {
                    HStack(spacing: 18) {
                        ForEach(timers) { timer in
                            Button {
                                started.insert(timer.id)
                                Task {
                                    await store.createTimer(
                                        name: timer.name,
                                        seconds: timer.duration,
                                        color: MarkerColor.guess(for: recipe.name),
                                        recipeID: recipe.id
                                    )
                                }
                            } label: {
                                Label(
                                    "\(timer.name), \(TimeText.seconds(Double(timer.duration)))",
                                    systemImage: started.contains(timer.id) ? "checkmark" : "timer"
                                )
                            }
                            .buttonStyle(PillButtonStyle(size: 26))
                        }
                        if anyStepDone(recipe) {
                            Button {
                                startOver()
                            } label: {
                                Label("Start the steps over", systemImage: "arrow.counterclockwise")
                            }
                            .buttonStyle(PillButtonStyle(size: 26))
                        }
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 10)
                }
                .scrollClipDisabled()
                .padding(.horizontal, -10)
            }

            HStack(alignment: .top, spacing: 50) {
                column("Ingredients", empty: "No ingredients listed.", isEmpty: (recipe.ingredients ?? []).isEmpty) {
                    ForEach(recipe.ingredients ?? []) { ingredient in
                        Button {
                            gathered.formSymmetricDifference([ingredient.id])
                        } label: {
                            ingredientRow(ingredient)
                        }
                        .buttonStyle(RowButtonStyle())
                    }
                }
                .frame(width: 600)

                column("Steps", empty: "No steps written.", isEmpty: (recipe.steps ?? []).isEmpty) {
                    ForEach(Array((recipe.steps ?? []).enumerated()), id: \.element.id) { index, step in
                        Button {
                            toggle(step)
                        } label: {
                            stepRow(step, number: index + 1, tint: tint)
                        }
                        .buttonStyle(RowButtonStyle())
                    }
                }
            }
        }
        .padding(.horizontal, 80)
        .padding(.top, 54)
        .ignoresSafeArea()
    }

    private func column<Rows: View>(
        _ title: String,
        empty: String,
        isEmpty: Bool,
        @ViewBuilder rows: () -> Rows
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.marker(38))
                .padding(.leading, 22)
            palette.rule.frame(height: 4)

            if isEmpty {
                Text(empty)
                    .font(.text(29))
                    .foregroundStyle(palette.ink2)
                    .padding(22)
                    .focusable()
                Spacer(minLength: 0)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        rows()
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 8)
                }
                .scrollClipDisabled()
                .padding(.horizontal, -8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func ingredientRow(_ ingredient: Ingredient) -> some View {
        let have = gathered.contains(ingredient.id)
        return HStack(alignment: .firstTextBaseline, spacing: 16) {
            Image(systemName: have ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(have ? palette.ok : palette.ink3)
            Text(ingredient.quantity.map { "\($0) \(ingredient.name)" } ?? ingredient.name)
                .font(.text(30))
                .strikethrough(have)
                .multilineTextAlignment(.leading)
        }
        .opacity(have ? 0.5 : 1)
    }

    private func anyStepDone(_ recipe: Recipe) -> Bool {
        (recipe.steps ?? []).contains { $0.isDone }
    }

    /// "10 min", "Done, marked by Sam", or both
    private func stepDetail(_ step: CookingStep) -> String? {
        var parts: [String] = []
        if let minutes = step.estimatedTime, minutes > 0 {
            parts.append(TimeText.duration(minutes: Double(minutes)))
        }
        if step.isDone {
            parts.append(step.doneBy.map { "Done, marked by \($0.firstName)" } ?? "Done")
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private func stepRow(_ step: CookingStep, number: Int, tint: Color) -> some View {
        let done = step.isDone
        return HStack(alignment: .firstTextBaseline, spacing: 20) {
            Text("\(number)")
                .font(.marker(40))
                .foregroundStyle(tint)
                .frame(width: 54, alignment: .trailing)
            VStack(alignment: .leading, spacing: 4) {
                Text(step.instruction)
                    .font(.text(31))
                    .strikethrough(done)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                if let detail = stepDetail(step) {
                    Text(detail)
                        .font(.text(24, weight: .semibold))
                        .foregroundStyle(palette.ink2)
                }
            }
            Spacer(minLength: 12)
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(done ? palette.ok : palette.ink3)
        }
        .opacity(done ? 0.55 : 1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Step \(number), \(done ? "done" : "not done"). \(step.instruction)")
    }
}
