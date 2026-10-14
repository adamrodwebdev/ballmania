import type { KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter } from './PlatformAdapter';

/** The keys the game saves: loaded together in one call at start, as Playgama asks. */
export const SAVE_KEYS = [
  'ballmania:settings',
  'ballmania:progress',
  'ballmania:arcade',
  'ballmania:player',
] as const;

/** Longest wait for an ad's outcome before the game goes on, in milliseconds. */
const AD_TIMEOUT = 90_000;
/** An ad that has not even started loading by then was skipped (too soon, none): go on. */
const AD_START_TIMEOUT = 4_000;

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
 * play are told as level messages; ads come from Bridge only.
 */
export class PlaygamaPlatform implements PlatformAdapter {
  readonly id = 'playgama';
  readonly hasAds = true;
  private bridge: PlaygamaBridge | null = null;
  private readonly cache = new Map<string, string>();
  private inLevel = false;
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
    if (!ads?.isInterstitialSupported || !this.bridge) return;
    await this.watch(this.bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onStart, () =>
      ads.showInterstitial('between_games'),
    );
  }

  rewardedAvailable(): boolean {
    return this.bridge?.advertisement.isRewardedSupported === true;
  }

  async rewarded(onStart: AdStart): Promise<boolean> {
    const ads = this.bridge?.advertisement;
    if (!ads?.isRewardedSupported || !this.bridge) return false;
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

  onPausedChange(listener: (paused: boolean) => void): () => void {
    return this.listen(this.bridge?.EVENT_NAME.PAUSE_STATE_CHANGED, listener);
  }

  private listen(event: string | undefined, listener: (value: boolean) => void): () => void {
    const platform = this.bridge?.platform;
    if (!platform || !event) return () => {};
    const handler = listener as Listener;
    platform.on(event, handler);
    return () => platform.off?.(event, handler);
  }

  /**
   * Shows an ad and follows its states: `opened` silences the game; the ad is
   * over at `closed` or `failed`. True if `rewarded` came on the way.
   */
  private watch(event: string, onStart: AdStart, show: () => void): Promise<boolean> {
    const ads = this.bridge?.advertisement;
    if (!ads) return Promise.resolve(false);
    return new Promise((resolve) => {
      let rewarded = false;
      let started = false;
      const finish = () => {
        clearTimeout(timer);
        clearTimeout(silence);
        ads.off?.(event, handler);
        resolve(rewarded);
      };
      const handler = ((state: string) => {
        clearTimeout(silence);
        if (state === 'opened' && !started) {
          started = true;
          onStart();
        } else if (state === 'rewarded') rewarded = true;
        else if (state === 'closed' || state === 'failed') finish();
      }) as Listener;
      const timer = setTimeout(finish, AD_TIMEOUT);
      const silence = setTimeout(finish, AD_START_TIMEOUT);
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
