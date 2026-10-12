import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { BrowserStorage, MemoryStorage, readJson } from '@/services/KeyValueStorage';
import { SETTINGS_KEY, SettingsService } from '@/services/SettingsService';
import { ThemeController } from '@/services/ThemeController';

const DEFAULTS = {
  locale: 'fr',
  theme: 'system',
  effects: 'spectacular',
  volume: 0.7,
  vibration: true,
} as const;

describe('SettingsService', () => {
  it('starts from the defaults and saves every change', () => {
    const storage = new MemoryStorage();
    const settings = new SettingsService(storage, DEFAULTS);
    expect(settings.current.theme).toBe('system');
    settings.update({ theme: 'dark', effects: 'subtle', volume: 0 });
    expect(settings.current.theme).toBe('dark');
    expect(readJson(storage, SETTINGS_KEY)).toEqual({
      ...DEFAULTS,
      theme: 'dark',
      effects: 'subtle',
      volume: 0,
    });
  });

  it('restores saved settings and ignores invalid fields', () => {
    const storage = new MemoryStorage();
    storage.set(
      SETTINGS_KEY,
      JSON.stringify({ locale: 'id', theme: 'neon', effects: 'max', volume: 3, vibration: false }),
    );
    const settings = new SettingsService(storage, DEFAULTS);
    expect(settings.current).toEqual({ ...DEFAULTS, locale: 'id', vibration: false });
  });

  it('survives corrupt storage', () => {
    const storage = new MemoryStorage();
    storage.set(SETTINGS_KEY, '{not json');
    expect(new SettingsService(storage, DEFAULTS).current.locale).toBe('fr');
  });

  it('uses the key the theme bootstrap script reads', () => {
    expect(SETTINGS_KEY).toBe('ballmania:settings');
  });
});

describe('BrowserStorage', () => {
  it('falls back to memory when the browser refuses to store', () => {
    const refusing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage;
    const storage = new BrowserStorage(refusing);
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });

  it('works without any browser storage', () => {
    const storage = new BrowserStorage(null);
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });
});

/** A media query whose result the test controls. */
class FakeMediaQuery {
  private readonly listeners: (() => void)[] = [];

  constructor(public matches: boolean) {}

  addEventListener(_type: 'change', listener: () => void): void {
    this.listeners.push(listener);
  }

  change(matches: boolean): void {
    this.matches = matches;
    for (const listener of this.listeners) listener();
  }
}

describe('ThemeController', () => {
  const setup = (systemDark: boolean) => {
    const settings = new SettingsService(new MemoryStorage(), DEFAULTS);
    const root = { dataset: {} } as HTMLElement;
    const query = new FakeMediaQuery(systemDark);
    const theme = new ThemeController(settings, root, () => query as unknown as MediaQueryList);
    return { settings, root, query, theme };
  };

  it('follows the system theme by default', () => {
    const { root, query } = setup(true);
    expect(root.dataset.theme).toBe('dark');
    query.change(false);
    expect(root.dataset.theme).toBe('light');
  });

  it('applies an explicit choice over the system', async () => {
    const { settings, root } = setup(true);
    settings.update({ theme: 'light' });
    await nextTick();
    expect(root.dataset.theme).toBe('light');
  });

  it('toggles to the other theme', async () => {
    const { settings, theme } = setup(false);
    theme.toggle();
    await nextTick();
    expect(settings.current.theme).toBe('dark');
    expect(theme.resolved.value).toBe('dark');
  });
});
