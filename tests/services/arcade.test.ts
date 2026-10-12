import { describe, expect, it } from 'vitest';
import { ARCADE_KEY, ArcadeProgress } from '@/services/ArcadeProgress';
import { MemoryStorage, readJson } from '@/services/KeyValueStorage';

const IDS = ['puzzle-01', 'puzzle-02', 'puzzle-03'];

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

  it('saves and restores; ignores what it does not recognise', () => {
    const storage = new MemoryStorage();
    const arcade = new ArcadeProgress(storage);
    arcade.recordEndless(3000);
    arcade.recordPuzzle('puzzle-02', 3, 2);
    arcade.recordSong('rush', 700);
    arcade.recordDuel('easy');
    expect(readJson(storage, ARCADE_KEY)).toMatchObject({ version: 1, endless: 3000 });
    const restored = new ArcadeProgress(storage);
    expect(restored.view.endless).toBe(3000);
    expect(restored.puzzle('puzzle-02')).toEqual({ stars: 3, shots: 2 });
    expect(restored.song('rush')).toBe(700);
    expect(restored.duelsWon('easy')).toBe(1);

    storage.set(
      ARCADE_KEY,
      JSON.stringify({
        version: 1,
        endless: -5,
        puzzles: { 'puzzle-01': { stars: 9, shots: 2 }, hack: { stars: 3 } },
        dailyPuzzles: { today: { won: true } },
        songs: { pulse: 'a lot', unknown: 5 },
        duels: { hard: 3, extreme: 9 },
      }),
    );
    const repaired = new ArcadeProgress(storage);
    expect(repaired.view.endless).toBe(0);
    expect(repaired.puzzlesSolved).toBe(0);
    expect(repaired.view.dailyPuzzles).toEqual({});
    expect(repaired.song('pulse')).toBe(0);
    expect(repaired.duelsWon('hard')).toBe(3);
    storage.set(ARCADE_KEY, JSON.stringify({ version: 99, endless: 5 }));
    expect(new ArcadeProgress(storage).view.endless).toBe(0);
  });
});
