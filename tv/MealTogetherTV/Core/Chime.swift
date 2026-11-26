import AVFoundation

/// The timer chime: A5, E5, A5, played twice. Synthesized, so no audio file ships.
final class Chime {
    private let settings: AppSettings
    private var player: AVAudioPlayer?

    init(settings: AppSettings) {
        self.settings = settings
    }

    func playIfEnabled() {
        if settings.soundEnabled { play() }
    }

    func play() {
        if player == nil {
            try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
            try? AVAudioSession.sharedInstance().setActive(true)
            player = try? AVAudioPlayer(data: Self.wave(), fileTypeHint: AVFileType.wav.rawValue)
            player?.prepareToPlay()
        }
        player?.currentTime = 0
        player?.play()
    }

    /// 16-bit mono PCM in a WAV container
    nonisolated static func wave(sampleRate: Double = 44100) -> Data {
        let phrase: [Double] = [880, 660, 880]
        let noteLength = 0.26
        let pause = 0.3
        let volume = 0.55

        var samples: [Int16] = []
        for round in 0..<2 {
            for frequency in phrase {
                let count = Int(noteLength * sampleRate)
                for index in 0..<count {
                    let t = Double(index) / sampleRate
                    // Quick attack, exponential decay
                    let attack = min(1, t / 0.01)
                    let decay = exp(-t / noteLength * 4.2)
                    let value = sin(2 * .pi * frequency * t) * attack * decay * volume
                    samples.append(Int16(max(-1, min(1, value)) * Double(Int16.max)))
                }
            }
            if round == 0 {
                samples.append(contentsOf: [Int16](repeating: 0, count: Int(pause * sampleRate)))
            }
        }

        let byteCount = samples.count * 2
        var data = Data()
        func append<T: FixedWidthInteger>(_ value: T) {
            withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
        }
        data.append(contentsOf: Array("RIFF".utf8))
        append(UInt32(36 + byteCount))
        data.append(contentsOf: Array("WAVEfmt ".utf8))
        append(UInt32(16))
        append(UInt16(1))
        append(UInt16(1))
        append(UInt32(sampleRate))
        append(UInt32(sampleRate * 2))
        append(UInt16(2))
        append(UInt16(16))
        data.append(contentsOf: Array("data".utf8))
        append(UInt32(byteCount))
        for sample in samples { append(sample) }
        return data
    }
}
