import { describe, expect, it } from 'vitest';
import type { AppServices } from '@/app/AppServices';
import { createMode, type Settlement } from '@/app/modes';
import type { GameReport } from '@/engine/Game';
import { PUZZLES } from '@/levels/arcade/puzzles';
import { SONGS } from '@/levels/arcade/rhythm';
import { CAMPAIGN, findLevel, starThresholds } from '@/levels/campaign';
import type { Difficulty } from '@/levels/difficulty';
import { FRAMES } from '@/levels/tracks';
import { DailyChallenge } from '@/player/DailyChallenge';
import { PlayerProfile } from '@/player/PlayerProfile';
import { REWARDS } from '@/player/rewards';
import { ArcadeProgress } from '@/services/ArcadeProgress';
import { CampaignProgress } from '@/services/CampaignProgress';
import { MemoryStorage } from '@/services/KeyValueStorage';

/** The services the modes use, on memory storage. */
const services = (): AppServices => {
  const storage = new MemoryStorage();
  return {
    progress: new CampaignProgress(storage),
    arcade: new ArcadeProgress(storage),
    player: new PlayerProfile(storage),
  } as unknown as AppServices;
};

/** What the player brings to a game. */
const play = (assisted: boolean, difficulty: Difficulty) => ({
  assisted,
  difficulty,
  upgrades: {},
});

/** Shards a game paid, without those of the achievements it reached. */
const paid = ({ rewards }: Settlement) =>
  rewards.shards - rewards.achievements.reduce((sum, achievement) => sum + achievement.reward, 0);

const report = (overrides: Partial<GameReport> = {}): GameReport => ({
  outcome: 'won',
  score: 2000,
  seconds: 60,
  ballsDestroyed: 40,
  bestDepth: 1,
  bestStreak: 2,
  bestBounce: 0,
  swaps: 3,
  pulls: 0,
  fusions: 0,
  switches: 0,
  curves: 0,
  shots: 2,
  bestGroove: 1,
  stage: 0,
  rivalScore: 0,
  fragments: 0,
  danger: 0.5,
  colossusDefeated: false,
  ...overrides,
});

