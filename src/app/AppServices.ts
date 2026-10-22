import { inject, type InjectionKey } from 'vue';
import { isFirstVisit, type PlayerTrace } from '@/app/landing';
import { detectLocale } from '@/i18n/locales';
import { AD_INTERVAL, AdPolicy, AdService, GameplaySignals } from '@/platform/AdService';
import type { PlatformAdapter } from '@/platform/PlatformAdapter';
import { PlayerProfile } from '@/player/PlayerProfile';
import { ArcadeProgress } from '@/services/ArcadeProgress';
import { CampaignProgress } from '@/services/CampaignProgress';
import type { KeyValueStorage } from '@/services/KeyValueStorage';
import { SettingsService } from '@/services/SettingsService';
import { ShareService } from '@/services/ShareService';
import { ThemeController } from '@/services/ThemeController';

/** Every service the interface depends on, created once and injected. */
export interface AppServices {
  readonly settings: SettingsService;
  readonly theme: ThemeController;
  readonly progress: CampaignProgress;
  readonly arcade: ArcadeProgress;
  readonly player: PlayerProfile;
  readonly share: ShareService;
  /** The site or portal the game runs on (§ 3.7). */
  readonly platform: PlatformAdapter;
  readonly ads: AdService;
  readonly gameplay: GameplaySignals;
  /** Today, for the daily challenge (a function so tests can fix it). */
  readonly today: () => Date;
}

export const APP_SERVICES: InjectionKey<AppServices> = Symbol('AppServices');

/** What the saves tell of the player's past: enough to recognise a first visit (§ 3.7). */
export function playerTrace(player: PlayerProfile, progress: CampaignProgress): PlayerTrace {
  return {
    gamesPlayed: player.view.stats.gamesPlayed,
    levelsFinished: Object.keys(progress.levels).length,
    worldsFinished: player.view.worlds.length,
  };
}

/**
 * Settings stay in the browser (the theme script reads them before the first
 * paint); saves go where the platform keeps them.
 */
export function createBrowserServices(
  platform: PlatformAdapter,
  storage: KeyValueStorage = platform.preferences(),
): AppServices {
  const saves = platform.saves();
  const portalLocale = platform.locale();
  const settings = new SettingsService(storage, {
    locale: detectLocale(portalLocale ? [portalLocale] : navigator.languages),
    // The game's look is the dark cosmos; light stays one setting away.
    theme: 'dark',
    effects: 'spectacular',
    volume: 0.7,
    music: 0.6,
    muted: false,
    vibration: true,
    aimAssist: true,
    difficulty: 'pilot',
  });
  const progress = new CampaignProgress(saves);
  const player = new PlayerProfile(saves);
  const newcomer = isFirstVisit(playerTrace(player, progress));
  return {
    settings,
    theme: new ThemeController(settings, document.documentElement, (query) =>
      window.matchMedia(query),
    ),
    progress,
    arcade: new ArcadeProgress(saves),
    player,
    share: new ShareService(navigator),
    platform,
    ads: new AdService(platform, new AdPolicy(Date.now(), AD_INTERVAL, newcomer), () => Date.now()),
    gameplay: new GameplaySignals(platform),
    today: () => new Date(),
  };
}

export function useServices(): AppServices {
  const services = inject(APP_SERVICES);
  if (!services) throw new Error('App services are not provided');
  return services;
}
