import { SeededRandom } from '@/engine/core/Random';
import type { Plan } from './Composer';
import { SAMPLE_RATE } from './Loudness';
import type { Mood } from './Mood';
import { sectionNotes, type Note } from './Score';

/**
 * The voices of an ambience (specification § 3.18): each section rendered on
 * its own in an `OfflineAudioContext`, stereo at 48 kHz, with a long stereo
 * reverberation drawn from the seed. Sound is linear here (no compressor),
 * so the sections, laid end to end over their cross-fades, add up to the
 * whole video exactly. The game's own `MusicPlayer` is not used: it plays in
 * real time, draws its noise at random and carries the tension.
 */

export interface RenderedSection {
  readonly index: number;
  /** Seconds from the start of the video where its first sample sits. */
  readonly start: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

/** How much of each voice goes into the reverberation. */
const SEND: Readonly<Record<Note['voice'], number>> = {
  pad: 0.5,
  drone: 0.35,
  bass: 0.12,
  glass: 0.9,
  bell: 0.8,
};

const BELL_PARTIALS = [
  [1, 1, 1],
  [2, 0.55, 0.7],
  [3.01, 0.35, 0.5],
  [4.2, 0.22, 0.35],
  [5.43, 0.12, 0.25],
] as const;

/**
 * Mixes nodes through a tree of gains with two inputs each. Chrome adds the
 * inputs of a node in an order that changes from one render to the next, and
 * floating-point addition is not associative: with three inputs or more, the
 * same notes come out a few units of the last place apart (around −140 dB).
 * With two, a + b is b + a exactly, and the sound is the same to the bit.
 */
export function mixTree(ctx: BaseAudioContext, nodes: readonly AudioNode[]): AudioNode | null {
  let level = [...nodes];
  if (!level.length) return null;
  while (level.length > 1) {
    const next: AudioNode[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const pair = ctx.createGain();
      level[i]!.connect(pair);
      level[i + 1]?.connect(pair);
      next.push(pair);
    }
    level = next;
  }
  return level[0]!;
}

export class AmbientVoices {
  constructor(
    private readonly plan: Plan,
    private readonly mood: Mood,
    private readonly wave: OscillatorType,
  ) {}

  /** Seconds a section's sound lasts: until the next one has finished fading in. */
  span(index: number): { start: number; seconds: number } {
    const section = this.plan.sections[index]!;
    const next = this.plan.sections[index + 1];
    return { start: section.start, seconds: section.seconds + (next?.crossfade ?? 0) };
  }

