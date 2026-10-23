import type { PlayRequest } from '../PlayRequest';
import { DuelMode, EndlessMode, PuzzleMode, RhythmMode } from './ArcadeModes';
import { CampaignMode, DailyMode } from './CampaignModes';
import type { PlayMode } from './PlayMode';
import { TrainingMode } from './TrainingMode';

export type { Message, PlayMode, Settlement } from './PlayMode';

/** The mode that plays a request. */
export function createMode(request: PlayRequest): PlayMode {
  switch (request.kind) {
    case 'training':
      return new TrainingMode(request);
    case 'campaign':
      return new CampaignMode(request);
    case 'daily':
      return new DailyMode(request);
    case 'endless':
      return new EndlessMode(request);
    case 'puzzle':
      return new PuzzleMode(request);
    case 'rhythm':
      return new RhythmMode(request);
    case 'duel':
      return new DuelMode(request);
  }
}
