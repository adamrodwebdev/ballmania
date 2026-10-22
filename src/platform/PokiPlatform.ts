import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter, ScriptLoader } from './PlatformAdapter';

export const POKI_SDK = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';

/** The part of the Poki SDK (v2) the game uses. */
export interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
  shareableURL(params: Record<string, string>): Promise<string>;
}

export interface PokiHost {
  PokiSDK?: PokiSdk;
}

/**
 * Poki (SDK v2): commercial and rewarded breaks, shareable links. Poki decides
 * itself whether a break really shows an ad. Saves stay in the browser.
 */
export class PokiPlatform implements PlatformAdapter {
  readonly id = 'poki';
  readonly hasAds = true;
  readonly isPortal = true;
  private sdk: PokiSdk | null = null;
  /** `init` fails with an ad blocker: the game runs, without rewarded ads. */
  private adsBlocked = false;
  private readonly storage: KeyValueStorage;

  constructor(
    private readonly host: PokiHost,
    private readonly load: ScriptLoader,
    storage: KeyValueStorage = BrowserStorage.local(),
  ) {
    this.storage = storage;
  }

  async init(): Promise<void> {
    if (!this.host.PokiSDK && !(await this.load(POKI_SDK))) return;
    const sdk = this.host.PokiSDK;
    if (!sdk) return;
    this.sdk = sdk;
    try {
      await sdk.init();
    } catch {
      this.adsBlocked = true;
    }
  }

  saves(): KeyValueStorage {
    return this.storage;
  }

  preferences(): KeyValueStorage {
    return this.storage;
  }

  locale(): null {
    return null;
  }

  loaded(): void {
    this.call((sdk) => sdk.gameLoadingFinished());
  }

  gameplayStart(): void {
    this.call((sdk) => sdk.gameplayStart());
  }

  gameplayStop(): void {
    this.call((sdk) => sdk.gameplayStop());
  }

  celebrate(): void {}
  levelEnded(_won: boolean): void {}

  async interstitial(onStart: AdStart): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.commercialBreak(onStart);
    } catch {
      // No ad this time.
    }
  }

  rewardedAvailable(): boolean {
    return this.sdk !== null && !this.adsBlocked;
  }

  async rewarded(onStart: AdStart): Promise<boolean> {
    if (!this.rewardedAvailable()) return false;
    try {
      return (await this.sdk?.rewardedBreak(onStart)) === true;
    } catch {
      return false;
    }
  }

  async shareLink(params: Readonly<Record<string, string>>): Promise<string | null> {
    if (!this.sdk) return null;
    try {
      return await this.sdk.shareableURL({ ...params });
    } catch {
      return null;
    }
  }

  muted(): boolean {
    return false;
  }

  onMutedChange(): () => void {
    return () => {};
  }

  onPausedChange(): () => void {
    return () => {};
  }

  private call(action: (sdk: PokiSdk) => void): void {
    if (!this.sdk) return;
    try {
      action(this.sdk);
    } catch {
      // A signal lost is never worth stopping the game for.
    }
  }
}
