import type { GameReport } from '@/engine/Game';
import { CAMPAIGN } from '@/levels/campaign';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';
import {
  trainingDefinition,
  trainingLevel,
  TRAINING_STEPS,
  type TrainingLevel,
} from '@/levels/training';
import type { AppServices } from '../AppServices';
import type { PlayRequest } from '../PlayRequest';
import { shortName } from './CampaignModes';
import type { Message, NextGame, PlayMode, Settlement, TrainingStepView } from './PlayMode';

/** Where the training leads, once over or skipped: the campaign's first level. */
const FIRST_LEVEL: PlayRequest = { kind: 'campaign', level: CAMPAIGN[0]! };

/** A showcase pays nothing and records nothing: its progress is apart from the campaign. */
const NOTHING: Settlement = {
  stars: null,
  record: null,
  rewards: { shards: 0, achievements: [], unlocked: [], firstDailyAttempt: false },
};

/**
 * A showcase of the training (v1.8.0, specification § 3.13), made to hook a
 * new player: no score, stars, shards or goals on screen, the same game every
 * time, and no defeat. A win leads on to the next showcase; the last one, to
 * the campaign's first level, and the portal celebrates it.
 */
export class TrainingMode implements PlayMode {
  readonly boss = null;
  readonly alchemy = false;
  readonly stars = null;
  readonly continuable = false;
  readonly home = 'home';
  readonly daily = null;
  readonly assisted = false;
  readonly rope = false;
  readonly root = null;
  readonly ranked = false;
  readonly swapLabel: Message = { key: 'game.swap' };
  readonly hintable = false;
  readonly par = null;
  readonly assistLevel = null;
  readonly finale = false;
  readonly training: TrainingStepView;
  private readonly level: TrainingLevel;

  constructor(readonly request: Extract<PlayRequest, { kind: 'training' }>) {
    this.level = trainingLevel(request.step);
    this.training = {
      step: request.step,
      of: TRAINING_STEPS.length,
      skip: ({ player }) => {
        player.finishTraining();
        return FIRST_LEVEL;
      },
    };
  }

  get world() {
    return this.level.world;
  }

  get music() {
    return this.level.world;
  }

  get hint() {
    return this.level.hint ?? null;
  }

  /** The same chain every time: each showcase is tuned to reach its moment. */
  get seed(): string {
    return this.level.id;
  }

  get label(): Message {
    return { key: `training.steps.${this.request.step}.name` };
  }

  private get last(): boolean {
    return this.request.step === TRAINING_STEPS.length;
  }

  celebrates(won: boolean): boolean {
    return won && this.last;
  }

  outcome(won: boolean): Message {
    if (!won) return { key: 'game.lost' };
    return { key: this.last ? 'training.end.title' : 'game.won' };
  }

  definition(frame: Frame): LevelDefinition {
    return trainingDefinition(this.level, frame);
  }

  /** A showcase won: the next one is where the training resumes; the last one ends it. */
  settle(report: GameReport, { player }: AppServices): Settlement {
    if (report.outcome !== 'won') return NOTHING;
    const next = TRAINING_STEPS[this.request.step];
    if (next === undefined) player.finishTraining();
    else player.reachTraining(next);
    return NOTHING;
  }

  next(): NextGame | null {
    const step = TRAINING_STEPS[this.request.step];
    if (step !== undefined) {
      return {
        request: { kind: 'training', step },
        label: { key: 'training.step', params: { step, of: TRAINING_STEPS.length } },
      };
    }
    const first = CAMPAIGN[0]!;
    return {
      request: FIRST_LEVEL,
      label: { key: 'training.end.continue' },
      detail: {
        key: 'training.end.level',
        params: { level: shortName(first), world: { key: `worlds.${first.world}.name` } },
      },
    };
  }
}
