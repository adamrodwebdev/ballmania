import { SeededRandom } from '@/engine/core/Random';
import { Game } from '@/engine/Game';
import { toLevelSetup, type Lesson, type LevelDefinition } from '@/levels/LevelDefinition';
import { HandCoach, LESSON_BEND } from '@/play/HandCoach';

const FRAME = 1 / 60;

/** How a newcomer's game of a showcase went. */
export interface ShowcaseRun {
  readonly won: boolean;
  /** Seconds until the win, or until the bot gave up. */
  readonly seconds: number;
  readonly shots: number;
  /** When the hand's lessons were all done, or null. */
  readonly learntAt: number | null;
  /** When each of the hand's lessons was done, in seconds (v1.8.1); missing if never. */
  readonly lessons: Readonly<Partial<Record<Lesson, number>>>;
  /** Deepest chain reaction of the game. */
  readonly bestDepth: number;
  /** The player's explosions that showed the lesson: after a rebound, or a curve. */
  readonly lessonShots: number;
  /** Furthest the head of the chain got, as a share of its track. */
  readonly danger: number;
}

/**
 * A newcomer in the training (v1.8.0), for its simulations: the first shot
 * goes anywhere on the chain (they shoot before they understand); then they
 * copy the hand when it shows, once they have watched its gesture: its drag,
 * roughly, nudging the aim until the preview lights a group; its tap on the
 * launcher, a swap; its press held still, a charged shot (v1.8.1). Without
 * it, they move the aim about and take the biggest group the preview shows,
 * else put their colour beside its own. `seed` makes their hesitations and
 * errors.
 */
export function playShowcase(level: LevelDefinition, seed: number, cap = 180): ShowcaseRun {
  const setup = toLevelSetup(level);
  const game = new Game(setup, SeededRandom.fromString(level.id));
  const coach = new HandCoach(game, level.lessons!, level.nudge ?? null);
  const lessons: Partial<Record<Lesson, number>> = {};
  const random = SeededRandom.fromString(`newcomer-${seed}`);
  let shots = 0;
  let learntAt: number | null = null;
  let lessonShots = 0;
  let danger = 0;
  let shot: { readonly deflection: number } | null = null;
  game.events.on('fired', ({ projectile }) => {
    if (projectile.by === 'player') shot = projectile;
  });
  game.events.on('exploded', ({ by, cause, bounces }) => {
    if (by !== 'player' || cause !== 'shot') return;
    if (bounces > 0 || (shot?.deflection ?? 0) >= LESSON_BEND) lessonShots++;
  });

  /** Seconds before the next shot of their own, and before copying the gesture shown. */
  let thinking = 1 + random.next();
  let watching = 0.9 + random.next() * 0.6;
  const fireAt = (angle: number, error: number, power = false) => {
    game.shooter.aim(angle + (random.next() - 0.5) * 2 * error);
    if (game.fire(power)) shots++;
    thinking = 0.8 + random.next() * 0.6;
    watching = 0.9 + random.next() * 0.6;
  };

  let t = 0;
  for (; t < cap && game.state === 'playing'; t += FRAME) {
    game.update(FRAME);
    const flying = game.projectiles.some((projectile) => projectile.by === 'player');
    coach.update(FRAME, !flying);
    if (learntAt === null && coach.learnt) learntAt = t;
    for (const lesson of coach.done) lessons[lesson] ??= t;
    const chain = game.chains[0]!;
    const head = chain.balls[chain.balls.length - 1];
    if (head) danger = Math.max(danger, head.s / chain.path.length);
    if (flying || !game.shooter.ready) continue;
    thinking -= FRAME;
    const visible = chain.balls.filter((ball) => ball.s > chain.diameter * 2);
    if (visible.length === 0) continue;
    const angleTo = (index: number) =>
      chain.positionOf(visible[index]!).sub(game.shooter.position).angle();
    if (shots === 0) {
      // The first shot: anywhere on the chain, before the hand is understood.
      if (thinking <= 0) fireAt(angleTo(Math.floor(random.next() * visible.length)), 0.02);
      continue;
    }
    const gesture = coach.gesture;
    if (gesture) {
      if (gesture.time < watching) continue;
      if (gesture.kind === 'tap') {
        // The hand taps the launcher: so do they, a swap.
        game.swap();
        watching = 0.9 + random.next() * 0.6;
        continue;
      }
      // Copying the hand roughly, they nudge the aim until the preview lights a group.
      const shown = gesture.to.sub(game.shooter.position).angle();
      let angle = shown + (random.next() - 0.5) * 0.07;
      for (let nudge = 0; nudge < 4; nudge++) {
        if ((game.preview(false, game.aimLineAt(angle))?.group.length ?? 0) > 0) break;
        angle = shown + (random.next() - 0.5) * 0.035;
      }
      // A press held still, as the hand's: the shot leaves charged.
      fireAt(angle, 0.005, gesture.kind === 'hold');
      continue;
    }
    if (thinking > 0) continue;
    // Without the hand: they move the aim around the chain and watch the preview,
    // then take the biggest group it showed, else put their colour beside its own
    // (a pair, for the next shot), else any shot that reaches the chain.
    let best = { angle: angleTo(0), value: -1 };
    for (let look = 0; look < 10; look++) {
      const ball = angleTo(Math.floor(random.next() * visible.length));
      const angle = ball + (random.next() - 0.5) * 0.6;
      const line = game.aimLineAt(angle);
      const target = line.target;
      if (!target) continue;
      const group = game.preview(false, line)?.group.length ?? 0;
      const touched = game.chains[target.chain]!.balls[target.index]!;
      const value = group > 0 ? group : touched.tone === game.shooter.current ? 0.5 : 0;
      if (value > best.value) best = { angle, value };
    }
    fireAt(best.angle, 0.025);
  }
  return {
    won: game.state === 'won',
    seconds: t,
    shots,
    learntAt,
    lessons,
    bestDepth: game.bestDepth,
    lessonShots,
    danger,
  };
}
