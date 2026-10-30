import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';
import { findLevel } from '@/levels/campaign';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import { resolveLevel } from '@/levels/resolveLevel';
import { FRAMES } from '@/levels/tracks';
import {
  trainingDefinition,
  trainingLevel,
  TRAINING_NUDGE,
  type TrainingStep,
} from '@/levels/training';
import {
  bend,
  bestWindow,
  GESTURE_LOOP,
  HandCoach,
  LESSON_BEND,
  type Candidate,
} from '@/play/HandCoach';
import { FixedRandom, PARAMS } from '../engine/helpers';

const FRAME = 1 / 60;

/** A level as the game screen plays it: the same seed as its mode gives. */
function play(level: LevelDefinition): { game: Game; coach: HandCoach } {
  const game = new Game(toLevelSetup(level), SeededRandom.fromString(level.id));
  return { game, coach: new HandCoach(game, level.lessons!, level.nudge ?? null) };
}

const showcase = (step: TrainingStep) =>
  play(trainingDefinition(trainingLevel(step), FRAMES.square));

/** Plays `seconds`, the hand free to show, as the play session does. */
function run(game: Game, coach: HandCoach, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) {
    game.update(FRAME);
    const flying = game.projectiles.some((projectile) => projectile.by === 'player');
    coach.update(FRAME, game.state === 'playing' && !flying);
  }
}

/** Shoots where the hand lets go, and plays until the shot has landed or is lost. */
function copy(game: Game, coach: HandCoach): void {
  const gesture = coach.gesture!;
  game.aimAt(gesture.to);
  expect(game.fire()).toBe(true);
  for (let i = 0; i < 600 && game.projectiles.length > 0; i++) run(game, coach, FRAME);
}

const candidate = (angle: number, score: number, key: number): Candidate => ({ angle, score, key });

/** The angle between two directions, in radians. */
const turn = (a: Vec2, b: Vec2) => Math.acos(Math.min(1, a.normalize().dot(b.normalize())));

describe('bestWindow', () => {
  it('aims at the middle of the widest run of the best shot', () => {
    const results = [
      null,
      candidate(1, 3, 7),
      candidate(2, 3, 7),
      candidate(3, 3, 7),
      null,
      candidate(5, 3, 8),
      null,
      candidate(7, 5, 9),
      null,
      null,
    ];
    // The best shot wins however narrow; between equals, the widest.
    expect(bestWindow(results)?.angle).toBe(7);
    expect(bestWindow(results.map((result) => (result?.key === 9 ? null : result)))?.angle).toBe(2);
  });

  it('keeps a run whole across the end of the sweep', () => {
    const results = [candidate(0, 3, 4), candidate(1, 3, 4), null, null, null, candidate(5, 3, 4)];
    expect(bestWindow(results)?.angle).toBe(0);
    expect(bestWindow([null, null, null])).toBeNull();
  });
});

/** A still chain along the top, tail first, and the shooter below it, loaded as `opening` says. */
const strip = (tones: readonly number[], opening: readonly number[]): Game =>
  new Game(
    {
      board: { width: 1000, height: 1000 },
      shooter: new Vec2(500, 700),
      chains: [
        {
          path: Path.fromPoints([new Vec2(0, 100), new Vec2(1000, 100)]),
          recipe: { length: tones.length, tones: 3, repeatChance: 0 },
          tones,
          tail: 300,
        },
      ],
      chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
      projectileSpeed: 1000,
      fireCooldown: 0,
      opening,
    },
    new FixedRandom(0),
  );

