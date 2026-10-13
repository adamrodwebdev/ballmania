import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { Game, REVIVE_SHARE, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { puzzleHint } from '@/levels/arcade/hint';
import { PuzzleSolver } from '@/levels/arcade/PuzzleSolver';
import { PUZZLES, puzzleLevel } from '@/levels/arcade/puzzles';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { FRAMES } from '@/levels/tracks';
import { FixedRandom, PARAMS, straightPath } from './helpers';

const run = (game: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60);
};

/** A fast chain on a straight track: it reaches the hole within two seconds. */
const rushing: LevelSetup = {
  board: { width: 1000, height: 1000 },
  shooter: new Vec2(500, 700),
  chains: [
    { path: straightPath(), recipe: { length: 4, tones: 3, repeatChance: 0 }, tones: [0, 1, 2, 0] },
  ],
  chain: { ...PARAMS, speed: 400, rushSpeed: 400 },
  projectileSpeed: 1500,
  fireCooldown: 0,
};

describe('continue after a defeat (rewarded ad)', () => {
  it('pushes the chain back out of the hole and plays on', () => {
    const game = new Game(rushing, new FixedRandom(0));
    const events: string[] = [];
    game.events.on('revived', ({ chains }) => events.push(`revived ${chains.join()}`));
    expect(game.revive()).toBe(false);
    run(game, 4);
    expect(game.state).toBe('lost');
    const chain = game.chains[0]!;
    const head = chain.balls[chain.balls.length - 1]!.s;
    expect(game.revive()).toBe(true);
    expect(events).toEqual(['revived 0']);
    expect(game.state).toBe('playing');
    expect(chain.balls[chain.balls.length - 1]!.s).toBeCloseTo(
      head - chain.path.length * REVIVE_SHARE,
    );
    expect(chain.reachedHole).toBe(false);
    expect(game.fire()).toBe(true);
    // The chain still moves: without help, it is lost again.
    run(game, 4);
    expect(game.state).toBe('lost');
  });

  it('cannot continue a game lost another way', () => {
    const puzzle = PUZZLES[0]!;
    const game = new Game(
      toLevelSetup(puzzleLevel(puzzle, FRAMES.square)),
      SeededRandom.fromString(puzzle.id),
    );
    // Shots thrown away, far from the chain, until none is left.
    game.aimAt(new Vec2(game.shooter.position.x, game.setup.board.height * 2));
    for (let shot = 0; shot < 40 && game.state === 'playing'; shot++) {
      game.fire();
      run(game, 1);
    }
    expect(game.state).toBe('lost');
    expect(game.revive()).toBe(false);
  });
});

describe('puzzle hint (rewarded ad)', () => {
  it('leads to a solution at par, hint after hint', () => {
    const puzzle = PUZZLES[7]!;
    const game = new Game(
      toLevelSetup(puzzleLevel(puzzle, FRAMES.square)),
      SeededRandom.fromString(puzzle.id),
    );
    expect(new PuzzleSolver().minimumShots(puzzle.sequence)).toBe(puzzle.par);
    for (let shot = 0; shot < puzzle.par; shot++) {
      const hint = puzzleHint(game);
      expect(hint).not.toBeNull();
      for (let i = 0; i < 6 && game.shooter.current !== hint!.tone; i++) game.swap();
      game.aimAt(hint!.target);
      expect(game.fire()).toBe(true);
      const chain = game.chains[0]!;
      for (let i = 0; i < 240 && (game.projectiles.length > 0 || !chain.settled); i++) {
        game.update(1 / 60);
      }
      game.update(0.2);
    }
    expect(game.state).toBe('won');
    expect(puzzleHint(game)).toBeNull();
  });
});
