import { describe, expect, it, vi } from 'vitest';
import {
  AD_INTERVAL,
  AdPolicy,
  AdService,
  FIRST_VISIT_DELAY,
  GameplaySignals,
} from '@/platform/AdService';
import {
  CRAZYGAMES_SDK,
  CrazyGamesPlatform,
  type CrazyGamesSdk,
} from '@/platform/CrazyGamesPlatform';
import {
  GAMEDISTRIBUTION_SDK,
  GameDistributionPlatform,
  type GameDistributionHost,
} from '@/platform/GameDistributionPlatform';
import type { PlatformAdapter } from '@/platform/PlatformAdapter';
import { PLATFORM_IDS, withListedName } from '@/platform/platforms';
import { PlaygamaPlatform, type PlaygamaBridge } from '@/platform/PlaygamaPlatform';
import { POKI_SDK, PokiPlatform, type PokiSdk } from '@/platform/PokiPlatform';
import { SimulatedPlatform } from '@/platform/SimulatedPlatform';
import { StandalonePlatform } from '@/platform/StandalonePlatform';
import {
  AD_OPEN_TIMEOUT,
  SAVE_INTERVAL,
  YANDEX_SDK,
  YandexPlatform,
  type YandexAdCallbacks,
  type YandexHost,
  type YandexPlayer,
  type YandexSdk,
} from '@/platform/YandexPlatform';
import { MemoryStorage, UNREADABLE } from '@/services/KeyValueStorage';

const silence = () => ({ start: vi.fn(), end: vi.fn() });

/** A portal whose ads always play, recording what the game asked. */
class FakePortal extends StandalonePlatform {
  override readonly hasAds = true;
  readonly calls: string[] = [];
  available = true;
  watched = true;

  constructor() {
    super({ origin: 'https://portal.example', pathname: '/' }, new MemoryStorage());
  }

  override gameplayStart(): void {
    this.calls.push('start');
  }

  override gameplayStop(): void {
    this.calls.push('stop');
  }

  override interstitial(onStart: () => void): Promise<void> {
    this.calls.push('interstitial');
    onStart();
    return Promise.resolve();
  }

  override rewardedAvailable(): boolean {
    return this.available;
  }

  override rewarded(onStart: () => void): Promise<boolean> {
    this.calls.push('rewarded');
    onStart();
    return Promise.resolve(this.watched);
  }
}

describe('listed names', () => {
  it('names the game in two words where Playgama and Yandex list it so, elsewhere as it is', () => {
    expect(withListedName('yandex', 'Ballmania — marble shooting reinvented')).toBe(
      'Ball Mania — marble shooting reinvented',
    );
    expect(withListedName('playgama', 'Ballmania')).toBe('Ball Mania');
    expect(withListedName('standalone', 'Ballmania')).toBe('Ballmania');
    expect(withListedName('crazygames', 'Ballmania')).toBe('Ballmania');
  });
});

describe('AdPolicy', () => {
  it('waits three minutes after the start of the visit and after every ad', () => {
    const policy = new AdPolicy(0);
    expect(policy.allowsInterstitial(AD_INTERVAL - 1)).toBe(false);
    expect(policy.allowsInterstitial(AD_INTERVAL)).toBe(true);
    policy.shown(AD_INTERVAL);
    expect(policy.allowsInterstitial(AD_INTERVAL * 2 - 1)).toBe(false);
    expect(policy.allowsInterstitial(AD_INTERVAL * 2)).toBe(true);
    // A returning player may see one after a defeat.
    expect(policy.allowsInterstitial(AD_INTERVAL * 2, true)).toBe(true);
  });

  it("spares a new player's first visit: eight minutes, and never after a defeat", () => {
    const policy = new AdPolicy(0, AD_INTERVAL, true);
    expect(policy.allowsInterstitial(FIRST_VISIT_DELAY - 1)).toBe(false);
    expect(policy.allowsInterstitial(FIRST_VISIT_DELAY)).toBe(true);
    expect(policy.allowsInterstitial(FIRST_VISIT_DELAY * 2, true)).toBe(false);
    // A rewarded ad the player chose does not shorten the wait.
    const rewarded = new AdPolicy(0, AD_INTERVAL, true);
    rewarded.shown(60_000);
    expect(rewarded.allowsInterstitial(60_000 + AD_INTERVAL)).toBe(false);
    expect(rewarded.allowsInterstitial(FIRST_VISIT_DELAY)).toBe(true);
  });
});

describe('AdService', () => {
  it('shows an ad between games at most every three minutes, in silence', async () => {
    const portal = new FakePortal();
    let now = 0;
    const ads = new AdService(portal, new AdPolicy(0), () => now);
    const quiet = silence();
    await ads.betweenGames(quiet);
    expect(portal.calls).toEqual([]);
    now = AD_INTERVAL;
    await ads.betweenGames(quiet);
    await ads.betweenGames(quiet);
    expect(portal.calls).toEqual(['interstitial']);
    expect(quiet.start).toHaveBeenCalledOnce();
    expect(quiet.end).toHaveBeenCalledOnce();
  });

  it('counts a rewarded ad as an ad: no interstitial right after it', async () => {
    const portal = new FakePortal();
    let now = AD_INTERVAL;
    const ads = new AdService(portal, new AdPolicy(0), () => now);
    expect(await ads.reward(silence())).toBe(true);
    now += 60_000;
    await ads.betweenGames(silence());
    expect(portal.calls).toEqual(['rewarded']);
  });

  it('offers no reward on our own site, behind an ad blocker or when the ad is closed early', async () => {
    const site = new AdService(
      new StandalonePlatform({ origin: 'https://x.org', pathname: '/' }, new MemoryStorage()),
      new AdPolicy(0),
      () => AD_INTERVAL * 10,
    );
    expect(site.rewardsOffered).toBe(false);
    expect(await site.reward(silence())).toBe(false);
    await site.betweenGames(silence());

    const portal = new FakePortal();
    const ads = new AdService(portal, new AdPolicy(0), () => 0);
    portal.available = false;
    expect(ads.rewardsOffered).toBe(false);
    expect(await ads.reward(silence())).toBe(false);
    portal.available = true;
    portal.watched = false;
    expect(await ads.reward(silence())).toBe(false);
  });

  it('gives the sound back even when the ad fails', async () => {
    const portal = new FakePortal();
    portal.rewarded = (onStart) => {
      onStart();
      return Promise.reject(new Error('boom'));
    };
    const quiet = silence();
    await expect(new AdService(portal, new AdPolicy(0), () => 0).reward(quiet)).rejects.toThrow();
    expect(quiet.end).toHaveBeenCalledOnce();
  });
});

