import { SeededRandom } from '@/engine/core/Random';
import { Game } from '@/engine/Game';
import type { CampaignLevel } from '@/levels/campaign';
import { resolveLevel } from '@/levels/campaign';
import { toLevelSetup } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';

export interface BotResult {
  readonly outcome: 'won' | 'lost' | 'timeout';
  readonly score: number;
  readonly seconds: number;
  readonly shots: number;
  /** Furthest the head of a chain got, as a share of its track (1 = the hole). */
  readonly danger: number;
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
  const hand = SeededRandom.fromString(`hand:${seed}`);
  const game = new Game(toLevelSetup(resolveLevel(level, frame)), SeededRandom.fromString(seed));
  let shots = 0;
  let danger = 0;
  const target = (tone: number) => {
    let best: { score: number; chain: number; s: number } | null = null;
    game.chains.forEach((chain, index) => {
      const balls = chain.balls;
      balls.forEach((ball, i) => {
        if (ball.tone !== tone || ball.s < 0) return;
        const pair = (balls[i - 1]?.tone === tone ? 1 : 0) + (balls[i + 1]?.tone === tone ? 1 : 0);
        const score = pair * 2 + ball.s / chain.path.length;
        if (!best || score > best.score) best = { score, chain: index, s: ball.s };
      });
    });
    return best as { score: number; chain: number; s: number } | null;
  };

  for (let frameIndex = 0; frameIndex < 60 * 300 && game.state === 'playing'; frameIndex++) {
    if (frameIndex % cadence === 0 && game.shooter.ready) {
      let aim = target(game.shooter.current);
      const other = target(game.shooter.next);
      if (other && (!aim || other.score > aim.score + 1)) {
        game.swap();
        aim = other;
      }
      if (aim) {
        const chain = game.chains[aim.chain]!;
        game.aimAt(chain.path.pointAt(aim.s + 6 + (hand.next() - 0.5) * 2 * sloppiness));
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
  };
}
