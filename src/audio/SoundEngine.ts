import { HUSH, MusicPlayer } from './MusicPlayer';
import { defeatMotif, isMinor, THEMES, type MusicThemeId } from './score';
import type { PowerKind } from '@/engine/powers/Powers';

/** Pentatonic steps (semitones) climbed by the chain reaction: it always sounds right. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
/** Inharmonic partials of a glass bell. */
const GLASS_PARTIALS = [1, 2.76, 5.4];

const semitones = (base: number, steps: number) => base * 2 ** (steps / 12);
/** Bass line of Rhythm mode, in semitones above the song's root: one note per beat, two bars. */
const BASS = [0, 0, 12, 10, 0, 0, 7, 5];
/** Minor chord played at the start of every bar. */
const CHORD = [0, 3, 7];

/**
 * Every sound of the game, synthesised with Web Audio (specification § 3.5):
 * no audio file to download. The context is created on the first player
 * gesture, as browsers require; until then, and without Web Audio, every
 * call is silently ignored.
 */
export class SoundEngine {
  private context: AudioContext | null = null;
  /** Sound effects, at the player's effects volume. */
  private master: GainNode | null = null;
  /** The music, at its own volume. */
  private musicGain: GainNode | null = null;
  /** Shared reverb (a synthesised room): bells and pads sing in it. */
  private reverbSend: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private musicPlayer: MusicPlayer | null = null;
  private theme: MusicThemeId | null = null;
  private volume: number;
  private music: number;

  constructor(
    volume: number,
    private readonly createContext: () => AudioContext | null = () =>
      typeof AudioContext === 'undefined' ? null : new AudioContext(),
    music = 0.6,
  ) {
    this.volume = volume;
    this.music = music;
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
      this.buildMix(this.context);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  /**
   * The mixing desk: effects and music on their own faders, a shared reverb,
   * and a gentle compressor that glues everything and keeps big chain
   * reactions from clipping.
   */
  private buildMix(ctx: AudioContext): void {
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16;
    glue.knee.value = 12;
    glue.ratio.value = 3.5;
    glue.attack.value = 0.005;
    glue.release.value = 0.2;
    glue.connect(ctx.destination);
    const room = ctx.createConvolver();
    // Short and mono: a long stereo convolution costs a modest device dearly.
    room.buffer = this.impulse(ctx, 1.2);
    const roomReturn = ctx.createGain();
    roomReturn.gain.value = 0.32;
    room.connect(roomReturn);
    roomReturn.connect(glue);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.6;
    this.reverbSend.connect(room);
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(glue);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.music;
    this.musicGain.connect(glue);
    this.noise = this.whiteNoise(ctx);
    this.musicPlayer = new MusicPlayer(ctx, this.musicGain, this.reverbSend, this.noise);
    this.musicPlayer.play(this.music > 0 ? this.theme : null);
  }

  /** The music to play now (a world, the menus) or none; it starts once sound is unlocked. */
  playMusic(theme: MusicThemeId | null): void {
    this.theme = theme;
    this.musicPlayer?.play(this.music > 0 ? theme : null);
  }

  /** The world's music again after a defeat's silence (a new game, a continue). */
  restoreMusic(): void {
    this.musicPlayer?.play(this.music > 0 ? this.theme : null);
  }

  /** How close the danger is, 0 to 1: the music tightens. */
  setTension(tension: number): void {
    this.musicPlayer?.setIntensity(tension);
  }

  setMusicVolume(volume: number): void {
    // Music off: nothing is scheduled at all, which spares the processor too.
    if (volume > 0 !== this.music > 0) this.musicPlayer?.play(volume > 0 ? this.theme : null);
    this.music = volume;
    if (this.musicGain && this.context) {
      this.musicGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
    }
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

  /** A powered shot: a deep whoosh and a crack. */
  powerShot(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sawtooth', 420, 90, 0.22, 0.2, 1800);
      this.noiseBurst(ctx, out, now, 0.12, 2500, 0.18);
      this.thump(ctx, out, now, 0.35);
    });
  }

