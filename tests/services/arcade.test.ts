import { describe, expect, it } from 'vitest';
import { COUNT_LIMITS } from '@/rules/limits';
import { ARCADE_KEY, ArcadeProgress } from '@/services/ArcadeProgress';
import { MemoryStorage } from '@/services/KeyValueStorage';
import { storageWith, storedJson } from './stored';

const IDS = ['puzzle-01', 'puzzle-02', 'puzzle-03'];

/** The Arcade records read back from this saved text. */
const arcadeFrom = (text: string) => new ArcadeProgress(storageWith(ARCADE_KEY, text));
/** A save of version 1 with these fields, as the game writes it. */
const saveOf = (fields: string) => `{"version":1,${fields}}`;

describe('ArcadeProgress', () => {
  it('keeps the best Endless score', () => {
    const arcade = new ArcadeProgress(new MemoryStorage());
    expect(arcade.recordEndless(1200)).toEqual({ best: 1200, newBest: true });
    expect(arcade.recordEndless(800)).toEqual({ best: 1200, newBest: false });
    expect(arcade.view.endless).toBe(1200);
  });

  it('opens puzzles one after the other and keeps the best result of each', () => {
    const arcade = new ArcadeProgress(new MemoryStorage());
    expect(arcade.isPuzzleOpen(IDS, 'puzzle-01')).toBe(true);
    expect(arcade.isPuzzleOpen(IDS, 'puzzle-02')).toBe(false);
    expect(arcade.recordPuzzle('puzzle-01', 2, 4)).toBe(true);
    expect(arcade.recordPuzzle('puzzle-01', 3, 3)).toBe(false);
    expect(arcade.recordPuzzle('puzzle-01', 1, 5)).toBe(false);
    expect(arcade.puzzle('puzzle-01')).toEqual({ stars: 3, shots: 3 });
    expect(arcade.isPuzzleOpen(IDS, 'puzzle-02')).toBe(true);
    expect(arcade.puzzlesSolved).toBe(1);
  });

  it('counts only the first attempt at the puzzle of the day', () => {
    const arcade = new ArcadeProgress(new MemoryStorage());
    expect(arcade.recordDailyPuzzle('20261012', false, 5)).toBe(true);
    expect(arcade.recordDailyPuzzle('20261012', true, 4)).toBe(false);
    expect(arcade.dailyPuzzle('20261012')).toEqual({ won: false, shots: 5 });
  });

  it('keeps the best score of each song and counts duels won', () => {
    const arcade = new ArcadeProgress(new MemoryStorage());
    expect(arcade.recordSong('pulse', 900)).toEqual({ best: 900, newBest: false });
    expect(arcade.recordSong('pulse', 1500)).toEqual({ best: 1500, newBest: true });
    expect(arcade.song('drive')).toBeUndefined();
    expect(arcade.recordDuel('hard')).toBe(1);
    expect(arcade.recordDuel('hard')).toBe(2);
    expect(arcade.duelsWon('easy')).toBe(0);
  });

  it('saves and restores', () => {
    const storage = new MemoryStorage();
    const arcade = new ArcadeProgress(storage);
    arcade.recordEndless(3000);
    arcade.recordPuzzle('puzzle-02', 3, 2);
    arcade.recordSong('rush', 700);
    arcade.recordDuel('easy');
    expect(storedJson(storage, ARCADE_KEY)).toMatchObject({ version: 1, endless: 3000 });
    const restored = new ArcadeProgress(storage);
    expect(restored.view.endless).toBe(3000);
    expect(restored.puzzle('puzzle-02')).toEqual({ stars: 3, shots: 2 });
    expect(restored.song('rush')).toBe(700);
    expect(restored.duelsWon('easy')).toBe(1);
  });

  it('reads the records every version wrote since 1.0.0', () => {
    const arcade = arcadeFrom(
      saveOf(
        '"endless":12840,"puzzles":{"puzzle-01":{"stars":3,"shots":4}},' +
          '"dailyPuzzles":{"20261012":{"won":true,"shots":6}},' +
          '"songs":{"pulse":4200,"rush":0},"duels":{"hard":2}',
      ),
    );
    expect(arcade.view).toEqual({
      endless: 12840,
      puzzles: { 'puzzle-01': { stars: 3, shots: 4 } },
      dailyPuzzles: { '20261012': { won: true, shots: 6 } },
      songs: { pulse: 4200, rush: 0 },
      duels: { hard: 2 },
    });
  });
});

