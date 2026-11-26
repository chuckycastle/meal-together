import Foundation

/// Time labels, written the way the web app writes them
nonisolated enum TimeText {
    struct ClockParts: Equatable {
        let hour: String
        /// nil on the hour
        let minutes: String?
        let period: String
    }

    /// Split a time the way the family writes it: 11 30 am, 6 pm
    static func clockParts(_ date: Date, calendar: Calendar = .current) -> ClockParts {
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        let hours = parts.hour ?? 0
        let minutes = parts.minute ?? 0
        return ClockParts(
            hour: String(hours % 12 == 0 ? 12 : hours % 12),
            minutes: minutes == 0 ? nil : String(format: "%02d", minutes),
            period: hours < 12 ? "am" : "pm"
        )
    }

    static func clock(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = clockParts(date, calendar: calendar)
        return "\(parts.hour)\(parts.minutes.map { ":\($0)" } ?? "") \(parts.period)"
    }

    /// 195 -> "3 hr 15 min"
    static func duration(minutes total: Double) -> String {
        let minutes = max(0, Int(total.rounded()))
        let hours = minutes / 60
        let rest = minutes % 60
        if hours == 0 { return "\(rest) min" }
        if rest == 0 { return "\(hours) hr" }
        return "\(hours) hr \(rest) min"
    }

    /// A timer length: 8 -> "8 sec", 90 -> "1 min 30 sec", 600 -> "10 min"
    static func seconds(_ total: Double) -> String {
        let seconds = max(0, Int(total.rounded()))
        if seconds < 60 { return "\(seconds) sec" }
        if seconds < 3600 && seconds % 60 != 0 { return "\(seconds / 60) min \(seconds % 60) sec" }
        return duration(minutes: Double(seconds) / 60)
    }

    /// 754 -> "12:34", 3725 -> "1:02:05"
    static func countdown(_ total: Double) -> String {
        let seconds = max(0, Int(total.rounded(.up)))
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }

    static func daysUntil(_ target: Date, from now: Date, calendar: Calendar = .current) -> Int {
        let start = calendar.startOfDay(for: now)
        let end = calendar.startOfDay(for: target)
        return calendar.dateComponents([.day], from: start, to: end).day ?? 0
    }

    /// "today", "tomorrow", "in 2 days", "3 days ago"
    static func dayDistance(_ target: Date, from now: Date, calendar: Calendar = .current) -> String {
        let days = daysUntil(target, from: now, calendar: calendar)
        switch days {
        case 0: return "today"
        case 1: return "tomorrow"
        case -1: return "yesterday"
        default: return days > 0 ? "in \(days) days" : "\(-days) days ago"
        }
    }

    /// "Thursday, November 26"
    static func longDate(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.wide).month(.wide).day())
    }

    /// Time left until the meal: "2 days 3 hr" beyond a day, a ticking countdown inside it
    static func untilMeal(_ seconds: Double) -> String {
        let day = 86400.0
        guard seconds >= day else { return countdown(seconds) }
        let days = Int(seconds / day)
        let hours = Int(seconds.truncatingRemainder(dividingBy: day) / 3600)
        return "\(days) \(days == 1 ? "day" : "days") \(hours) hr"
    }
}
