import { reactive, readonly } from 'vue';
import { LOCALES, type Locale } from '@/i18n/locales';
import { DIFFICULTIES, type Difficulty } from '@/levels/difficulty';
import { orElse, type InputRecord } from '@/rules/input';
import { NUMBER_RULES, SAVE_LIMITS } from '@/rules/limits';
import type { KeyValueStorage } from './KeyValueStorage';
import { SaveSlot } from './SaveSlot';

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
  /** Everything silent (the mute button), whatever the volumes. */
  readonly muted: boolean;
  /** Vibrations on phones that support them. */
  readonly vibration: boolean;
  /** Aim assistance: ghost ball where the shot lands and the group it would make (§ 3.9). */
  readonly aimAssist: boolean;
  /** Difficulty of the campaign (§ 3.9). */
  readonly difficulty: Difficulty;
}

/** Same key as the theme bootstrap script (public/theme-boot.js). */
export const SETTINGS_KEY = 'ballmania:settings';

type Chosen = { -readonly [K in keyof Settings]?: Settings[K] };

/**
 * How each saved setting is read into the chosen ones: one of its choices, a volume, a boolean.
 * A reader that refuses its field leaves it out: that setting keeps its default.
 */
const READERS: readonly ((saved: InputRecord, chosen: Chosen) => void)[] = [
  (saved, chosen) => {
    chosen.locale = saved.choice('locale', LOCALES);
  },
  (saved, chosen) => {
    chosen.theme = saved.choice('theme', THEME_PREFERENCES);
  },
  (saved, chosen) => {
    chosen.effects = saved.choice('effects', EFFECT_LEVELS);
  },
  (saved, chosen) => {
    chosen.volume = saved.number('volume', NUMBER_RULES.volume);
  },
  (saved, chosen) => {
    chosen.music = saved.number('music', NUMBER_RULES.volume);
  },
  (saved, chosen) => {
    chosen.muted = saved.boolean('muted');
  },
  (saved, chosen) => {
    chosen.vibration = saved.boolean('vibration');
  },
  (saved, chosen) => {
    chosen.aimAssist = saved.boolean('aimAssist');
  },
  (saved, chosen) => {
    chosen.difficulty = saved.choice('difficulty', DIFFICULTIES);
  },
];

/**
 * The player's preferences: read field by field (`SaveSlot`), saved on every
 * change, and exposed read-only so that only `update` can change them. Only
 * what the player chose is saved: a default, such as the language their portal
 * gives, keeps following that portal (Yandex rule 2.14), whatever else they
 * changed.
 */
export class SettingsService {
  private readonly slot: SaveSlot;
  private readonly state: Settings;
  /** What the player chose: the settings saved. */
  private chosen: Partial<Settings>;
  readonly current: Readonly<Settings>;

  constructor(storage: KeyValueStorage, defaults: Settings) {
    this.slot = new SaveSlot(storage, { key: SETTINGS_KEY, maxLength: SAVE_LIMITS.settings });
    this.chosen = this.slot.load(
      (saved) => SettingsService.read(saved),
      () => ({}),
    );
    this.state = reactive({ ...defaults, ...this.chosen });
    this.current = readonly(this.state);
  }

  /** The player's choice: saved, even over settings that could not be read. */
  update(patch: Partial<Settings>): void {
    Object.assign(this.state, patch);
    this.chosen = { ...this.chosen, ...patch };
    this.slot.write(this.chosen);
  }

  /** The settings the player chose, each one that reads as a setting; the others keep their default. */
  private static read(saved: InputRecord): Partial<Settings> {
    const chosen: Chosen = {};
    for (const read of READERS) orElse(() => read(saved, chosen), undefined);
    return chosen;
  }
}
