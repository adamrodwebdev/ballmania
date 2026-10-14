import { describe, expect, it } from 'vitest';
import { eventsAt, stepSeconds, STEPS_PER_BAR, THEMES, type MusicThemeId } from '@/audio/score';
import { WORLDS } from '@/levels/campaign';

describe('the score', () => {
  it('has a theme for the menus and for every world, each a loop of whole bars', () => {
    const ids = Object.keys(THEMES) as MusicThemeId[];
    expect(ids).toContain('title');
    for (const world of WORLDS) expect(ids).toContain(world.id);
    for (const theme of Object.values(THEMES)) {
      for (const pattern of [
        theme.bass.pattern,
        theme.arp.pattern,
        theme.kick,
        theme.snare,
        theme.hat,
      ]) {
        expect(pattern).toHaveLength(STEPS_PER_BAR);
        for (const level of pattern) expect(level).toBeGreaterThanOrEqual(0);
      }
      expect(theme.chords.length).toBeGreaterThan(0);
      expect(theme.bpm).toBeGreaterThan(50);
      expect(theme.bpm).toBeLessThan(140);
    }
  });

  it('starts a chord on the first step of each bar and loops the progression', () => {
    const theme = THEMES.nebula;
    const first = eventsAt(theme, 0).pad;
    expect(first?.notes).toHaveLength(theme.chords[0]!.length);
    expect(first?.notes[0]).toBeCloseTo(theme.root);
    expect(first?.seconds).toBeCloseTo(stepSeconds(theme) * STEPS_PER_BAR);
    expect(eventsAt(theme, 1).pad).toBeNull();
    const loop = theme.chords.length * STEPS_PER_BAR;
    expect(eventsAt(theme, loop).pad).toEqual(first);
    expect(eventsAt(theme, STEPS_PER_BAR).pad).not.toEqual(first);
  });

  it('plays the bass an octave down and climbs the chord with the arpeggio', () => {
    const theme = THEMES.nebula;
    expect(eventsAt(theme, 0).bass?.note).toBeCloseTo(theme.root / 2);
    const notes = [0, 1, 2, 3].map((step) => eventsAt(theme, step).arp?.note ?? 0);
    expect(notes[1]).toBeGreaterThan(notes[0]!);
    expect(notes[2]).toBeGreaterThan(notes[1]!);
  });

  it('brings drums into a calm theme as the danger rises', () => {
    const calm = THEMES.abyss;
    const quiet = Array.from({ length: STEPS_PER_BAR }, (_, step) => eventsAt(calm, step));
    expect(quiet.every((events) => events.kick === 0 && events.hat === 0)).toBe(true);
    const tense = Array.from({ length: STEPS_PER_BAR }, (_, step) => eventsAt(calm, step, 1));
    expect(tense.filter((events) => events.kick > 0)).toHaveLength(4);
    expect(tense.filter((events) => events.hat > 0)).toHaveLength(8);
  });
});
