import { inject, type InjectionKey } from 'vue';
import { detectLocale } from '@/i18n/locales';
import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import { SettingsService } from '@/services/SettingsService';
import { ThemeController } from '@/services/ThemeController';

/** Every service the interface depends on, created once and injected. */
export interface AppServices {
  readonly settings: SettingsService;
  readonly theme: ThemeController;
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
  };
}

export function useServices(): AppServices {
  const services = inject(APP_SERVICES);
  if (!services) throw new Error('App services are not provided');
  return services;
}
