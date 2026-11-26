import SwiftUI

/// One dish from the schedule: mark it done, set its cook, start its recipe's timers, open the recipe
struct DishDetailView: View {
    let itemID: Int
    let family: Family

    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @Environment(\.dismiss) private var dismiss
    @State private var choosingCook = false
    @State private var recipeID: Int?

    var body: some View {
        NavigationStack {
            Group {
                if let item = store.item(itemID) {
                    detail(item)
                } else {
                    Text("This dish is no longer on the schedule.")
                        .font(.text(31))
                        .foregroundStyle(palette.ink2)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.counter.ignoresSafeArea())
            .navigationDestination(item: $recipeID) { id in
                ZStack {
                    palette.counter.ignoresSafeArea()
                    RecipeDetailView(recipeID: id)
                }
            }
        }
        .foregroundStyle(palette.ink)
        .presentationBackground(palette.counter)
    }

    private func detail(_ item: MealItem) -> some View {
        let tint = palette.marker(item.color)

        return HStack(alignment: .top, spacing: 90) {
            VStack(alignment: .leading, spacing: 18) {
                Text(item.title)
                    .font(.marker(84))
                    .foregroundStyle(tint)
                    .strikethrough(item.done, color: tint)
                    .lineLimit(2)
                    .minimumScaleFactor(0.6)

                ForEach(facts(for: item), id: \.self) { fact in
                    Text(fact)
                        .font(.text(33))
                        .foregroundStyle(palette.ink2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 20) {
                Button(item.done ? "Mark not done" : "Mark done") {
                    Task { await store.setDone(!item.done, item: item) }
                    dismiss()
                }
                .buttonStyle(PillButtonStyle(kind: .primary, size: 31, fill: true))

                Button(item.cook.map { "Cook: \($0.firstName)" } ?? "Choose a cook") {
                    choosingCook = true
                }

                if let recipe = item.recipe {
                    ForEach(recipe.timers) { timer in
                        Button("Start \(timer.name), \(TimeText.seconds(Double(timer.duration)))") {
                            Task {
                                await store.createTimer(
                                    name: timer.name,
                                    seconds: timer.duration,
                                    color: item.color,
                                    recipeID: recipe.id
                                )
                            }
                            dismiss()
                        }
                    }
                    Button("Open the recipe") {
                        recipeID = recipe.id
                    }
                }
            }
            .buttonStyle(PillButtonStyle(size: 31, fill: true))
            .frame(width: 640)
        }
        .padding(.horizontal, 110)
        .padding(.vertical, 90)
        .frame(maxHeight: .infinity, alignment: .top)
        .confirmationDialog("Who is cooking \(item.title)?", isPresented: $choosingCook, titleVisibility: .visible) {
            ForEach(family.members) { member in
                if let user = member.user {
                    Button(user.fullName) {
                        Task { await store.assign(user.id, to: item) }
                    }
                }
            }
            if item.assignedToId != nil {
                Button("No one on this dish", role: .destructive) {
                    Task { await store.assign(nil, to: item) }
                }
            }
        }
    }

    private func facts(for item: MealItem) -> [String] {
        var lines: [String] = []
        let now = store.now

        if item.done {
            lines.append("Done")
        } else if let start = item.startAt {
            let left = start.timeIntervalSince(now)
            if left > 0 {
                let distance = left < 86400
                    ? "in \(TimeText.duration(minutes: left / 60))"
                    : TimeText.dayDistance(start, from: now)
                lines.append("Starts at \(TimeText.clock(start)), \(distance)")
            } else {
                lines.append("Started at \(TimeText.clock(start))")
            }
        } else {
            lines.append("No start time")
        }

        lines.append(item.cook.map { "Cook: \($0.fullName)" } ?? "Needs a cook")

        if let recipe = item.recipe {
            let total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
            var parts: [String] = []
            if total > 0 { parts.append("\(TimeText.duration(minutes: Double(total))) start to finish") }
            if let servings = recipe.servings, servings > 0 { parts.append("serves \(servings)") }
            if !parts.isEmpty { lines.append(parts.joined(separator: ", ")) }
        }
        return lines
    }
}
