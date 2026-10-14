import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter, ScriptLoader } from './PlatformAdapter';

export const CRAZYGAMES_SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown) => void;
}

interface CrazySettings {
  readonly muteAudio?: boolean;
}

/** The part of the CrazyGames SDK (v3) the game uses. */
export interface CrazyGamesSdk {
  init(): Promise<void>;
  readonly environment: 'local' | 'crazygames' | 'disabled';
  readonly game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
    inviteLink(params: Record<string, string>): string;
    readonly settings: CrazySettings;
    addSettingsChangeListener(listener: (settings: CrazySettings) => void): void;
    removeSettingsChangeListener(listener: (settings: CrazySettings) => void): void;
  };
  readonly ad: {
    requestAd(type: 'midgame' | 'rewarded', callbacks: AdCallbacks): void;
    hasAdblock(): Promise<boolean>;
  };
  readonly data: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  readonly user: { readonly systemInfo?: { readonly locale?: string } };
}

export interface CrazyGamesHost {
  CrazyGames?: { SDK?: CrazyGamesSdk };
}

/**
 * CrazyGames (SDK v3): midgame and rewarded ads, saves in the SDK's data
 * module (kept with the player's account when signed in), the player's
 * locale, invite links, and the portal's mute setting.
 */
export class CrazyGamesPlatform implements PlatformAdapter {
  readonly id = 'crazygames';
  readonly hasAds = true;
  private sdk: CrazyGamesSdk | null = null;
  private adblock = false;
  private storage: KeyValueStorage | null = null;

  constructor(
    private readonly host: CrazyGamesHost,
    private readonly load: ScriptLoader,
  ) {}

  async init(): Promise<void> {
    if (!this.host.CrazyGames?.SDK && !(await this.load(CRAZYGAMES_SDK))) return;
    const sdk = this.host.CrazyGames?.SDK;
    if (!sdk) return;
    try {
      await sdk.init();
      if (sdk.environment === 'disabled') return;
      this.sdk = sdk;
      sdk.game.loadingStart();
      this.adblock = await sdk.ad.hasAdblock().catch(() => true);
    } catch {
      this.sdk = null;
    }
  }

  saves(): KeyValueStorage {
    const sdk = this.sdk;
    this.storage ??= sdk
      ? {
          get: (key) => {
            try {
              return sdk.data.getItem(key);
            } catch {
              return null;
            }
          },
          set: (key, value) => {
            try {
              sdk.data.setItem(key, value);
            } catch {
              // The data module is off: nothing is kept, the game goes on.
            }
          },
        }
      : BrowserStorage.local();
    return this.storage;
  }

  locale(): string | null {
    return this.sdk?.user.systemInfo?.locale ?? null;
  }

  loaded(): void {
    this.call((sdk) => sdk.game.loadingStop());
  }

  gameplayStart(): void {
    this.call((sdk) => sdk.game.gameplayStart());
  }

  gameplayStop(): void {
    this.call((sdk) => sdk.game.gameplayStop());
  }

  celebrate(): void {
    this.call((sdk) => sdk.game.happytime());
  }

  async interstitial(onStart: AdStart): Promise<void> {
    await this.request('midgame', onStart);
  }

  rewardedAvailable(): boolean {
    return this.sdk !== null && !this.adblock;
  }

  rewarded(onStart: AdStart): Promise<boolean> {
    return this.request('rewarded', onStart);
  }

  shareLink(params: Readonly<Record<string, string>>): Promise<string | null> {
    const sdk = this.sdk;
    if (!sdk) return Promise.resolve(null);
    try {
      return Promise.resolve(sdk.game.inviteLink({ ...params }));
    } catch {
      return Promise.resolve(null);
    }
  }

  muted(): boolean {
    return this.sdk?.game.settings.muteAudio === true;
  }

  onMutedChange(listener: (muted: boolean) => void): () => void {
    const sdk = this.sdk;
    if (!sdk) return () => {};
    const onChange = (settings: CrazySettings) => listener(settings.muteAudio === true);
    sdk.game.addSettingsChangeListener(onChange);
    return () => sdk.game.removeSettingsChangeListener(onChange);
  }

  /** An ad; resolves true once it was shown to the end, false if it failed or was refused. */
  private request(type: 'midgame' | 'rewarded', onStart: AdStart): Promise<boolean> {
    const sdk = this.sdk;
    if (!sdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        sdk.ad.requestAd(type, {
          adStarted: onStart,
          adFinished: () => resolve(true),
          adError: (error) => {
            // Ads are off (Basic Launch) or blocked: no rewarded button may stay without effect.
            const code = (error as { code?: unknown } | null)?.code;
            if (code === 'adsDisabledBasicLaunch' || code === 'adblock') this.adblock = true;
            resolve(false);
          },
        });
      } catch {
        resolve(false);
      }
    });
  }

  private call(action: (sdk: CrazyGamesSdk) => void): void {
    if (!this.sdk) return;
    try {
      action(this.sdk);
    } catch {
      // A signal lost is never worth stopping the game for.
    }
  }
}
