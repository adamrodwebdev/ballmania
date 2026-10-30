import type { GameReport } from '@/engine/Game';
import { starsFor, starThresholds } from '@/levels/calibration';
import { CAMPAIGN, colossusName, nextLevel, WORLDS, type CampaignLevel } from '@/levels/campaign';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import { noveltyOf, type Novelty } from '@/levels/novelty';
import { resolveLevel } from '@/levels/resolveLevel';
import type { Seat } from '@/levels/seat';
import type { Frame } from '@/levels/tracks';
import type { DailyChallenge } from '@/player/DailyChallenge';
import { assistanceOf, type Assistance } from '@/player/rewards';
import type { AppServices } from '../AppServices';
import { DefeatSummary, type Aiming } from '../DefeatSummary';
import type { PlayRequest } from '../PlayRequest';
import type { Message, NextGame, PlayedGame, PlayMode, PlayOptions, Settlement } from './PlayMode';

/** Seconds between two star fragments, on average, without the Attrape-étoiles upgrade. */
export const FRAGMENT_EVERY = 9;

const ORDER = CAMPAIGN.map((level) => level.id);
const worldNumber = (level: CampaignLevel) =>
  WORLDS.findIndex((world) => world.id === level.world) + 1;

/** "1-3": the short name of a level. */
export const shortName = (level: CampaignLevel): Message => ({
  key: 'campaign.levelShort',
  params: { world: worldNumber(level), number: level.number },
});

/** The name of the Colossus a level opposes, if it has one. */
const bossOf = (level: CampaignLevel): Message | null =>
  level.colossus ? { key: colossusName(level.world, level.colossus.young) } : null;

/** How each kind of novelty is said under the "next level" button. */
const NOVELTY_MESSAGES: {
  readonly [K in Novelty['kind']]: (novelty: Extract<Novelty, { kind: K }>) => Message;
} = {
  world: ({ world }) => ({ key: 'next.world', params: { name: { key: `worlds.${world}.name` } } }),
  colossus: ({ world, young }) => ({
    key: 'next.colossus',
    params: { name: { key: colossusName(world, young) } },
  }),
  power: ({ power }) => ({ key: 'next.power', params: { name: { key: `power.${power}.name` } } }),
  mechanic: ({ hint }) => ({
    key: 'next.mechanic',
    params: { name: { key: `next.mechanics.${hint}` } },
  }),
};

const noveltyMessage = (novelty: Novelty): Message =>
  (NOVELTY_MESSAGES[novelty.kind] as (novelty: Novelty) => Message)(novelty);

/** The world a win finishes, if the level is the last of its world. */
const worldFinished = (level: CampaignLevel) => {
  const world = WORLDS.find((candidate) => candidate.id === level.world);
  return world?.levels[world.levels.length - 1]?.id === level.id ? level.world : undefined;
};

/** A level of the campaign: stars, best score, the next level, the assistance. */
export class CampaignMode implements PlayMode {
  readonly home = 'campaign';
  readonly continuable = true;
  readonly seed = null;
  readonly daily = null;
  readonly rope = false;
  readonly root = null;
  readonly ranked = true;
  readonly swapLabel: Message = { key: 'game.swap' };
  readonly hintable = false;
  readonly par = null;
  readonly training = null;

  constructor(
    readonly request: Extract<PlayRequest, { kind: 'campaign' }>,
    private readonly level: CampaignLevel = request.level,
  ) {}

  get world() {
    return this.level.world;
  }

  get music() {
    return this.level.world;
  }

  get assisted(): boolean {
    return this.request.assisted === true;
  }

  get assistLevel(): string {
    return this.level.id;
  }

  get assistance(): Assistance {
    return assistanceOf(this.level.world);
  }

  get finale(): boolean {
    return this.level.id === CAMPAIGN[CAMPAIGN.length - 1]?.id;
  }

  get boss(): Message | null {
    return bossOf(this.level);
  }

  get hint() {
    return this.level.hint ?? null;
  }

  get alchemy(): boolean {
    return this.level.palette !== undefined;
  }

  get label(): Message {
    return shortName(this.level);
  }

  stars(seat: Seat): readonly [number, number] {
    return starThresholds(this.level, seat);
  }

