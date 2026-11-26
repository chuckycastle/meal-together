import SwiftUI

/// A recipe to cook from: ingredients on the left, steps on the right, timers on top.
/// Clicking an ingredient or a step ticks it off on this screen only.
struct RecipeDetailView: View {
    let recipeID: Int

    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @State private var recipe: Recipe?
    @State private var error: String?
    @State private var gathered: Set<Int> = []
    @State private var finished: Set<Int> = []
    @State private var started: Set<Int> = []

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
        .task { await load() }
    }

    private func load() async {
        error = nil
        do {
            recipe = try await store.recipe(recipeID)
        } catch {
            self.error = Session.describe(error)
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
            }

            if !timers.isEmpty {
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
                            finished.formSymmetricDifference([step.id])
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

    private func stepRow(_ step: CookingStep, number: Int, tint: Color) -> some View {
        let done = finished.contains(step.id)
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
                if let minutes = step.estimatedTime, minutes > 0 {
                    Text(TimeText.duration(minutes: Double(minutes)))
                        .font(.text(24, weight: .semibold))
                        .foregroundStyle(palette.ink2)
                }
            }
        }
        .opacity(done ? 0.45 : 1)
    }
}
