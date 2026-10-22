import type { KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter } from './PlatformAdapter';

/** The keys the game saves: loaded together in one call at start, as Playgama asks. */
export const SAVE_KEYS = [
  'ballmania:settings',
  'ballmania:progress',
  'ballmania:arcade',
  'ballmania:player',
] as const;

/** An ad that has not even started loading by then was skipped (too soon, none): go on. */
const AD_START_TIMEOUT = 4_000;
/**
 * An ad still loading by then will not open. On Playgama's own pages, an ad
 * whose request fails (ad blocker) leaves Bridge "loading" for good, with no
 * failure ever told, and every later request is ignored.
 */
const AD_OPEN_TIMEOUT = 12_000;
/** Longest an open ad may last before the game goes on regardless, in milliseconds. */
const AD_TIMEOUT = 120_000;
/** Bridge ad states during which it ignores any other ad request. */
const AD_BUSY: readonly string[] = ['loading', 'opened', 'rewarded'];

type Listener = (value: never) => void;

/** The part of the Playgama Bridge SDK (v2) the game uses. */
export interface PlaygamaBridge {
  initialize(): Promise<void>;
  readonly EVENT_NAME: {
    readonly AUDIO_STATE_CHANGED: string;
    readonly PAUSE_STATE_CHANGED: string;
    readonly INTERSTITIAL_STATE_CHANGED: string;
    readonly REWARDED_STATE_CHANGED: string;
  };
  readonly platform: {
    readonly language: string;
    readonly isAudioEnabled: boolean;
    readonly isPaused?: boolean;
    sendMessage(message: string): void;
    on(event: string, listener: Listener): void;
    off?(event: string, listener: Listener): void;
  };
  readonly storage: {
    get(keys: readonly string[], tryParseJson?: boolean): Promise<readonly (string | null)[]>;
    set(keys: readonly string[], values: readonly string[]): Promise<void>;
  };
  readonly advertisement: {
    readonly isInterstitialSupported: boolean;
    readonly isRewardedSupported: boolean;
    readonly interstitialState?: string;
    readonly rewardedState?: string;
    /** True if ads are blocked; checked at the boundary, Bridge being outside our types. */
    checkAdBlock?(): Promise<unknown>;
    showInterstitial(placement?: string): void;
    showRewarded(placement?: string): void;
    on(event: string, listener: Listener): void;
    off?(event: string, listener: Listener): void;
  };
}

export interface PlaygamaHost {
  bridge?: PlaygamaBridge;
}

/**
 * Playgama (Bridge SDK v2), which also publishes the game on its partner
 * sites. Saves (settings included) go through `bridge.storage`, loaded in one
 * call at start and kept in memory so the game reads them synchronously; the
 * portal's language, sound and pause states are followed; the moments of
 * play are told as level messages; ads come from Bridge only, and are not
 * offered when Bridge finds them blocked.
 */
export class PlaygamaPlatform implements PlatformAdapter {
  readonly id = 'playgama';
  readonly hasAds = true;
  readonly isPortal = true;
  private bridge: PlaygamaBridge | null = null;
  private readonly cache = new Map<string, string>();
  private inLevel = false;
  /** The portal paused the game (hidden tab, its own overlay). */
  private portalPaused = false;
  /** A full-screen ad is open, ours or one the portal launched by itself. */
  private adOpen = false;
  /** Bridge found the ads blocked: an ad blocker, or the portal's ad SDK missing. */
  private adsBlocked = false;
  private paused = false;
  private readonly pauseListeners = new Set<(paused: boolean) => void>();
  private readonly store: KeyValueStorage = {
    get: (key) => this.cache.get(key) ?? null,
    set: (key, value) => {
      this.cache.set(key, value);
      void this.bridge?.storage.set([key], [value]).catch(() => undefined);
    },
  };

  constructor(private readonly host: PlaygamaHost) {}

  async init(): Promise<void> {
    const bridge = this.host.bridge;
    if (!bridge) return;
    try {
      await bridge.initialize();
    } catch {
      return;
    }
    this.bridge = bridge;
    this.followPause(bridge);
    this.checkAds();
    try {
      const values = await bridge.storage.get(SAVE_KEYS, false);
      SAVE_KEYS.forEach((key, i) => {
        const value = values[i];
        if (typeof value === 'string') this.cache.set(key, value);
      });
    } catch {
      // No saved data: a new player.
    }
  }

  saves(): KeyValueStorage {
    return this.store;
  }

  preferences(): KeyValueStorage {
    return this.store;
  }

  locale(): string | null {
    return this.bridge?.platform.language || null;
  }

  loaded(): void {
    this.send('game_ready');
  }

  gameplayStart(): void {
    this.send(this.inLevel ? 'level_resumed' : 'level_started');
    this.inLevel = true;
  }

  gameplayStop(): void {
    if (this.inLevel) this.send('level_paused');
  }

  levelEnded(won: boolean): void {
    if (!this.inLevel) return;
    this.inLevel = false;
    this.send(won ? 'level_completed' : 'level_failed');
  }

  celebrate(): void {}

