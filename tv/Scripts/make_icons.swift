// Draws the tvOS app icon layers and Top Shelf images into Assets.xcassets.
// Run from the tv directory: swift Scripts/make_icons.swift
import AppKit
import CoreText

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let brand = root.appendingPathComponent("MealTogetherTV/Assets.xcassets/App Icon & Top Shelf Image.brandassets")
let fonts = root.appendingPathComponent("MealTogetherTV/Resources/Fonts/ShantellSans-SemiBold.ttf")
CTFontManagerRegisterFontsForURL(fonts as CFURL, .process, nil)

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(
        srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
        blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
}

let counter = color(0x10161C)
let paper = color(0xFFFFFF)
let ink = color(0x17222E)
let rule = color(0xEE9A3A)

func render(_ width: Int, _ height: Int, opaque: Bool, to url: URL, _ draw: (CGSize) -> Void) {
    // Opaque images are written without an alpha channel, as the back layer and banners require
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let alpha: CGImageAlphaInfo = opaque ? .noneSkipLast : .premultipliedLast
    let context = CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
        bitmapInfo: alpha.rawValue)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    draw(CGSize(width: width, height: height))
    NSGraphicsContext.restoreGraphicsState()
    try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    let rep = NSBitmapImageRep(cgImage: context.makeImage()!)
    try! rep.representation(using: .png, properties: [:])!.write(to: url)
}

/// The counter with faint ruled lines, like the sheet seen in a dark kitchen
func drawBack(_ size: CGSize) {
    counter.setFill()
    NSRect(origin: .zero, size: size).fill()
    rule.withAlphaComponent(0.22).setFill()
    let rows = 5
    let line = max(2, size.height * 0.012)
    for row in 1..<rows {
        let y = size.height * CGFloat(row) / CGFloat(rows) - line / 2
        NSRect(x: 0, y: y, width: size.width, height: line).fill()
    }
}

/// The mark: a sheet with a ruled border and a marker check
func drawMark(in rect: NSRect) {
    let side = rect.width
    let sheet = NSBezierPath(roundedRect: rect, xRadius: side * 0.23, yRadius: side * 0.23)
    paper.setFill()
    sheet.fill()
    rule.setStroke()
    sheet.lineWidth = side * 0.115
    sheet.stroke()

    // The favicon's check, on a 26-unit square with y measured from the top
    func point(_ x: CGFloat, _ y: CGFloat) -> NSPoint {
        NSPoint(x: rect.minX + (x - 3) / 26 * side, y: rect.maxY - (y - 3) / 26 * side)
    }
    let check = NSBezierPath()
    check.move(to: point(9.5, 16.5))
    check.line(to: point(14.1, 21.3))
    check.line(to: point(22.5, 10.5))
    check.lineWidth = side * 3.4 / 26
    check.lineCapStyle = .round
    check.lineJoinStyle = .round
    ink.setStroke()
    check.stroke()
}

func markRect(in size: CGSize, scale: CGFloat, centerX: CGFloat = 0.5) -> NSRect {
    let side = size.height * scale
    return NSRect(x: size.width * centerX - side / 2, y: (size.height - side) / 2, width: side, height: side)
}

func imageSet(_ folder: URL, _ files: [(name: String, scale: String)]) {
    let images = files.map { ["idiom": "tv", "filename": $0.name, "scale": $0.scale] }
    let json = try! JSONSerialization.data(
        withJSONObject: ["images": images, "info": ["author": "xcode", "version": 1]],
        options: [.prettyPrinted, .sortedKeys])
    try! FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    try! json.write(to: folder.appendingPathComponent("Contents.json"))
}

func writeJSON(_ object: Any, to url: URL) {
    try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try! JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]).write(to: url)
}

let info: [String: Any] = ["author": "xcode", "version": 1]

/// A two-layer icon: the mark in front of the ruled counter
func iconStack(_ name: String, sizes: [(width: Int, height: Int, scale: String)]) {
    let stack = brand.appendingPathComponent("\(name).imagestack")
    writeJSON(
        ["info": info, "layers": [["filename": "Front.imagestacklayer"], ["filename": "Back.imagestacklayer"]]],
        to: stack.appendingPathComponent("Contents.json"))

    for (layer, opaque) in [("Front", false), ("Back", true)] {
        let layerFolder = stack.appendingPathComponent("\(layer).imagestacklayer")
        writeJSON(["info": info], to: layerFolder.appendingPathComponent("Contents.json"))
        let set = layerFolder.appendingPathComponent("Content.imageset")
        var files: [(name: String, scale: String)] = []
        for size in sizes {
            let file = "\(layer.lowercased())@\(size.scale).png"
            files.append((file, size.scale))
            render(size.width, size.height, opaque: opaque, to: set.appendingPathComponent(file)) { canvas in
                if opaque {
                    drawBack(canvas)
                } else {
                    drawMark(in: markRect(in: canvas, scale: 0.6))
                }
            }
        }
        imageSet(set, files)
    }
}

/// A Top Shelf banner: the mark and the name on the ruled counter
func topShelf(_ name: String, width: Int, height: Int) {
    let set = brand.appendingPathComponent("\(name).imageset")
    var files: [(name: String, scale: String)] = []
    for (factor, scale) in [(1, "1x"), (2, "2x")] {
        let file = "banner@\(scale).png"
        files.append((file, scale))
        render(width * factor, height * factor, opaque: true, to: set.appendingPathComponent(file)) { canvas in
            drawBack(canvas)
            let side = canvas.height * 0.36
            let font = NSFont(name: "ShantellSans-SemiBold", size: canvas.height * 0.2)!
            let text = NSAttributedString(
                string: "MealTogether", attributes: [.font: font, .foregroundColor: color(0xEEF2F5)])
            let gap = side * 0.32
            let total = side + gap + text.size().width
            let x = (canvas.width - total) / 2
            drawMark(in: NSRect(x: x, y: (canvas.height - side) / 2, width: side, height: side))
            text.draw(at: NSPoint(x: x + side + gap, y: (canvas.height - text.size().height) / 2))
        }
    }
    imageSet(set, files)
}

iconStack("App Icon", sizes: [(400, 240, "1x"), (800, 480, "2x")])
iconStack("App Icon - App Store", sizes: [(1280, 768, "1x")])
topShelf("Top Shelf Image", width: 1920, height: 720)
topShelf("Top Shelf Image Wide", width: 2320, height: 720)

writeJSON(
    [
        "info": info,
        "assets": [
            ["idiom": "tv", "role": "primary-app-icon", "size": "1280x768", "filename": "App Icon - App Store.imagestack"],
            ["idiom": "tv", "role": "primary-app-icon", "size": "400x240", "filename": "App Icon.imagestack"],
            ["idiom": "tv", "role": "top-shelf-image-wide", "size": "2320x720", "filename": "Top Shelf Image Wide.imageset"],
            ["idiom": "tv", "role": "top-shelf-image", "size": "1920x720", "filename": "Top Shelf Image.imageset"],
        ],
    ], to: brand.appendingPathComponent("Contents.json"))
writeJSON(["info": info], to: brand.deletingLastPathComponent().appendingPathComponent("Contents.json"))
print("Wrote \(brand.path)")
