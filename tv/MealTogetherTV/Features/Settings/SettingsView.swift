import SwiftUI

/// Choices for this Apple TV: family, the meal on the dashboard, colors, timer sound, and the account
struct SettingsView: View {
    let family: Family

    @Environment(Session.self) private var session
    @Environment(AppSettings.self) private var settings
    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @Environment(\.chime) private var chime
    @State private var confirmingSignOut = false

    var body: some View {
        @Bindable var settings = settings

        ScrollView {
            VStack(alignment: .leading, spacing: 34) {
                Text("Settings")
                    .font(.marker(67))

                if session.families.count > 1 {
                    section("Family") {
                        ForEach(session.families) { candidate in
                            choice(candidate.name, selected: candidate.id == family.id) {
                                session.selectFamily(candidate.id)
                            }
                        }
                    }
                }

                section("Meal on the dashboard") {
                    choice("Next meal", selected: settings.selectedMealID == nil) {
                        settings.selectedMealID = nil
                    }
                    ForEach(upcomingMeals) { meal in
                        choice(
                            "\(meal.name), \(meal.serveAt.formatted(.dateTime.month(.abbreviated).day()))",
                            selected: settings.selectedMealID == meal.id
                        ) {
                            settings.selectedMealID = meal.id
                        }
                    }
                }

                section("Colors") {
                    ForEach(AppSettings.Theme.allCases, id: \.self) { theme in
                        choice(theme.label, selected: settings.theme == theme) {
                            settings.theme = theme
                        }
                    }
                }

                section("Timer sound") {
                    choice("On", selected: settings.soundEnabled) {
                        settings.soundEnabled = true
                        chime?.play()
                    }
                    choice("Off", selected: !settings.soundEnabled) {
                        settings.soundEnabled = false
                    }
                    Button("Play the chime") { chime?.play() }
                        .buttonStyle(PillButtonStyle(size: 27))
                }

                section("Account") {
                    if let user = session.user {
                        Text("\(user.fullName), \(user.email)")
                            .font(.text(29))
                            .foregroundStyle(palette.ink2)
                            .padding(.trailing, 20)
                    }
                    Button("Sign out") { confirmingSignOut = true }
                        .buttonStyle(PillButtonStyle(kind: .destructive, size: 27))
                }

                Text("MealTogether for Apple TV \(version)")
                    .font(.text(23))
                    .foregroundStyle(palette.ink3)
            }
            .padding(.horizontal, 80)
            .padding(.vertical, 54)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollClipDisabled()
        .ignoresSafeArea()
        .foregroundStyle(palette.ink)
        .toolbar(.hidden, for: .navigationBar)
        .confirmationDialog("Sign out of MealTogether on this Apple TV?", isPresented: $confirmingSignOut, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { session.signOut() }
        }
    }

    /// Meals from six hours ago onward, soonest first
    private var upcomingMeals: [Meal] {
        let cutoff = store.now.addingTimeInterval(-6 * 3600)
        return Array(store.meals.filter { $0.serveAt >= cutoff }.prefix(6))
    }

    private var version: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? ""
        let build = info?["CFBundleVersion"] as? String ?? ""
        return "\(short) (\(build))"
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.marker(36))
            FlowLayout(spacing: 18, lineSpacing: 16) {
                content()
            }
        }
    }

    private func choice(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(label, systemImage: selected ? "checkmark.circle.fill" : "circle")
        }
        .buttonStyle(PillButtonStyle(kind: selected ? .primary : .normal, size: 27))
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
