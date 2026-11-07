import { describe, expect, it } from 'vitest';
import {
  ClickDetector,
  fadeAt,
  fromDecibels,
  gainTo,
  Limiter,
  LoudnessMeter,
  SAMPLE_RATE,
  SilenceDetector,
  SoundAnalyzer,
  toDecibels,
  TruePeak,
} from '../../marketing/ambiance/Loudness';

const sine = (seconds: number, frequency: number, amplitude: number, phase = 0) => {
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < out.length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE + phase);
  }
  return out;
};

/** A pad as the factory plays it: a sine that rises over 50 ms (a sudden start is a click). */
const pad = (seconds: number, frequency: number, amplitude: number) => {
  const out = sine(seconds, frequency, amplitude);
  const rise = SAMPLE_RATE / 20;
  for (let i = 0; i < rise; i++) out[i] = out[i]! * (i / rise);
  return out;
};

const metered = (...parts: Float32Array[]) => {
  const meter = new LoudnessMeter();
  for (const part of parts) meter.push(part, part);
  return meter.reading();
};

describe('the loudness meter (EBU Tech 3341)', () => {
  it('reads a stereo 1 kHz sine at -23 dBFS as -23 LUFS', () => {
    expect(metered(sine(20, 1000, fromDecibels(-23))).integrated).toBeCloseTo(-23, 1);
  });

  it('reads a stereo 1 kHz sine at -33 dBFS as -33 LUFS', () => {
    expect(metered(sine(20, 1000, fromDecibels(-33))).integrated).toBeCloseTo(-33, 1);
  });

  it('reads -36, -23 then -36 dBFS for 10, 60 and 10 s as -23 LUFS, within 0.1 LU (case 3)', () => {
    const quiet = sine(10, 1000, fromDecibels(-36));
    const loud = sine(60, 1000, fromDecibels(-23));
    expect(Math.abs(metered(quiet, loud, quiet).integrated + 23)).toBeLessThanOrEqual(0.1);
  });

  it('reads a tone stepping by 10 dB as a range of about 10 LU (EBU Tech 3342)', () => {
    const { range } = metered(sine(20, 1000, fromDecibels(-30)), sine(20, 1000, fromDecibels(-20)));
    expect(range).toBeGreaterThan(9);
    expect(range).toBeLessThan(11);
  });
});

describe('the true peak', () => {
  it('finds the crest of a sine at a quarter of the rate sampled off its crest', () => {
    const peak = new TruePeak();
    for (const x of sine(1, SAMPLE_RATE / 4, 1, Math.PI / 4)) peak.step(x);
    expect(toDecibels(peak.highest)).toBeGreaterThan(-0.3);
    expect(toDecibels(peak.highest)).toBeLessThan(0.3);
  });
});

describe('the limiter', () => {
  it('keeps the true peak under its ceiling', () => {
    // Measured over the whole output: cutting it open would itself make a peak.
    const left = pad(2, 440, 1.2);
    const right = pad(2, 440, 1.2);
    new Limiter(fromDecibels(-2.5)).process(left, right);
    const peak = new TruePeak();
    for (const x of left) peak.step(x);
    expect(toDecibels(peak.highest)).toBeLessThan(-2.2);
  });

  it('leaves a quiet passage untouched, only delayed by its look-ahead', () => {
    const left = sine(1, 440, 0.1);
    const right = left.slice();
    const original = left.slice();
    new Limiter(fromDecibels(-2.5)).process(left, right);
    expect(left[240 + 1000]).toBeCloseTo(original[1000]!, 6);
  });
});

describe('the click detector', () => {
  it('hears a jump in a pad', () => {
    const clicked = pad(2, 220, 0.2);
    for (let i = SAMPLE_RATE; i < clicked.length; i++) clicked[i] = clicked[i]! + 0.05;
    const detector = new ClickDetector();
    detector.push(clicked, clicked);
    expect(detector.clicks).toHaveLength(1);
    expect(detector.clicks[0]).toBeCloseTo(1, 2);
  });

  it('hears nothing in a clean pad', () => {
    const clean = pad(2, 220, 0.2);
    const detector = new ClickDetector();
    detector.push(clean, clean);
    expect(detector.clicks).toEqual([]);
  });
});

describe('the silence detector', () => {
  it('names the silent seconds, leaving out the first and last two', () => {
    const tone = sine(10, 220, 0.1);
    tone.fill(0, 0, SAMPLE_RATE);
    tone.fill(0, 5 * SAMPLE_RATE, 6 * SAMPLE_RATE);
    const detector = new SilenceDetector();
    detector.push(tone, tone);
    expect(detector.silences(10)).toEqual([5]);
  });
});

describe('the sound report', () => {
  it('loses nothing in mono when both channels agree', () => {
    const tone = sine(10, 440, 0.1);
    const analyzer = new SoundAnalyzer();
    analyzer.push(tone, tone);
    expect(analyzer.report().monoLoss).toBeCloseTo(0, 1);
  });

  it('loses 3 dB in mono when only one channel plays', () => {
    const tone = sine(10, 440, 0.1);
    const analyzer = new SoundAnalyzer();
    analyzer.push(tone, new Float32Array(tone.length));
    expect(analyzer.report().monoLoss).toBeCloseTo(3, 0);
  });

  it('brings a mix to its target by a gain', () => {
    expect(toDecibels(gainTo(-24, -18))).toBeCloseTo(6, 9);
  });

  it('fades in and out with equal power', () => {
    const fade = { in: 10, out: 20 };
    expect(fadeAt(0, 100, fade)).toBe(0);
    expect(fadeAt(50, 100, fade)).toBe(1);
    expect(fadeAt(5, 100, fade)).toBeCloseTo(Math.SQRT1_2, 9);
    expect(fadeAt(100, 100, fade)).toBeCloseTo(0, 9);
  });
});

describe('a sudden start', () => {
  it('counts as a click, which is why every note and the video fade in', () => {
    const abrupt = sine(1, 220, 0.2);
    const detector = new ClickDetector();
    detector.push(abrupt, abrupt);
    expect(detector.clicks).toHaveLength(1);
    expect(detector.clicks[0]).toBeLessThan(0.001);
  });
});
