import { ingredients, mix } from '@/engine/chain/Alchemy';
import type { BallView } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Game } from '@/engine/Game';
import type { CampaignLevel } from '@/levels/campaign';
import { resolveLevel } from '@/levels/resolveLevel';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';

export interface BotResult {
  readonly outcome: 'won' | 'lost' | 'timeout';
  readonly score: number;
  readonly seconds: number;
  readonly shots: number;
  /** Furthest the head of a chain got, as a share of its track (1 = the hole). */
  readonly danger: number;
  /** Seconds with the head of a chain past half its track: time under pressure (v1.8.0). */
  readonly pressure: number;
  /** Points of the computer rival (Duel mode). */
  readonly rivalScore: number;
  /** Seconds spent with no ball on the board while more wait in the tunnel. */
  readonly idle: number;
  /** Seconds with fewer balls on the board than a group needs (3) while more wait in the tunnel. */
  readonly thin: number;
  /** Longest run of shots in a row that each made a group explode. */
  readonly bestStreak: number;
  /** End-of-level bonus included in the score (0 without a win). */
  readonly bonus: number;
  /** Seconds played, to the tenth. */
  readonly elapsed: number;
}

/** Share of its track past which the head of a chain puts the player under pressure. */
export const PRESSURE_FROM = 0.5;

/**
 * Players for balancing (frames between two shots, aim error, one move ahead).
 * Humans take longer than a greedy bot to decide, but once they do, they
 * shoot true and set up chain reactions: they are the reference for the time
 * bonus and the stars.
 */
export const PLAYERS = {
  /**
   * A newcomer (v1.8.0): a shot every 1.6 s, often off target, no plan; the
   * profile of the genre study of 21/10/2026, to set again on the hallway test.
   */
  newcomer: { cadence: 96, sloppiness: 32, insight: false },
  /** A greedy, hasty player: a shot every 1.2 s, often off target. */
  casual: { cadence: 72, sloppiness: 24, insight: false },
  /** A human: decides every 1.5 s, shoots true, looks for chain reactions. */
  human: { cadence: 90, sloppiness: 8, insight: true },
  /** An applied human: decides every 1.1 s, very precise. */
  applied: { cadence: 66, sloppiness: 5, insight: true },
} as const;

/**
 * A simple greedy player, for balancing: it shoots at a visible ball of the
 * loaded colour, preferring pairs and the balls closest to the hole, and
 * swaps when the next ball has a better target. With `insight`, it also
 * prefers the groups whose neighbours will meet and explode in turn.
 */
export function playLevel(
  level: CampaignLevel,
  frame: Frame,
  seed: string,
  /** Frames between two shots (54 ≈ a casual player's 0.9 s). */
  cadence = 54,
  /** Aim error, in board units along the track. */
  sloppiness = 18,
  insight = false,
): BotResult {
  return playDefinition(resolveLevel(level, frame), seed, cadence, sloppiness, insight);
}

/**
 * Looking one move ahead: once the group around `index` is gone, will the
 * balls on either side, of one colour and three or more together, meet and
 * explode in turn? A join of two only makes a pair.
 */
const reactionAfter = (balls: readonly BallView[], index: number, colour: number): number => {
  let first = index;
  while (first > 0 && balls[first - 1]!.tone === colour) first--;
  let last = index;
  while (last + 1 < balls.length && balls[last + 1]!.tone === colour) last++;
  const left = balls[first - 1];
  const right = balls[last + 1];
  if (!left || !right || left.tone !== right.tone) return 0;
  let run = 2;
  for (let k = first - 2; k >= 0 && balls[k]!.tone === left.tone; k--) run++;
  for (let k = last + 2; k < balls.length && balls[k]!.tone === left.tone; k++) run++;
  return run >= 3 ? 3 : 0;
};

