import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndOfGame, type EndOfGameContext } from '@/app/EndOfGame';
import { createMode, type Settlement } from '@/app/modes';
import { DUEL_DIFFICULTIES } from '@/levels/arcade/duel';
import { PUZZLES } from '@/levels/arcade/puzzles';
import { CAMPAIGN } from '@/levels/campaign';
import { DailyChallenge } from '@/player/DailyChallenge';
import { ASSIST_AFTER, HINT_COOLDOWN } from '@/player/rewards';

const FIRST = CAMPAIGN[0]!;
const LAST = CAMPAIGN[CAMPAIGN.length - 1]!;

/** A portal with ads that work, and a player who lost a level `failures` times. */
const context = (overrides: Partial<EndOfGameContext> = {}, failures = 0): EndOfGameContext => ({
  portal: true,
  ads: { rewardsOffered: true, reviveOffered: true },
  player: { failures: () => failures },
  ...overrides,
});

const settlement = (
  overrides: Partial<Settlement['rewards']> = {},
  record: Settlement['record'] = null,
): Settlement => ({
  stars: null,
  record,
  rewards: { shards: 0, achievements: [], unlocked: [], firstDailyAttempt: false, ...overrides },
});

const campaign = (level = FIRST) => createMode({ kind: 'campaign', level });

describe('EndOfGame', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a defeat unsaved once a game, on a portal, while it may be continued', () => {
    const rules = new EndOfGame(campaign(), context());
    expect(rules.holdDefeat(true)).toBe(true);
    expect(rules.offersContinue('lost')).toBe(true);
    rules.continuedOnce();
    expect(rules.pendingLoss).toBe(false);
    // Lost again after continuing: saved at once.
    expect(rules.holdDefeat(true)).toBe(false);
    rules.restart();
    expect(rules.holdDefeat(true)).toBe(true);
  });

  it('saves the defeat at once on our site, in a mode that is compared, or when it cannot revive', () => {
    expect(new EndOfGame(campaign(), context({ portal: false })).holdDefeat(true)).toBe(false);
    const daily = createMode({
      kind: 'daily',
      challenge: DailyChallenge.of(new Date(2026, 9, 23)),
    });
    expect(new EndOfGame(daily, context()).holdDefeat(true)).toBe(false);
    expect(new EndOfGame(campaign(), context()).holdDefeat(false)).toBe(false);
  });

  it('releases the defeat kept once, to be saved', () => {
    const rules = new EndOfGame(campaign(), context());
    rules.holdDefeat(true);
    expect(rules.releaseDefeat()).toBe(true);
    expect(rules.releaseDefeat()).toBe(false);
    expect(rules.offersContinue('lost')).toBe(false);
  });

  it('offers the assistance after repeated defeats of a campaign level, the one kept included', () => {
    const almost = new EndOfGame(campaign(), context({}, ASSIST_AFTER - 1));
    expect(almost.offersAssist('lost', false)).toBe(false);
    almost.holdDefeat(true);
    expect(almost.offersAssist('lost', false)).toBe(true);
    const enough = new EndOfGame(campaign(), context({ portal: false }, ASSIST_AFTER));
    expect(enough.offersAssist('lost', false)).toBe(true);
    expect(enough.offersAssist('lost', true)).toBe(false);
    expect(enough.offersAssist('won', false)).toBe(false);
    const duel = createMode({ kind: 'duel', difficulty: DUEL_DIFFICULTIES[0]! });
    expect(new EndOfGame(duel, context({}, 10)).offersAssist('lost', false)).toBe(false);
  });

  it('doubles the shards of a game once, for an ad that can be shown', () => {
    const paid = settlement({ shards: 30 });
    const rules = new EndOfGame(campaign(), context());
    expect(rules.offersDouble(null, paid)).toBe(false);
    expect(rules.offersDouble('won', settlement())).toBe(false);
    expect(rules.offersDouble('won', paid)).toBe(true);
    rules.doubledOnce();
    expect(rules.offersDouble('won', paid)).toBe(false);
    const blocked = context({ ads: { rewardsOffered: false, reviveOffered: false } });
    expect(new EndOfGame(campaign(), blocked).offersDouble('won', paid)).toBe(false);
  });

  it('offers a puzzle hint on a portal while playing, a minute apart', () => {
    vi.useFakeTimers();
    const puzzle = createMode({ kind: 'puzzle', puzzle: PUZZLES[0]! });
    const rules = new EndOfGame(puzzle, context());
    expect(rules.offersHint(false)).toBe(false);
    expect(rules.offersHint(true)).toBe(true);
    rules.restHint();
    expect(rules.offersHint(true)).toBe(false);
    vi.advanceTimersByTime(HINT_COOLDOWN * 1000);
    expect(rules.offersHint(true)).toBe(true);
    expect(new EndOfGame(puzzle, context({ portal: false })).offersHint(true)).toBe(false);
    expect(new EndOfGame(campaign(), context()).offersHint(true)).toBe(false);
  });

  it('plays no ad between games after an offer to continue for an ad', () => {
    const rules = new EndOfGame(campaign(), context());
    expect(rules.adBetweenGames('lost')).toBe(true);
    rules.holdDefeat(true);
    expect(rules.adBetweenGames('lost')).toBe(false);
    const shardsOnly = new EndOfGame(
      campaign(),
      context({ ads: { rewardsOffered: false, reviveOffered: false } }),
    );
    shardsOnly.holdDefeat(true);
    expect(shardsOnly.adBetweenGames('lost')).toBe(true);
  });

  it('celebrates an item unlocked, the end of the campaign and a new Endless record', () => {
    const plain = settlement();
    const won = { outcome: 'won' } as const;
    const lost = { outcome: 'lost' } as const;
    expect(new EndOfGame(campaign(), context()).celebrates(won, plain)).toBe(false);
    expect(
      new EndOfGame(campaign(), context()).celebrates(
        won,
        settlement({ unlocked: [{ id: 'x' } as never] }),
      ),
    ).toBe(true);
    expect(new EndOfGame(campaign(LAST), context()).celebrates(lost, plain)).toBe(false);
    const endless = createMode({ kind: 'endless' });
    const record = { value: 9000, newBest: true, unit: 'score' as const };
    expect(new EndOfGame(endless, context()).celebrates(lost, settlement({}, record))).toBe(true);
  });

  it('celebrates the last level of the campaign won, read from the report, with nothing unlocked', () => {
    // The game is saved as soon as it ends, a moment before its result is on
    // screen: the win is the report's, never the screen's (fixed in 1.7.6).
    const rules = new EndOfGame(campaign(LAST), context());
    expect(rules.celebrates({ outcome: 'won' }, settlement())).toBe(true);
  });
});