  outcome(won: boolean): Message {
    return { key: won ? 'game.won' : 'game.lost' };
  }

  celebrates(won: boolean): boolean {
    return won && this.finale;
  }

  defeat(report: GameReport, aiming: Aiming): DefeatSummary {
    return DefeatSummary.of(report, aiming, this.hint);
  }

  definition(
    frame: Frame,
    { assisted, difficulty, upgrades, aiming }: PlayOptions,
  ): LevelDefinition {
    const resolved = resolveLevel(this.level, frame, { difficulty, aiming });
    return {
      ...resolved,
      speed: resolved.speed * (assisted ? this.assistance.speed : 1),
      upgrades,
      fragments: { every: FRAGMENT_EVERY },
    };
  }

  settle(report: PlayedGame, { progress, player }: AppServices): Settlement {
    const won = report.outcome === 'won';
    const stars = starsFor(this.level, report.seat, { score: report.score, won });
    const result = won ? progress.record(this.level.id, report.score, stars) : null;
    const world = won ? worldFinished(this.level) : undefined;
    const rewards = player.recordGame(report, {
      kind: 'campaign',
      levelId: this.level.id,
      stars,
      starsGained: result?.starsGained ?? 0,
      threeStarLevels: progress.threeStarCount(ORDER),
      ...(world ? { worldCompleted: world } : {}),
    });
    return {
      stars,
      starsGained: result?.starsGained ?? 0,
      record: result && { value: result.best, newBest: result.newBest, unit: 'score' },
      rewards,
    };
  }

  next({ progress }: AppServices): NextGame | null {
    const following = nextLevel(this.level);
    if (!following || !progress.isUnlocked(ORDER, following.id)) return null;
    const novelty = noveltyOf(following);
    return {
      request: { kind: 'campaign', level: following },
      label: { key: 'game.nextLevelNamed', params: { level: shortName(following) } },
      ...(novelty ? { detail: noveltyMessage(novelty) } : {}),
    };
  }
}

/** The daily challenge: one level, the same balls for everyone, the first attempt counts. */
export class DailyMode implements PlayMode {
  readonly home = 'home';
  readonly continuable = false;
  readonly hint = null;
  readonly assisted = false;
  readonly rope = false;
  readonly root = null;
  readonly ranked = false;
  readonly swapLabel: Message = { key: 'game.swap' };
  readonly hintable = false;
  readonly par = null;
  readonly assistLevel = null;
  readonly assistance = null;
  readonly finale = false;
  readonly training = null;
  private readonly challenge: DailyChallenge;

  constructor(readonly request: Extract<PlayRequest, { kind: 'daily' }>) {
    this.challenge = request.challenge;
  }

  get world() {
    return this.challenge.level.world;
  }

  get music() {
    return this.challenge.level.world;
  }

  get daily(): DailyChallenge {
    return this.challenge;
  }

  get boss(): Message | null {
    return bossOf(this.challenge.level);
  }

  get alchemy(): boolean {
    return this.challenge.level.palette !== undefined;
  }

  get seed(): string {
    return this.challenge.seed;
  }

  get label(): Message {
    return { key: 'daily.short' };
  }

  stars(seat: Seat): readonly [number, number] {
    return starThresholds(this.challenge.level, seat);
  }

  outcome(won: boolean): Message {
    return { key: won ? 'game.won' : 'game.lost' };
  }

  celebrates(): boolean {
    return false;
  }

  /** The daily result keeps its own defeat: the first attempt's score counts and is shared. */
  defeat(): null {
    return null;
  }

  definition(frame: Frame, { aiming }: PlayOptions): LevelDefinition {
    return resolveLevel(this.challenge.level, frame, { aiming });
  }

  settle(report: PlayedGame, { progress, player }: AppServices): Settlement {
    const stars = starsFor(this.challenge.level, report.seat, {
      score: report.score,
      won: report.outcome === 'won',
    });
    const rewards = player.recordGame(report, {
      kind: 'daily',
      levelId: this.challenge.level.id,
      stars,
      starsGained: 0,
      threeStarLevels: progress.threeStarCount(ORDER),
      day: this.challenge.day,
    });
    return { stars, record: null, rewards };
  }

  next(): null {
    return null;
  }
}
