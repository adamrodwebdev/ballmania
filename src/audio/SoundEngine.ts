/** Pentatonic steps (semitones) climbed by the chain reaction: it always sounds right. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
/** Inharmonic partials of a glass bell. */
const GLASS_PARTIALS = [1, 2.76, 5.4];

const semitones = (base: number, steps: number) => base * 2 ** (steps / 12);

/**
 * Every sound of the game, synthesised with Web Audio (specification § 3.5):
 * no audio file to download. The context is created on the first player
 * gesture, as browsers require; until then, and without Web Audio, every
 * call is silently ignored.
 */
export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume: number;

  constructor(
    volume: number,
    private readonly createContext: () => AudioContext | null = () =>
      typeof AudioContext === 'undefined' ? null : new AudioContext(),
  ) {
    this.volume = volume;
  }

  /** Call from a user gesture (pointer or key): creates or wakes the audio context. */
  unlock(): void {
    if (!this.context) {
      try {
        this.context = this.createContext();
      } catch {
        this.context = null;
      }
      if (!this.context) return;
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
      this.noise = this.whiteNoise(this.context);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
    }
  }

  /** Silences everything while the game is paused or hidden. */
  suspend(): void {
    if (this.context?.state === 'running') void this.context.suspend();
  }

  resume(): void {
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  shoot(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'triangle', 900, 320, 0.09, 0.22);
      this.noiseBurst(ctx, out, now, 0.03, 4000, 0.08);
    });
  }

  land(): void {
    this.play((ctx, out, now) => this.bell(ctx, out, now, 1650, 0.06, 0.08));
  }

  swap(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'sine', 520, 880, 0.06, 0.12));
  }

  /** Glass bursting; pitch climbs with the depth of the chain reaction. */
  explode(balls: number, depth: number): void {
    this.play((ctx, out, now) => {
      const step = SCALE[Math.min(depth - 1, SCALE.length - 1)]!;
      const note = semitones(784, step);
      this.noiseBurst(ctx, out, now, 0.28, 2600, 0.32);
      this.bell(ctx, out, now, note, 0.7, 0.22);
      this.bell(ctx, out, now + 0.03, note * 1.5, 0.5, 0.12);
      if (balls >= 4 || depth >= 2) this.thump(ctx, out, now, 0.35 + 0.08 * Math.min(depth, 4));
    });
  }

  /** One beat of the heart, when the chain is close to the hole. */
  heartbeat(): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.35);
      this.thump(ctx, out, now + 0.16, 0.25);
    });
  }

  /** A shot bouncing off a mirror: a glassy ping, higher at each rebound. */
  rebound(bounces: number): void {
    this.play((ctx, out, now) => {
      this.bell(ctx, out, now, semitones(1318, 3 * Math.min(bounces - 1, 4)), 0.25, 0.12);
    });
  }

  /** The magnet pulls a ball: a watery suction sweeping upwards. */
  pull(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sine', 160, 720, 0.26, 0.22, 1400);
      this.noiseBurst(ctx, out, now, 0.2, 900, 0.1);
    });
  }

  /** The magnet gets a charge back: two soft rising notes. */
  charge(): void {
    this.play((ctx, out, now) => {
      this.bell(ctx, out, now, 880, 0.3, 0.1);
      this.bell(ctx, out, now + 0.08, 1320, 0.35, 0.1);
    });
  }

  /** A blow on the Colossus: a heavy, metallic hit. */
  colossusHit(): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.6);
      this.bell(ctx, out, now, 196, 0.5, 0.15);
    });
  }

  /** The Colossus enters a new phase: a low growl. */
  roar(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sawtooth', 70, 140, 0.5, 0.22, 500);
      this.sweep(ctx, out, now + 0.25, 'sawtooth', 140, 55, 0.7, 0.2, 400);
    });
  }

  win(): void {
    this.play((ctx, out, now) => {
      [0, 4, 7, 12, 16].forEach((step, i) => {
        this.bell(ctx, out, now + i * 0.09, semitones(523, step), 1.1, 0.2);
      });
      this.noiseBurst(ctx, out, now, 0.6, 1800, 0.25);
      this.thump(ctx, out, now, 0.6);
    });
  }

  lose(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sawtooth', 220, 48, 1.1, 0.2, 900);
      this.noiseBurst(ctx, out, now, 0.9, 300, 0.3);
    });
  }

  private play(build: (ctx: AudioContext, out: AudioNode, now: number) => void): void {
    if (!this.context || !this.master || this.volume === 0) return;
    if (this.context.state !== 'running') return;
    build(this.context, this.master, this.context.currentTime);
  }

  private envelope(ctx: AudioContext, out: AudioNode, at: number, peak: number, decay: number) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    gain.connect(out);
    return gain;
  }

  private sweep(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    peak: number,
    lowpass?: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    let target: AudioNode = this.envelope(ctx, out, at, peak, duration);
    if (lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      filter.connect(target);
      target = filter;
    }
    osc.connect(target);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  private bell(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    frequency: number,
    decay: number,
    peak: number,
  ): void {
    GLASS_PARTIALS.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;
      osc.connect(this.envelope(ctx, out, at, peak / (i + 1), decay / (i + 1)));
      osc.start(at);
      osc.stop(at + decay + 0.05);
    });
  }

  private noiseBurst(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    decay: number,
    highpass: number,
    peak: number,
  ): void {
    if (!this.noise) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    source.connect(filter);
    filter.connect(this.envelope(ctx, out, at, peak, decay));
    source.start(at, Math.random() * 0.5);
    source.stop(at + decay + 0.05);
  }

  private thump(ctx: AudioContext, out: AudioNode, at: number, peak: number): void {
    this.sweep(ctx, out, at, 'sine', 110, 38, 0.22, peak);
  }

  private whiteNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
