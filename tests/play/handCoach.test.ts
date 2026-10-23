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
  return { game, coach: new HandCoach(game, level.lesson!, level.nudge ?? null) };
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

describe('HandCoach', () => {
  it('shows E1 a shot at the chain, until the Nova bursts, then again after a wait', () => {
    const { game, coach } = showcase(1);
    run(game, coach, 1.5);
    const gesture = coach.gesture!;
    expect(gesture.from).toEqual(game.shooter.position);
    expect(gesture.path).toHaveLength(2);
    let bombs = 0;
    game.events.on('bomb', () => bombs++);
    copy(game, coach);
    expect(bombs).toBe(1);
    expect(coach.learnt).toBe(true);
    run(game, coach, TRAINING_NUDGE - 1);
    expect(coach.gesture).toBeNull();
    run(game, coach, 1.5);
    expect(coach.gesture).not.toBeNull();
  });

  it('shows E2 a bank shot that makes a group, and is done once one explodes', () => {
    const { game, coach } = showcase(2);
    run(game, coach, 1.5);
    const gesture = coach.gesture!;
    expect(gesture.path.length).toBeGreaterThan(2);
    const bounced: number[] = [];
    game.events.on('exploded', ({ bounces, by }) => {
      if (by === 'player') bounced.push(bounces);
    });
    copy(game, coach);
    expect(bounced[0]).toBeGreaterThan(0);
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
      const coach = new HandCoach(game, 'curve', null);
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
