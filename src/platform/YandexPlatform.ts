import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter, ScriptLoader } from './PlatformAdapter';
import { YANDEX_SDK } from './platforms';

export { YANDEX_SDK };

/**
 * Yandex allows 100 player-data requests in 5 minutes: the saves of one
 * moment leave together as soon as it is over, then at most one request every
 * `SAVE_INTERVAL` (75 in 5 minutes), the latest always kept.
 */
export const SAVE_INTERVAL = 4_000;
/** An ad that has neither opened nor closed by then will not: go on. */
export const AD_OPEN_TIMEOUT = 12_000;
/** Longest an open ad may last before the game goes on regardless, in milliseconds. */
const AD_TIMEOUT = 120_000;

export interface YandexAdCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown?: boolean) => void;
  onError?: (error: unknown) => void;
  onOffline?: () => void;
  onRewarded?: () => void;
}

/** The player's data on Yandex's servers, kept whether or not the player is logged in. */
export interface YandexPlayer {
  getData(): Promise<Readonly<Record<string, unknown>>>;
  /** Replaces the whole data object; `flush` sends it at once instead of queuing it. */
  setData(data: Readonly<Record<string, string>>, flush: boolean): Promise<void>;
}

/** The part of the Yandex Games SDK (v2) the game uses. */
export interface YandexSdk {
  readonly features: {
    readonly LoadingAPI?: { ready(): void };
    readonly GameplayAPI?: { start(): void; stop(): void };
  };
  readonly environment: { readonly i18n: { readonly lang: string } };
  readonly adv: {
    showFullscreenAdv(options: { callbacks: YandexAdCallbacks }): void;
    showRewardedVideo(options: { callbacks: YandexAdCallbacks }): void;
  };
  getPlayer(options: { scopes: boolean }): Promise<YandexPlayer>;
  /** Yandex pauses the game for its ads, purchase windows, other tabs and minimized windows. */
  on(event: 'game_api_pause' | 'game_api_resume', listener: () => void): unknown;
}

export interface YandexHost {
  YaGames?: { init(): Promise<YandexSdk> };
  addEventListener(type: 'blur' | 'focus' | 'pagehide', listener: () => void): void;
  readonly document: {
    readonly visibilityState: string;
    addEventListener(type: 'visibilitychange', listener: () => void): void;
  };
}

/**
 * Sends the saves at most once per `interval`: the changes of one moment
 * leave together as soon as it is over, and the last change is never lost.
 */
class SaveQueue {
  private waiting = false;
  private gathering = false;
  private cooldown: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly send: () => void,
    private readonly interval: number,
  ) {}

  push(): void {
    this.waiting = true;
    if (this.gathering || this.cooldown) return;
    this.gathering = true;
    setTimeout(() => {
      this.gathering = false;
      this.flush();
    }, 0);
  }

  /** Sends what waits at once: the page may be closing. */
  flush(): void {
    if (!this.waiting) return;
    this.waiting = false;
    this.send();
    if (this.cooldown) clearTimeout(this.cooldown);
    this.cooldown = setTimeout(() => {
      this.cooldown = null;
      this.flush();
    }, this.interval);
  }
}

/**
 * Yandex Games (SDK v2), published directly (version 1.9.0): the SDK from the
 * relative `/sdk.js` and initialized before any other call, the ready signal
 * and the gameplay marks, the player's language, saves in the player's data on
 * Yandex's servers (settings stay in the browser, read by the theme script),
 * the platform's pauses, and its fullscreen and rewarded ads. Yandex rules
 * 1.3, 1.9, 1.19 and 4.7 (`references/yandex-games.md`).
 */
