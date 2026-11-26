import SwiftUI

/// The family's shopping lists. Click an item to check it off for everyone.
struct ShoppingView: View {
    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @State private var selectedListID: Int?

    private struct Section: Identifiable {
        let id: String
        let items: [ShoppingItem]
    }

    private var list: ShoppingList? {
        store.shoppingLists.first { $0.id == selectedListID } ?? store.shoppingLists.first
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 26) {
            header

            if !store.shoppingLoaded {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let list, !list.items.isEmpty {
                items(in: list)
            } else {
                QuietPanel(
                    text: store.shoppingLists.isEmpty
                        ? "No shopping list yet. Make one from a meal in the app and it shows here."
                        : "This list is empty."
                )
                .focusable()
                Spacer()
            }
        }
        .padding(.horizontal, 80)
        .padding(.top, 54)
        .ignoresSafeArea()
        .foregroundStyle(palette.ink)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 30) {
            Text("Shopping")
                .font(.marker(67))

            if let list {
                Text(list.remaining == 0 && !list.items.isEmpty
                    ? "Everything is checked off"
                    : "\(list.remaining) of \(list.items.count) left")
                    .font(.text(31))
                    .foregroundStyle(palette.ink2)
            }

            Spacer()

            if store.shoppingLists.count > 1 {
                HStack(spacing: 16) {
                    ForEach(store.shoppingLists) { candidate in
                        Button(candidate.name) {
                            selectedListID = candidate.id
                        }
                        .buttonStyle(PillButtonStyle(kind: candidate.id == list?.id ? .primary : .normal, size: 25))
                    }
                }
            }
        }
    }

    private func items(in list: ShoppingList) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 30) {
                ForEach(sections(of: list)) { section in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(section.id)
                            .font(.marker(36))
                            .foregroundStyle(palette.ink2)
                            .padding(.leading, 22)
                        palette.rule
                            .frame(height: 4)
                            .padding(.bottom, 6)

                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 24), count: 2), spacing: 6) {
                            ForEach(section.items) { item in
                                Button {
                                    Task { await store.toggle(item, in: list.id) }
                                } label: {
                                    row(item)
                                }
                                .buttonStyle(RowButtonStyle())
                            }
                        }
                    }
                }
            }
            .padding(.vertical, 20)
            .padding(.horizontal, 10)
        }
        .scrollClipDisabled()
    }

    private func row(_ item: ShoppingItem) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 18) {
            Image(systemName: item.checked ? "checkmark.square.fill" : "square")
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(item.checked ? palette.ok : palette.ink2)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.text(31, weight: .semibold))
                    .strikethrough(item.checked)
                if let detail = detail(for: item) {
                    Text(detail)
                        .font(.text(24))
                        .foregroundStyle(palette.ink2)
                }
            }
            .lineLimit(1)
        }
        .opacity(item.checked ? 0.5 : 1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item.name), \(item.checked ? "checked" : "not checked")")
    }

    private func detail(for item: ShoppingItem) -> String? {
        var parts: [String] = []
        if let quantity = item.quantity { parts.append(quantity) }
        if let notes = item.notes { parts.append(notes) }
        if item.checked, let name = item.checkedBy?.firstName {
            parts.append("checked by \(name)")
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    /// Items by category, alphabetical, with uncategorized items last
    private func sections(of list: ShoppingList) -> [Section] {
        let other = "Other"
        let grouped = Dictionary(grouping: list.items) { item in
            let category = item.category?.trimmingCharacters(in: .whitespaces) ?? ""
            return category.isEmpty ? other : category
        }
        return grouped.keys
            .sorted { a, b in
                if a == other { return false }
                if b == other { return true }
                return a.localizedCaseInsensitiveCompare(b) == .orderedAscending
            }
            .map { Section(id: $0, items: grouped[$0] ?? []) }
    }
}
