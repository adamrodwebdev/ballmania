import { inject, type InjectionKey } from 'vue';
import { detectLocale } from '@/i18n/locales';
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
  /** Today, for the daily challenge (a function so tests can fix it). */
  readonly today: () => Date;
}

export const APP_SERVICES: InjectionKey<AppServices> = Symbol('AppServices');

export function createBrowserServices(
  storage: KeyValueStorage = BrowserStorage.local(),
): AppServices {
  const settings = new SettingsService(storage, {
    locale: detectLocale(navigator.languages),
    theme: 'system',
    effects: 'spectacular',
    volume: 0.7,
    vibration: true,
  });
  return {
    settings,
    theme: new ThemeController(settings, document.documentElement, (query) =>
      window.matchMedia(query),
    ),
    progress: new CampaignProgress(storage),
    arcade: new ArcadeProgress(storage),
    player: new PlayerProfile(storage),
    share: new ShareService(navigator),
    today: () => new Date(),
  };
}

export function useServices(): AppServices {
  const services = inject(APP_SERVICES);
  if (!services) throw new Error('App services are not provided');
  return services;
}
