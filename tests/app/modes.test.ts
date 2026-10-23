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
    expect(mode.hint).toBe('match');
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
    // Level 1-2 teaches nothing new; level 1-3 brings the young Colossus, 1-4 the Rewind marble.
    expect(mode.next(app)?.detail).toBeUndefined();
    const second = createMode({ kind: 'campaign', level: findLevel('nebula-02')! });
    second.settle(report(), app);
    expect(second.next(app)?.detail).toEqual({
      key: 'next.colossus',
      params: { name: { key: 'colossus.young' } },
    });
    const third = createMode({ kind: 'campaign', level: findLevel('nebula-03')! });
    third.settle(report(), app);
    expect(third.next(app)?.detail).toEqual({
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

  it('name the Colossus a game opposes, the young one of 1-3 included', () => {
    const boss = (id: string) => createMode({ kind: 'campaign', level: findLevel(id)! }).boss;
    expect(boss('nebula-01')).toBeNull();
    expect(boss('nebula-03')).toEqual({ key: 'colossus.young' });
    expect(boss('nebula-12')).toEqual({ key: 'colossus.nebula' });
    expect(boss('neon-12')).toEqual({ key: 'colossus.neon' });
    expect(createMode({ kind: 'endless' }).boss).toBeNull();
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

describe('what the game screen asks its mode (v1.7.6)', () => {
  const first = CAMPAIGN[0]!;
  const last = CAMPAIGN[CAMPAIGN.length - 1]!;

  it('a campaign level: ranked, assisted on request, taught by a gesture at 1-1', () => {
    const mode = createMode({ kind: 'campaign', level: first, assisted: true });
    expect(mode.definition(FRAMES.square, play(false, 'pilot')).lesson).toBe('shot');
    expect(mode.assisted).toBe(true);
    expect(mode.ranked).toBe(true);
    expect(mode.assistLevel).toBe(first.id);
    expect(mode.music).toBe(first.world);
    expect(mode.daily).toBeNull();
    expect(mode.finale).toBe(false);
    expect(createMode({ kind: 'campaign', level: last }).finale).toBe(true);
    expect(createMode({ kind: 'campaign', level: last }).assisted).toBe(false);
  });

  it('the daily challenge: its challenge, no assistance, no ranking', () => {
    const challenge = DailyChallenge.of(new Date(2026, 9, 23));
    const mode = createMode({ kind: 'daily', challenge });
    expect(mode.daily).toBe(challenge);
    expect(mode.assistLevel).toBeNull();
    expect(mode.ranked).toBe(false);
    expect(mode.music).toBe(challenge.level.world);
  });

  it('a puzzle: its par, a hint to have, the swap that shows the next colour', () => {
    const puzzle = PUZZLES[0]!;
    const mode = createMode({ kind: 'puzzle', puzzle });
    expect(mode.par).toBe(puzzle.par);
    expect(mode.hintable).toBe(true);
    expect(mode.swapLabel).toEqual({ key: 'arcade.puzzle.nextColour' });
  });

  it('a song plays its own music in its own key; a duel shows its rope', () => {
    const song = SONGS[0]!;
    const rhythm = createMode({ kind: 'rhythm', song });
    expect(rhythm.music).toBeNull();
    expect(rhythm.root).toBe(song.root);
    expect(createMode({ kind: 'duel', difficulty: 'normal' }).rope).toBe(true);
    const endless = createMode({ kind: 'endless' });
    expect(endless.rope).toBe(false);
    expect(endless.swapLabel).toEqual({ key: 'game.swap' });
    expect(endless.par).toBeNull();
    expect(endless.root).toBeNull();
  });
});

describe('the training (v1.8.0)', () => {
  const options = play(false, 'pilot');

  it('shows its place among the showcases, and nothing of the campaign', () => {
    const mode = createMode({ kind: 'training', step: 2 });
    expect(mode.training).toMatchObject({ step: 2, of: 3 });
    expect(mode.stars).toBeNull();
    expect(mode.ranked).toBe(false);
    expect(mode.continuable).toBe(false);
    expect(mode.assistLevel).toBeNull();
    expect(mode.world).toBe('neon');
    // The same chain every time: each showcase is tuned to reach its moment.
    expect(mode.seed).toBe('training-2');
    expect(createMode({ kind: 'campaign', level: CAMPAIGN[0]! }).training).toBeNull();
  });

  it('stops its chains short of the hole, and ends on a burst or on the promise', () => {
    const e1 = createMode({ kind: 'training', step: 1 }).definition(FRAMES.square, options);
    expect(e1.halt).toBeGreaterThan(0.8);
    expect(e1.halt).toBeLessThan(1);
    expect(e1.victory).toBe('short');
    expect(e1.gift).toBe('bomb');
    expect(e1.lesson).toBe('shot');
    const e3 = createMode({ kind: 'training', step: 3 }).definition(FRAMES.square, options);
    expect(e3.victory).toBe('promise');
    expect(e3.lesson).toBe('curve');
    expect(e3.gravity).toBeDefined();
  });

  it('can be skipped for good, from any showcase, for the first level', () => {
    const shared = services();
    const skipped = createMode({ kind: 'training', step: 2 }).training!.skip(shared);
    expect(skipped).toEqual({ kind: 'campaign', level: CAMPAIGN[0] });
    expect(shared.player.training.done).toBe(true);
  });

  it('pays nothing, resumes at the next showcase, and ends on the first level', () => {
    const shared = services();
    const first = createMode({ kind: 'training', step: 1 });
    const settled = first.settle(report(), shared);
    expect(settled.rewards.shards).toBe(0);
    expect(shared.player.training).toEqual({ step: 2, done: false });
    // Not a game of the campaign: a training left halfway resumes where it stopped.
    expect(shared.player.view.stats.gamesPlayed).toBe(0);
    expect(first.next(shared)).toEqual({
      request: { kind: 'training', step: 2 },
      label: { key: 'training.step', params: { step: 2, of: 3 } },
    });
    expect(first.outcome(true).key).toBe('game.won');
    expect(first.celebrates(true, settled)).toBe(false);
    const last = createMode({ kind: 'training', step: 3 });
    last.settle(report(), shared);
    expect(shared.player.training.done).toBe(true);
    expect(last.next(shared)?.request).toEqual({ kind: 'campaign', level: CAMPAIGN[0] });
    expect(last.next(shared)?.detail?.params?.level).toEqual({
      key: 'campaign.levelShort',
      params: { world: 1, number: 1 },
    });
    expect(last.outcome(true).key).toBe('training.end.title');
    expect(last.celebrates(true, settled)).toBe(true);
  });
});
