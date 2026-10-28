import { describe, expect, it } from 'vitest';
import { CLOSE_SHARE, DefeatSummary } from '@/app/DefeatSummary';
import type { GameReport } from '@/engine/Game';

/** A lost game's report, as the engine settles it, with what a test needs changed. */
const lost = (changes: Partial<GameReport> = {}): GameReport => ({
  outcome: 'lost',
  score: 1200,
  seconds: 74,
  ballsDestroyed: 41,
  bestDepth: 4,
  bestStreak: 3,
  bestBounce: 0,
  swaps: 2,
  pulls: 0,
  fusions: 0,
  switches: 0,
  curves: 0,
  shots: 30,
  chargedShots: 1,
  ballsLeft: 9,
  colossus: null,
  bestGroove: 1,
  stage: 0,
  rivalScore: 0,
  fragments: 0,
  danger: 1,
  colossusDefeated: false,
  ...changes,
});

/**
 * A defeat as its screen tells it (v1.8.1, spec § 3.17): honestly, how close
 * it came, the deepest reaction, and one tip.
 */
describe('DefeatSummary', () => {
  it('tells the marbles left and the share of the chain destroyed', () => {
    const summary = DefeatSummary.of(lost(), 'touch', null);
    expect(summary.left).toEqual({ what: 'marbles', count: 9 });
    expect(summary.share).toBeCloseTo(41 / 50);
    expect(summary.reaction).toBe(4);
  });

  it('reads "So close!" from 70 % of the level destroyed, "The chain wins" below', () => {
    expect(CLOSE_SHARE).toBe(0.7);
    expect(DefeatSummary.of(lost({ ballsDestroyed: 35, ballsLeft: 15 }), 'mouse', null).close).toBe(
      true,
    );
    expect(DefeatSummary.of(lost({ ballsDestroyed: 34, ballsLeft: 16 }), 'mouse', null).close).toBe(
      false,
    );
  });

  it("tells a Colossus's hit points left instead of the marbles", () => {
    const summary = DefeatSummary.of(lost({ colossus: { hp: 7.4, maxHp: 30 } }), 'touch', null);
    expect(summary.left).toEqual({ what: 'colossus', count: 8 });
    expect(summary.share).toBeCloseTo(1 - 7.4 / 30);
  });

  it('first teaches a gesture the game never used, as the player makes it', () => {
    expect(DefeatSummary.of(lost({ swaps: 0 }), 'touch', null).tip).toBe(
      'game.defeat.tips.swap.touch',
    );
    expect(DefeatSummary.of(lost({ swaps: 0 }), 'mouse', null).tip).toBe(
      'game.defeat.tips.swap.mouse',
    );
    const charge = DefeatSummary.of(lost({ chargedShots: 0 }), 'touch', 'wind');
    expect(charge.tip).toBe('game.defeat.tips.charge.touch');
    expect(charge.gesture).toBe('charge');
  });

  it("then gives the level's own hint, never one that opens a level", () => {
    const hint = DefeatSummary.of(lost(), 'touch', 'magnetCombo');
    expect(hint.tip).toBe('hints.magnetCombo');
    expect(hint.gesture).toBeNull();
    for (const opening of ['aim', 'match', 'swap'] as const) {
      expect(DefeatSummary.of(lost(), 'touch', opening).tip).toBe('hints.reaction');
    }
    expect(DefeatSummary.of(lost(), 'mouse', null).tip).toBe('hints.reaction');
  });

  it('keeps the share between 0 and 1', () => {
    expect(DefeatSummary.of(lost({ ballsDestroyed: 0, ballsLeft: 0 }), 'touch', null).share).toBe(
      0,
    );
    expect(
      DefeatSummary.of(lost({ colossus: { hp: -2, maxHp: 30 } }), 'touch', null).share,
    ).toBeLessThanOrEqual(1);
  });
});
