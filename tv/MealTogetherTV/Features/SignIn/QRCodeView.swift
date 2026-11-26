import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI

/// A QR code drawn dark on a white card with a quiet margin, so a phone
/// camera reads it in either color theme
struct QRCodeView: View {
    let text: String

    var body: some View {
        GeometryReader { proxy in
            let side = min(proxy.size.width, proxy.size.height)
            ZStack {
                RoundedRectangle(cornerRadius: side * 0.06, style: .continuous)
                    .fill(.white)
                if let image = Self.image(for: text) {
                    Image(decorative: image, scale: 1)
                        .interpolation(.none)
                        .resizable()
                        .padding(side * 0.07)
                }
            }
            .frame(width: side, height: side)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    /// One pixel per module; the view scales it up without smoothing
    static func image(for text: String) -> CGImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        return CIContext().createCGImage(output, from: output.extent)
    }
}
