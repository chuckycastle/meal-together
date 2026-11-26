import SwiftUI

/// One timer on the dashboard. Click runs the action that fits its state;
/// hold, or the remote's play/pause button, reaches the rest.
struct TimerCard: View {
    let timer: KitchenTimer
    let big: Bool
    @Environment(KitchenStore.self) private var store

    var body: some View {
        Button {
            run(store.primaryAction(for: timer))
        } label: {
            TimerFace(timer: timer, big: big)
        }
        .buttonStyle(CardButtonStyle(lift: big ? 1.03 : 1.05))
        .onPlayPauseCommand {
            run(store.primaryAction(for: timer))
        }
        .contextMenu {
            if timer.kind == .countdown {
                Button("Add 1 minute") { add(60) }
                Button("Add 5 minutes") { add(300) }
            }
            switch timer.state {
            case .running:
                Button("Pause") { run(.pause) }
            case .paused, .idle:
                Button("Start") { run(.start) }
            case .done:
                EmptyView()
            }
            Button("Reset") { run(.reset) }
            Button("Remove from the board", role: .destructive) {
                Task { await store.remove(timerID: timer.id) }
            }
        }
        .accessibilityLabel(accessibilityLabel)
    }

    private func run(_ action: KitchenStore.TimerAction) {
        Task { await store.perform(action, on: timer.id) }
    }

    private func add(_ seconds: Int) {
        Task { await store.addTime(seconds, to: timer.id) }
    }

    private var accessibilityLabel: String {
        switch timer.state {
        case .done: "\(timer.name), done, \(timer.detail)"
        case .paused: "\(timer.name), paused at \(TimeText.countdown(timer.seconds))"
        default: "\(timer.name), \(TimeText.countdown(timer.seconds))"
        }
    }
}

private struct TimerFace: View {
    let timer: KitchenTimer
    let big: Bool
    @Environment(\.palette) private var palette

    var body: some View {
        let done = timer.state == .done
        let tint = palette.marker(timer.color)
        let shape = RoundedRectangle(cornerRadius: 15, style: .continuous)
        // The last minute pulses once a second
        let dimmed = timer.isUrgent && Int(timer.seconds.rounded(.up)) % 2 == 0

        VStack(alignment: .leading, spacing: 0) {
            Text(timer.name)
                .font(.marker(big ? 46 : 33))
                .foregroundStyle(done ? palette.onHot : tint)

            Text(done ? "Done" : TimeText.countdown(timer.seconds))
                .font(.marker(timeSize))
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .tightLine(timeSize)
                .opacity(timer.state == .paused ? 0.45 : 1)
                .contentTransition(.numericText(countsDown: timer.kind == .countdown))

            Text(timer.detail)
                .font(.text(23))
                .foregroundStyle(done ? palette.onHot : palette.ink2)
        }
        .lineLimit(1)
        .padding(.top, 12)
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .frame(height: big ? 266 : 192, alignment: .topLeading)
        .foregroundStyle(done ? palette.onHot : palette.ink)
        .background(done ? palette.hot : palette.paper)
        .overlay(alignment: .bottomLeading) {
            if timer.kind == .countdown, !done {
                GeometryReader { proxy in
                    tint
                        .frame(width: proxy.size.width * timer.fraction, height: 10)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                        .animation(.linear(duration: 1), value: timer.fraction)
                }
            }
        }
        .clipShape(shape)
        .overlay(shape.strokeBorder(done ? palette.hot : tint, lineWidth: 6))
        .opacity(dimmed ? 0.6 : 1)
        .animation(.easeInOut(duration: 0.5), value: dimmed)
    }

    private var timeSize: CGFloat {
        if big { return timer.isLong ? 124 : 150 }
        return timer.isLong ? 60 : 78
    }
}
