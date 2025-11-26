/**
 * audioNotification - Web Audio API Notification System
 * Port of turkey project's playFinishChime() function
 *
 * Features:
 * - Synthesized audio using Web Audio API
 * - 3-note chime sequence (880Hz → 660Hz → 880Hz)
 * - Envelope with attack/decay for natural sound
 * - User preference toggle (muted/unmuted)
 */

const AUDIO_CONTEXT = typeof window !== 'undefined' ? new AudioContext() : null;

export interface ChimeOptions {
  volume?: number; // 0.0 to 1.0
  duration?: number; // milliseconds per note
  frequencies?: [number, number, number]; // Hz values for 3 notes
}

const DEFAULT_OPTIONS: Required<ChimeOptions> = {
  volume: 0.3,
  duration: 200,
  frequencies: [880, 660, 880], // A5 → E5 → A5
};

/**
 * Play a single note with envelope
 * @param frequency - Note frequency in Hz
 * @param duration - Note duration in ms
 * @param volume - Volume (0.0 to 1.0)
 * @param startTime - When to start (AudioContext time)
 * @returns Promise that resolves when note completes
 */
function playNote(
  frequency: number,
  duration: number,
  volume: number,
  startTime: number
): Promise<void> {
  if (!AUDIO_CONTEXT) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const oscillator = AUDIO_CONTEXT.createOscillator();
    const gainNode = AUDIO_CONTEXT.createGain();

    // Connect nodes: oscillator → gain → destination
    oscillator.connect(gainNode);
    gainNode.connect(AUDIO_CONTEXT.destination);

    // Configure oscillator
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Envelope: quick attack, gradual decay
    const durationSec = duration / 1000;
    const attackTime = 0.01; // 10ms attack

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      startTime + durationSec
    );

    // Start and stop oscillator
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSec);

    // Resolve when note completes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      resolve();
    };
  });
}

/**
 * Play timer completion chime (turkey pattern)
 * @param options - Chime configuration
 * @returns Promise that resolves when chime completes
 */
export async function playFinishChime(
  options: ChimeOptions = {}
): Promise<void> {
  if (!AUDIO_CONTEXT) {
    console.warn('AudioContext not available');
    return;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { volume, duration, frequencies } = opts;

  // Resume AudioContext if suspended (browser autoplay policy)
  if (AUDIO_CONTEXT.state === 'suspended') {
    await AUDIO_CONTEXT.resume();
  }

  const currentTime = AUDIO_CONTEXT.currentTime;
  const noteDuration = duration / 1000; // Convert to seconds
  const gapDuration = 0.05; // 50ms gap between notes

  // Play 3-note sequence
  await playNote(frequencies[0], duration, volume, currentTime);
  await playNote(
    frequencies[1],
    duration,
    volume,
    currentTime + noteDuration + gapDuration
  );
  await playNote(
    frequencies[2],
    duration,
    volume,
    currentTime + 2 * (noteDuration + gapDuration)
  );
}

/**
 * Test audio playback (for settings UI)
 * @param options - Chime configuration
 */
export async function testAudioNotification(
  options: ChimeOptions = {}
): Promise<void> {
  await playFinishChime(options);
}

/**
 * Check if audio notifications are enabled
 * @returns true if enabled
 */
export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const pref = localStorage.getItem('audioNotifications');
  return pref !== 'false'; // Default to enabled
}

/**
 * Set audio notification preference
 * @param enabled - Whether to enable audio
 */
export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('audioNotifications', enabled ? 'true' : 'false');
}

/**
 * Play chime if audio notifications are enabled
 * @param options - Chime configuration
 */
export async function playChimeIfEnabled(
  options: ChimeOptions = {}
): Promise<void> {
  if (isAudioEnabled()) {
    await playFinishChime(options);
  }
}
