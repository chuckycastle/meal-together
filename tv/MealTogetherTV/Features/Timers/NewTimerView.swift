import SwiftUI

/// Start a timer from the couch: pick a length, restart one already on the board, or count up
struct NewTimerView: View {
    @Environment(KitchenStore.self) private var store
    @Environment(\.palette) private var palette
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @FocusState private var focusedMinutes: Int?

    private static let minutes = [
        1, 2, 3, 4, 5, 6,
        8, 10, 12, 15, 20, 25,
        30, 35, 40, 45, 50, 60,
        75, 90, 105, 120, 180, 240,
    ]

    var body: some View {
        let idle = store.idleTimers

        ScrollView {
            VStack(alignment: .leading, spacing: 34) {
                Text("New timer")
                    .font(.marker(67))

                TextField("Name, such as Gravy (optional)", text: $name)

                VStack(alignment: .leading, spacing: 16) {
                    Text("How long?")
                        .font(.marker(38))
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 6), spacing: 16) {
                        ForEach(Self.minutes, id: \.self) { minutes in
                            Button {
                                start(minutes: minutes)
                            } label: {
                                Text(minutes < 120 ? "\(minutes) min" : "\(minutes / 60) hr")
                                    .minimumScaleFactor(0.8)
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PillButtonStyle(size: 25, fill: true))
                            .focused($focusedMinutes, equals: minutes)
                        }
                    }
                }

                HStack(spacing: 22) {
                    Button("Stopwatch, counting up") {
                        Task {
                            await store.createTimer(name: title(fallback: "Stopwatch"), kind: .stopwatch, color: color)
                        }
                        dismiss()
                    }
                }

                if !idle.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("On the board")
                            .font(.marker(38))
                        FlowLayout(spacing: 18, lineSpacing: 18) {
                            ForEach(idle) { timer in
                                Button {
                                    Task { await store.perform(.start, on: timer.id) }
                                    dismiss()
                                } label: {
                                    Text(label(for: timer))
                                }
                            }
                        }
                    }
                }
            }
            .buttonStyle(PillButtonStyle(size: 29))
            .padding(.horizontal, 64)
            .padding(.vertical, 56)
            // The sheet takes its width from its content
            .frame(width: 1180, alignment: .leading)
        }
        .scrollClipDisabled()
        .defaultFocus($focusedMinutes, 10)
        .foregroundStyle(palette.ink)
        .presentationBackground(palette.counter)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var color: MarkerColor {
        MarkerColor.guess(for: trimmedName)
    }

    private func title(fallback: String) -> String {
        trimmedName.isEmpty ? fallback : trimmedName
    }

    private func start(minutes: Int) {
        let seconds = minutes * 60
        let name = title(fallback: "\(TimeText.seconds(Double(seconds))) timer")
        Task { await store.createTimer(name: name, seconds: seconds, color: color) }
        dismiss()
    }

    private func label(for timer: KitchenTimer) -> String {
        timer.kind == .stopwatch ? timer.name : "\(timer.name), \(TimeText.seconds(timer.duration))"
    }
}
