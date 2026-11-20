// Web Audio API Referee Whistle and Sound Effects Generator
// 100% offline, zero network assets required, authentic sports whistle synthesis

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Referee whistle burst with trill (frequency modulation like a pea whistle)
 */
export const playWhistleBurst = (duration = 0.35, trillRate = 35) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Carrier oscillator (primary whistle tone around 2800Hz)
    const carrier = ctx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(2850, now);

    // Modulator for the "pea" trill inside referee whistle
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(trillRate, now);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(180, now); // frequency deviation
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Secondary harmonic tone for rich acoustic whistle piercing sound
    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(3200, now);

    // Master envelope gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.4, now + 0.04);
    masterGain.gain.setValueAtTime(0.35, now + duration - 0.06);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Bandpass filter to model whistle resonant chamber
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.Q.setValueAtTime(4, now);

    carrier.connect(masterGain);
    harmonic.connect(masterGain);
    masterGain.connect(filter);
    filter.connect(ctx.destination);

    carrier.start(now);
    modulator.start(now);
    harmonic.start(now);

    carrier.stop(now + duration);
    modulator.stop(now + duration);
    harmonic.stop(now + duration);
  } catch (e) {
    console.warn("Audio playback not allowed or failed:", e);
  }
};

/**
 * Short Point Scored chirp
 */
export const playScoreSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn(e);
  }
};

/**
 * Game Point Alert: Double sharp whistle
 */
export const playGamePointWhistle = () => {
  playWhistleBurst(0.2, 40);
  setTimeout(() => {
    playWhistleBurst(0.3, 40);
  }, 220);
};

/**
 * Match Point / Victory Alert: Triple celebratory whistle
 */
export const playMatchPointWhistle = () => {
  playWhistleBurst(0.18, 45);
  setTimeout(() => {
    playWhistleBurst(0.18, 45);
    setTimeout(() => {
      playWhistleBurst(0.5, 35);
    }, 220);
  }, 220);
};
