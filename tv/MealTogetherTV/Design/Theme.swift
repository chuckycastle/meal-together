import SwiftUI

/// Colors of the laminated schedule sheet: a sheet of paper, orange ruled
/// lines, blue-black ink, and one marker color per dish. Values match the web app.
nonisolated struct Palette: Sendable {
    let counter: Color
    let paper: Color
    let paper2: Color
    let ink: Color
    let ink2: Color
    let ink3: Color
    let line: Color
    let rule: Color
    let ruleSoft: Color
    let hot: Color
    let onHot: Color
    let ok: Color
    private let markers: [MarkerColor: Color]

    func marker(_ color: MarkerColor) -> Color {
        markers[color] ?? ink
    }

    static let light = Palette(
        counter: Color(hex: 0xEDF0F2),
        paper: Color(hex: 0xFFFFFF),
        paper2: Color(hex: 0xF6F8F9),
        ink: Color(hex: 0x17222E),
        ink2: Color(hex: 0x4A5764),
        ink3: Color(hex: 0x6B7785),
        line: Color(hex: 0xDCE1E6),
        rule: Color(hex: 0xEE9A3A),
        ruleSoft: Color(hex: 0xF8DCB7),
        hot: Color(hex: 0xD92A49),
        onHot: Color(hex: 0xFFFFFF),
        ok: Color(hex: 0x2A7F35),
        markers: [
            .red: Color(hex: 0xD12E4A),
            .orange: Color(hex: 0xC9540F),
            .brown: Color(hex: 0x8A5636),
            .green: Color(hex: 0x2A7F35),
            .tan: Color(hex: 0x96690F),
            .ink: Color(hex: 0x17222E),
        ]
    )

    static let dark = Palette(
        counter: Color(hex: 0x10161C),
        paper: Color(hex: 0x19212A),
        paper2: Color(hex: 0x202A35),
        ink: Color(hex: 0xEEF2F5),
        ink2: Color(hex: 0xB4BFCA),
        ink3: Color(hex: 0x8F9CAA),
        line: Color(hex: 0x2F3A46),
        rule: Color(hex: 0xC27A2C),
        ruleSoft: Color(hex: 0x4A3A25),
        hot: Color(hex: 0xFF6B81),
        onHot: Color(hex: 0x10161C),
        ok: Color(hex: 0x6FCF7C),
        markers: [
            .red: Color(hex: 0xFF7A8C),
            .orange: Color(hex: 0xFF9A52),
            .brown: Color(hex: 0xDBA682),
            .green: Color(hex: 0x6FCF7C),
            .tan: Color(hex: 0xE3BD5B),
            .ink: Color(hex: 0xEEF2F5),
        ]
    )
}

nonisolated extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension EnvironmentValues {
    @Entry var palette: Palette = .dark
    /// True while the dashboard is idle and focus highlights are dimmed
    @Entry var subdued: Bool = false
    @Entry var chime: Chime? = nil
}

extension Font {
    /// Marker display type (Shantell Sans)
    static func marker(_ size: CGFloat, bold: Bool = false) -> Font {
        .custom(bold ? "ShantellSans-Bold" : "ShantellSans-SemiBold", fixedSize: size)
    }

    /// Text type (Atkinson Hyperlegible Next)
    static func text(_ size: CGFloat, weight: TextWeight = .regular) -> Font {
        .custom(weight.rawValue, fixedSize: size)
    }

    enum TextWeight: String {
        case regular = "AtkinsonHyperlegibleNext-Regular"
        case semibold = "AtkinsonHyperlegibleNext-SemiBold"
        case bold = "AtkinsonHyperlegibleNext-Bold"
    }
}

extension View {
    /// Trim the font's built-in line spacing from a single line of large marker type
    func tightLine(_ size: CGFloat) -> some View {
        padding(.vertical, -size * 0.12)
    }
}
