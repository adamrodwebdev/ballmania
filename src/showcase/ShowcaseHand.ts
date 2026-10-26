import { mix } from '@/engine/chain/Alchemy';
import type { BallView } from '@/engine/chain/Ball';
import { GIFT_BOMB_RADIUS, type AimLine, type Game } from '@/engine/Game';
import { bend, bestWindow, keyOf, LESSON_BEND, type Candidate } from '@/play/HandCoach';
import type { Stage } from './stage';

/**
 * What the hand does at a cue: a shot of a kind (the best group it can make,
 * its chain reaction counting double: anywhere, off a mirror, curved by the
 * black hole, next to the Colossus; the Nova where it takes the most), a
 * marble pulled out (Abyss), a fusion (Jewel), a switch flipped (Volcano).
 */
export type Act = 'shot' | 'nova' | 'bank' | 'curve' | 'colossus' | 'pull' | 'fuse' | 'flip';

/** One cue of a moment: what the hand does, at so many seconds. */
export interface Cue {
  readonly at: number;
  readonly act: Act;
}

/** Seconds the hand aims before it lets go: the aim line shows the shot coming. */
export const AIM_LEAD = 0.35;
/** Board units a bomb's landing keeps from the board's edges, so that its blast shows whole. */
const BLAST_ROOM = GIFT_BOMB_RADIUS * 0.75;
/** Angles the hand tries around the shooter. */
const ANGLES = 360;

/** How the hand weighs a landing: null if it meets no ball or is not of the kind. */
type Worth = (game: Game, line: AimLine) => number | null;

/** The best group a shot along `line` makes, its reaction counting double; 0 if none. */
function group(game: Game, line: AimLine): number {
  const preview = game.preview(false, line, true);
  const size = preview?.group.length ?? 0;
  return size === 0 ? 0 : size + 2 * (preview?.reaction.length ?? 0);
}

/** The ball a line meets, and its chain. */
function met(game: Game, line: AimLine) {
  const target = line.target;
  const chain = target && game.chains[target.chain];
  const ball = target && chain?.balls[target.index];
  return target && chain && ball ? { chain, ball, index: target.index } : null;
}

/** Balls of `tone` touching each other from `from`, going one way. */
function run(
  balls: readonly BallView[],
  from: number,
  step: 1 | -1,
  tone: number,
  diameter: number,
) {
  let count = 0;
  for (let i = from; i >= 0 && i < balls.length; i += step) {
    const ball = balls[i]!;
    if (ball.tone !== tone) break;
    const previous = balls[i - step];
    if (i !== from && previous && Math.abs(ball.s - previous.s) > diameter + 1e-6) break;
    count++;
  }
  return count;
}

const WORTH: Readonly<Record<Exclude<Act, 'flip'>, Worth>> = {
  shot: (game, line) => (line.target ? group(game, line) : null),
  // The bomb takes every marble within its blast: the more, the better, its blast in the window.
  nova: (game, line) => {
    const preview = line.target ? game.preview(false, line) : null;
    if (!preview) return null;
    const { x, y } = preview.position;
    const { width, height } = game.setup.board;
    const room = Math.min(x, y, width - x, height - y);
    return room >= BLAST_ROOM ? preview.group.length : Math.floor(preview.group.length / 4);
  },
  bank: (game, line) => (line.target && line.rebounds.length > 0 ? group(game, line) : null),
  curve: (game, line) =>
    line.target && line.rebounds.length === 0 && bend(line.points) >= LESSON_BEND
      ? group(game, line) + (group(game, line) > 0 ? Math.round(4 * bend(line.points)) : 0)
      : null,
  // Close enough to the Colossus's body for the burst to hurt it.
  colossus: (game, line) => {
    const landing = met(game, line);
    const colossus = game.setup.colossus;
    const body = landing?.chain.pusherArc ?? null;
    if (!landing || !colossus || body === null) return null;
    const near = landing.ball.s - (body + colossus.radius) <= colossus.reach;
    return near ? group(game, line) : 0;
  },
  // Pulled out, the marble lets its two neighbours meet: of one colour, they burst.
  pull: (game, line) => {
    const landing = met(game, line);
    if (!landing) return null;
    const { chain, index } = landing;
    const before = chain.balls[index - 1];
    const after = chain.balls[index + 1];
    if (!before || !after || before.tone !== after.tone || before.tone === landing.ball.tone) {
      return 0;
    }
    const { diameter } = chain;
    const joined =
      run(chain.balls, index - 1, -1, before.tone, diameter) +
      run(chain.balls, index + 1, 1, after.tone, diameter);
    return joined >= game.setup.chain.minMatch ? joined : 0;
  },
  // Shot onto another primary, the marble turns into their mix: with two of it beside, a group.
  fuse: (game, line) => {
    const landing = met(game, line);
    if (!landing) return null;
    const { chain, index } = landing;
    const mixed = mix(game.shooter.current, landing.ball.tone);
    if (mixed === null) return 0;
    const { diameter } = chain;
    const joined =
      1 +
      run(chain.balls, index - 1, -1, mixed, diameter) +
      run(chain.balls, index + 1, 1, mixed, diameter);
    return joined >= game.setup.chain.minMatch ? joined : 0;
  },
};

/** The best angle for an act, at the middle of its widest window; null if nothing is worth it. */
export function plan(game: Game, act: Exclude<Act, 'flip'>): number | null {
  const worth = WORTH[act];
  const sweep = Array.from({ length: ANGLES }, (_, i): Candidate | null => {
    const angle = (i / ANGLES) * Math.PI * 2;
    const line = game.aimLineAt(angle);
    const score = worth(game, line);
    const key = keyOf(line, game);
    return score !== null && score > 0 && key !== null ? { angle, score, key } : null;
  });
  return bestWindow(sweep)?.angle ?? null;
}

/**
 * The hand that plays a moment of the reel (v1.8.0): at each cue, it plans
 * with the game's own aim line and preview (swapping its ball when the other
 * one has the shot), aims a moment before so the aim line shows the shot
 * coming, then lets go.
 */
export class ShowcaseHand {
  /** The best angle for the act, with the loaded ball or else the next one; null if none. */
  private static aimFor(stage: Stage, act: Exclude<Act, 'flip'>): number | null {
    const angle = plan(stage.game, act);
    // The bomb is the gift, and the magnet takes any colour: no swap for them.
    if (angle !== null || act === 'nova' || act === 'pull') return angle;
    stage.swap();
    const swapped = plan(stage.game, act);
    if (swapped === null) stage.swap();
    return swapped;
  }

  private next = 0;
  private aimed = false;

  constructor(private readonly cues: readonly Cue[]) {}

  /** `time` seconds into the moment: whatever its cues ask by then. */
  play(stage: Stage, time: number): void {
    const cue = this.cues[this.next];
    if (!cue) return;
    if (cue.act === 'flip') {
      if (time < cue.at) return;
      stage.flip();
      this.next++;
      return;
    }
    if (!this.aimed) {
      if (time < cue.at - AIM_LEAD) return;
      const angle = ShowcaseHand.aimFor(stage, cue.act);
      if (angle === null) {
        // Nothing worth it now: the next cue.
        this.next++;
        return;
      }
      stage.aim(angle);
      this.aimed = true;
      return;
    }
    if (time < cue.at || !stage.game.shooter.ready) return;
    // The chain has moved since: the last touch of the aim, then the shot.
    const angle = plan(stage.game, cue.act);
    if (angle !== null) {
      stage.aim(angle);
      if (cue.act === 'pull') stage.pull();
      else stage.fire();
    }
    this.aimed = false;
    this.next++;
  }
}
