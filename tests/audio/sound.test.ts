import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HUSH } from '@/audio/MusicPlayer';
import { defeatMotif, THEMES } from '@/audio/score';
import { SoundEngine } from '@/audio/SoundEngine';
import { FakeAudioContext } from './FakeAudioContext';

/** A sound engine on a fake sound card, the Nebula's music playing. */
const engine = (volume = 0.7, music = 0.6) => {
  const ctx = new FakeAudioContext();
  const sound = new SoundEngine(volume, () => ctx.asContext, music);
  sound.playMusic('nebula');
  sound.unlock();
  return { ctx, sound };
};

/** Oscillators the music makes over the next seconds of audio, the clock moving tick by tick. */
const musicOver = (ctx: FakeAudioContext, seconds = 1) => {
  const before = ctx.oscillators.length;
  for (let t = 0; t < seconds; t += 0.025) {
    ctx.currentTime += 0.025;
    vi.advanceTimersByTime(25);
  }
  return ctx.oscillators.length - before;
};

/** The Nebula's arpeggio notes (glass, high) played over the next seconds: its tempo. */
const arpeggioOver = (ctx: FakeAudioContext, seconds: number) => {
  const before = ctx.oscillators.length;
  musicOver(ctx, seconds);
  return ctx.oscillators
    .slice(before)
    .filter((oscillator) => oscillator.type === 'sine' && (oscillator.frequency.first ?? 0) >= 500)
    .length;
};

/** The defeat's sound (v1.8.1, spec § 3.17). */
describe('a defeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("silences the music, then sings its motif in the world's key", () => {
    const { ctx, sound } = engine();
    expect(musicOver(ctx)).toBeGreaterThan(0);
    const before = ctx.oscillators.length;
    sound.lose();
    const sung = ctx.oscillators
      .slice(before)
      .filter((oscillator) => oscillator.type === 'triangle');
    const motif = defeatMotif(THEMES.nebula.root);
    expect(sung.map((oscillator) => oscillator.frequency.first)).toEqual(
      motif.map((note) => note.frequency),
    );
    expect(sung[0]!.startedAt).toBeCloseTo(ctx.currentTime + HUSH);
    // Then silence: the music no longer plays.
    expect(musicOver(ctx, 2)).toBe(0);
  });

  it('brings the music back with the next game', () => {
    const { ctx, sound } = engine();
    sound.lose();
    musicOver(ctx, 2);
    sound.restoreMusic();
    expect(musicOver(ctx)).toBeGreaterThan(0);
  });

  it('keeps its silence when the music is switched off and on again', () => {
    const { ctx, sound } = engine();
    sound.lose();
    sound.setMusicVolume(0);
    sound.setMusicVolume(0.6);
    expect(musicOver(ctx, 2)).toBe(0);
    sound.restoreMusic();
    expect(musicOver(ctx)).toBeGreaterThan(0);
  });

  it('sings in the key of a song the music does not play (Rhythm mode)', () => {
    const { ctx, sound } = engine();
    sound.playMusic(null);
    const before = ctx.oscillators.length;
    sound.lose(55);
    const sung = ctx.oscillators
      .slice(before)
      .filter((oscillator) => oscillator.type === 'triangle');
    expect(sung.map((oscillator) => oscillator.frequency.first)).toEqual(
      defeatMotif(55).map((note) => note.frequency),
    );
  });

  it('keeps quiet with the sound off, and brings no music back with the music off', () => {
    const { ctx, sound } = engine(0, 0);
    const before = ctx.oscillators.length;
    sound.lose();
    sound.restoreMusic();
    musicOver(ctx, 2);
    expect(ctx.oscillators.length).toBe(before);
  });
});

/** The tension music (v1.8.1, spec § 3.17): its tempo, followed once a step. */
describe('the tension music', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays faster near the hole, and calms down as the chain goes back', () => {
    const { ctx, sound } = engine();
    const calm = arpeggioOver(ctx, 10);
    sound.setDanger(1);
    expect(arpeggioOver(ctx, 10)).toBeGreaterThan(calm * 1.08);
    sound.setDanger(0);
    musicOver(ctx, 30);
    expect(arpeggioOver(ctx, 10)).toBeLessThan(calm * 1.02);
  });
});
