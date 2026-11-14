export type Sfx = {
  unlock: () => void;
  shoot: () => void;
  hit: () => void;
  explode: (big?: boolean) => void;
  phase: () => void;
  hurt: () => void;
  setMuted: (muted: boolean) => void;
};

export function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  let muted = false;

  function ac() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 1) {
    if (muted) return;
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), c.currentTime + dur);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  function noise(dur: number, gain: number) {
    if (muted) return;
    const c = ac();
    const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = n;
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start();
  }

  return {
    unlock: () => {
      ac();
    },
    shoot: () => tone(640 + Math.random() * 80, 0.06, "square", 0.04, 1.8),
    hit: () => tone(220, 0.05, "triangle", 0.05, 0.6),
    explode: (big) => {
      noise(big ? 0.38 : 0.18, big ? 0.18 : 0.1);
      tone(big ? 90 : 140, big ? 0.28 : 0.12, "sawtooth", 0.05, 0.4);
    },
    phase: () => {
      tone(180, 0.35, "sawtooth", 0.06, 2.4);
      noise(0.2, 0.08);
    },
    hurt: () => tone(110, 0.2, "square", 0.06, 0.5),
    setMuted: (value) => {
      muted = value;
    },
  };
}
