import { ingredients, mix } from '@/engine/chain/Alchemy';
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
  /** Points of the computer rival (Duel mode). */
  readonly rivalScore: number;
}

/**
 * A simple greedy player, for balancing: it shoots at a visible ball of the
 * loaded colour, preferring pairs and the balls closest to the hole, and
 * swaps when the next ball has a better target. A human does better.
 */
export function playLevel(
  level: CampaignLevel,
  frame: Frame,
  seed: string,
  /** Frames between two shots (54 ≈ a casual player's 0.9 s). */
  cadence = 54,
  /** Aim error, in board units along the track. */
  sloppiness = 18,
): BotResult {
  return playDefinition(resolveLevel(level, frame), seed, cadence, sloppiness);
}

/** The same player, on any level given as data (Arcade modes). */
export function playDefinition(
  definition: LevelDefinition,
  seed: string,
  cadence = 54,
  sloppiness = 18,
): BotResult {
  const hand = SeededRandom.fromString(`hand:${seed}`);
  const game = new Game(toLevelSetup(definition), SeededRandom.fromString(seed));
  const alchemy = game.setup.alchemy === true;
  const gravity = game.gravity;
  let shots = 0;
  let danger = 0;
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
        found.push({
          score: pair * 2 + fusion + ball.s / chain.path.length,
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
  const sweep = () => {
    reach = new Map();
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
   * aim line would check (only where touching another ball matters: alchemy,
   * or where shots curve: gravity).
   */
  const target = (tone: number): Candidate | null => {
    const list = candidates(tone);
    if (gravity) return list.find((candidate) => reach.has(candidate.id)) ?? null;
    if (!alchemy) return list[0] ?? null;
    const saved = game.shooter.angle;
    for (const candidate of list.slice(0, 8)) {
      game.aimAt(game.chains[candidate.chain]!.path.pointAt(candidate.s));
      if (game.aimTarget()?.ball.id === candidate.id) {
        game.shooter.aim(saved);
        return candidate;
      }
    }
    game.shooter.aim(saved);
    return null;
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
        if (gravity && !reach.has(ball.id)) continue;
        if (!best || ball.s > best.s) best = { chain: index, s: ball.s, id: ball.id };
      }
    });
    return best as { chain: number; s: number; id: number } | null;
  };

  for (let frameIndex = 0; frameIndex < 60 * 300 && game.state === 'playing'; frameIndex++) {
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
    for (const chain of game.chains) {
      const head = chain.balls[chain.balls.length - 1];
      if (head) danger = Math.max(danger, head.s / chain.path.length);
    }
  }
  return {
    outcome: game.state === 'playing' ? 'timeout' : game.state,
    score: game.score,
    seconds: Math.round(game.elapsed),
    shots,
    danger: Math.round(danger * 100) / 100,
    rivalScore: game.rivalScore,
  };
}
