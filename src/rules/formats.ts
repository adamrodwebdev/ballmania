import {
  InvalidInput,
  orElse,
  parseNumber,
  readText,
  type InputRecord,
  type TextRule,
} from './input';
import { TEXT_LIMITS } from './limits';

/*
 * The formats the game reads from outside, built on the readers of `input.ts`: each is an
 * allow-list matched against the whole cleaned text (anchored, without the g or y flag).
 */

/** An id the game writes: lower-case words joined by hyphens ("board-neon", "world-nebula"). */
export const IDENTIFIER: TextRule = {
  maxLength: TEXT_LIMITS.identifier,
  required: true,
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

/** A level of the campaign: its world, then its number in two digits ("nebula-01"). */
export const LEVEL_ID: TextRule = {
  maxLength: TEXT_LIMITS.identifier,
  required: true,
  pattern: /^[a-z]+-\d{2}$/,
};

/** A puzzle of the Arcade: "puzzle-07". */
export const PUZZLE_ID: TextRule = {
  maxLength: TEXT_LIMITS.identifier,
  required: true,
  pattern: /^puzzle-\d{2}$/,
};

/** A colour token as the design writes them: "#ff3b6b" (or #rgb, #rrggbbaa). */
export const COLOUR: TextRule = {
  maxLength: TEXT_LIMITS.colour,
  required: true,
  pattern: /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
};

/** A BCP 47 language tag, as browsers and portals write them: "ru", "id-ID", "zh-Hant-TW". */
const LANGUAGE_TAG: TextRule = {
  maxLength: TEXT_LIMITS.languageTag,
  required: true,
  pattern: /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/,
};

/** The language a portal or the browser names, or null when it names none that reads as a tag. */
export function readLanguageTag(value: unknown): string | null {
  return orElse(() => readText(value, LANGUAGE_TAG, 'language'), null);
}

const LINK: TextRule = { maxLength: TEXT_LIMITS.link, required: true };
/** The schemes a shared link may have: the web's, never `javascript:` or `data:`. */
const LINK_SCHEMES: readonly string[] = ['https:', 'http:'];

/** A link to share that a platform gives, or null when it gives none the web can open. */
export function readLink(value: unknown): string | null {
  return orElse(() => {
    const text = readText(value, LINK, 'link');
    let scheme: string;
    try {
      scheme = new URL(text).protocol;
    } catch {
      throw new InvalidInput('link', 'bad-format');
    }
    if (!LINK_SCHEMES.includes(scheme)) throw new InvalidInput('link', 'bad-format');
    return text;
  }, null);
}

/** Eight digits, the shape of a day as the saves key it; `readDay` also checks it is one. */
export const DAY: TextRule = { maxLength: TEXT_LIMITS.day, required: true, pattern: /^\d{8}$/ };
const YEAR = { min: 1000, max: 9999, integer: true } as const;
const MONTH = { min: 1, max: 12, integer: true } as const;
const DATE = { min: 1, max: 31, integer: true } as const;

/**
 * A day as the saves key it (YYYYMMDD, `dayKey`): eight digits that name a day of the calendar,
 * checked by a round trip, so "20261399" or "20260230" are refused.
 */
export function readDay(value: unknown, field: string): string {
  const text = readText(value, DAY, field);
  const year = parseNumber(text.slice(0, 4), YEAR, field);
  const month = parseNumber(text.slice(4, 6), MONTH, field);
  const date = parseNumber(text.slice(6, 8), DATE, field);
  const day = new Date(Date.UTC(year, month - 1, date));
  if (day.getUTCMonth() !== month - 1 || day.getUTCDate() !== date) {
    throw new InvalidInput(field, 'bad-format');
  }
  return text;
}

/**
 * True for a name of a map keyed by data (levels by id, records by day) that `rule` reads back
 * unchanged: a name that needs cleaning to fit is no name of that map, so two names never merge.
 */
export const keyOf =
  (rule: TextRule) =>
  (key: string): boolean =>
    orElse(() => readText(key, rule, 'key') === key, false);

/** True for a name that is a day exactly as the saves write it. */
export const isDayKey = (key: string): boolean => orElse(() => readDay(key, 'day') === key, false);

/**
 * The names of a map keyed by data that `isKey` accepts; none when the map holds more names than
 * `maxKeys` (it is then refused as a whole, never cut).
 */
export function keysOf(
  map: InputRecord,
  maxKeys: number,
  isKey: (key: string) => boolean,
): readonly string[] {
  return orElse(() => map.keys(maxKeys).filter(isKey), []);
}

/** The browser's lengths read back from a computed style: none is wider than this. */
const CSS_PIXELS = { min: 0, max: 10_000 } as const;

/**
 * A length the browser computed, in CSS pixels ("47px", "33.5px"): the number before `px`,
 * spelled whole; 0 when it spells none (an inset the device does not have).
 */
export function readCssPixels(value: unknown): number {
  const text = typeof value === 'string' ? value.replace(/px$/, '') : value;
  return orElse(() => parseNumber(text, CSS_PIXELS, 'length'), 0);
}
