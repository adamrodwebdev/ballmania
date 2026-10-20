import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { Game } from '@/engine/Game';
import { DUEL_DIFFICULTIES, duelLevel } from '@/levels/arcade/duel';
import { endlessLevel } from '@/levels/arcade/endless';
import { ARCADE_MODES } from '@/levels/arcade/modes';
import { PuzzleSolver } from '@/levels/arcade/PuzzleSolver';
import { dailyPuzzle, PUZZLES, puzzleLevel, puzzleStars } from '@/levels/arcade/puzzles';
import { rhythmLevel, SONGS } from '@/levels/arcade/rhythm';
import { WORLDS } from '@/levels/campaign';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { FRAMES } from '@/levels/tracks';
import { playDefinition } from './bot';

/** Runs of one colour in the chain, tail first: [colour, index of their first ball]. */
const runsOf = (game: Game) => {
  const runs: [number, number][] = [];
  game.chains[0]!.balls.forEach((ball, index) => {
    if (runs[runs.length - 1]?.[0] !== ball.tone) runs.push([ball.tone, index]);
  });
  return runs;
};

describe('Arcade modes', () => {
  it('open one by one with the first four worlds', () => {
    expect(ARCADE_MODES.map((mode) => mode.id)).toEqual(['endless', 'puzzle', 'rhythm', 'duel']);
    expect(ARCADE_MODES.map((mode) => mode.unlockedBy)).toEqual(
      WORLDS.slice(0, 4).map((world) => world.id),
    );
  });
});

describe('puzzles', () => {
  it('are thirty, each with its exact par and a few spare shots', () => {
    expect(PUZZLES).toHaveLength(30);
    expect(new Set(PUZZLES.map((puzzle) => puzzle.id)).size).toBe(30);
    for (const puzzle of PUZZLES) {
      expect(new PuzzleSolver().minimumShots(puzzle.sequence), puzzle.id).toBe(puzzle.par);
      expect(puzzle.shots - puzzle.par).toBe(puzzle.number <= 10 ? 2 : 1);
      // Nothing explodes before the first shot, and three colours at least.
      const runs = puzzle.sequence.join('').match(/(\d)\1*/g)!;
      expect(Math.max(...runs.map((run) => run.length))).toBeLessThan(3);
      expect(new Set(puzzle.sequence).size).toBeGreaterThanOrEqual(3);
      // Chain reactions make the puzzle: it takes fewer shots than run by run.
      expect(PuzzleSolver.naiveShots(puzzle.sequence)).toBeGreaterThan(puzzle.par);
    }
    const average = (from: number) =>
      PUZZLES.slice(from, from + 10).reduce((sum, puzzle) => sum + puzzle.par, 0) / 10;
    expect(average(10)).toBeGreaterThan(average(0));
    expect(average(20)).toBeGreaterThan(average(10));
  });

  // On every board shape: the spiral stretches with the screen, and no ring may hide a target.
  it.each(
    Object.values(FRAMES).flatMap((frame) =>
      PUZZLES.map((puzzle) => [puzzle.id, frame.kind, puzzle, frame] as const),
    ),
  )('%s is solved by the game itself in par shots on the %s board', (_, __, puzzle, frame) => {
    const game = new Game(
      toLevelSetup(puzzleLevel(puzzle, frame)),
      SeededRandom.fromString(puzzle.id),
    );
    const chain = game.chains[0]!;
    for (const move of new PuzzleSolver().solution(puzzle.sequence)) {
      const [tone, index] = runsOf(game)[move]!;
      for (let i = 0; i < 6 && game.shooter.current !== tone; i++) game.swap();
      game.aimAt(chain.positionOf(chain.balls[index]!));
      expect(game.fire()).toBe(true);
      // Let the shot land and every chain reaction play out.
      for (let i = 0; i < 240 && (game.projectiles.length > 0 || !chain.settled); i++) {
        game.update(1 / 60);
      }
      game.update(0.2);
    }
    expect(game.state).toBe('won');
    expect(game.summary().shots).toBe(puzzle.par);
  });

  it('gives everyone the same puzzle of the day, of middle difficulty', () => {
    const today = dailyPuzzle('20261012');
    expect(dailyPuzzle('20261012')).toEqual(today);
    expect(today.par).toBeGreaterThanOrEqual(4);
    expect(today.par).toBeLessThanOrEqual(6);
    expect(today.shots).toBe(today.par + 1);
    expect(new PuzzleSolver().minimumShots(today.sequence)).toBe(today.par);
    expect(dailyPuzzle('20261013').sequence).not.toEqual(today.sequence);
  });

  it('awards three stars at par, two with one more shot', () => {
    const puzzle = PUZZLES[0]!;
    expect(puzzleStars(puzzle, puzzle.par, true)).toBe(3);
    expect(puzzleStars(puzzle, puzzle.par + 1, true)).toBe(2);
    expect(puzzleStars(puzzle, puzzle.par + 2, true)).toBe(1);
    expect(puzzleStars(puzzle, puzzle.par, false)).toBe(0);
  });
});

describe.each(Object.values(FRAMES))('arcade levels on the $kind board', (frame) => {
  it('start a game in every mode', () => {
    const levels = [
      endlessLevel(frame),
      puzzleLevel(PUZZLES[29]!, frame),
      ...SONGS.map((song) => rhythmLevel(song, frame)),
      ...DUEL_DIFFICULTIES.map((difficulty) => duelLevel(difficulty, frame)),
    ];
    for (const level of levels) {
      const game = new Game(toLevelSetup(level), SeededRandom.fromString(level.id));
      for (let i = 0; i < 120; i++) game.update(1 / 60);
      expect(game.state, level.id).toBe('playing');
    }
  });

  it('keeps the duel chain clear of both holes and of both shooters', () => {
    const setup = toLevelSetup(duelLevel('normal', frame));
    const { path } = setup.chains[0]!;
    const tail = setup.chains[0]!.tail!;
    const span = 19 * setup.chain.ballRadius * 2;
    // As much room on each side: neither player starts closer to losing.
    expect(tail).toBeCloseTo(path.length - (tail + span));
    expect(tail).toBeGreaterThan(path.length * 0.25);
    for (const point of path.sample(10)) {
      expect(point.distanceTo(setup.shooter)).toBeGreaterThan(110);
      expect(point.distanceTo(setup.duel!.rival.position)).toBeGreaterThan(110);
    }
  });
});

describe('duel balance (casual bot)', () => {
  it('beats the rookie rival, struggles against the fearsome one', () => {
    const seeds = ['a', 'b', 'c', 'd'];
    const wins = (difficulty: 'easy' | 'hard') =>
      seeds
        .map((seed) => playDefinition(duelLevel(difficulty, FRAMES.square), seed, 72, 24))
        .filter((run) => run.outcome === 'won').length;
    expect(wins('easy')).toBeGreaterThanOrEqual(3);
    expect(wins('hard')).toBeLessThan(4);
  }, 60_000);
});