  /** The held shot is fully charged: a short rising chime. */
  charged(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'sine', 880, 1760, 0.08, 0.08));
  }

  land(): void {
    this.play((ctx, out, now) => this.bell(ctx, out, now, 1650, 0.06, 0.08));
  }

  swap(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'sine', 520, 880, 0.06, 0.12));
  }

  /**
   * Glass bursting: a crack of noise, a scatter of tiny shards, a bell whose
   * pitch climbs with the depth of the chain reaction, a sub thump for big
   * groups, and from depth 3 a rising sparkle, a reward the ear expects.
   */
  explode(balls: number, depth: number): void {
    this.play((ctx, out, now) => {
      const step = SCALE[Math.min(depth - 1, SCALE.length - 1)]!;
      const note = semitones(784, step);
      this.noiseBurst(ctx, out, now, 0.28, 2600, 0.3);
      for (let i = 0; i < Math.min(6, balls + 1); i++) {
        this.bell(ctx, out, now + i * 0.018, 2600 + Math.random() * 2400, 0.12, 0.04);
      }
      this.bell(ctx, out, now, note, 0.8, 0.22);
      this.bell(ctx, out, now + 0.03, note * 1.5, 0.6, 0.12);
      if (balls >= 4 || depth >= 2) this.thump(ctx, out, now, 0.35 + 0.08 * Math.min(depth, 4));
      if (depth >= 3) {
        [0, 4, 7, 12].forEach((up, i) =>
          this.bell(ctx, out, now + 0.08 + i * 0.05, semitones(note, up + 12), 0.5, 0.06),
        );
      }
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

  /** A switch flips: a heavy mechanical clack, lower for the detour. */
  switch(detour: boolean): void {
    this.play((ctx, out, now) => {
      this.noiseBurst(ctx, out, now, 0.06, 1500, 0.25);
      this.thump(ctx, out, now, 0.3);
      this.bell(ctx, out, now + 0.03, detour ? 330 : 494, 0.25, 0.08);
    });
  }

  /** A switch the chain has already reached: a dull refusal. */
  /** Weather coming (§ 3.9): a roar of fire, an icy chime, or a gust; louder when massive. */
  weather(kind: 'solar' | 'cold' | 'wind', massive: boolean): void {
    this.play((ctx, out, now) => {
      if (kind === 'solar') {
        this.noiseBurst(ctx, out, now, 1.2, 300, 0.22);
        this.sweep(ctx, out, now, 'sawtooth', 90, 180, 1, 0.12, 700);
      } else if (kind === 'cold') {
        [0, 5, 9].forEach((step, i) =>
          this.bell(ctx, out, now + i * 0.07, semitones(1320, step), 1, 0.08),
        );
      } else {
        this.noiseBurst(ctx, out, now, massive ? 1.4 : 0.9, 500, massive ? 0.3 : 0.18);
      }
    });
  }

  /** A star fragment caught: a bright, rising arpeggio. */
  fragment(): void {
    this.play((ctx, out, now) => {
      [0, 4, 7, 12].forEach((step, i) =>
        this.bell(ctx, out, now + i * 0.05, semitones(1046, step), 0.5, 0.08),
      );
    });
  }

  /** A power set off (v1.7): each one sounds like what it does. */
  power(kind: PowerKind): void {
    this.play((ctx, out, now) => this.powerSounds[kind](ctx, out, now));
  }

  private readonly powerSounds: Readonly<
    Record<PowerKind, (ctx: AudioContext, out: AudioNode, now: number) => void>
  > = {
    // Rewind: a tape pulled back, falling fast.
    rewind: (ctx, out, now) => {
      this.sweep(ctx, out, now, 'sawtooth', 900, 120, 0.45, 0.12, 1800);
      this.noiseBurst(ctx, out, now, 0.4, 2500, 0.1);
    },
    // Slow-down: a chord sinking slowly, as time stretches.
    slow: (ctx, out, now) => {
      this.sweep(ctx, out, now, 'triangle', 660, 330, 0.9, 0.14);
      this.bell(ctx, out, now, 392, 1.2, 0.06);
    },
    // Rainbow shot: an arpeggio climbing through the six colours.
    rainbow: (ctx, out, now) => {
      [0, 4, 7, 11, 14, 19].forEach((step, i) =>
        this.bell(ctx, out, now + i * 0.045, semitones(784, step), 0.45, 0.07),
      );
    },
    // Laser: a charge that snaps.
    laser: (ctx, out, now) => {
      this.sweep(ctx, out, now, 'square', 220, 1760, 0.25, 0.08, 3000);
      this.bell(ctx, out, now + 0.2, 1760, 0.4, 0.06);
    },
  };

  /** The Nova bomb is ready: a deep hum rising. */
  novaReady(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'triangle', 110, 440, 0.5, 0.14));
  }

  /** A Nova bomb goes off. */
  bomb(): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.8);
      this.noiseBurst(ctx, out, now, 0.8, 200, 0.35);
      this.sweep(ctx, out, now, 'sawtooth', 300, 40, 0.6, 0.2, 900);
    });
  }

  /** A ball starts falling from the sky: a short whistle going down. */
  whistle(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'sine', 1800, 500, 0.9, 0.05));
  }

  /** A ball from the sky lands in the chain. */
  thud(): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.4);
      this.bell(ctx, out, now, 520, 0.2, 0.06);
    });
  }

  /** A shot falling into the black hole: a long sigh down into the depths. */
  swallow(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sine', 620, 55, 0.5, 0.2);
      this.noiseBurst(ctx, out, now, 0.25, 600, 0.06);
    });
  }

  /**
   * One beat of Rhythm mode's music, synthesised like everything else: a kick
   * on the beat, a hi-hat between beats, the bass line, and a chord on every
   * bar. `beat` is its length in seconds; `root` the song's key, in hertz.
   */
  beat(index: number, beat: number, root: number): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.45);
      this.noiseBurst(ctx, out, now + beat / 2, 0.05, 7000, 0.07);
      const note = semitones(root * 2, BASS[index % BASS.length]!);
      this.sweep(ctx, out, now, 'sawtooth', note, note, beat * 0.8, 0.1, 500);
      if (index % 4 === 0) {
        for (const step of CHORD) this.bell(ctx, out, now, semitones(root * 8, step), beat, 0.04);
      }
    });
  }

  /** The groove goes up a notch (Rhythm mode). */
  grooveUp(multiplier: number): void {
    this.play((ctx, out, now) =>
      this.bell(ctx, out, now, semitones(660, multiplier * 2), 0.4, 0.12),
    );
  }

  /** A new stage of Endless mode: a rising fanfare. */
  stageUp(): void {
    this.play((ctx, out, now) => {
      [0, 7, 12].forEach((step, i) => {
        this.bell(ctx, out, now + i * 0.08, semitones(392, step), 0.7, 0.14);
      });
    });
  }

  /** The duel rival fires: a softer, lower shot than the player's. */
  rivalShoot(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'triangle', 600, 220, 0.09, 0.12));
  }

  locked(): void {
    this.play((ctx, out, now) => this.sweep(ctx, out, now, 'square', 140, 110, 0.12, 0.08, 600));
  }

  /** Two colours fuse: two glass notes sliding into one. */
  fuse(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sine', 660, 880, 0.18, 0.12);
      this.sweep(ctx, out, now, 'sine', 1100, 880, 0.18, 0.12);
      this.bell(ctx, out, now + 0.16, 880, 0.6, 0.16);
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

  /** A level is won: the light surging along the tracks, rising to the hole (effects/Victory). */
  win(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sawtooth', 110, 880, 0.9, 0.05, 2400);
      this.sweep(ctx, out, now, 'sine', 220, 1760, 0.9, 0.08);
      [0, 4, 7, 11].forEach((step, i) => {
        this.bell(ctx, out, now + 0.2 + i * 0.16, semitones(523, step), 0.5, 0.06);
      });
    });
  }

  /** A showcase of the training is won: a lighter blow and a short bright chord. */
  burst(): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.4);
      [0, 4, 7].forEach((step, i) => {
        this.bell(ctx, out, now + i * 0.04, semitones(523, step), 1.1, 0.12);
      });
      this.noiseBurst(ctx, out, now, 0.5, 3200, 0.08);
    });
  }

  /** The black hole stirs before the young Colossus rises out of it: a deep rumble. */
  rumble(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sawtooth', 36, 72, 1.3, 0.16, 260);
      this.sweep(ctx, out, now, 'sine', 48, 30, 1.2, 0.22);
    });
  }

  /** The supernova: a deep blow, a bright chord, a shower of glass and a breath of air. */
  nova(): void {
    this.play((ctx, out, now) => {
      this.thump(ctx, out, now, 0.7);
      [0, 4, 7, 11, 14].forEach((step, i) => {
        this.bell(ctx, out, now + i * 0.03, semitones(523, step), 1.6, 0.16);
      });
      [24, 28, 31, 36].forEach((step, i) => {
        this.bell(ctx, out, now + 0.12 + i * 0.07, semitones(523, step), 0.6, 0.05);
      });
      this.noiseBurst(ctx, out, now, 0.9, 3200, 0.16);
    });
  }

  /** A launcher bought and worn on the victory panel (v1.8.0): the shards pour in, then it rings. */
  equip(): void {
    this.play((ctx, out, now) => {
      this.sweep(ctx, out, now, 'sine', 660, 1320, 0.3, 0.06);
      this.bell(ctx, out, now + 0.32, semitones(1047, 7), 0.9, 0.14);
      this.bell(ctx, out, now + 0.36, semitones(2093, 7), 0.6, 0.05);
    });
  }

  /** A star of the result lights up: each one a step higher. */
  star(index: number): void {
    this.play((ctx, out, now) => {
      const base = semitones(1047, [0, 4, 7][index] ?? 7);
      this.bell(ctx, out, now, base, 0.9, 0.16);
      this.bell(ctx, out, now + 0.05, base * 2, 0.5, 0.05);
    });
  }

  /**
   * A defeat (v1.8.1, spec § 3.17): the music falls silent, a short motif falls
   * in the world's key, the hole swallows the chain with a long gulp, then
   * silence until the next game. `root` is the key of a song the music
   * player does not play (Rhythm mode), in hertz.
   */
  lose(root: number | null = null): void {
    this.musicPlayer?.hush();
    const theme = THEMES[this.theme ?? 'nebula'];
    const motif = root === null ? defeatMotif(theme.root, isMinor(theme)) : defeatMotif(root);
    this.play((ctx, out, now) => {
      const start = now + HUSH;
      for (const note of motif) this.sung(ctx, out, start + note.at, note.frequency, note.seconds);
      // Under the last note, the hole swallows the chain, and closes.
      const last = motif.at(-1)!;
      const gulp = start + last.at + 0.12;
      this.sweep(ctx, out, gulp, 'sine', last.frequency / 2, 30, 0.8, 0.28);
      this.noiseBurst(ctx, out, gulp, 0.65, 180, 0.1);
      this.thump(ctx, out, gulp + 0.7, 0.3);
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

  /** A soft sung note (a defeat's motif): a triangle over a sine an octave down, in the room. */
  private sung(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    frequency: number,
    seconds: number,
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    const voice = this.envelope(ctx, out, at, 0.16, seconds);
    if (this.reverbSend) voice.connect(this.reverbSend);
    filter.connect(voice);
    for (const [ratio, type] of [
      [1, 'triangle'],
      [0.5, 'sine'],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency * ratio, at);
      // Each note sighs: it sags a third of a semitone as it fades.
      osc.frequency.linearRampToValueAtTime(frequency * ratio * 2 ** (-0.35 / 12), at + seconds);
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + seconds + 0.05);
    }
  }

  private bell(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    frequency: number,
    decay: number,
    peak: number,
  ): void {
    // Partials above half the sample rate can't be played (the browser warns): skip them.
    const nyquist = ctx.sampleRate / 2;
    GLASS_PARTIALS.forEach((ratio, i) => {
      if (frequency * ratio >= nyquist) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;
      const voice = this.envelope(ctx, out, at, peak / (i + 1), decay / (i + 1));
      // Glass rings on in the room.
      if (this.reverbSend) voice.connect(this.reverbSend);
      osc.connect(voice);
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

  /** A room's echo, synthesised: noise fading out over `seconds`. */
  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.round(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    return buffer;
  }

  private whiteNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