  async render(index: number): Promise<RenderedSection> {
    const section = this.plan.sections[index]!;
    const next = this.plan.sections[index + 1];
    const { start, seconds } = this.span(index);
    const length = Math.ceil(seconds * SAMPLE_RATE);
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: SAMPLE_RATE });
    // The section's own fades: in over its cross-fade, out over the next one's, equal power.
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const curve = (from: number, to: number, rising: boolean) => {
      const points = 64;
      const values = new Float32Array(points);
      for (let i = 0; i < points; i++) {
        const x = i / (points - 1);
        values[i] = rising ? Math.sin((Math.PI / 2) * x) : Math.cos((Math.PI / 2) * x);
      }
      master.gain.setValueCurveAtTime(values, from, to - from);
    };
    if (section.crossfade > 0) curve(0, section.crossfade, true);
    if (next) curve(section.seconds, section.seconds + next.crossfade, false);
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet);
    wet.connect(master);
    const dry: AudioNode[] = [];
    const sends: AudioNode[] = [];
    for (const note of sectionNotes(this.plan, index)) {
      const at = note.at - start;
      if (at >= seconds) continue;
      const outputs = this.play(ctx, note, at, section.brightness);
      dry.push(outputs.dry);
      sends.push(outputs.send);
    }
    mixTree(ctx, dry)?.connect(master);
    mixTree(ctx, sends)?.connect(reverb);
    const buffer = await ctx.startRendering();
    return {
      index,
      start,
      left: buffer.getChannelData(0),
      right: buffer.getChannelData(1),
    };
  }

  private play(
    ctx: OfflineAudioContext,
    note: Note,
    at: number,
    brightness: number,
  ): { dry: AudioNode; send: AudioNode } {
    const pan = ctx.createStereoPanner();
    pan.pan.value = note.pan;
    const send = ctx.createGain();
    send.gain.value = SEND[note.voice];
    pan.connect(send);
    switch (note.voice) {
      case 'pad':
        this.pad(ctx, note, at, pan, brightness);
        break;
      case 'drone':
        this.layered(
          ctx,
          note,
          at,
          pan,
          [
            [1, 1, 'sine'],
            [2, 0.25, 'triangle'],
          ],
          520,
        );
        break;
      case 'bass':
        // Harmonics an octave and a fifth up: a phone's small speaker hears the pitch.
        this.layered(
          ctx,
          note,
          at,
          pan,
          [
            [1, 1, 'sine'],
            [2, 0.4, 'sine'],
            [3, 0.18, 'sine'],
          ],
          1100,
        );
        break;
      case 'glass':
        this.struck(ctx, note, at, pan, [
          [1, 1, 1],
          [2.76, 0.35, 0.45],
          [5.4, 0.08, 0.2],
        ]);
        break;
      case 'bell':
        this.struck(ctx, note, at, pan, BELL_PARTIALS);
        break;
    }
    return { dry: pan, send };
  }

  /** A held note: rises over its attack, holds, then falls over its last third. */
  private envelope(ctx: OfflineAudioContext, note: Note, at: number, level: number): GainNode {
    const gain = ctx.createGain();
    const end = at + note.seconds;
    const release = Math.max(note.attack, note.seconds / 3);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + note.attack);
    gain.gain.setValueAtTime(level, Math.max(at + note.attack, end - release));
    gain.gain.linearRampToValueAtTime(0, end);
    return gain;
  }

  private pad(
    ctx: OfflineAudioContext,
    note: Note,
    at: number,
    out: AudioNode,
    brightness: number,
  ): void {
    const gain = this.envelope(ctx, note, at, note.level);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = brightness;
    filter.Q.value = 0.4;
    filter.connect(gain);
    gain.connect(out);
    // Two voices a few cents apart, one each side: the pad breathes and is wide.
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = this.wave;
      osc.frequency.value = note.frequency;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + note.seconds + 0.05);
    }
  }

  private layered(
    ctx: OfflineAudioContext,
    note: Note,
    at: number,
    out: AudioNode,
    layers: readonly (readonly [number, number, OscillatorType])[],
    lowpass: number,
  ): void {
    const gain = this.envelope(ctx, note, at, note.level);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    filter.connect(gain);
    gain.connect(out);
    const parts: AudioNode[] = [];
    for (const [ratio, level, wave] of layers) {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = note.frequency * ratio;
      const layer = ctx.createGain();
      layer.gain.value = level;
      osc.connect(layer);
      parts.push(layer);
      osc.start(at);
      osc.stop(at + note.seconds + 0.05);
    }
    mixTree(ctx, parts)?.connect(filter);
  }

  /** A struck note (glass, bell): each partial rises over the attack and rings away. */
  private struck(
    ctx: OfflineAudioContext,
    note: Note,
    at: number,
    out: AudioNode,
    partials: readonly (readonly [number, number, number])[],
  ): void {
    const parts: AudioNode[] = [];
    for (const [ratio, level, decay] of partials) {
      const frequency = note.frequency * ratio;
      if (frequency > 12_000) continue;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const gain = ctx.createGain();
      const ring = note.seconds * decay;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(note.level * level, at + note.attack);
      gain.gain.setTargetAtTime(0, at + note.attack, ring / 5);
      gain.gain.setValueAtTime(0.00001, at + note.attack + ring * 1.4);
      gain.gain.linearRampToValueAtTime(0, at + note.attack + ring * 1.5);
      osc.connect(gain);
      parts.push(gain);
      osc.start(at);
      osc.stop(at + note.attack + ring * 1.5 + 0.05);
    }
    mixTree(ctx, parts)?.connect(out);
  }

  /**
   * A stereo room drawn from the seed: noise that decays over the mood's
   * reverberation time, darker as it fades, a little different each side.
   */
  private impulse(ctx: OfflineAudioContext): AudioBuffer {
    const seconds = this.mood.reverb;
    const length = Math.round(seconds * SAMPLE_RATE);
    const buffer = ctx.createBuffer(2, length, SAMPLE_RATE);
    // The same room for every section: seeded by the video's seed only.
    const random = new SeededRandom((this.plan.seed * 2654435761 + 17) >>> 0);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let low = 0;
      const predelay = Math.round(0.025 * SAMPLE_RATE);
      for (let i = predelay; i < length; i++) {
        const t = i / length;
        const white = random.next() * 2 - 1;
        // A one-pole low-pass closing as the tail decays: the room darkens.
        const k = 0.6 - 0.5 * t;
        low += (white - low) * k;
        data[i] = low * Math.exp(-6.9 * t) * (1 - t);
      }
    }
    return buffer;
  }
}
