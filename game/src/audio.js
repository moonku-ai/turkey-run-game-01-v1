// Tiny WebAudio synth: every sound is built from oscillators and filtered noise,
// no audio files. The context is created lazily on the first user gesture, so
// autoplay rules never block the game, and ?shot= scenes stay silent.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.22);
      tone(990, 0.12, 'sine', 0.2, 0.07);
    },
    feather() {
      tone(523, 0.1, 'triangle', 0.22);
      tone(659, 0.1, 'triangle', 0.22, 0.08);
      tone(784, 0.16, 'triangle', 0.24, 0.16);
    },
    gobble() {
      // Three quick descending clucks.
      tone(320, 0.07, 'square', 0.1, 0, 180);
      tone(300, 0.07, 'square', 0.1, 0.09, 170);
      tone(260, 0.09, 'square', 0.1, 0.18, 140);
    },
    dash() {
      noise(0.18, 0.16, 1200);
    },
    alarm() {
      tone(220, 0.22, 'sawtooth', 0.2, 0, 440);
      tone(220, 0.22, 'sawtooth', 0.2, 0.24, 440);
    },
    knife() {
      noise(0.22, 0.2, 2600);
    },
    hit() {
      tone(140, 0.25, 'sawtooth', 0.26, 0, 70);
      noise(0.15, 0.2, 300);
    },
    hide() {
      noise(0.3, 0.12, 500);
    },
    stageClear() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.22, i * 0.1));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.24, i * 0.12));
      tone(262, 0.6, 'sine', 0.16, 0.1);
    },
    caught() {
      tone(196, 0.4, 'sawtooth', 0.24, 0, 98);
      tone(147, 0.5, 'sawtooth', 0.22, 0.3, 73);
    },
  };
}
