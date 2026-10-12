import type { CampaignLevel } from '@/levels/campaign';
import type { DailyChallenge } from '@/player/DailyChallenge';

/** What the player asked to play: a campaign level (maybe assisted) or today's challenge. */
export type PlayRequest =
  | { readonly kind: 'campaign'; readonly level: CampaignLevel; readonly assisted?: boolean }
  | { readonly kind: 'daily'; readonly challenge: DailyChallenge };