describe('revive ads', () => {
  it('offer one revive per visit at most', async () => {
    const portal = new FakePortal();
    const ads = new AdService(portal, new AdPolicy(0), () => 0);
    expect(ads.reviveOffered).toBe(true);
    portal.watched = false;
    expect(await ads.revive(silence())).toBe(false);
    expect(ads.reviveOffered).toBe(true);
    portal.watched = true;
    expect(await ads.revive(silence())).toBe(true);
    expect(ads.reviveOffered).toBe(false);
    expect(await ads.revive(silence())).toBe(false);
    expect(portal.calls.filter((call) => call === 'rewarded')).toHaveLength(2);
  });
});

describe('GameplaySignals', () => {
  it('tells the portal each start and stop once', () => {
    const portal = new FakePortal();
    const signals = new GameplaySignals(portal);
    signals.stop();
    signals.start();
    signals.start();
    signals.stop();
    signals.stop();
    expect(portal.calls).toEqual(['start', 'stop']);
  });
});

describe('StandalonePlatform', () => {
  it('has no ads and shares the page itself', async () => {
    const site: PlatformAdapter = new StandalonePlatform(
      { origin: 'https://ballmania.example', pathname: '/jeu/' },
      new MemoryStorage(),
    );
    expect(site.hasAds).toBe(false);
    expect(site.isPortal).toBe(false);
    expect(site.allowsSharing).toBe(true);
    expect(site.showsVersion).toBe(true);
    expect(await site.shareLink({ day: '20261013' })).toBe('https://ballmania.example/jeu/');
    expect(PLATFORM_IDS).toContain(site.id);
  });
});

describe('SimulatedPlatform', () => {
  it('stands for a portal build without ads with ?ads=off', () => {
    // The page is only used to draw the pretend ads.
    const page = {} as Document;
    const storage = new MemoryStorage();
    const off = new SimulatedPlatform(page, 'off', 0, storage);
    expect(off.isPortal).toBe(true);
    expect(off.hasAds).toBe(false);
    expect(off.rewardedAvailable()).toBe(false);
    const normal = new SimulatedPlatform(page, 'normal', 0, storage);
    expect(normal.hasAds).toBe(true);
    expect(normal.rewardedAvailable()).toBe(true);
  });
});

const crazySdk = (overrides: Partial<CrazyGamesSdk> = {}) => {
  const data = new Map<string, string>();
  const calls: string[] = [];
  const sdk: CrazyGamesSdk = {
    init: () => Promise.resolve(),
    environment: 'crazygames',
    game: {
      gameplayStart: () => calls.push('gameplayStart'),
      gameplayStop: () => calls.push('gameplayStop'),
      loadingStart: () => calls.push('loadingStart'),
      loadingStop: () => calls.push('loadingStop'),
      happytime: () => calls.push('happytime'),
      inviteLink: (params) => `https://www.crazygames.com/game/ballmania?day=${params.day}`,
      settings: { muteAudio: true },
      addSettingsChangeListener: () => calls.push('listen'),
      removeSettingsChangeListener: () => calls.push('unlisten'),
    },
    ad: {
      requestAd: (type, callbacks) => {
        calls.push(type);
        callbacks.adStarted?.();
        callbacks.adFinished?.();
      },
      hasAdblock: () => Promise.resolve(false),
    },
    data: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
    },
    user: { systemInfo: { locale: 'id-ID' } },
    ...overrides,
  };
  return { sdk, calls, data };
};

