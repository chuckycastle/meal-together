import SwiftUI

/// The schedule drawn as the laminated sheet: a time column, ruled rows, and
/// each dish in its marker color. Text shrinks until every row fits; the sheet never scrolls.
struct ScheduleSheet: View {
    let meal: Meal
    let now: Date
    var focus: FocusState<DashboardView.Target?>.Binding
    let select: (MealItem) -> Void

    @Environment(\.palette) private var palette

    private static let maxRows = 9
    private static let scales: [CGFloat] = [1, 0.9, 0.8, 0.7, 0.62, 0.55, 0.5]
    private static let ruleWidth: CGFloat = 4

    private struct Row: Identifiable {
        enum Kind {
            case group(TimeGroup, state: GroupState, tag: Tag?)
            case later(Int)
            case serve
        }

        let id: String
        let kind: Kind
    }

    private enum GroupState { case done, due, ahead }

    private enum Tag {
        case due
        case next(String)
    }

    var body: some View {
        let rows = makeRows()
        let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)

        GeometryReader { proxy in
            // Each candidate is measured at the sheet's real width so wrapped rows count
            ViewThatFits(in: .vertical) {
                ForEach(Self.scales, id: \.self) { scale in
                    sheet(rows, scale: scale)
                        .frame(width: proxy.size.width)
                }
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .background(palette.paper)
        .clipShape(shape)
        .overlay(shape.strokeBorder(palette.rule, lineWidth: Self.ruleWidth))
    }

    // MARK: Rows

    private func makeRows() -> [Row] {
        var groups = Schedule.groups(for: meal.items)
        // When the day is long, drop what is finished from the top
        while groups.count > Self.maxRows, groups[0].isOver(at: now) {
            groups.removeFirst()
        }
        let later = max(0, groups.count - Self.maxRows)
        groups = Array(groups.prefix(Self.maxRows))

        let nextID = groups.first { ($0.start ?? .distantPast) > now }?.id
        let day: TimeInterval = 86400

        var rows = groups.map { group -> Row in
            let over = group.isOver(at: now)
            let near = group.start.map { abs($0.timeIntervalSince(now)) < day } ?? false
            let started = group.start.map { $0 <= now } ?? false
            let due = !over && near && started && group.items.contains { $0.kind == .dish }

            var tag: Tag?
            if due {
                tag = .due
            } else if group.id == nextID, let start = group.start {
                tag = .next(Self.distance(to: start, from: now))
            }
            return Row(id: group.id, kind: .group(group, state: over ? .done : due ? .due : .ahead, tag: tag))
        }
        if later > 0 { rows.append(Row(id: "later", kind: .later(later))) }
        rows.append(Row(id: "serve", kind: .serve))
        return rows
    }

    /// A live countdown inside the last hour, otherwise a rounded distance
    private static func distance(to start: Date, from now: Date) -> String {
        let left = start.timeIntervalSince(now)
        if left < 3600 { return "in \(TimeText.countdown(left))" }
        if left < 86400 { return "in \(TimeText.duration(minutes: left / 60))" }
        return TimeText.dayDistance(start, from: now)
    }

    // MARK: Drawing

    private func sheet(_ rows: [Row], scale: CGFloat) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                if index > 0 {
                    palette.rule.frame(height: Self.ruleWidth)
                }
                rowView(row, scale: scale)
            }
        }
    }

    private func rowView(_ row: Row, scale: CGFloat) -> some View {
        let timeWidth = 202 * scale + 30

        // No explicit minimum on the row itself: a row with wrapped dishes
        // must keep its full height when the rows share what is left over.
        return HStack(spacing: 0) {
            timeCell(row, scale: scale)
                .padding(.horizontal, 23 * scale)
                .frame(width: timeWidth, alignment: .leading)
                .frame(minHeight: 62 * scale)

            dishes(row, scale: scale)
                .padding(.horizontal, 13 * scale)
                .padding(.vertical, 7 * scale)
                .frame(maxWidth: .infinity, alignment: .leading)

            if case .group(_, _, let tag?) = row.kind {
                tagView(tag, scale: scale)
                    .padding(.trailing, 22 * scale)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(isDue(row) ? palette.ruleSoft : .clear)
        .overlay(alignment: .leading) {
            palette.rule
                .frame(width: Self.ruleWidth)
                .padding(.leading, timeWidth - Self.ruleWidth)
        }
    }

    private func isDue(_ row: Row) -> Bool {
        if case .group(_, .due, _) = row.kind { return true }
        return false
    }

    @ViewBuilder
    private func timeCell(_ row: Row, scale: CGFloat) -> some View {
        switch row.kind {
        case .group(let group, let state, _):
            if let start = group.start {
                ClockText(date: start, size: 56 * scale)
                    .tightLine(56 * scale)
                    .opacity(state == .done ? 0.4 : 1)
            } else {
                Text("no time")
                    .font(.text(24 * scale))
                    .foregroundStyle(palette.ink2)
            }
        case .later:
            EmptyView()
        case .serve:
            ClockText(date: meal.serveAt, size: 56 * scale)
                .tightLine(56 * scale)
                .foregroundStyle(palette.hot)
        }
    }

    @ViewBuilder
    private func dishes(_ row: Row, scale: CGFloat) -> some View {
        switch row.kind {
        case .group(let group, let state, _):
            FlowLayout(spacing: 14 * scale, lineSpacing: 2 * scale) {
                ForEach(group.items) { item in
                    dish(item, over: state == .done, scale: scale)
                }
            }
        case .later(let count):
            Text("\(count) more \(count == 1 ? "time" : "times") later")
                .font(.text(24 * scale))
                .foregroundStyle(palette.ink2)
                .padding(.horizontal, 14 * scale)
        case .serve:
            Text("On the table")
                .font(.marker(43 * scale))
                .tightLine(43 * scale)
                .foregroundStyle(palette.hot)
                .padding(.horizontal, 14 * scale)
        }
    }

    @ViewBuilder
    private func dish(_ item: MealItem, over: Bool, scale: CGFloat) -> some View {
        let tint = palette.marker(item.color)
        let faded = item.kind == .dish ? item.done : over

        let label = HStack(alignment: .firstTextBaseline, spacing: 13 * scale) {
            Text(item.title)
                .font(.marker(43 * scale))
                .tightLine(43 * scale)
                .foregroundStyle(tint)
                .strikethrough(item.kind == .dish && item.done, color: tint)
            if item.kind == .dish, !item.done {
                Text(item.cook?.firstName ?? "needs a cook")
                    .font(.text(24 * scale))
                    .foregroundStyle(item.cook == nil ? palette.hot : palette.ink2)
            }
        }
        .lineLimit(1)
        .opacity(faded ? 0.45 : 1)

        if item.kind == .dish {
            Button {
                select(item)
            } label: {
                label
            }
            .buttonStyle(DishButtonStyle(tint: tint, scale: scale))
            .focused(focus, equals: .dish(item.id))
            .accessibilityLabel(accessibilityLabel(for: item))
        } else {
            label
                .padding(.horizontal, 14 * scale)
                .padding(.vertical, 3 * scale)
        }
    }

    private func accessibilityLabel(for item: MealItem) -> String {
        if item.done { return "\(item.title), done" }
        return "\(item.title), \(item.cook?.firstName ?? "needs a cook")"
    }

    @ViewBuilder
    private func tagView(_ tag: Tag, scale: CGFloat) -> some View {
        let base = Text(label(for: tag))
            .font(.text(25 * scale, weight: .bold))
            .monospacedDigit()
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 17 * scale)
            .padding(.vertical, 5 * scale)

        switch tag {
        case .due:
            base
                .foregroundStyle(palette.onHot)
                .background(Capsule().fill(palette.hot))
        case .next:
            base
                .overlay(Capsule().strokeBorder(palette.ink, lineWidth: 3))
        }
    }

    private func label(for tag: Tag) -> String {
        switch tag {
        case .due: "Start now"
        case .next(let text): text
        }
    }
}
