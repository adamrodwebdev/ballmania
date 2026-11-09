import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { SAVE_LIMITS } from '@/rules/limits';
import { BrowserStorage, MemoryStorage } from '@/services/KeyValueStorage';
import { SETTINGS_KEY, SettingsService, type Settings } from '@/services/SettingsService';
import { ThemeController } from '@/services/ThemeController';
import { storageWith, storedJson } from './stored';

const DEFAULTS = {
  locale: 'fr',
  theme: 'system',
  effects: 'spectacular',
  volume: 0.7,
  music: 0.6,
  muted: false,
  vibration: true,
  aimAssist: true,
  difficulty: 'pilot',
} as const;

describe('SettingsService', () => {
  it('starts from the defaults and saves every change, only what the player chose', () => {
    const storage = new MemoryStorage();
    const settings = new SettingsService(storage, DEFAULTS);
    expect(settings.current.theme).toBe('system');
    settings.update({ theme: 'dark', effects: 'subtle' });
    settings.update({ volume: 0 });
    expect(settings.current).toEqual({ ...DEFAULTS, theme: 'dark', effects: 'subtle', volume: 0 });
    expect(storedJson(storage, SETTINGS_KEY)).toEqual({
      theme: 'dark',
      effects: 'subtle',
      volume: 0,
    });
  });

  it('keeps following a language the player never chose, such as the portal one', () => {
    const storage = new MemoryStorage();
    // Muted on a visit in Russian, the language Yandex gave (rule 2.14)…
    new SettingsService(storage, { ...DEFAULTS, locale: 'ru' }).update({ muted: true });
    // …then back with Yandex in English: English, still muted.
    const next = new SettingsService(storage, { ...DEFAULTS, locale: 'en' });
    expect(next.current).toMatchObject({ locale: 'en', muted: true });
    // A language the player picked stays theirs.
    next.update({ locale: 'id' });
    expect(new SettingsService(storage, { ...DEFAULTS, locale: 'ru' }).current.locale).toBe('id');
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

/** The settings read back from this saved text. */
const settingsFrom = (text: string) =>
  new SettingsService(storageWith(SETTINGS_KEY, text), DEFAULTS).current;

/** A choice for every setting, none of them its default. */
const CHOSEN: Settings = {
  locale: 'ru',
  theme: 'light',
  effects: 'subtle',
  volume: 0.3,
  music: 0.2,
  muted: true,
  vibration: false,
  aimAssist: false,
  difficulty: 'legend',
};
/** The chosen settings saved, with `json` written as it is in place of one of them. */
const savedWith = (field: keyof Settings, json: string) =>
  JSON.stringify({ ...CHOSEN, [field]: '@' }).replace('"@"', json);
/** The chosen settings, with the default of one of them. */
const chosenBut = (field: keyof Settings) => ({ ...CHOSEN, [field]: DEFAULTS[field] });

describe('SettingsService reads a tampered save field by field', () => {
  it.each([
    { field: 'locale', json: '"FR"' },
    { field: 'locale', json: '"__proto__"' },
    { field: 'locale', json: '"constructor"' },
    { field: 'locale', json: '["id"]' },
    { field: 'locale', json: '"id\u200b"' },
    { field: 'theme', json: '"toString"' },
    { field: 'theme', json: '"Dark"' },
    { field: 'effects', json: '"max"' },
    { field: 'volume', json: '"0.5"' },
    { field: 'volume', json: '1.5' },
    { field: 'volume', json: '-0.1' },
    { field: 'volume', json: '1e999' },
    { field: 'music', json: '[0.2]' },
    { field: 'music', json: 'null' },
    { field: 'muted', json: '1' },
    { field: 'muted', json: '"true"' },
    { field: 'vibration', json: '"no"' },
    { field: 'aimAssist', json: '{}' },
    { field: 'difficulty', json: '"god"' },
  ] as const)('keeps the default $field for $json, and the rest of the save', ({ field, json }) => {
    expect(settingsFrom(savedWith(field, json))).toEqual(chosenBut(field));
  });

  it('reads every setting the player chose, as the game has saved them since 1.0.0', () => {
    expect(settingsFrom(JSON.stringify(CHOSEN))).toEqual(CHOSEN);
  });
});

describe('SettingsService keeps settings it cannot read', () => {
  const longer = JSON.stringify({ ...CHOSEN, pad: 'x'.repeat(SAVE_LIMITS.settings) });

  it.each([
    { name: 'a text cut short', text: '{"locale":"ru","muted":tr' },
    { name: 'a list', text: '["ru"]' },
    { name: 'a text longer than any settings', text: longer },
  ])('starts from the defaults on $name, and keeps it stored as it is', ({ text }) => {
    const storage = storageWith(SETTINGS_KEY, text);
    expect(new SettingsService(storage, DEFAULTS).current).toEqual(DEFAULTS);
    expect(storage.get(SETTINGS_KEY)).toBe(text);
  });

  it("saves the player's next choice over them", () => {
    const storage = storageWith(SETTINGS_KEY, '["ru"]');
    new SettingsService(storage, DEFAULTS).update({ muted: true });
    expect(storedJson(storage, SETTINGS_KEY)).toEqual({ muted: true });
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
