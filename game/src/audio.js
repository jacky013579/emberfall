// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// Short blips for shots and hits, a chime for pickups, an arpeggio for level-ups,
// and a quiet two-chord pad that loops under play. M toggles mute.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(720, 0.07, 'square', 0.08, 240);
    },
    hit() {
      tone(190, 0.06, 'triangle', 0.12, 90);
    },
    explode() {
      noise(0.28, 0.22, 900);
      tone(120, 0.25, 'sine', 0.18, 40);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.12, 1320);
    },
    hurt() {
      tone(160, 0.18, 'sawtooth', 0.16, 60);
      noise(0.12, 0.1, 500);
    },
    levelUp() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.16, 'sine', 0.14), i * 70);
      });
    },
    dash() {
      noise(0.12, 0.1, 2400);
    },
    boss() {
      tone(65, 0.6, 'sawtooth', 0.2, 45);
      noise(0.5, 0.14, 300);
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => tone(f, 0.3, 'triangle', 0.14), i * 110);
      });
    },
    startMusic() {
      if (musicTimer || !ensure()) return;
      const chords = [[220, 277, 330], [174, 220, 261], [196, 247, 294], [146, 220, 293]];
      let i = 0;
      const play = () => {
        if (muted) return;
        const [a, b, c] = chords[i % chords.length];
        i += 1;
        for (const f of [a, b, c]) tone(f, 1.8, 'sine', 0.03);
      };
      play();
      musicTimer = setInterval(play, 1900);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
