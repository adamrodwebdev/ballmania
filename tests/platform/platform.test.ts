import { describe, expect, it, vi } from 'vitest';
import { AD_INTERVAL, AdPolicy, AdService, GameplaySignals } from '@/platform/AdService';
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
import { PLATFORM_IDS } from '@/platform/platforms';
import { POKI_SDK, PokiPlatform, type PokiSdk } from '@/platform/PokiPlatform';
import { StandalonePlatform } from '@/platform/StandalonePlatform';
import { MemoryStorage } from '@/services/KeyValueStorage';

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

describe('AdPolicy', () => {
  it('waits three minutes after the start of the visit and after every ad', () => {
    const policy = new AdPolicy(0);
    expect(policy.allowsInterstitial(AD_INTERVAL - 1)).toBe(false);
    expect(policy.allowsInterstitial(AD_INTERVAL)).toBe(true);
    policy.shown(AD_INTERVAL);
    expect(policy.allowsInterstitial(AD_INTERVAL * 2 - 1)).toBe(false);
    expect(policy.allowsInterstitial(AD_INTERVAL * 2)).toBe(true);
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
    expect(await site.shareLink({ day: '20261013' })).toBe('https://ballmania.example/jeu/');
    expect(PLATFORM_IDS).toContain(site.id);
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
});