export class YandexPlatform implements PlatformAdapter {
  readonly id = 'yandex';
  readonly hasAds = true;
  readonly isPortal = true;
  readonly stopsOnAutoPause = true;
  readonly allowsSharing = false;
  private sdk: YandexSdk | null = null;
  private player: YandexPlayer | null = null;
  private readonly cache = new Map<string, string>();
  private readonly queue = new SaveQueue(() => this.write(), SAVE_INTERVAL);
  private readonly cloud: KeyValueStorage = {
    get: (key) => this.cache.get(key) ?? null,
    set: (key, value) => {
      this.cache.set(key, value);
      this.queue.push();
    },
  };
  private readonly browser: KeyValueStorage;
  /** Where the saves went when the game first asked: kept for the whole visit. */
  private saveTarget: KeyValueStorage | null = null;
  private ready = false;
  /** The game says the player plays. */
  private playing = false;
  /** What Yandex was told last: the player plays and nothing pauses the game. */
  private running = false;
  /** An ad failed: Yandex tells no ad blocker, so no reward is offered again this visit. */
  private rewardedBroken = false;
  /** Yandex paused the game (its own ads, purchase window, another tab, a minimized window). */
  private platformPaused = false;
  /** The game lost the focus: a click outside its frame, another window. */
  private blurred = false;
  private hidden = false;
  /** One of our ads is open. */
  private adOpen = false;
  private paused = false;
  private readonly pauseListeners = new Set<(paused: boolean) => void>();

  constructor(
    private readonly host: YandexHost,
    private readonly load: ScriptLoader,
    browser: KeyValueStorage = BrowserStorage.local(),
  ) {
    this.browser = browser;
  }

  async init(): Promise<void> {
    if (!this.host.YaGames && !(await this.load(YANDEX_SDK))) return;
    const yaGames = this.host.YaGames;
    if (!yaGames) return;
    try {
      const sdk = await yaGames.init();
      this.sdk = sdk;
      this.followPause(sdk);
      await this.loadSaves(sdk);
    } catch {
      // No SDK: the game runs without ads, its saves in the browser.
    }
  }

  /** The player's data on Yandex's servers, or the browser when it could not be read. */
  saves(): KeyValueStorage {
    this.saveTarget ??= this.player ? this.cloud : this.browser;
    return this.saveTarget;
  }

  /** Settings stay in the browser: the theme script reads them before the SDK loads. */
  preferences(): KeyValueStorage {
    return this.browser;
  }

  locale(): string | null {
    return this.sdk?.environment.i18n.lang || null;
  }

  /** Once, when the player can play (rule 1.19.2). */
  loaded(): void {
    if (this.ready) return;
    this.ready = true;
    this.call((sdk) => sdk.features.LoadingAPI?.ready());
  }

  gameplayStart(): void {
    this.playing = true;
    this.tellGameplay();
  }

  gameplayStop(): void {
    this.playing = false;
    this.tellGameplay();
  }

  levelEnded(_won: boolean): void {}

  celebrate(): void {}

  async interstitial(onStart: AdStart): Promise<void> {
    const sdk = this.sdk;
    if (!sdk) return;
    await this.show(onStart, (callbacks) => sdk.adv.showFullscreenAdv({ callbacks }));
  }

  rewardedAvailable(): boolean {
    return this.sdk !== null && !this.rewardedBroken;
  }

  rewarded(onStart: AdStart): Promise<boolean> {
    const sdk = this.sdk;
    if (!sdk || this.rewardedBroken) return Promise.resolve(false);
    return this.show(
      onStart,
      (callbacks) => sdk.adv.showRewardedVideo({ callbacks }),
      () => {
        this.rewardedBroken = true;
      },
    );
  }

  /** Never asked: the game offers no share on Yandex Games (`allowsSharing`). */
  shareLink(): Promise<null> {
    return Promise.resolve(null);
  }

  /** Yandex has no setting of its own for the game's sound. */
  muted(): boolean {
    return false;
  }

  onMutedChange(): () => void {
    return () => {};
  }

