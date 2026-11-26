import SwiftUI

/// Reports remote activity when the styled control gains focus or is pressed
private struct ActivityReporter: ViewModifier {
    let focused: Bool
    let pressed: Bool
    @Environment(Activity.self) private var activity

    func body(content: Content) -> some View {
        content
            .onChange(of: focused) { _, isFocused in
                if isFocused { activity.bump() }
            }
            .onChange(of: pressed) { _, _ in activity.bump() }
    }
}

/// A dish on the schedule sheet: marker-colored plate behind the text when focused
struct DishButtonStyle: ButtonStyle {
    let tint: Color
    var scale: CGFloat = 1

    func makeBody(configuration: Configuration) -> some View {
        Plate(configuration: configuration, tint: tint, scale: scale)
    }

    private struct Plate: View {
        let configuration: Configuration
        let tint: Color
        let scale: CGFloat
        @Environment(\.isFocused) private var focused
        @Environment(\.subdued) private var subdued

        var body: some View {
            let lit = focused && !subdued
            let shape = RoundedRectangle(cornerRadius: 12 * scale, style: .continuous)
            configuration.label
                .padding(.horizontal, 14 * scale)
                .padding(.vertical, 3 * scale)
                .background(shape.fill(tint.opacity(lit ? 0.2 : 0)))
                .overlay(shape.strokeBorder(tint.opacity(focused ? (subdued ? 0.3 : 1) : 0), lineWidth: 3))
                .scaleEffect(lit && !configuration.isPressed ? 1.05 : 1)
                .animation(.easeOut(duration: 0.16), value: lit)
                .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
                .modifier(ActivityReporter(focused: focused, pressed: configuration.isPressed))
        }
    }
}

/// A card that lifts and gains an ink outline when focused
struct CardButtonStyle: ButtonStyle {
    var cornerRadius: CGFloat = 15
    var lift: CGFloat = 1.04

    func makeBody(configuration: Configuration) -> some View {
        Card(configuration: configuration, cornerRadius: cornerRadius, lift: lift)
    }

    private struct Card: View {
        let configuration: Configuration
        let cornerRadius: CGFloat
        let lift: CGFloat
        @Environment(\.isFocused) private var focused
        @Environment(\.subdued) private var subdued
        @Environment(\.palette) private var palette

        var body: some View {
            let lit = focused && !subdued
            let shape = RoundedRectangle(cornerRadius: cornerRadius + 7, style: .continuous)
            configuration.label
                .padding(7)
                .overlay(shape.strokeBorder(palette.ink.opacity(focused ? (subdued ? 0.25 : 1) : 0), lineWidth: 4))
                .scaleEffect(lit && !configuration.isPressed ? lift : 1)
                .shadow(color: .black.opacity(lit ? 0.45 : 0), radius: 24, y: 14)
                .animation(.easeOut(duration: 0.18), value: lit)
                .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
                .modifier(ActivityReporter(focused: focused, pressed: configuration.isPressed))
        }
    }
}

/// A text button: paper with an ink outline, inverted when focused
struct PillButtonStyle: ButtonStyle {
    enum Kind { case normal, primary, destructive }
    var kind: Kind = .normal
    var size: CGFloat = 29
    var fill = false

    func makeBody(configuration: Configuration) -> some View {
        Pill(configuration: configuration, kind: kind, size: size, fill: fill)
    }

    private struct Pill: View {
        let configuration: Configuration
        let kind: Kind
        let size: CGFloat
        let fill: Bool
        @Environment(\.isFocused) private var focused
        @Environment(\.subdued) private var subdued
        @Environment(\.isEnabled) private var enabled
        @Environment(\.palette) private var palette

        var body: some View {
            let lit = focused && !subdued
            let accent = kind == .destructive ? palette.hot : palette.ink
            let shape = RoundedRectangle(cornerRadius: size * 0.55, style: .continuous)
            configuration.label
                .font(.text(size, weight: .semibold))
                .lineLimit(1)
                .fixedSize(horizontal: !fill, vertical: false)
                .foregroundStyle(lit ? (kind == .destructive ? palette.onHot : palette.paper) : accent)
                .padding(.horizontal, size * 0.9)
                .padding(.vertical, size * 0.5)
                .frame(maxWidth: fill ? .infinity : nil, alignment: .leading)
                .background(shape.fill(lit ? accent : (kind == .primary ? palette.ruleSoft : palette.paper)))
                .overlay(shape.strokeBorder(focused ? accent : palette.line, lineWidth: focused ? 3 : 2))
                .scaleEffect(lit && !configuration.isPressed ? (fill ? 1.02 : 1.07) : 1)
                .shadow(color: .black.opacity(lit ? 0.35 : 0), radius: 16, y: 8)
                .opacity(enabled ? 1 : 0.45)
                .animation(.easeOut(duration: 0.16), value: lit)
                .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
                .modifier(ActivityReporter(focused: focused, pressed: configuration.isPressed))
        }
    }
}