  async interstitial(onStart: AdStart): Promise<void> {
    const ads = this.bridge?.advertisement;
    if (!this.bridge || !ads || !this.canShow(ads.isInterstitialSupported)) return;
    await this.watch(this.bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onStart, () =>
      ads.showInterstitial('between_games'),
    );
  }

  rewardedAvailable(): boolean {
    return this.canShow(this.bridge?.advertisement.isRewardedSupported === true);
  }

  async rewarded(onStart: AdStart): Promise<boolean> {
    const ads = this.bridge?.advertisement;
    if (!this.bridge || !ads || !this.rewardedAvailable()) return false;
    return this.watch(this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED, onStart, () =>
      ads.showRewarded('bonus'),
    );
  }

  /** Links lead outside the portal: not allowed on Playgama. */
  shareLink(): Promise<null> {
    return Promise.resolve(null);
  }

  muted(): boolean {
    return this.bridge ? !this.bridge.platform.isAudioEnabled : false;
  }

  onMutedChange(listener: (muted: boolean) => void): () => void {
    return this.listen(this.bridge?.EVENT_NAME.AUDIO_STATE_CHANGED, (enabled: boolean) =>
      listener(!enabled),
    );
  }

  /**
   * Paused while the portal says so or while any full-screen ad is open:
   * Playgama may show ads by itself ("smart ads"), and the game must then be
   * silent and still as for its own.
   */
  onPausedChange(listener: (paused: boolean) => void): () => void {
    this.pauseListeners.add(listener);
    if (this.paused) listener(true);
    return () => this.pauseListeners.delete(listener);
  }

  private followPause(bridge: PlaygamaBridge): void {
    this.portalPaused = bridge.platform.isPaused === true;
    this.adOpen = [
      bridge.advertisement.interstitialState,
      bridge.advertisement.rewardedState,
    ].includes('opened');
    this.tellPaused();
    bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, (paused: boolean) => {
      this.portalPaused = paused;
      this.tellPaused();
    });
    const onAd = ((state: string) => {
      if (state === 'opened') this.adOpen = true;
      else if (state === 'closed' || state === 'failed') this.adOpen = false;
      else return;
      this.tellPaused();
    }) as Listener;
    bridge.advertisement.on(bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onAd);
    bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, onAd);
  }

  private tellPaused(): void {
    const paused = this.portalPaused || this.adOpen;
    if (paused === this.paused) return;
    this.paused = paused;
    this.pauseListeners.forEach((listener) => listener(paused));
  }

  private listen(event: string | undefined, listener: (value: boolean) => void): () => void {
    const platform = this.bridge?.platform;
    if (!platform || !event) return () => {};
    const handler = listener as Listener;
    platform.on(event, handler);
    return () => platform.off?.(event, handler);
  }

  /**
   * True if Bridge can show an ad now: the format is supported, ads are not
   * blocked, and no ad is under way (Bridge would ignore the request).
   */
  private canShow(supported: boolean): boolean {
    const ads = this.bridge?.advertisement;
    if (!ads || !supported || this.adsBlocked) return false;
    return (
      !AD_BUSY.includes(ads.interstitialState ?? '') && !AD_BUSY.includes(ads.rewardedState ?? '')
    );
  }

  /**
   * Asks Bridge once whether ads can run at all: if not, no ad is offered and
   * no request is left hanging. A check that fails changes nothing.
   */
  private checkAds(): void {
    try {
      void this.bridge?.advertisement.checkAdBlock?.().then(
        (blocked) => {
          this.adsBlocked = blocked === true;
        },
        () => undefined,
      );
    } catch {
      // No answer: ads stay offered, and a request that hangs is given up.
    }
  }

  /**
   * Shows an ad and follows its states: `opened` silences the game; the ad is
   * over at `closed` or `failed`, or when it never opens. True if `rewarded`
   * came on the way.
   */
  private watch(event: string, onStart: AdStart, show: () => void): Promise<boolean> {
    const ads = this.bridge?.advertisement;
    if (!ads) return Promise.resolve(false);
    return new Promise((resolve) => {
      let rewarded = false;
      let started = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        clearTimeout(timer);
        ads.off?.(event, handler);
        resolve(rewarded);
      };
      /** Each state gives the ad a new deadline to reach the next one. */
      const wait = (delay: number) => {
        clearTimeout(timer);
        timer = setTimeout(finish, delay);
      };
      const handler = ((state: string) => {
        if (state === 'loading') wait(AD_OPEN_TIMEOUT);
        else if (state === 'opened') {
          wait(AD_TIMEOUT);
          if (started) return;
          started = true;
          onStart();
        } else if (state === 'rewarded') rewarded = true;
        else if (state === 'closed' || state === 'failed') finish();
      }) as Listener;
      wait(AD_START_TIMEOUT);
      ads.on(event, handler);
      try {
        show();
      } catch {
        finish();
      }
    });
  }

  private send(message: string): void {
    try {
      this.bridge?.platform.sendMessage(message);
    } catch {
      // A signal lost is never worth stopping the game for.
    }
  }
}
