import SwiftUI

/// The family's recipes as a grid of cards
struct RecipesView: View {
    let open: (Int) -> Void

    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @State private var recipes: [Recipe]?
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 26) {
            Text("Recipes")
                .font(.marker(67))

            if let recipes {
                if recipes.isEmpty {
                    QuietPanel(text: "No recipes yet. Add one from the app and it shows here.")
                        .focusable()
                    Spacer()
                } else {
                    grid(recipes)
                }
            } else if let error {
                QuietPanel(text: error)
                Button("Try again") {
                    Task { await load() }
                }
                .buttonStyle(PillButtonStyle(kind: .primary))
                Spacer()
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .padding(.horizontal, 80)
        .padding(.top, 54)
        .ignoresSafeArea()
        .foregroundStyle(palette.ink)
        .toolbar(.hidden, for: .navigationBar)
        .task { await load() }
    }

    private func load() async {
        error = nil
        do {
            recipes = try await store.recipes()
        } catch {
            self.error = Session.describe(error)
        }
    }

    private func grid(_ recipes: [Recipe]) -> some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 20), count: 3), spacing: 20) {
                ForEach(recipes) { recipe in
                    Button {
                        open(recipe.id)
                    } label: {
                        card(recipe)
                    }
                    .buttonStyle(CardButtonStyle())
                }
            }
            .padding(.vertical, 24)
            .padding(.horizontal, 12)
        }
        .scrollClipDisabled()
    }

    private func card(_ recipe: Recipe) -> some View {
        let tint = palette.marker(MarkerColor.guess(for: recipe.name))
        let shape = RoundedRectangle(cornerRadius: 15, style: .continuous)

        return VStack(alignment: .leading, spacing: 10) {
            Text(recipe.name)
                .font(.marker(40))
                .foregroundStyle(tint)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            Spacer(minLength: 0)
            Text(RecipeFacts.line(for: recipe))
                .font(.text(25))
                .foregroundStyle(palette.ink2)
                .lineLimit(1)
        }
        .padding(26)
        .frame(maxWidth: .infinity, minHeight: 190, maxHeight: 190, alignment: .topLeading)
        .background(palette.paper)
        .clipShape(shape)
        .overlay(shape.strokeBorder(tint, lineWidth: 4))
    }
}

enum RecipeFacts {
    /// "1 hr 20 min, serves 8, Dana cooks"
    static func line(for recipe: Recipe) -> String {
        var parts: [String] = []
        if recipe.totalMinutes > 0 { parts.append(TimeText.duration(minutes: Double(recipe.totalMinutes))) }
        if let servings = recipe.servings, servings > 0 { parts.append("serves \(servings)") }
        if let cook = recipe.assignedTo { parts.append("\(cook.firstName) cooks") }
        return parts.isEmpty ? "No times set" : parts.joined(separator: ", ")
    }
}