describe('ArcadeProgress reads a tampered save field by field', () => {
  it('repairs what it does not recognise and keeps the rest', () => {
    const repaired = arcadeFrom(
      saveOf(
        '"endless":-5,"puzzles":{"puzzle-01":{"stars":9,"shots":2},"hack":{"stars":3}},' +
          '"dailyPuzzles":{"today":{"won":true}},"songs":{"pulse":"a lot","unknown":5},' +
          '"duels":{"hard":3,"extreme":9}',
      ),
    );
    expect(repaired.view.endless).toBe(0);
    expect(repaired.puzzle('puzzle-01')).toEqual({ stars: 1, shots: 2 });
    expect(repaired.puzzlesSolved).toBe(1);
    expect(repaired.view.dailyPuzzles).toEqual({});
    expect(repaired.song('pulse')).toBe(0);
    expect(repaired.duelsWon('hard')).toBe(3);
  });

  it.each([
    { name: 'a score as text', endless: '"3000"' },
    { name: 'a score past any number', endless: '1e999' },
    { name: 'a score in a list', endless: '[3000]' },
    { name: 'a score past the exact integers', endless: '9007199254740993' },
  ])('counts no Endless record for $name, and keeps the puzzles', ({ endless }) => {
    const arcade = arcadeFrom(saveOf(`"endless":${endless},"puzzles":{"puzzle-02":{"stars":2}}`));
    expect(arcade.view.endless).toBe(0);
    expect(arcade.puzzle('puzzle-02')).toEqual({ stars: 2, shots: 0 });
  });

  it.each([
    { name: 'a month that does not exist', day: '20261399' },
    { name: 'the 30th of February', day: '20260230' },
    { name: 'a date with dashes', day: '2026-10-12' },
    { name: 'full-width digits', day: '２０２６１０１２' },
    { name: 'nine digits', day: '202610120' },
    { name: 'the prototype key', day: '__proto__' },
  ])('leaves out a puzzle of the day saved under $name', ({ day }) => {
    const arcade = arcadeFrom(
      saveOf(`"dailyPuzzles":{"${day}":{"won":true,"shots":3},"20261012":{"won":false,"shots":8}}`),
    );
    expect(arcade.view.dailyPuzzles).toEqual({ '20261012': { won: false, shots: 8 } });
  });

  it.each([
    { name: 'a duel count as text', duels: '{"hard":"3"}' },
    { name: 'a negative count', duels: '{"hard":-3}' },
    { name: 'a fraction', duels: '{"hard":2.5}' },
    { name: 'a list', duels: '[3]' },
  ])('counts no duel won for $name', ({ duels }) => {
    expect(arcadeFrom(saveOf(`"duels":${duels}`)).duelsWon('hard')).toBe(0);
  });

  it('reads no puzzle of the day from a save holding more days than a hundred years', () => {
    const days = Array.from({ length: COUNT_LIMITS.days + 1 }, (_, i) => `"d${i}":{}`);
    expect(arcadeFrom(saveOf(`"dailyPuzzles":{${days.join(',')}}`)).view.dailyPuzzles).toEqual({});
  });
});

describe('ArcadeProgress keeps a save it cannot read', () => {
  it.each([
    { name: 'another version', text: '{"version":99,"endless":5}' },
    { name: 'a text cut short', text: '{"version":1,"endless":5' },
    { name: 'a list', text: '[]' },
  ])('starts afresh on $name, and keeps it stored as it is', ({ text }) => {
    const storage = storageWith(ARCADE_KEY, text);
    expect(new ArcadeProgress(storage).view.endless).toBe(0);
    expect(storage.get(ARCADE_KEY)).toBe(text);
  });
});
