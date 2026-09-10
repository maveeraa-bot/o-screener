/**
 * Synthesizes a subtle, pleasant alert sound using the Web Audio API.
 * No external audio files or network requests required.
 */
let audioCtx: AudioContext | null = null;

export function playAlertChime(isBullish: boolean = true) {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';

    if (isBullish) {
      // Pleasant rising chord (bullish)
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
    } else {
      // Sharp descending warning tone (bearish)
      osc.frequency.setValueAtTime(698.46, now); // F5
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.15); // C#5
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.3); // A4
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  } catch (err) {
    console.warn('Audio chime playback omitted or blocked by browser policy:', err);
  }
}