describe('play modes', () => {
  it('play a campaign level: stars, record, next level, assistance', () => {
    const app = services();
    const level = findLevel('nebula-01')!;
    const mode = createMode({ kind: 'campaign', level });
    expect(mode.label).toEqual({ key: 'campaign.levelShort', params: { world: 1, number: 1 } });
    expect(mode.stars).toEqual(starThresholds(level));
    expect(mode.home).toBe('campaign');
    expect(mode.hint).toBe('aim');
    expect(mode.next(app)).toBeNull();
    const settled = mode.settle(report(), app);
    expect(settled.stars).toBeGreaterThan(0);
    expect(settled.record).toEqual({ value: 2000, newBest: false, unit: 'score' });
    expect(settled.rewards.shards).toBeGreaterThan(0);
    expect(mode.next(app)?.request).toEqual({ kind: 'campaign', level: CAMPAIGN[1] });
    expect(mode.next(app)?.label).toEqual({
      key: 'game.nextLevelNamed',
      params: { level: { key: 'campaign.levelShort', params: { world: 1, number: 2 } } },
    });
    // Level 1-2 teaches nothing new; level 1-3 brings the Rewind marble.
    expect(mode.next(app)?.detail).toBeUndefined();
    const second = createMode({ kind: 'campaign', level: findLevel('nebula-02')! });
    second.settle(report(), app);
    expect(second.next(app)?.detail).toEqual({
      key: 'next.power',
      params: { name: { key: 'power.rewind.name' } },
    });
    const slow = mode.definition(FRAMES.square, play(true, 'pilot'));
    expect(slow.speed).toBeLessThan(mode.definition(FRAMES.square, play(false, 'pilot')).speed);
    const legend = mode.definition(FRAMES.square, play(false, 'legend'));
    expect(legend.speed).toBeGreaterThan(
      mode.definition(FRAMES.square, play(false, 'pilot')).speed,
    );
    expect(legend.scoreFactor).toBe(1.3);
  });

  it('play the daily challenge with its shared seed', () => {
    const challenge = DailyChallenge.of(new Date(2026, 9, 12));
    const mode = createMode({ kind: 'daily', challenge });
    expect(mode.seed).toBe(challenge.seed);
    expect(mode.home).toBe('home');
    expect(mode.settle(report(), services()).rewards.firstDailyAttempt).toBe(true);
  });

  it('keep the Endless record and pay by score', () => {
    const app = services();
    const mode = createMode({ kind: 'endless' });
    expect(mode.home).toBe('arcade');
    expect(mode.stars).toBeNull();
    expect(mode.outcome(false)).toEqual({ key: 'arcade.endless.over' });
    const settled = mode.settle(report({ outcome: 'lost', score: 12_345, stage: 3 }), app);
    expect(settled.stars).toBeNull();
    expect(settled.record).toEqual({ value: 12_345, newBest: true, unit: 'score' });
    expect(paid(settled)).toBe(REWARDS.endlessMax);
    expect(mode.definition(FRAMES.portrait, play(false, 'pilot')).endless).toBeDefined();
  });

  it('pay a puzzle the first time it is solved, then open the next one', () => {
    const app = services();
    const puzzle = PUZZLES[0]!;
    const mode = createMode({ kind: 'puzzle', puzzle });
    expect(mode.label).toEqual({ key: 'arcade.puzzle.short', params: { number: 1 } });
    const first = mode.settle(report({ shots: puzzle.par }), app);
    expect(first.stars).toBe(3);
    expect(paid(first)).toBe(REWARDS.puzzleSolved + 3 * REWARDS.puzzlePerStar);
    expect(paid(mode.settle(report({ shots: puzzle.par }), app))).toBe(0);
    expect(mode.next(app)?.request).toEqual({ kind: 'puzzle', puzzle: PUZZLES[1] });
    expect(app.player.view.stats.puzzlesSolved).toBe(1);
  });

  it('count the puzzle of the day once', () => {
    const app = services();
    const mode = createMode({ kind: 'puzzle', puzzle: PUZZLES[4]!, day: '20261012' });
    expect(mode.label).toEqual({ key: 'arcade.puzzle.daily' });
    expect(paid(mode.settle(report(), app))).toBe(REWARDS.dailyPuzzleSolved);
    expect(paid(mode.settle(report(), app))).toBe(0);
    expect(mode.next(app)).toBeNull();
  });

  it('keep the best score of a song and offer the next one', () => {
    const app = services();
    const mode = createMode({ kind: 'rhythm', song: SONGS[0]! });
    expect(paid(mode.settle(report({ bestGroove: 4 }), app))).toBe(REWARDS.songCleared);
    expect(app.player.view.stats.bestGroove).toBe(4);
    expect(mode.next(app)?.request).toEqual({ kind: 'rhythm', song: SONGS[1] });
    expect(mode.definition(FRAMES.square, play(false, 'pilot')).rhythm?.bpm).toBe(SONGS[0]!.bpm);
  });

  it('count duels won by difficulty and offer a stronger rival', () => {
    const app = services();
    const mode = createMode({ kind: 'duel', difficulty: 'hard' });
    expect(mode.outcome(true)).toEqual({ key: 'arcade.duel.won' });
    const won = mode.settle(report(), app);
    expect(won.record).toEqual({ value: 1, newBest: false, unit: 'wins' });
    expect(paid(won)).toBe(REWARDS.duelWon.hard);
    expect(won.rewards.achievements.map((item) => item.id)).toContain('duel-hard');
    expect(mode.settle(report({ outcome: 'lost' }), app).record?.value).toBe(1);
    expect(mode.next(app)).toBeNull();
    expect(createMode({ kind: 'duel', difficulty: 'easy' }).next(app)?.request).toEqual({
      kind: 'duel',
      difficulty: 'normal',
    });
  });
});
