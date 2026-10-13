import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter, ScriptLoader } from './PlatformAdapter';

export const GAMEDISTRIBUTION_SDK = 'https://html5.api.gamedistribution.com/main.min.js';

/** The part of the GameDistribution SDK the game uses. */
export interface GameDistributionSdk {
  showAd(type?: 'interstitial' | 'rewarded'): Promise<unknown>;
  preloadAd?(type: 'rewarded'): Promise<unknown>;
}

interface SdkEvent {
  readonly name: string;
}

export interface GameDistributionHost {
  GD_OPTIONS?: { gameId: string; onEvent: (event: SdkEvent) => void };
  gdsdk?: GameDistributionSdk;
}

/** Longest wait for the SDK to say it is ready, in milliseconds. */
const READY_TIMEOUT = 6000;

/**
 * GameDistribution: the SDK is configured through `GD_OPTIONS` before it
 * loads, then speaks through events (pause before an ad, start after it, a
 * rewarded ad watched to the end). No locale, no shareable link.
 */
export class GameDistributionPlatform implements PlatformAdapter {
  readonly id = 'gamedistribution';
  readonly hasAds = true;
  private sdk: GameDistributionSdk | null = null;
  private rewardEarned = false;
  private adStart: AdStart | null = null;
  private readonly storage: KeyValueStorage;

  constructor(
    private readonly host: GameDistributionHost,
    private readonly load: ScriptLoader,
    private readonly gameId: string,
    storage: KeyValueStorage = BrowserStorage.local(),
  ) {
    this.storage = storage;
  }

  async init(): Promise<void> {
    if (!this.gameId) return;
    const ready = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), READY_TIMEOUT);
      this.host.GD_OPTIONS = {
        gameId: this.gameId,
        onEvent: (event) => {
          if (event.name === 'SDK_READY') resolve(true);
          else if (event.name === 'SDK_ERROR') resolve(false);
          else if (event.name === 'SDK_GAME_PAUSE') this.adStart?.();
          else if (event.name === 'SDK_REWARDED_WATCH_COMPLETE') this.rewardEarned = true;
        },
      };
    });
    if (!(await this.load(GAMEDISTRIBUTION_SDK)) || !(await ready)) return;
    this.sdk = this.host.gdsdk ?? null;
    void this.sdk?.preloadAd?.('rewarded').catch(() => undefined);
  }

  saves(): KeyValueStorage {
    return this.storage;
  }

  locale(): null {
    return null;
  }

  loaded(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  celebrate(): void {}

  async interstitial(onStart: AdStart): Promise<void> {
    await this.show('interstitial', onStart);
  }

  rewardedAvailable(): boolean {
    return this.sdk !== null;
  }

  async rewarded(onStart: AdStart): Promise<boolean> {
    this.rewardEarned = false;
    const shown = await this.show('rewarded', onStart);
    void this.sdk?.preloadAd?.('rewarded').catch(() => undefined);
    return shown && this.rewardEarned;
  }

  shareLink(): Promise<null> {
    return Promise.resolve(null);
  }

  muted(): boolean {
    return false;
  }

  onMutedChange(): () => void {
    return () => {};
  }

  private async show(type: 'interstitial' | 'rewarded', onStart: AdStart): Promise<boolean> {
    if (!this.sdk) return false;
    this.adStart = onStart;
    try {
      await this.sdk.showAd(type);
      return true;
    } catch {
      return false;
    } finally {
      this.adStart = null;
    }
  }
}