/** The same player, on any level given as data (Arcade modes). */
export function playDefinition(
  definition: LevelDefinition,
  seed: string,
  cadence = 54,
  sloppiness = 18,
  insight = false,
): BotResult {
  const hand = SeededRandom.fromString(`hand:${seed}`);
  const game = new Game(toLevelSetup(definition), SeededRandom.fromString(seed));
  const alchemy = game.setup.alchemy === true;
  const gravity = game.gravity;
  let shots = 0;
  let danger = 0;
  let pressureFrames = 0;
  let idleFrames = 0;
  let thinFrames = 0;
  let bonus = 0;
  game.events.on('ended', (event) => (bonus = event.bonus));
  interface Candidate {
    readonly score: number;
    readonly chain: number;
    readonly s: number;
    readonly id: number;
  }
  /** Balls worth shooting the loaded colour at, best first. */
  const candidates = (tone: number): Candidate[] => {
    const found: Candidate[] = [];
    game.chains.forEach((chain, index) => {
      const balls = chain.balls;
      balls.forEach((ball, i) => {
        if (ball.s < 0) return;
        // Jewel world: shooting onto another primary turns it into their mix.
        const becomes = alchemy ? mix(tone, ball.tone) : null;
        // Jewel world, first half of a two-step move: put an ingredient next to a
        // pair of its mixed colour; the other ingredient will fuse it into a third.
        const setsUp =
          alchemy &&
          becomes === null &&
          ingredients(ball.tone)?.includes(tone) === true &&
          (balls[i - 1]?.tone === ball.tone || balls[i + 1]?.tone === ball.tone);
        if (setsUp) {
          found.push({
            score: 1 + ball.s / chain.path.length,
            chain: index,
            s: ball.s,
            id: ball.id,
          });
          return;
        }
        if (ball.tone !== tone && becomes === null) return;
        const colour = becomes ?? tone;
        const pair =
          (balls[i - 1]?.tone === colour ? 1 : 0) + (balls[i + 1]?.tone === colour ? 1 : 0);
        // A fusion only helps next to its own colour; alone, it leaves a ball nobody can shoot.
        const fusion = becomes === null ? 0 : pair > 0 ? 0.3 : -1.5;
        const ahead = insight && pair > 0 && becomes === null ? reactionAfter(balls, i, colour) : 0;
        found.push({
          score: pair * 2 + fusion + ahead + ball.s / chain.path.length,
          chain: index,
          s: ball.s,
          id: ball.id,
        });
      });
    });
    return found.sort((a, b) => b.score - a.score);
  };
  /**
   * Singularity world: shots curve, so the bot sweeps the aim like a player
   * watching the aim line bend, and remembers the middle angle that reaches
   * each ball.
   */
  let reach = new Map<number, number>();
  /** Shots curve now: around a black hole, or in a gust of wind. */
  const curving = () => gravity !== null || game.weather?.kind === 'wind';
  const sweep = () => {
    reach = new Map();
    if (!gravity && curving()) {
      // In the wind: for the best balls, the angle closest to straight that reaches them.
      const saved = game.shooter.angle;
      for (const tone of [game.shooter.current, game.shooter.next]) {
        for (const candidate of candidates(tone).slice(0, 6)) {
          if (reach.has(candidate.id)) continue;
          const point = game.chains[candidate.chain]!.path.pointAt(candidate.s);
          const direct = point.sub(game.shooter.position).angle();
          for (let k = 0; k <= 40; k++) {
            const angle = direct + (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * 0.012;
            game.shooter.aim(angle);
            if (game.aimTarget()?.ball.id === candidate.id) {
              reach.set(candidate.id, angle);
              break;
            }
          }
        }
      }
      game.shooter.aim(saved);
      return;
    }
    if (!gravity) return;
    const found = new Map<number, number[]>();
    const saved = game.shooter.angle;
    const base = gravity.centre.sub(game.shooter.position).angle();
    for (let k = -70; k <= 70; k++) {
      const angle = base + k * 0.015;
      game.shooter.aim(angle);
      const hit = game.aimTarget();
      if (!hit) continue;
      const angles = found.get(hit.ball.id) ?? [];
      angles.push(angle);
      found.set(hit.ball.id, angles);
    }
    game.shooter.aim(saved);
    for (const [id, angles] of found) reach.set(id, angles[Math.floor(angles.length / 2)]!);
  };

  /**
   * The best candidate the shot would really reach, as a player reading the
   * aim line checks: another ball may stand in the way (two rows, two chains),
   * shots may curve (gravity, wind), and in the Jewel world what is touched
   * matters. Without any reachable candidate, the best one anyway.
   */
  const target = (tone: number): Candidate | null => {
    const list = candidates(tone);
    if (curving()) return list.find((candidate) => reach.has(candidate.id)) ?? null;
    const saved = game.shooter.angle;
    for (const candidate of list.slice(0, 8)) {
      game.aimAt(game.chains[candidate.chain]!.path.pointAt(candidate.s));
      if (game.aimTarget()?.ball.id === candidate.id) {
        game.shooter.aim(saved);
        return candidate;
      }
    }
    game.shooter.aim(saved);
    return alchemy ? null : (list[0] ?? null);
  };

  /**
   * Nothing useful to shoot at: aim where the ball lands next to a mixed colour,
   * which neither fuses nor wastes a good ball (Jewel world).
   */
  const harmless = (): boolean => {
    for (const chain of game.chains) {
      const visible = chain.balls.filter((ball) => ball.s >= 0);
      for (const ball of [...visible].reverse()) {
        if (mix(game.shooter.current, ball.tone) !== null) continue;
        game.aimAt(chain.positionOf(ball));
        if (game.aimTarget()?.ball.id === ball.id) return true;
      }
    }
    return false;
  };

  /** A ball between two balls of one same colour: pulling it out makes them meet. */
  const separator = () => {
    let best: { chain: number; s: number; id: number } | null = null;
    game.chains.forEach((chain, index) => {
      const balls = chain.balls;
      for (let i = 1; i + 1 < balls.length; i++) {
        const ball = balls[i]!;
        if (ball.s < 0 || balls[i - 1]!.tone !== balls[i + 1]!.tone) continue;
        if (ball.tone === balls[i - 1]!.tone) continue;
        if (curving() && !reach.has(ball.id)) continue;
        if (!best || ball.s > best.s) best = { chain: index, s: ball.s, id: ball.id };
      }
    });
    return best as { chain: number; s: number; id: number } | null;
  };

  /** A laser flies straight through four balls: the player aims it where it takes the most. */
  const aimLaser = (): boolean => {
    let best: { angle: number; balls: number } | null = null;
    for (let k = 0; k < 180; k++) {
      const angle = (k / 180) * Math.PI * 2;
      game.shooter.aim(angle);
      const balls = game.laserPath()?.targets.length ?? 0;
      if (balls > 0 && (!best || balls > best.balls)) best = { angle, balls };
    }
    if (best) game.shooter.aim(best.angle);
    return best !== null;
  };

  /** A rainbow ball takes the colour it touches: the player looks for the best pair of any colour. */
  const aimWild = (): boolean => {
    const tones = new Set(game.chains.flatMap((chain) => chain.balls.map((ball) => ball.tone)));
    const best = [...tones]
      .map((tone) => target(tone))
      .filter((candidate): candidate is Candidate => candidate !== null)
      .sort((a, b) => b.score - a.score)[0];
    if (!best) return false;
    const angle = reach.get(best.id);
    if (angle === undefined) game.aimAt(game.chains[best.chain]!.path.pointAt(best.s + 6));
    else game.shooter.aim(angle);
    return true;
  };

  for (let frameIndex = 0; frameIndex < 60 * 300 && game.state === 'playing'; frameIndex++) {
    // Waiting: the board runs short while balls are still to come out of a tunnel.
    if (game.chains.some((chain) => (chain.balls[0]?.s ?? 0) < 0)) {
      const onBoard = game.chains.reduce(
        (sum, chain) => sum + chain.balls.filter((ball) => ball.s >= 0).length,
        0,
      );
      if (onBoard === 0) idleFrames++;
      if (onBoard < 3) thinFrames++;
    }
    // Volcano world: a cautious player sends the lava into every free detour.
    if (frameIndex % 30 === 0) {
      for (const view of game.switches()) {
        if (!view.locked && view.branch === 'short') game.toggleSwitch(view.chain, view.fork);
      }
    }
    const magnet = game.magnet;
    if (frameIndex % cadence === 0 && game.shooter.ready) sweep();
    if (frameIndex % cadence === 0 && game.shooter.ready && magnet && magnet.charges > 0) {
      const target = separator();
      if (target) {
        const angle = reach.get(target.id);
        if (angle === undefined) game.aimAt(game.chains[target.chain]!.path.pointAt(target.s));
        else game.shooter.aim(angle);
        if (game.pull()) {
          game.update(1 / 60);
          continue;
        }
      }
    }
    // A power loaded a rainbow ball or a laser: the player uses it at once.
    const special = game.powerShot;
    if (frameIndex % cadence === 0 && game.shooter.ready && special) {
      if (special === 'laser' ? aimLaser() : aimWild()) {
        if (game.fire()) shots++;
        game.update(1 / 60);
        continue;
      }
    }
    if (frameIndex % cadence === 0 && game.shooter.ready) {
      let aim = target(game.shooter.current);
      const other = target(game.shooter.next);
      if (other && (!aim || other.score > aim.score + 1)) {
        game.swap();
        aim = other;
      }
      if (aim) {
        const chain = game.chains[aim.chain]!;
        const angle = reach.get(aim.id);
        const error = (hand.next() - 0.5) * 2 * sloppiness;
        // Around the black hole, the error is on the angle: about as far off at the chain.
        if (angle === undefined) game.aimAt(chain.path.pointAt(aim.s + 6 + error));
        else game.shooter.aim(angle + error * 0.0006);
        if (game.fire()) shots++;
      } else if (alchemy && harmless()) {
        if (game.fire()) shots++;
      }
    }
    game.update(1 / 60);
    let ahead = 0;
    for (const chain of game.chains) {
      const head = chain.balls[chain.balls.length - 1];
      if (head) ahead = Math.max(ahead, head.s / chain.path.length);
    }
    danger = Math.max(danger, ahead);
    if (ahead > PRESSURE_FROM) pressureFrames++;
  }
  return {
    outcome: game.state === 'playing' ? 'timeout' : game.state,
    score: game.score,
    seconds: Math.round(game.elapsed),
    shots,
    danger: Math.round(danger * 100) / 100,
    pressure: Math.round(pressureFrames / 6) / 10,
    rivalScore: game.rivalScore,
    idle: Math.round(idleFrames / 6) / 10,
    thin: Math.round(thinFrames / 6) / 10,
    bestStreak: game.summary().bestStreak,
    bonus,
    elapsed: Math.round(game.elapsed * 10) / 10,
  };
}