describe('HandCoach', () => {
  it('teaches E1 every control in turn: the Nova, a swap, then a charged shot', () => {
    const { game, coach } = showcase(1);
    run(game, coach, 1.5);
    expect(coach.teaching).toBe('shot');
    const gesture = coach.gesture!;
    expect(gesture.kind).toBe('drag');
    expect(gesture.from).toEqual(game.shooter.position);
    expect(gesture.path).toHaveLength(2);
    let bombs = 0;
    game.events.on('bomb', () => bombs++);
    copy(game, coach);
    expect(bombs).toBe(1);
    expect(coach.done).toEqual(['shot']);
    // The next ball sets the cascade off: the hand taps the launcher, nothing to aim.
    run(game, coach, 1.5);
    expect(coach.teaching).toBe('swap');
    expect(coach.gesture).toMatchObject({ kind: 'tap', from: game.shooter.position, path: [] });
    game.swap();
    expect(coach.done).toEqual(['shot', 'swap']);
    // Then the charge: the finger presses on the target and holds still there.
    run(game, coach, 1.5);
    const hold = coach.gesture!;
    expect(coach.teaching).toBe('charge');
    expect(hold.kind).toBe('hold');
    expect(hold.from).toEqual(hold.to);
    expect(hold.path[0]).toEqual(game.shooter.position);
    game.aimAt(hold.to);
    expect(game.fire(true)).toBe(true);
    expect(coach.learnt).toBe(true);
    expect(coach.teaching).toBeNull();
    // Its lessons done, the training's hand comes back to a player who waits.
    for (let i = 0; i < 600 && game.projectiles.length > 0; i++) run(game, coach, FRAME);
    run(game, coach, TRAINING_NUDGE - 1);
    expect(coach.gesture).toBeNull();
    run(game, coach, 1.5);
    expect(coach.gesture?.kind).toBe('drag');
  });

  it('shows a swap while the next ball does clearly better, and sets such a moment up', () => {
    // Tail first: a pair of b, a lone c, a lone a. A b makes a group; an a, a pair at most.
    const better = strip([1, 1, 2, 0], [0, 1]);
    const coach = new HandCoach(better, ['swap'], null);
    run(better, coach, 1.5);
    expect(coach.teaching).toBe('swap');
    expect(coach.gesture?.kind).toBe('tap');
    // A shot instead of the swap: the moment is gone with the loaded ball, not the lesson.
    better.aimAt(new Vec2(500, 0));
    better.fire();
    run(better, coach, 0.1);
    expect(coach.done).toEqual([]);
    // Loaded with the b already: the hand loads a colour that makes nothing, the b after it.
    const worse = strip([1, 1, 2, 0], [1, 0]);
    const staged = new HandCoach(worse, ['swap'], null);
    run(worse, staged, 1.5);
    expect(worse.shooter.next).toBe(1);
    expect([0, 2]).toContain(worse.shooter.current);
    expect(staged.teaching).toBe('swap');
    // Neither that nor a puzzle hint's load is the player's swap; theirs is.
    worse.loadTone(1);
    expect(staged.done).toEqual([]);
    worse.swap();
    expect(staged.done).toEqual(['swap']);
  });

  it('keeps a moment it set up until the swap, and waits when every colour does as well', () => {
    // Tail first: a pair of each colour, any of which makes a group: nothing to swap for.
    const even = strip([0, 0, 1, 1, 2, 2], [0, 1]);
    const waiting = new HandCoach(even, ['swap'], null);
    run(even, waiting, 3);
    expect(waiting.teaching).toBeNull();
    expect([even.shooter.current, even.shooter.next]).toEqual([0, 1]);
    // A moment set up by the hand stays, sweep after sweep, while the player waits.
    const worse = strip([1, 1, 2, 0], [1, 0]);
    const staged = new HandCoach(worse, ['swap'], null);
    run(worse, staged, 6);
    expect(staged.teaching).toBe('swap');
    expect(staged.gesture?.kind).toBe('tap');
  });

  it('learns the charge from a charged shot only', () => {
    const game = strip([1, 1, 2, 0], [1, 1, 1]);
    const coach = new HandCoach(game, ['charge'], null);
    run(game, coach, 1.5);
    const hold = coach.gesture!;
    expect(hold.kind).toBe('hold');
    game.aimAt(hold.to);
    game.fire();
    run(game, coach, 0.5);
    expect(coach.learnt).toBe(false);
    run(game, coach, 1.5);
    game.aimAt(coach.gesture!.to);
    game.fire(true);
    expect(coach.learnt).toBe(true);
  });

  it('shows E2 bank shots, and is done once one explodes', () => {
    const { game, coach } = showcase(2);
    run(game, coach, 1.5);
    expect(coach.gesture!.path.length).toBeGreaterThan(2);
    const bounced: number[] = [];
    game.events.on('exploded', ({ bounces, by }) => {
      if (by === 'player') bounced.push(bounces);
    });
    // A player who follows the hand gets there within a few shots.
    for (let shot = 0; shot < 5 && !coach.learnt; shot++) {
      run(game, coach, 0.5);
      if (coach.gesture) copy(game, coach);
    }
    expect(bounced.some((bounces) => bounces > 0)).toBe(true);
    expect(coach.learnt).toBe(true);
  });

  it('shows E3 a shot the black hole bends', () => {
    const { game, coach } = showcase(3);
    run(game, coach, 1.5);
    const { from, to, path } = coach.gesture!;
    // The finger points one way, the shot turns on its way.
    expect(turn(to.sub(from), path.at(-1)!.sub(path.at(-2)!))).toBeGreaterThanOrEqual(LESSON_BEND);
  });

  it('learns the curve from a shot the black hole bent, once it explodes', () => {
    // A still chain along the top, a strong black hole in the middle, the shooter below.
    const setup: LevelSetup = {
      board: { width: 1000, height: 1000 },
      shooter: new Vec2(500, 930),
      chains: [
        {
          path: Path.fromPoints([new Vec2(0, 100), new Vec2(1000, 100)]),
          recipe: { length: 30, tones: 3, repeatChance: 0.45 },
        },
      ],
      chain: { ...PARAMS, speed: 0, rushSpeed: 600, rushDistance: 800 },
      projectileSpeed: 1000,
      fireCooldown: 0.2,
      gravity: { centre: new Vec2(500, 500), strength: 6e7, horizon: 46 },
    };
    const board = () => {
      const game = new Game(setup, new FixedRandom(0));
      const coach = new HandCoach(game, ['curve'], null);
      run(game, coach, 3);
      return { game, coach };
    };
    const probe = board().game;
    const outcomes = Array.from({ length: 360 }, (_, i) => (i / 360) * Math.PI * 2)
      .filter((angle) => (probe.preview(false, probe.aimLineAt(angle))?.group.length ?? 0) > 0)
      .flatMap((angle) => {
        const { game, coach } = board();
        const exploded: string[] = [];
        game.events.on('exploded', ({ by }) => exploded.push(by));
        game.shooter.aim(angle);
        game.fire();
        run(game, coach, 1);
        const bent = bend(probe.aimLineAt(angle).points);
        return exploded.includes('player') ? [{ bent, learnt: coach.learnt }] : [];
      });
    // Curved shots teach it; straight ones do not.
    expect(outcomes.some(({ bent }) => bent >= LESSON_BEND)).toBe(true);
    for (const { bent, learnt } of outcomes) {
      if (bent >= LESSON_BEND * 1.2) expect(learnt).toBe(true);
      if (bent < LESSON_BEND * 0.8) expect(learnt).toBe(false);
    }
  });

  it('teaches the first level until the first shot lands, and never comes back', () => {
    const level = resolveLevel(findLevel('nebula-01')!, FRAMES.square);
    const { game, coach } = play(level);
    run(game, coach, 1.5);
    expect(coach.gesture).not.toBeNull();
    copy(game, coach);
    run(game, coach, TRAINING_NUDGE * 2);
    expect(coach.gesture).toBeNull();
  });

  it('hides while the player holds a shot, then starts the gesture again from the press', () => {
    const { game, coach } = showcase(1);
    run(game, coach, 1.5);
    expect(coach.gesture).not.toBeNull();
    coach.update(FRAME, false);
    expect(coach.gesture).toBeNull();
    coach.update(FRAME, true);
    expect(coach.gesture?.time).toBe(0);
    for (let t = 0; t < GESTURE_LOOP; t += FRAME) coach.update(FRAME, true);
    expect(coach.gesture?.time).toBeLessThan(0.1);
  });
});
