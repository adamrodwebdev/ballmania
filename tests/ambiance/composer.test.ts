import { describe, expect, it } from 'vitest';
import { THEMES } from '@/audio/score';
import { Composer, OPENING, arcEnergy } from '../../marketing/ambiance/Composer';
import { Mood } from '../../marketing/ambiance/Mood';
import {
  allNotes,
  MIN_ATTACK,
  sectionNotes,
  serialize,
  windowSignatures,
} from '../../marketing/ambiance/Score';
import moods from '../../marketing/ambiance/moods.json';

const MOODS = Mood.parseAll(moods);
const mood = (id: string) => MOODS.find((m) => m.id === id)!;
const abyss = mood('abyss-sleep');
const HOUR = 3600;
const IDS = MOODS.map((m) => m.id);

describe('the plan of an ambience', () => {
  it('is the same for the same seed and differs for another', () => {
    const once = serialize(allNotes(new Composer(abyss).plan(HOUR, 1)));
    expect(serialize(allNotes(new Composer(abyss).plan(HOUR, 1)))).toBe(once);
    expect(serialize(allNotes(new Composer(abyss).plan(HOUR, 2)))).not.toBe(once);
  });

  it.each(IDS.flatMap((id) => [1, 7, 42].map((seed) => [id, seed] as const)))(
    '%s, seed %i: sections of two to five minutes covering the whole hour',
    (id, seed) => {
      const plan = new Composer(mood(id)).plan(HOUR, seed);
      const total = plan.sections.reduce((sum, s) => sum + s.seconds, 0);
      expect(total).toBeCloseTo(HOUR, 6);
      for (const section of plan.sections) {
        expect(section.seconds).toBeGreaterThanOrEqual(120 - plan.barSeconds);
        expect(section.seconds).toBeLessThanOrEqual(300 + plan.barSeconds);
      }
    },
  );

  it.each(IDS)(
    '%s: each section changes two things or more from the one before, the last returns to the first',
    (id) => {
      const plan = new Composer(mood(id)).plan(HOUR, 3);
      for (const section of plan.sections.slice(1, -1)) {
        const before = plan.sections[section.index - 1]!;
        const changes = [
          section.progression !== before.progression || section.shift !== before.shift,
          section.voicing !== before.voicing,
          section.voices.join() !== before.voices.join(),
          Math.round(section.density * 4) !== Math.round(before.density * 4),
          Math.round(section.brightness / 250) !== Math.round(before.brightness / 250),
        ].filter(Boolean).length;
        expect(changes, `section ${section.index}`).toBeGreaterThanOrEqual(2);
      }
      const first = plan.sections[0]!;
      const last = plan.sections[plan.sections.length - 1]!;
      expect([last.progression, last.shift, last.voicing, last.voices]).toEqual([
        first.progression,
        first.shift,
        first.voicing,
        first.voices,
      ]);
    },
  );

  it.each(IDS)('%s: never plays the same five minutes twice', (id) => {
    const plan = new Composer(mood(id)).plan(HOUR, 1);
    const windows = windowSignatures(allNotes(plan), plan, 300);
    expect(windows.length).toBeGreaterThan(500);
    expect(new Set(windows).size).toBe(windows.length);
  });

  it.each(IDS)('%s: only its own voices, no attack under 40 ms, a fixed tempo', (id) => {
    const m = mood(id);
    const plan = new Composer(m).plan(HOUR, 5);
    expect(plan.barSeconds).toBeCloseTo(240 / m.bpm, 9);
    const notes = allNotes(plan);
    expect(notes.filter((n) => !m.voices.includes(n.voice))).toEqual([]);
    expect(Math.min(...notes.map((n) => n.attack))).toBeGreaterThanOrEqual(MIN_ATTACK);
    expect(notes.filter((n) => n.level <= 0 || n.level > 1)).toEqual([]);
  });

  it('keeps its harmony on the theme of the game', () => {
    const plan = new Composer(abyss).plan(HOUR, 1);
    expect(plan.root).toBe(THEMES.abyss.root);
    expect(plan.sections[0]!.chords).toEqual(THEMES.abyss.chords);
  });

  it('gives a section the same notes whether it is rendered alone or with the rest', () => {
    const plan = new Composer(abyss).plan(HOUR, 9);
    expect(serialize(allNotes(plan))).toContain(serialize(sectionNotes(plan, 4)));
  });

  it('opens richest, then calms down to half by mid-video, to sleep', () => {
    expect(arcEnergy('descending', 60, HOUR)).toBe(1);
    expect(arcEnergy('descending', OPENING + 1, HOUR)).toBeGreaterThan(0.99);
    expect(arcEnergy('descending', HOUR / 2, HOUR)).toBe(0.5);
    expect(arcEnergy('descending', HOUR - 10, HOUR)).toBe(0.5);
    const plan = new Composer(abyss).plan(HOUR, 1);
    expect(plan.sections[0]!.energy).toBeGreaterThan(plan.sections.at(-2)!.energy);
  });

  it('plans a one-minute smoke test as a single section', () => {
    const plan = new Composer(abyss).plan(60, 1);
    expect(plan.sections.map((s) => s.seconds)).toEqual([60]);
  });

  it('never films two sections in a row with the same shot', () => {
    const plan = new Composer(abyss).plan(HOUR, 1);
    const repeats = plan.sections.filter(
      (s) => s.index > 0 && s.shot === plan.sections[s.index - 1]!.shot,
    );
    expect(repeats).toEqual([]);
  });
});
