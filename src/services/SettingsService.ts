import { reactive, readonly } from 'vue';
import { isLocale, type Locale } from '@/i18n/locales';
import { isDifficulty, type Difficulty } from '@/levels/difficulty';
import { readJson, type KeyValueStorage } from './KeyValueStorage';

export const EFFECT_LEVELS = ['spectacular', 'balanced', 'subtle'] as const;
export type EffectLevel = (typeof EFFECT_LEVELS)[number];

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface Settings {
  readonly locale: Locale;
  readonly theme: ThemePreference;
  /** Intensity of destruction effects (specification § 3.5). */
  readonly effects: EffectLevel;
  /** Volume of the sound effects, from 0 (muted) to 1. */
  readonly volume: number;
  /** Volume of the music, from 0 (off) to 1. */
  readonly music: number;
  /** Vibrations on phones that support them. */
  readonly vibration: boolean;
  /** Aim assistance: ghost ball where the shot lands and the group it would make (§ 3.9). */
  readonly aimAssist: boolean;
  /** Difficulty of the campaign (§ 3.9). */
  readonly difficulty: Difficulty;
}

/** Same key as the theme bootstrap script (public/theme-boot.js). */
export const SETTINGS_KEY = 'ballmania:settings';

const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);

const isEffectLevel = (value: unknown): value is EffectLevel =>
  typeof value === 'string' && (EFFECT_LEVELS as readonly string[]).includes(value);

/**
 * The player's preferences: validated when read, saved on every change, and
 * exposed read-only so that only `update` can change them.
 */
export class SettingsService {
  private readonly state: Settings;
  readonly current: Readonly<Settings>;

  constructor(
    private readonly storage: KeyValueStorage,
    defaults: Settings,
  ) {
    this.state = reactive({
      ...defaults,
      ...SettingsService.parse(readJson(storage, SETTINGS_KEY)),
    });
    this.current = readonly(this.state);
  }

  update(patch: Partial<Settings>): void {
    Object.assign(this.state, patch);
    this.storage.set(SETTINGS_KEY, JSON.stringify(this.state));
  }

  /** Keeps only the valid fields of a stored value. */
  private static parse(value: unknown): Partial<Settings> {
    if (typeof value !== 'object' || value === null) return {};
    const record = value as Record<string, unknown>;
    const settings: { -readonly [K in keyof Settings]?: Settings[K] } = {};
    if (isLocale(record.locale)) settings.locale = record.locale;
    if (isThemePreference(record.theme)) settings.theme = record.theme;
    if (isEffectLevel(record.effects)) settings.effects = record.effects;
    if (typeof record.volume === 'number' && record.volume >= 0 && record.volume <= 1) {
      settings.volume = record.volume;
    }
    if (typeof record.music === 'number' && record.music >= 0 && record.music <= 1) {
      settings.music = record.music;
    }
    if (typeof record.vibration === 'boolean') settings.vibration = record.vibration;
    if (typeof record.aimAssist === 'boolean') settings.aimAssist = record.aimAssist;
    if (isDifficulty(record.difficulty)) settings.difficulty = record.difficulty;
    return settings;
  }
}