/// A full-width row in a list: check rows, steps, ingredients
struct RowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        Row(configuration: configuration)
    }

    private struct Row: View {
        let configuration: Configuration
        @Environment(\.isFocused) private var focused
        @Environment(\.palette) private var palette
        @Environment(Activity.self) private var activity

        var body: some View {
            let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)
            configuration.label
                .padding(.horizontal, 22)
                .padding(.vertical, 14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(shape.fill(focused ? palette.paper : palette.paper.opacity(0)))
                .overlay(shape.strokeBorder(palette.ink.opacity(focused ? 1 : 0), lineWidth: 3))
                .scaleEffect(focused && !configuration.isPressed ? 1.015 : 1)
                .shadow(color: .black.opacity(focused ? 0.3 : 0), radius: 14, y: 8)
                .animation(.easeOut(duration: 0.15), value: focused)
                .onChange(of: focused) { _, isFocused in
                    if isFocused { activity.bump() }
                }
        }
    }
}

/// Lays children out left to right and wraps onto new lines
nonisolated struct FlowLayout: Layout {
    var spacing: CGFloat = 12
    var lineSpacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let lines = arrange(subviews, width: proposal.width ?? .infinity)
        let width = lines.map(\.width).max() ?? 0
        let height = lines.reduce(0) { $0 + $1.height } + lineSpacing * CGFloat(max(0, lines.count - 1))
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for line in arrange(subviews, width: bounds.width) {
            var x = bounds.minX
            for index in line.indices {
                var size = subviews[index].sizeThatFits(.unspecified)
                size.width = min(size.width, bounds.width)
                subviews[index].place(
                    at: CGPoint(x: x, y: y + (line.height - size.height) / 2),
                    proposal: ProposedViewSize(size)
                )
                x += size.width + spacing
            }
            y += line.height + lineSpacing
        }
    }

    private struct Line {
        var indices: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func arrange(_ subviews: Subviews, width: CGFloat) -> [Line] {
        var lines: [Line] = []
        var current = Line()
        for index in subviews.indices {
            var size = subviews[index].sizeThatFits(.unspecified)
            size.width = min(size.width, width)
            let needed = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            if needed > width, !current.indices.isEmpty {
                lines.append(current)
                current = Line()
            }
            current.width = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            current.height = max(current.height, size.height)
            current.indices.append(index)
        }
        if !current.indices.isEmpty { lines.append(current) }
        return lines
    }
}

/// A time written the way the sheet writes it: 11 with a small underlined 30, then am
struct ClockText: View {
    let date: Date
    let size: CGFloat

    var body: some View {
        let parts = TimeText.clockParts(date)
        HStack(alignment: .lastTextBaseline, spacing: 0) {
            Text(parts.hour)
                .font(.marker(size))
            if let minutes = parts.minutes {
                // Small raised minutes with a rule under them
                VStack(spacing: 0) {
                    Text(minutes)
                        .font(.marker(size * 0.5))
                        .tightLine(size * 0.5)
                    Rectangle()
                        .frame(height: max(2, size * 0.045))
                }
                .fixedSize()
                .padding(.leading, size * 0.06)
                .alignmentGuide(.lastTextBaseline) { $0[.bottom] + size * 0.3 }
            }
            Text(parts.period)
                .font(.marker(size * 0.55))
                .padding(.leading, size * 0.12)
        }
        .monospacedDigit()
        .lineLimit(1)
        .fixedSize()
        .accessibilityElement()
        .accessibilityLabel(TimeText.clock(date))
    }
}

/// A dashed panel with a short message, for empty states
struct QuietPanel: View {
    let text: String
    @Environment(\.palette) private var palette

    var body: some View {
        Text(text)
            .font(.text(29))
            .foregroundStyle(palette.ink2)
            .padding(30)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(palette.line, style: StrokeStyle(lineWidth: 4, dash: [14, 10]))
            )
    }
}
