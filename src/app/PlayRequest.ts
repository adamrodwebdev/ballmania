import type { DuelDifficulty } from '@/levels/arcade/duel';
import type { Puzzle } from '@/levels/arcade/puzzles';
import type { Song } from '@/levels/arcade/rhythm';
import type { CampaignLevel } from '@/levels/campaign';
import type { TrainingStep } from '@/levels/training';
import type { DailyChallenge } from '@/player/DailyChallenge';

/**
 * What the player asked to play: a showcase of the training, a campaign level
 * (maybe assisted), a challenge, an Arcade mode.
 */
export type PlayRequest =
  | { readonly kind: 'training'; readonly step: TrainingStep }
  | { readonly kind: 'campaign'; readonly level: CampaignLevel; readonly assisted?: boolean }
  | { readonly kind: 'daily'; readonly challenge: DailyChallenge }
  | { readonly kind: 'endless' }
  /** `day` (YYYYMMDD) for the puzzle of the day. */
  | { readonly kind: 'puzzle'; readonly puzzle: Puzzle; readonly day?: string }
  | { readonly kind: 'rhythm'; readonly song: Song }
  | { readonly kind: 'duel'; readonly difficulty: DuelDifficulty };
