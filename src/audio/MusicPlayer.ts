import { eventsAt, stepSeconds, THEMES, type MusicThemeId, type StepEvents } from './score';

/** How far ahead notes are scheduled, in seconds, and how often the scheduler wakes. */
const LOOKAHEAD = 0.15;
const TICK_MS = 25;
/** Seconds of the fade between two themes. */
const FADE = 0.8;
/** Seconds the music takes to fall silent at a defeat, before its motif. */
export const HUSH = 0.25;

/**
 * Plays the themes of `score.ts` with Web Audio: a classic look-ahead
 * scheduler places each sixteenth note a little in advance on the audio
 * clock, so the timing never depends on the frame rate. Pads go through a
 * low-pass filter and the shared reverb; drums are synthesised from noise
 * and sine sweeps. A new theme fades in over the old one.
 */
export class MusicPlayer {
  private theme: MusicThemeId | null = null;
  private bus: GainNode | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private intensity = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
    private readonly reverb: AudioNode,
    private readonly noise: AudioBuffer,
  ) {}

  get playing(): MusicThemeId | null {
    return this.theme;
  }

  /** Plays a theme (or nothing); the same theme keeps playing without a restart. */
  play(theme: MusicThemeId | null): void {
    if (theme === this.theme) return;
    this.fadeOut();
    this.theme = theme;
    if (!theme) return;
    const bus = this.ctx.createGain();
    const now = this.ctx.currentTime;
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(1, now + FADE);
    bus.connect(this.output);
    this.bus = bus;
    this.step = 0;
    this.nextTime = now + 0.05;
    this.timer ??= setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Tension, 0 to 1 (the chain nearing the hole): calmer themes gain drums. */
  setIntensity(intensity: number): void {
    this.intensity = intensity;
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Falls silent in a moment (a defeat): nothing plays until a theme is played again. */
  hush(): void {
    this.fadeOut(HUSH);
    this.theme = null;
  }

  private fadeOut(seconds = FADE): void {
    const bus = this.bus;
    if (!bus) return;
    const now = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    setTimeout(() => bus.disconnect(), (seconds + 0.2) * 1000);
    this.bus = null;
  }

  private schedule(): void {
    const theme = this.theme ? THEMES[this.theme] : null;
    const bus = this.bus;
    if (!theme || !bus) return;
    // A suspended context (pause, ad) does not move: nothing piles up meanwhile.
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      this.render(eventsAt(theme, this.step, this.intensity), this.nextTime, bus, theme);
      this.nextTime += stepSeconds(theme);
      this.step++;
    }
  }

  private render(
    events: StepEvents,
    at: number,
    bus: GainNode,
    theme: (typeof THEMES)[MusicThemeId],
  ): void {
    if (events.pad) {
      for (const note of events.pad.notes) {
        this.pad(
          bus,
          at,
          note,
          events.pad.seconds,
          theme.pad.wave,
          theme.pad.level,
          theme.pad.bright,
        );
      }
    }
    const step = stepSeconds(theme);
    if (events.bass) {
      this.tone(
        bus,
        at,
        events.bass.note,
        step * 3,
        theme.bass.wave,
        theme.bass.level * events.bass.level,
        700,
      );
    }
    if (events.arp) {
      const level = theme.arp.level * events.arp.level;
      if (theme.arp.glass) this.glass(bus, at, events.arp.note, level);
      else this.tone(bus, at, events.arp.note, step * 1.5, 'sawtooth', level, 2600);
    }
    if (events.kick > 0) this.kick(bus, at, events.kick);
    if (events.snare > 0) this.hiss(bus, at, 1800, 0.16, 0.16 * events.snare);
    if (events.hat > 0) this.hiss(bus, at, 8000, 0.04, 0.06 * events.hat);
    if (events.tom > 0) this.tom(bus, at, events.tom);
  }

  /** A chord voice: two slightly detuned oscillators, slow attack, filtered, into the reverb. */
  private pad(
    bus: GainNode,
    at: number,
    frequency: number,
    seconds: number,
    wave: OscillatorType,
    level: number,
    bright: number,
  ): void {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level / 2, at + Math.min(0.8, seconds * 0.3));
    gain.gain.setValueAtTime(level / 2, at + seconds * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds * 1.05);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = bright;
    filter.connect(gain);
    gain.connect(bus);
    gain.connect(this.reverb);
    for (const detune of [-7, 7]) {
      const osc = this.ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + seconds * 1.1);
    }
  }

  private tone(
    bus: GainNode,
    at: number,
    frequency: number,
    seconds: number,
    wave: OscillatorType,
    level: number,
    lowpass: number,
  ): void {
    const osc = this.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = frequency;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.envelope(at, level, seconds);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + seconds + 0.05);
  }

  /** A glass pluck: a bright sine and its inharmonic overtone, half into the reverb. */
  private glass(bus: GainNode, at: number, frequency: number, level: number): void {
    [1, 2.76].forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;
      const gain = this.envelope(at, level / (i + 1), 0.9 / (i + 1));
      osc.connect(gain);
      gain.connect(bus);
      gain.connect(this.reverb);
      osc.start(at);
      osc.stop(at + 1);
    });
  }

  private kick(bus: GainNode, at: number, level: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(40, at + 0.18);
    const gain = this.envelope(at, 0.5 * level, 0.28);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + 0.32);
  }

  private tom(bus: GainNode, at: number, level: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, at);
    osc.frequency.exponentialRampToValueAtTime(70, at + 0.3);
    const gain = this.envelope(at, 0.35 * level, 0.35);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + 0.4);
  }

  private hiss(bus: GainNode, at: number, highpass: number, seconds: number, level: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const gain = this.envelope(at, level, seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(at, Math.random() * 0.5);
    source.stop(at + seconds + 0.05);
  }

  private envelope(at: number, peak: number, decay: number): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    return gain;
  }
}
