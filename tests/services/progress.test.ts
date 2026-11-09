import { describe, expect, it } from 'vitest';
import { COUNT_LIMITS, SAVE_LIMITS } from '@/rules/limits';
import { CampaignProgress, PROGRESS_KEY } from '@/services/CampaignProgress';
import { MemoryStorage } from '@/services/KeyValueStorage';
import { storageWith, storedJson } from './stored';

const ORDER = ['w-01', 'w-02', 'w-03'];

/** The campaign read back from this saved text. */
const levelsFrom = (text: string) => new CampaignProgress(storageWith(PROGRESS_KEY, text)).levels;
/** A save of version 1 holding these levels, as the game writes it. */
const saveOf = (levels: string) => `{"version":1,"levels":{${levels}}}`;

describe('CampaignProgress', () => {
  it('opens levels one after the other', () => {
    const progress = new CampaignProgress(new MemoryStorage());
    expect(progress.isUnlocked(ORDER, 'w-01')).toBe(true);
    expect(progress.isUnlocked(ORDER, 'w-02')).toBe(false);
    progress.record('w-01', 500, 1);
    expect(progress.isUnlocked(ORDER, 'w-02')).toBe(true);
    expect(progress.isUnlocked(ORDER, 'w-03')).toBe(false);
    expect(progress.isUnlocked(ORDER, 'unknown')).toBe(false);
  });

  it('keeps the best stars and score, and says what was gained', () => {
    const progress = new CampaignProgress(new MemoryStorage());
    expect(progress.record('w-01', 800, 2)).toEqual({
      stars: 2,
      best: 800,
      newBest: false,
      starsGained: 2,
    });
    expect(progress.record('w-01', 600, 1)).toEqual({
      stars: 2,
      best: 800,
      newBest: false,
      starsGained: 0,
    });
    expect(progress.record('w-01', 1200, 3)).toEqual({
      stars: 3,
      best: 1200,
      newBest: true,
      starsGained: 1,
    });
    expect(progress.totalStars(ORDER)).toBe(3);
  });

  it('saves a versioned record and reads it back', () => {
    const storage = new MemoryStorage();
    new CampaignProgress(storage).record('w-02', 300, 1);
    expect(storedJson(storage, PROGRESS_KEY)).toEqual({
      version: 1,
      levels: { 'w-02': { stars: 1, best: 300 } },
    });
    expect(new CampaignProgress(storage).get('w-02')).toEqual({ stars: 1, best: 300 });
  });

  it('reads every save the game ever wrote, from 1.0.0 on, scores with decimals included', () => {
    const save = saveOf('"nebula-01":{"stars":3,"best":4210},"neon-12":{"stars":1,"best":24.8}');
    expect(levelsFrom(save)).toEqual({
      'nebula-01': { stars: 3, best: 4210 },
      'neon-12': { stars: 1, best: 24.8 },
    });
  });
});

describe('CampaignProgress reads a tampered save field by field', () => {
  it.each([
    { name: 'stars as text', level: '{"stars":"3","best":90}' },
    { name: 'no stars', level: '{"best":90}' },
    { name: 'four stars', level: '{"stars":4,"best":90}' },
    { name: 'half a star', level: '{"stars":1.5,"best":90}' },
    { name: 'stars in a list', level: '{"stars":[3],"best":90}' },
  ])('keeps a level won, with one star, when it has $name', ({ level }) => {
    const levels = levelsFrom(saveOf(`"nebula-01":${level}`));
    expect(levels['nebula-01']).toEqual({ stars: 1, best: 90 });
  });

  it.each([
    { name: 'a score as text', best: '"90"' },
    { name: 'a negative score', best: '-3' },
    { name: 'a score past any number', best: '1e999' },
    { name: 'a score past the exact integers', best: '9007199254740992' },
    { name: 'a null score', best: 'null' },
  ])('keeps the stars of a level with $name, and no score', ({ best }) => {
    const levels = levelsFrom(saveOf(`"nebula-01":{"stars":2,"best":${best}}`));
    expect(levels['nebula-01']).toEqual({ stars: 2, best: 0 });
  });

  it.each([
    { name: 'the prototype key', id: '__proto__' },
    { name: 'an inherited name', id: 'constructor' },
    { name: 'a method name', id: 'toString' },
    { name: 'a name without its number', id: 'nebula' },
    { name: 'capitals', id: 'NEBULA-01' },
    { name: 'a hidden character', id: 'nebula-0\\u200b1' },
    { name: 'outer spaces', id: ' nebula-01' },
    { name: 'markup', id: '<b>nebula-01</b>' },
  ])('leaves out a level saved under $name, and keeps the others', ({ id }) => {
    const save = saveOf(`"${id}":{"stars":3,"best":1},"nebula-02":{"stars":2,"best":5}`);
    expect(levelsFrom(save)).toEqual({ 'nebula-02': { stars: 2, best: 5 } });
  });

  it('never takes a level named __proto__ for the prototype of the others', () => {
    const levels = levelsFrom(saveOf('"__proto__":{"stars":3,"best":1}'));
    expect(Object.getPrototypeOf(levels)).toBe(Object.prototype);
  });

  it.each([
    { name: 'a text', level: '"won"' },
    { name: 'a number', level: '3' },
    { name: 'a list', level: '[3,90]' },
    { name: 'null', level: 'null' },
  ])('leaves out a level saved as $name, and keeps the others', ({ level }) => {
    const levels = levelsFrom(saveOf(`"nebula-01":${level},"nebula-02":{"stars":2,"best":5}`));
    expect(levels).toEqual({ 'nebula-02': { stars: 2, best: 5 } });
  });

  it('reads no level from a save that holds more of them than any campaign', () => {
    const many = Array.from({ length: COUNT_LIMITS.levels + 1 }, (_, i) => `"w-${i}":{}`);
    expect(levelsFrom(saveOf(many.join(',')))).toEqual({});
  });
});

describe('CampaignProgress keeps a save it cannot read', () => {
  const won = saveOf('"nebula-01":{"stars":3,"best":4210}');
  const padded = saveOf(
    `"nebula-01":{"stars":3,"best":1,"pad":"${'x'.repeat(SAVE_LIMITS.progress)}"}`,
  );

  it.each([
    { name: 'another version', text: '{"version":2,"levels":{"nebula-01":{"stars":3,"best":1}}}' },
    { name: 'its version as text', text: '{"version":"1","levels":{}}' },
    { name: 'no version', text: '{"levels":{"nebula-01":{"stars":3,"best":1}}}' },
    { name: 'a text cut short', text: won.slice(0, -2) },
    { name: 'a list', text: '[{"version":1}]' },
    { name: 'a number', text: '42' },
    { name: 'a text longer than any campaign', text: padded },
  ])('starts afresh on $name, and keeps it stored as it is', ({ text }) => {
    const storage = storageWith(PROGRESS_KEY, text);
    expect(new CampaignProgress(storage).levels).toEqual({});
    expect(storage.get(PROGRESS_KEY)).toBe(text);
  });

  it('saves the first level the player wins over it', () => {
    const storage = storageWith(PROGRESS_KEY, '{"version":2}');
    new CampaignProgress(storage).record('nebula-01', 500, 2);
    expect(storedJson(storage, PROGRESS_KEY)).toEqual({
      version: 1,
      levels: { 'nebula-01': { stars: 2, best: 500 } },
    });
  });
});
