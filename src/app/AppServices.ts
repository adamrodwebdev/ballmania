import { inject, type InjectionKey } from 'vue';
import { detectLocale } from '@/i18n/locales';
import { AdPolicy, AdService, GameplaySignals } from '@/platform/AdService';
import type { PlatformAdapter } from '@/platform/PlatformAdapter';
import { PlayerProfile } from '@/player/PlayerProfile';
import { ArcadeProgress } from '@/services/ArcadeProgress';
import { CampaignProgress } from '@/services/CampaignProgress';
import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
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

/**
 * Settings stay in the browser (the theme script reads them before the first
 * paint); saves go where the platform keeps them.
 */
export function createBrowserServices(
  platform: PlatformAdapter,
  storage: KeyValueStorage = BrowserStorage.local(),
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
    vibration: true,
    aimAssist: true,
    difficulty: 'pilot',
  });
  return {
    settings,
    theme: new ThemeController(settings, document.documentElement, (query) =>
      window.matchMedia(query),
    ),
    progress: new CampaignProgress(saves),
    arcade: new ArcadeProgress(saves),
    player: new PlayerProfile(saves),
    share: new ShareService(navigator),
    platform,
    ads: new AdService(platform, new AdPolicy(Date.now()), () => Date.now()),
    gameplay: new GameplaySignals(platform),
    today: () => new Date(),
  };
}

export function useServices(): AppServices {
  const services = inject(APP_SERVICES);
  if (!services) throw new Error('App services are not provided');
  return services;
}