  /**
   * Paused while Yandex says so, while the game has lost the focus or its tab
   * is hidden, and while one of our ads is open: the sound stops in all of
   * them (rules 1.3 and 4.7).
   */
  onPausedChange(listener: (paused: boolean) => void): () => void {
    this.pauseListeners.add(listener);
    if (this.paused) listener(true);
    return () => this.pauseListeners.delete(listener);
  }

  private followPause(sdk: YandexSdk): void {
    sdk.on('game_api_pause', () => {
      this.platformPaused = true;
      this.tellPaused();
    });
    sdk.on('game_api_resume', () => {
      this.platformPaused = false;
      this.tellPaused();
    });
    this.host.addEventListener('blur', () => {
      this.blurred = true;
      this.tellPaused();
    });
    this.host.addEventListener('focus', () => {
      this.blurred = false;
      this.tellPaused();
    });
    // The page may close without warning: what waits leaves at once.
    this.host.addEventListener('pagehide', () => this.queue.flush());
    const page = this.host.document;
    page.addEventListener('visibilitychange', () => {
      this.hidden = page.visibilityState === 'hidden';
      if (this.hidden) this.queue.flush();
      this.tellPaused();
    });
  }

  private tellPaused(): void {
    const paused = this.platformPaused || this.blurred || this.hidden || this.adOpen;
    if (paused !== this.paused) {
      this.paused = paused;
      this.pauseListeners.forEach((listener) => listener(paused));
    }
    this.tellGameplay();
  }

  /**
   * Yandex hears that the player plays only while nothing pauses the game,
   * and once per change: a pause and resume over a menu restart nothing
   * (rule 1.19.3).
   */
  private tellGameplay(): void {
    const running = this.playing && !this.paused;
    if (running === this.running) return;
    this.running = running;
    this.call((sdk) => {
      if (running) sdk.features.GameplayAPI?.start();
      else sdk.features.GameplayAPI?.stop();
    });
  }

  /** Every save the player has, read once at start: one request of the hundred allowed. */
  private async loadSaves(sdk: YandexSdk): Promise<void> {
    try {
      // Without the name and photo: older SDKs asked the player's permission for them.
      const player = await sdk.getPlayer({ scopes: false });
      const data = await player.getData();
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') this.cache.set(key, value);
      }
      this.player = player;
    } catch {
      // No player data: saves stay in the browser.
    }
  }

  /**
   * The whole data object leaves each time, since Yandex replaces it, and at
   * once: a queued save could be lost when the page closes (rule 1.9).
   */
  private write(): void {
    const player = this.player;
    if (!player) return;
    try {
      void player.setData(Object.fromEntries(this.cache), true).catch(() => undefined);
    } catch {
      // Lost: the next save carries it again, since each one holds everything.
    }
  }

  /**
   * Shows an ad: `onOpen` silences the game; the ad is over at `onClose`,
   * `onError` or offline, or when it never opens. True if it rewarded.
   */
  private show(
    onStart: AdStart,
    request: (callbacks: YandexAdCallbacks) => void,
    onFailure: () => void = () => {},
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let rewarded = false;
      let done = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.adOpen = false;
        this.tellPaused();
        resolve(rewarded);
      };
      const fail = () => {
        onFailure();
        finish();
      };
      timer = setTimeout(fail, AD_OPEN_TIMEOUT);
      try {
        request({
          onOpen: () => {
            if (done || this.adOpen) return;
            clearTimeout(timer);
            timer = setTimeout(finish, AD_TIMEOUT);
            this.adOpen = true;
            this.tellPaused();
            onStart();
          },
          onRewarded: () => {
            rewarded = true;
          },
          onClose: finish,
          onError: fail,
          onOffline: finish,
        });
      } catch {
        fail();
      }
    });
  }

  private call(action: (sdk: YandexSdk) => void): void {
    if (!this.sdk) return;
    try {
      action(this.sdk);
    } catch {
      // A signal lost is never worth stopping the game for.
    }
  }
}