describe('CrazyGamesPlatform', () => {
  it('loads the SDK, saves in its data module and follows its settings', async () => {
    const { sdk, calls, data } = crazySdk();
    const host: { CrazyGames?: { SDK?: CrazyGamesSdk } } = {};
    const load = vi.fn((src: string) => {
      expect(src).toBe(CRAZYGAMES_SDK);
      host.CrazyGames = { SDK: sdk };
      return Promise.resolve(true);
    });
    const portal = new CrazyGamesPlatform(host, load);
    await portal.init();
    portal.saves().set('ballmania:player', '{}');
    expect(data.get('ballmania:player')).toBe('{}');
    expect(portal.locale()).toBe('id-ID');
    expect(portal.muted()).toBe(true);
    portal.onMutedChange(() => {})();
    portal.loaded();
    portal.gameplayStart();
    portal.celebrate();
    const started = vi.fn();
    await portal.interstitial(started);
    expect(await portal.rewarded(started)).toBe(true);
    expect(started).toHaveBeenCalledTimes(2);
    expect(await portal.shareLink({ day: '20261013' })).toContain('day=20261013');
    expect(calls).toEqual([
      'loadingStart',
      'listen',
      'unlisten',
      'loadingStop',
      'gameplayStart',
      'happytime',
      'midgame',
      'rewarded',
    ]);
  });

  it.each([
    { name: 'a number', locale: 7 },
    { name: 'a list', locale: ['id-ID'] },
    { name: 'text with a hidden script', locale: 'id-ID<script>' },
  ])('gives no locale when CrazyGames gives $name', async ({ locale }) => {
    const { sdk } = crazySdk({ user: { systemInfo: { locale } } });
    const portal = new CrazyGamesPlatform({ CrazyGames: { SDK: sdk } }, () =>
      Promise.resolve(true),
    );
    await portal.init();
    expect(portal.locale()).toBeNull();
  });

  it.each([
    { name: 'a text', answer: 'no' },
    { name: 'nothing', answer: undefined },
    { name: 'a number', answer: 0 },
  ])('offers no rewarded ad when the ad-block check answers $name', async ({ answer }) => {
    const { sdk } = crazySdk({
      ad: { requestAd: () => undefined, hasAdblock: () => Promise.resolve(answer) },
    });
    const portal = new CrazyGamesPlatform({ CrazyGames: { SDK: sdk } }, () =>
      Promise.resolve(true),
    );
    await portal.init();
    expect(portal.rewardedAvailable()).toBe(false);
  });

  it.each([
    { name: 'nothing', settings: null },
    { name: 'a text', settings: 'muted' },
    { name: 'a silence as text', settings: { muteAudio: 'true' } },
    { name: 'a silence as a number', settings: { muteAudio: 1 } },
  ])('keeps the sound when CrazyGames hands over $name as its settings', async ({ settings }) => {
    const listeners: ((settings: unknown) => void)[] = [];
    const { sdk } = crazySdk();
    const game = {
      ...sdk.game,
      addSettingsChangeListener: (l: (s: unknown) => void) => void listeners.push(l),
    };
    const portal = new CrazyGamesPlatform({ CrazyGames: { SDK: { ...sdk, game } } }, () =>
      Promise.resolve(true),
    );
    await portal.init();
    const muted = vi.fn();
    portal.onMutedChange(muted);
    listeners[0]!(settings);
    expect(muted).toHaveBeenCalledWith(false);
  });

  it.each([
    { name: 'nothing', error: null },
    { name: 'a text', error: 'adblock' },
    { name: 'a code that is a number', error: { code: 7 } },
  ])(
    'gives no reward, and keeps rewards on offer, when an ad fails with $name',
    async ({ error }) => {
      const { sdk } = crazySdk({
        ad: {
          requestAd: (_type, callbacks) => callbacks.adError?.(error),
          hasAdblock: () => Promise.resolve(false),
        },
      });
      const portal = new CrazyGamesPlatform({ CrazyGames: { SDK: sdk } }, () =>
        Promise.resolve(true),
      );
      await portal.init();
      expect(await portal.rewarded(() => {})).toBe(false);
      expect(portal.rewardedAvailable()).toBe(true);
    },
  );

  it('hides rewarded offers once ads turn out to be off (Basic Launch)', async () => {
    const { sdk } = crazySdk({
      ad: {
        requestAd: (_type, callbacks) => callbacks.adError?.({ code: 'adsDisabledBasicLaunch' }),
        hasAdblock: () => Promise.resolve(false),
      },
    });
    const portal = new CrazyGamesPlatform({ CrazyGames: { SDK: sdk } }, () =>
      Promise.resolve(true),
    );
    await portal.init();
    expect(portal.rewardedAvailable()).toBe(true);
    expect(await portal.rewarded(() => {})).toBe(false);
    expect(portal.rewardedAvailable()).toBe(false);
  });

  it('shows and requests no ad at all in the Basic Launch build', async () => {
    const { sdk, calls } = crazySdk();
    const hasAdblock = vi.spyOn(sdk.ad, 'hasAdblock');
    const portal = new CrazyGamesPlatform(
      { CrazyGames: { SDK: sdk } },
      () => Promise.resolve(true),
      { ads: false },
    );
    await portal.init();
    expect(portal.hasAds).toBe(false);
    expect(portal.isPortal).toBe(true);
    expect(portal.rewardedAvailable()).toBe(false);
    await portal.interstitial(() => {});
    expect(await portal.rewarded(() => {})).toBe(false);
    expect(hasAdblock).not.toHaveBeenCalled();
    expect(calls).not.toContain('midgame');
    expect(calls).not.toContain('rewarded');
  });

  it('says once in the console when the data module is off', async () => {
    const off = () => {
      throw Object.assign(new Error('off'), { code: 'dataModuleDisabled' });
    };
    const { sdk } = crazySdk({ data: { getItem: off, setItem: off } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const portal = new CrazyGamesPlatform({ CrazyGames: { SDK: sdk } }, () =>
      Promise.resolve(true),
    );
    await portal.init();
    portal.saves().set('ballmania:player', '{}');
    // Not "nothing saved": what the module holds is there, only unread.
    expect(portal.saves().get('ballmania:player')).toBe(UNREADABLE);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('dataModuleDisabled');
    warn.mockRestore();
  });

  it('runs without ads when the SDK cannot load or an ad fails', async () => {
    const offline = new CrazyGamesPlatform({}, () => Promise.resolve(false));
    await offline.init();
    expect(offline.rewardedAvailable()).toBe(false);
    expect(await offline.rewarded(() => {})).toBe(false);
    offline.gameplayStart();
    offline.saves().set('k', 'v');
    expect(offline.saves().get('k')).toBe('v');

    const { sdk } = crazySdk({
      ad: {
        requestAd: (_type, callbacks) => callbacks.adError?.({ code: 'adCooldown' }),
        hasAdblock: () => Promise.resolve(true),
      },
    });
    const blocked = new CrazyGamesPlatform({ CrazyGames: { SDK: sdk } }, () =>
      Promise.resolve(true),
    );
    await blocked.init();
    expect(blocked.rewardedAvailable()).toBe(false);
    expect(await blocked.rewarded(() => {})).toBe(false);
  });
});

describe('PokiPlatform', () => {
  const pokiSdk = (init: () => Promise<void>, watched = true) => {
    const calls: string[] = [];
    const sdk: PokiSdk = {
      init,
      gameLoadingFinished: () => calls.push('loaded'),
      gameplayStart: () => calls.push('start'),
      gameplayStop: () => calls.push('stop'),
      commercialBreak: (onStart) => {
        calls.push('commercial');
        onStart?.();
        return Promise.resolve();
      },
      rewardedBreak: (onStart) => {
        calls.push('rewarded');
        onStart?.();
        return Promise.resolve(watched);
      },
      shareableURL: (params) =>
        Promise.resolve(`https://poki.com/en/g/ballmania?gdday=${params.day}`),
    };
    return { sdk, calls };
  };

  it('maps breaks and signals to the SDK', async () => {
    const { sdk, calls } = pokiSdk(() => Promise.resolve());
    const host: { PokiSDK?: PokiSdk } = {};
    const portal = new PokiPlatform(
      host,
      (src) => {
        expect(src).toBe(POKI_SDK);
        host.PokiSDK = sdk;
        return Promise.resolve(true);
      },
      new MemoryStorage(),
    );
    await portal.init();
    portal.loaded();
    portal.gameplayStart();
    portal.gameplayStop();
    await portal.interstitial(() => {});
    expect(await portal.rewarded(() => {})).toBe(true);
    expect(await portal.shareLink({ day: '20261013' })).toContain('gdday=20261013');
    expect(calls).toEqual(['loaded', 'start', 'stop', 'commercial', 'rewarded']);
  });

  it('keeps the game going without rewards when init fails (ad blocker)', async () => {
    const { sdk, calls } = pokiSdk(() => Promise.reject(new Error('adblock')));
    const portal = new PokiPlatform(
      { PokiSDK: sdk },
      () => Promise.resolve(true),
      new MemoryStorage(),
    );
    await portal.init();
    expect(portal.rewardedAvailable()).toBe(false);
    expect(await portal.rewarded(() => {})).toBe(false);
    portal.gameplayStart();
    expect(calls).toEqual(['start']);
  });
});

describe('GameDistributionPlatform', () => {
  it('configures the SDK before loading it, then rewards only a finished ad', async () => {
    const host: GameDistributionHost = {};
    let complete = true;
    const shown: string[] = [];
    const portal = new GameDistributionPlatform(
      host,
      (src) => {
        expect(src).toBe(GAMEDISTRIBUTION_SDK);
        expect(host.GD_OPTIONS?.gameId).toBe('abc123');
        host.gdsdk = {
          showAd: (type = 'interstitial') => {
            shown.push(type);
            host.GD_OPTIONS?.onEvent({ name: 'SDK_GAME_PAUSE' });
            if (type === 'rewarded' && complete) {
              host.GD_OPTIONS?.onEvent({ name: 'SDK_REWARDED_WATCH_COMPLETE' });
            }
            host.GD_OPTIONS?.onEvent({ name: 'SDK_GAME_START' });
            return Promise.resolve();
          },
        };
        setTimeout(() => host.GD_OPTIONS?.onEvent({ name: 'SDK_READY' }), 0);
        return Promise.resolve(true);
      },
      'abc123',
      new MemoryStorage(),
    );
    await portal.init();
    const started = vi.fn();
    await portal.interstitial(started);
    expect(await portal.rewarded(started)).toBe(true);
    complete = false;
    expect(await portal.rewarded(started)).toBe(false);
    expect(shown).toEqual(['interstitial', 'rewarded', 'rewarded']);
    expect(started).toHaveBeenCalledTimes(3);
    expect(await portal.shareLink()).toBeNull();
  });

  it('does nothing without a game id', async () => {
    const load = vi.fn(() => Promise.resolve(true));
    const portal = new GameDistributionPlatform({}, load, '', new MemoryStorage());
    await portal.init();
    expect(load).not.toHaveBeenCalled();
    expect(portal.rewardedAvailable()).toBe(false);
  });

  it.each([
    { name: 'nothing', event: null },
    { name: 'a bare text', event: 'SDK_READY' },
    { name: 'a name that is a number', event: { name: 7 } },
    { name: 'a list', event: ['SDK_READY'] },
  ])('takes no sign from an event that is $name', async ({ event }) => {
    vi.useFakeTimers();
    try {
      const host: GameDistributionHost = {};
      const load = () => {
        host.gdsdk = { showAd: () => Promise.resolve() };
        setTimeout(() => host.GD_OPTIONS?.onEvent(event), 0);
        return Promise.resolve(true);
      };
      const portal = new GameDistributionPlatform(host, load, 'abc123', new MemoryStorage());
      const init = portal.init();
      await vi.advanceTimersByTimeAsync(6_000);
      await init;
      expect(portal.rewardedAvailable()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('PlaygamaPlatform', () => {
  /**
   * A Bridge whose ads open and close at once, unless they are blocked or
   * stall: a request on Playgama's page without its ad SDK stays "loading".
   */
  const fakeBridge = (
    options: {
      rewarded?: boolean;
      /** What Bridge says of the sound; on by default. */
      audio?: unknown;
      blocked?: boolean;
      stall?: boolean;
      /** What Bridge says the player's language is. */
      language?: unknown;
      /** True: Bridge cannot load the saves (its storage fails). */
      loadFails?: boolean;
      /** What Bridge answers when asked for the saves, instead of one value per key. */
      answer?: unknown;
      /** Bridge hands the saves over only once this settles. */
      handOver?: Promise<void>;
    } = {},
  ) => {
    const messages: string[] = [];
    const stored = new Map<string, string>([['ballmania:player', '{"version":1}']]);
    const platformListeners = new Map<string, (value: unknown) => void>();
    const adListeners = new Map<string, Set<(state: string) => void>>();
    const adStates = new Map<string, string>();
    const emitAd = (event: string, state: string) => {
      adStates.set(event, state);
      [...(adListeners.get(event) ?? [])].forEach((listener) => listener(state));
    };
    const showInterstitial = vi.fn(() => {
      emitAd('interstitial', 'loading');
      if (options.stall) return;
      emitAd('interstitial', 'opened');
      emitAd('interstitial', 'closed');
    });
    const showRewarded = vi.fn(() => {
      emitAd('rewarded', 'loading');
      if (options.stall) return;
      emitAd('rewarded', 'opened');
      if (options.rewarded ?? true) emitAd('rewarded', 'rewarded');
      emitAd('rewarded', 'closed');
    });
    const bridge: PlaygamaBridge = {
      initialize: () => Promise.resolve(),
      EVENT_NAME: {
        AUDIO_STATE_CHANGED: 'audio',
        PAUSE_STATE_CHANGED: 'pause',
        INTERSTITIAL_STATE_CHANGED: 'interstitial',
        REWARDED_STATE_CHANGED: 'rewarded',
      },
      platform: {
        language: 'language' in options ? options.language : 'id',
        isAudioEnabled: 'audio' in options ? options.audio : true,
        sendMessage: (message) => messages.push(message),
        on: (event, listener) => void platformListeners.set(event, listener as never),
        off: (event) => void platformListeners.delete(event),
      },
      storage: {
        get: (keys) =>
          options.loadFails
            ? Promise.reject(new Error('storage unavailable'))
            : (options.handOver ?? Promise.resolve()).then(() =>
                'answer' in options ? options.answer : keys.map((key) => stored.get(key) ?? null),
              ),
        set: (keys, values) => {
          keys.forEach((key, i) => stored.set(key, values[i]!));
          return Promise.resolve();
        },
      },
      advertisement: {
        isInterstitialSupported: true,
        isRewardedSupported: true,
        get interstitialState() {
          return adStates.get('interstitial') ?? 'closed';
        },
        get rewardedState() {
          return adStates.get('rewarded') ?? 'closed';
        },
        checkAdBlock: () => Promise.resolve(options.blocked ?? false),
        showInterstitial,
        showRewarded,
        on: (event, listener) => {
          const listeners = adListeners.get(event) ?? new Set();
          listeners.add(listener as never);
          adListeners.set(event, listeners);
        },
        off: (event, listener) => void adListeners.get(event)?.delete(listener as never),
      },
    };
    return { bridge, messages, stored, platformListeners, emitAd, showInterstitial, showRewarded };
  };

  it('loads every save in one call and writes through Bridge storage', async () => {
    const { bridge, stored } = fakeBridge();
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    expect(portal.saves().get('ballmania:player')).toBe('{"version":1}');
    expect(portal.preferences()).toBe(portal.saves());
    portal.saves().set('ballmania:progress', '{}');
    expect(stored.get('ballmania:progress')).toBe('{}');
    expect(portal.locale()).toBe('id');
  });

  it('never writes over saves Bridge hands over after the game started without them', async () => {
    let handOver = () => {};
    const late = new Promise<void>((resolve) => (handOver = resolve));
    const { bridge, stored } = fakeBridge({ handOver: late });
    const portal = new PlaygamaPlatform({ bridge });
    const init = portal.init();
    // The game gave up waiting for the SDK (createPlatform) and read its saves: none yet.
    expect(portal.saves().get('ballmania:player')).toBeNull();
    handOver();
    await init;
    portal.saves().set('ballmania:player', '{"version":2}');
    expect(stored.get('ballmania:player')).toBe('{"version":1}');
  });

  it('never writes over the saves it could not load', async () => {
    const { bridge, stored } = fakeBridge({ loadFails: true });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    portal.saves().set('ballmania:player', '{"version":2}');
    expect(stored.get('ballmania:player')).toBe('{"version":1}');
    expect(portal.saves().get('ballmania:player')).toBe('{"version":2}');
  });

  it.each([
    { name: 'a number', language: 42 },
    { name: 'an object', language: { code: 'fr' } },
    { name: 'a list', language: ['fr'] },
    { name: 'text that is no language tag', language: 'fr fr' },
    { name: 'a tag longer than any language', language: `fr-${'x'.repeat(33)}` },
  ])('gives no language when Bridge gives $name', async ({ language }) => {
    const { bridge } = fakeBridge({ language });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    expect(portal.locale()).toBeNull();
  });

  it('tells the portal the game is ready and the levels it plays', async () => {
    const { bridge, messages } = fakeBridge();
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    portal.loaded();
    portal.gameplayStart();
    portal.gameplayStop();
    portal.gameplayStart();
    portal.levelEnded(true);
    portal.gameplayStart();
    portal.levelEnded(false);
    expect(messages).toEqual([
      'game_ready',
      'level_started',
      'level_paused',
      'level_resumed',
      'level_completed',
      'level_started',
      'level_failed',
    ]);
  });

  it('follows the portal sound and pause, and grants a reward only when rewarded', async () => {
    const { bridge, platformListeners } = fakeBridge({ audio: false });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    expect(portal.muted()).toBe(true);
    const muted = vi.fn();
    const paused = vi.fn();
    portal.onMutedChange(muted);
    portal.onPausedChange(paused);
    platformListeners.get('audio')!(true);
    platformListeners.get('pause')!(true);
    expect(muted).toHaveBeenCalledWith(false);
    expect(paused).toHaveBeenCalledWith(true);
    const started = vi.fn();
    await portal.interstitial(started);
    expect(await portal.rewarded(started)).toBe(true);
    expect(started).toHaveBeenCalledTimes(2);
    expect(await portal.shareLink()).toBeNull();

    const refused = fakeBridge({ rewarded: false });
    const other = new PlaygamaPlatform({ bridge: refused.bridge });
    await other.init();
    expect(await other.rewarded(() => {})).toBe(false);
  });

  it.each([
    { name: 'a text', value: 'true' },
    { name: 'a number', value: 1 },
    { name: 'nothing', value: undefined },
  ])('changes neither sound nor pause when Bridge hands over $name', async ({ value }) => {
    const { bridge, platformListeners } = fakeBridge();
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    const muted = vi.fn();
    const paused = vi.fn();
    portal.onMutedChange(muted);
    portal.onPausedChange(paused);
    platformListeners.get('audio')!(value);
    platformListeners.get('pause')!(value);
    expect(muted).not.toHaveBeenCalled();
    expect(paused).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'a text', audio: 'yes' },
    { name: 'a number', audio: 1 },
    { name: 'nothing', audio: undefined },
  ])('stays silent when Bridge gives $name for its sound', async ({ audio }) => {
    const { bridge } = fakeBridge({ audio });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    expect(portal.muted()).toBe(true);
  });

  it.each([
    { name: 'no list', answer: { 'ballmania:player': '{}' } },
    { name: 'more values than keys', answer: ['{}', '{}', '{}', '{}', '{}'] },
  ])('plays from memory when Bridge answers the saves with $name', async ({ answer }) => {
    const { bridge, stored } = fakeBridge({ answer });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    portal.saves().set('ballmania:player', '{"version":2}');
    expect(stored.get('ballmania:player')).toBe('{"version":1}');
  });

  it('hands over a save Bridge parsed as it is, for the game to read at the door', async () => {
    const { bridge } = fakeBridge({ answer: [{ locale: 'ru' }, null, null, null] });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    expect(portal.saves().get('ballmania:settings')).toEqual({ locale: 'ru' });
    expect(portal.saves().get('ballmania:progress')).toBeNull();
  });

  it('pauses the game while an ad the portal launched by itself is open', async () => {
    const { bridge, platformListeners, emitAd } = fakeBridge();
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    const paused = vi.fn();
    portal.onPausedChange(paused);
    emitAd('interstitial', 'loading');
    expect(paused).not.toHaveBeenCalled();
    emitAd('interstitial', 'opened');
    platformListeners.get('pause')!(true);
    emitAd('interstitial', 'closed');
    expect(paused).toHaveBeenCalledTimes(1);
    platformListeners.get('pause')!(false);
    expect(paused.mock.calls).toEqual([[true], [false]]);
    emitAd('rewarded', 'opened');
    emitAd('rewarded', 'failed');
    expect(paused.mock.calls.slice(2)).toEqual([[true], [false]]);
  });

  it('starts paused if an ad is already open when the game loads', async () => {
    const { bridge } = fakeBridge();
    const portal = new PlaygamaPlatform({
      bridge: {
        ...bridge,
        advertisement: { ...bridge.advertisement, interstitialState: 'opened' },
      },
    });
    await portal.init();
    const paused = vi.fn();
    portal.onPausedChange(paused);
    expect(paused).toHaveBeenCalledWith(true);
  });

  it('offers no ad when Bridge finds the ads blocked, and never asks for one', async () => {
    const { bridge, showInterstitial, showRewarded } = fakeBridge({ blocked: true });
    const portal = new PlaygamaPlatform({ bridge });
    await portal.init();
    expect(portal.rewardedAvailable()).toBe(false);
    await portal.interstitial(() => {});
    expect(await portal.rewarded(() => {})).toBe(false);
    expect(showInterstitial).not.toHaveBeenCalled();
    expect(showRewarded).not.toHaveBeenCalled();
  });

  it('gives up on an ad that never opens, then asks for none while Bridge is stuck', async () => {
    vi.useFakeTimers();
    try {
      const { bridge, showInterstitial } = fakeBridge({ stall: true });
      const portal = new PlaygamaPlatform({ bridge });
      await portal.init();
      expect(portal.rewardedAvailable()).toBe(true);
      const started = vi.fn();
      const outcome = portal.rewarded(started);
      await vi.advanceTimersByTimeAsync(11_000);
      let settled = false;
      void outcome.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(await outcome).toBe(false);
      expect(started).not.toHaveBeenCalled();
      expect(portal.rewardedAvailable()).toBe(false);
      await portal.interstitial(() => {});
      expect(showInterstitial).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs without Bridge (blocked script)', async () => {
    const portal = new PlaygamaPlatform({});
    await portal.init();
    expect(portal.rewardedAvailable()).toBe(false);
    portal.saves().set('k', 'v');
    expect(portal.saves().get('k')).toBe('v');
    portal.loaded();
  });
});

describe('YandexPlatform', () => {
  interface FakeYandexOptions {
    /** False: the page lacks the SDK, which the adapter must load. */
    inPage?: boolean;
    /** What Yandex does with an ad request; by default the ad plays to its end. */
    ad?: 'shown' | 'skipped' | 'error' | 'stall';
    /** False: the player closes the rewarded video before its end. */
    watched?: boolean;
    /** False: the player's data cannot be read. */
    player?: boolean;
    /** What Yandex holds as the player's data; by default a profile and an old number. */
    data?: unknown;
    /** What Yandex says the player's language is. */
    lang?: unknown;
  }

  /** A Yandex SDK and page, recording what the adapter asks of them. */
  const fakeYandex = (options: FakeYandexOptions = {}) => {
    const calls: string[] = [];
    const saved: Readonly<Record<string, unknown>>[] = [];
    const listeners = new Map<string, () => void>();
    const play = (callbacks: YandexAdCallbacks, rewarded: boolean) => {
      const outcome = options.ad ?? 'shown';
      if (outcome === 'error') callbacks.onError?.(new Error('no ad'));
      if (outcome === 'skipped') callbacks.onClose?.(false);
      if (outcome !== 'shown') return;
      callbacks.onOpen?.();
      if (rewarded && (options.watched ?? true)) callbacks.onRewarded?.();
      callbacks.onClose?.(true);
    };
    const player: YandexPlayer = {
      getData: () => {
        calls.push('getData');
        return Promise.resolve(
          'data' in options
            ? options.data
            : { 'ballmania:player': '{"version":1}', 'ballmania:legacy': 3 },
        );
      },
      setData: (data, flush) => {
        expect(flush).toBe(true);
        saved.push(data);
        return Promise.resolve();
      },
    };
    const sdk: YandexSdk = {
      features: {
        LoadingAPI: { ready: () => calls.push('ready') },
        GameplayAPI: { start: () => calls.push('start'), stop: () => calls.push('stop') },
      },
      environment: { i18n: { lang: 'lang' in options ? options.lang : 'ru' } },
      adv: {
        showFullscreenAdv: ({ callbacks }) => {
          calls.push('fullscreen');
          play(callbacks, false);
        },
        showRewardedVideo: ({ callbacks }) => {
          calls.push('rewarded');
          play(callbacks, true);
        },
      },
      getPlayer: () =>
        options.player === false ? Promise.reject(new Error('no player')) : Promise.resolve(player),
      on: (event, listener) => void listeners.set(event, listener),
    };
    const yaGames = { init: () => Promise.resolve(sdk) };
    const page = {
      visibilityState: 'visible',
      addEventListener: (type: 'visibilitychange', listener: () => void) =>
        void listeners.set(type, listener),
    };
    const host: YandexHost = {
      addEventListener: (type, listener) => void listeners.set(type, listener),
      document: page,
    };
    if (options.inPage ?? true) host.YaGames = yaGames;
    /** Fires a window, page or SDK event the adapter listens to. */
    const fire = (event: string) => {
      listeners.get(event)!();
    };
    return { host, yaGames, page, calls, saved, fire };
  };

  /** The adapter on a page that has the SDK already (the build puts it in the head). */
  const yandexPortal = async (options: FakeYandexOptions = {}) => {
    const fake = fakeYandex(options);
    const load = vi.fn(() => Promise.resolve(true));
    const browser = new MemoryStorage();
    const portal = new YandexPlatform(fake.host, load, browser);
    await portal.init();
    return { ...fake, portal, load, browser };
  };

  it('loads the SDK from /sdk.js, then the language and every save in one request', async () => {
    const { host, yaGames, calls } = fakeYandex({ inPage: false });
    const load = vi.fn((src: string) => {
      expect(src).toBe(YANDEX_SDK);
      host.YaGames = yaGames;
      return Promise.resolve(true);
    });
    const browser = new MemoryStorage();
    const portal = new YandexPlatform(host, load, browser);
    await portal.init();
    expect(load).toHaveBeenCalledTimes(1);
    expect(portal.locale()).toBe('ru');
    expect(portal.saves().get('ballmania:player')).toBe('{"version":1}');
    expect(portal.saves().get('ballmania:legacy')).toBe(3);
    expect(portal.saves()).not.toBe(browser);
    expect(portal.preferences()).toBe(browser);
    expect(calls).toEqual(['getData']);
  });

  it('sends the saves of one moment together, then one request per interval at most', async () => {
    vi.useFakeTimers();
    try {
      const { portal, saved } = await yandexPortal();
      const saves = portal.saves();
      saves.set('ballmania:progress', '{"level":2}');
      saves.set('ballmania:player', '{"version":1,"shards":5}');
      expect(saved).toEqual([]);
      await vi.advanceTimersByTimeAsync(0);
      expect(saved).toEqual([
        {
          'ballmania:player': '{"version":1,"shards":5}',
          'ballmania:legacy': 3,
          'ballmania:progress': '{"level":2}',
        },
      ]);
      saves.set('ballmania:arcade', '{"best":10}');
      saves.set('ballmania:arcade', '{"best":12}');
      await vi.advanceTimersByTimeAsync(SAVE_INTERVAL - 1);
      expect(saved).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(saved).toHaveLength(2);
      expect(saved[1]).toEqual({
        'ballmania:player': '{"version":1,"shards":5}',
        'ballmania:legacy': 3,
        'ballmania:progress': '{"level":2}',
        'ballmania:arcade': '{"best":12}',
      });
      await vi.advanceTimersByTimeAsync(SAVE_INTERVAL);
      saves.set('ballmania:arcade', '{"best":15}');
      await vi.advanceTimersByTimeAsync(0);
      expect(saved).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends what waits at once when the page hides or closes', async () => {
    vi.useFakeTimers();
    try {
      const { portal, saved, page, fire } = await yandexPortal();
      portal.saves().set('ballmania:progress', '{"level":2}');
      await vi.advanceTimersByTimeAsync(0);
      portal.saves().set('ballmania:progress', '{"level":3}');
      page.visibilityState = 'hidden';
      fire('visibilitychange');
      expect(saved).toHaveLength(2);
      expect(saved[1]).toMatchObject({ 'ballmania:progress': '{"level":3}' });
      portal.saves().set('ballmania:progress', '{"level":4}');
      fire('pagehide');
      fire('pagehide');
      expect(saved).toHaveLength(3);
      expect(saved[2]).toMatchObject({ 'ballmania:progress': '{"level":4}' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the saves in the browser when the player data cannot be read', async () => {
    const { portal, browser, saved } = await yandexPortal({ player: false });
    expect(portal.saves()).toBe(browser);
    portal.saves().set('k', 'v');
    expect(browser.get('k')).toBe('v');
    expect(saved).toEqual([]);
  });

  it('sends back, untouched, the player data it could not read', async () => {
    vi.useFakeTimers();
    try {
      const { portal, saved } = await yandexPortal();
      portal.saves().set('ballmania:progress', '{"version":1,"levels":{}}');
      await vi.advanceTimersByTimeAsync(0);
      expect(saved).toEqual([
        {
          'ballmania:player': '{"version":1}',
          'ballmania:legacy': 3,
          'ballmania:progress': '{"version":1,"levels":{}}',
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    { name: 'nothing', data: null },
    { name: 'a list', data: ['{"version":1}'] },
    { name: 'a text', data: '{"ballmania:player":"{}"}' },
    {
      name: 'more fields than the game could ever have saved',
      data: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`key-${i}`, '{}'])),
    },
  ])('keeps the saves in the browser when the player data is $name', async ({ data }) => {
    const { portal, browser, saved } = await yandexPortal({ data });
    expect(portal.saves()).toBe(browser);
    expect(saved).toEqual([]);
  });

  it.each([
    { name: 'a number', lang: 7 },
    { name: 'an object', lang: { code: 'ru' } },
    { name: 'text that is no language tag', lang: 'ru!' },
  ])('gives no language when Yandex gives $name', async ({ lang }) => {
    const { portal } = await yandexPortal({ lang });
    expect(portal.locale()).toBeNull();
  });

  it('tells Yandex once that the game is ready, then each start and stop of play', async () => {
    const { portal, calls, load } = await yandexPortal();
    expect(load).not.toHaveBeenCalled();
    portal.loaded();
    portal.loaded();
    portal.gameplayStart();
    portal.gameplayStart();
    portal.gameplayStop();
    portal.levelEnded(true);
    portal.celebrate();
    expect(calls).toEqual(['getData', 'ready', 'start', 'stop']);
    expect(portal.stopsOnAutoPause).toBe(true);
    expect(portal.allowsSharing).toBe(false);
    // No version number in the game: developer information to Yandex (rule 1.14).
    expect(portal.showsVersion).toBe(false);
    expect(portal.muted()).toBe(false);
    expect(await portal.shareLink()).toBeNull();
  });

  it('stops play and sound while Yandex pauses the game, it loses the focus or its tab hides', async () => {
    const { portal, calls, page, fire } = await yandexPortal();
    const paused = vi.fn();
    portal.onPausedChange(paused);
    portal.gameplayStart();
    fire('game_api_pause');
    fire('blur');
    fire('game_api_resume');
    expect(paused.mock.calls).toEqual([[true]]);
    fire('focus');
    page.visibilityState = 'hidden';
    fire('visibilitychange');
    page.visibilityState = 'visible';
    fire('visibilitychange');
    expect(paused.mock.calls).toEqual([[true], [false], [true], [false]]);
    expect(calls).toEqual(['getData', 'start', 'stop', 'start', 'stop', 'start']);

    // Over a menu, a pause and resume restart nothing.
    portal.gameplayStop();
    fire('game_api_pause');
    fire('game_api_resume');
    expect(calls.slice(6)).toEqual(['stop']);

    fire('blur');
    const late = vi.fn();
    portal.onPausedChange(late);
    expect(late).toHaveBeenCalledWith(true);
  });

  it('silences the game during its ads and rewards only a video watched to the end', async () => {
    const { portal, calls } = await yandexPortal();
    const paused = vi.fn();
    portal.onPausedChange(paused);
    const started = vi.fn();
    await portal.interstitial(started);
    expect(await portal.rewarded(started)).toBe(true);
    expect(started).toHaveBeenCalledTimes(2);
    expect(paused.mock.calls).toEqual([[true], [false], [true], [false]]);
    expect(calls).toEqual(['getData', 'fullscreen', 'rewarded']);

    const early = await yandexPortal({ watched: false });
    expect(await early.portal.rewarded(() => {})).toBe(false);
    expect(early.portal.rewardedAvailable()).toBe(true);

    const skipped = await yandexPortal({ ad: 'skipped' });
    const notStarted = vi.fn();
    await skipped.portal.interstitial(notStarted);
    expect(notStarted).not.toHaveBeenCalled();
  });

  it('gives up on an ad that fails or never opens, then offers no reward again', async () => {
    const failing = await yandexPortal({ ad: 'error' });
    expect(await failing.portal.rewarded(() => {})).toBe(false);
    expect(failing.portal.rewardedAvailable()).toBe(false);
    expect(await failing.portal.rewarded(() => {})).toBe(false);
    expect(failing.calls.filter((call) => call === 'rewarded')).toHaveLength(1);

    vi.useFakeTimers();
    try {
      const { portal } = await yandexPortal({ ad: 'stall' });
      const started = vi.fn();
      const outcome = portal.rewarded(started);
      let settled = false;
      void outcome.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(AD_OPEN_TIMEOUT - 1);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toBe(false);
      expect(started).not.toHaveBeenCalled();
      expect(portal.rewardedAvailable()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs without the SDK (blocked script or failed init), its saves in the browser', async () => {
    const { host } = fakeYandex({ inPage: false });
    const browser = new MemoryStorage();
    const portal = new YandexPlatform(host, () => Promise.resolve(false), browser);
    await portal.init();
    expect(portal.locale()).toBeNull();
    expect(portal.rewardedAvailable()).toBe(false);
    expect(await portal.rewarded(() => {})).toBe(false);
    await portal.interstitial(() => {});
    expect(portal.saves()).toBe(browser);
    portal.loaded();
    portal.gameplayStart();

    const broken = fakeYandex();
    broken.host.YaGames = { init: () => Promise.reject(new Error('blocked')) };
    const offline = new YandexPlatform(broken.host, () => Promise.resolve(true), browser);
    await offline.init();
    expect(offline.rewardedAvailable()).toBe(false);
    expect(offline.saves()).toBe(browser);
  });
});
