import type { PlatformAdapter } from './PlatformAdapter';

/** Least time between two ads, and before the first one between games (§ 3.7). */
export const AD_INTERVAL = 180_000;

/** A new player's first visit: no ad between games before this much of it (§ 3.7). */
export const FIRST_VISIT_DELAY = 480_000;

/**
 * When an ad between games is allowed (specification § 3.7): never in the
 * first minutes of a visit, at most one every three minutes, rewarded ads
 * included. A new player's first visit is spared longer: no ad between games
 * before eight minutes of it, and none right after a defeat. It only says
 * *when*; the platform says *how*.
 */
export class AdPolicy {
  private lastAd: number;

  constructor(
    private readonly startedAt: number,
    private readonly interval = AD_INTERVAL,
    /** True on a new player's first visit. */
    private readonly newcomer = false,
  ) {
    this.lastAd = startedAt;
  }

  /** `afterDefeat`: the break follows a lost game. */
  allowsInterstitial(now: number, afterDefeat = false): boolean {
    if (this.newcomer && (afterDefeat || now - this.startedAt < FIRST_VISIT_DELAY)) return false;
    return now - this.lastAd >= this.interval;
  }

  /** An ad was shown (or offered and watched) at `now`. */
  shown(now: number): void {
    this.lastAd = now;
  }
}

/** What the game does while an ad plays: silence, then sound again. */
export interface Silence {
  start(): void;
  end(): void;
}

/**
 * The ads of the game, as the interface sees them: an ad between games when
 * the policy allows it, and rewarded ads that are always the player's choice
 * and simply unavailable on our own site or behind an ad blocker.
 */
export class AdService {
  constructor(
    private readonly platform: PlatformAdapter,
    private readonly policy: AdPolicy,
    private readonly now: () => number,
  ) {}

  /** A revive was already watched this visit: portals allow one per session. */
  private revived = false;

  /** True if a rewarded ad can be offered now. */
  get rewardsOffered(): boolean {
    return this.platform.hasAds && this.platform.rewardedAvailable();
  }

  /** True if a revive ad can be offered: one per visit at most. */
  get reviveOffered(): boolean {
    return this.rewardsOffered && !this.revived;
  }

  /** A revive ad (continue after a defeat); true if watched. Once per visit. */
  async revive(silence: Silence): Promise<boolean> {
    if (!this.reviveOffered) return false;
    const watched = await this.reward(silence);
    if (watched) this.revived = true;
    return watched;
  }

  /**
   * Between two games: maybe an ad. Resolves when the game may go on.
   * `afterDefeat`: the game before was lost.
   */
  async betweenGames(silence: Silence, afterDefeat = false): Promise<void> {
    if (!this.platform.hasAds || !this.policy.allowsInterstitial(this.now(), afterDefeat)) return;
    this.policy.shown(this.now());
    await this.during(silence, (onStart) => this.platform.interstitial(onStart));
  }

  /** A rewarded ad the player asked for; true if the reward is due. */
  async reward(silence: Silence): Promise<boolean> {
    if (!this.rewardsOffered) return false;
    const watched = await this.during(silence, (onStart) => this.platform.rewarded(onStart));
    this.policy.shown(this.now());
    return watched;
  }

  private async during<T>(silence: Silence, show: (onStart: () => void) => Promise<T>) {
    const ad = { started: false };
    try {
      return await show(() => {
        ad.started = true;
        silence.start();
      });
    } finally {
      if (ad.started) silence.end();
    }
  }
}

/**
 * The moments of play told to the portal: each start and stop once, even when
 * the interface reports the same state twice (pause then quit, say).
 */
export class GameplaySignals {
  private playing = false;

  constructor(private readonly platform: PlatformAdapter) {}

  start(): void {
    if (this.playing) return;
    this.playing = true;
    this.platform.gameplayStart();
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.platform.gameplayStop();
  }
}
