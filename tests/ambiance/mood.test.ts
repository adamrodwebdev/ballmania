import { describe, expect, it } from 'vitest';
import { InvalidMood, Mood } from '../../marketing/ambiance/Mood';
import moods from '../../marketing/ambiance/moods.json';

type Raw = Record<string, unknown>;

const valid = (): Raw => structuredClone(moods[0]!);

const fieldAtFault = (data: unknown): string => {
  try {
    Mood.parse(data);
  } catch (error) {
    if (error instanceof InvalidMood) return error.field;
    throw error;
  }
  return '(accepted)';
};

describe('the moods', () => {
  it('reads every mood of the file, one per world', () => {
    const all = Mood.parseAll(moods);
    expect(all.map((mood) => mood.world).sort()).toEqual([
      'abyss',
      'jewel',
      'nebula',
      'neon',
      'singularity',
      'volcano',
    ]);
    expect(all.find((mood) => mood.id === 'abyss-sleep')?.loudness).toBe(-18);
  });

  it.each<[string, (m: Raw) => void, string]>([
    ['a missing field', (m) => delete m.bpm, 'bpm'],
    ['an unknown field', (m) => (m.drums = true), 'drums'],
    ['a tempo below 56', (m) => (m.bpm = 50), 'bpm'],
    ['a tempo above 80', (m) => (m.bpm = 92), 'bpm'],
    ['a section under two minutes', (m) => (m.sections = { min: 60, max: 200 }), 'sections.min'],
    ['a section over five minutes', (m) => (m.sections = { min: 150, max: 400 }), 'sections.max'],
    ['sections whose min exceeds max', (m) => (m.sections = { min: 280, max: 200 }), 'sections'],
    ['an unknown theme', (m) => (m.theme = 'disco'), 'theme'],
    ['an unknown voice', (m) => (m.voices = ['pad', 'kick']), 'voices[1]'],
    ['voices without a pad', (m) => (m.voices = ['glass']), 'voices'],
    ['a voice twice', (m) => (m.voices = ['pad', 'pad']), 'voices'],
    ['a loudness too high', (m) => (m.loudness = -9), 'loudness'],
    ['a fade too long', (m) => (m.fade = { in: 20, out: 90 }), 'fade.out'],
    ['an unknown world', (m) => (m.world = 'desert'), 'world'],
    ['an id with spaces', (m) => (m.id = 'Abyss sleep'), 'id'],
    ['a caption that is not a flag', (m) => (m.caption = 'yes'), 'caption'],
    ['a missing French name', (m) => (m.name = { en: 'Abyss' }), 'name.fr'],
    ['particles above 1', (m) => (m.particles = 1.5), 'particles'],
  ])('refuses %s and names the field', (_, spoil, field) => {
    const mood = valid();
    spoil(mood);
    expect(fieldAtFault(mood)).toBe(field);
  });

  it('accepts the first mood of the file as it is', () => {
    expect(fieldAtFault(valid())).toBe('(accepted)');
  });

  it('refuses two moods with the same id', () => {
    expect(() => Mood.parseAll([moods[0], moods[0]])).toThrow(/used twice/);
  });
});
