import { describe, expect, it } from 'vitest';
import {
  COLOUR,
  IDENTIFIER,
  isDayKey,
  keyOf,
  LEVEL_ID,
  readCssPixels,
  readDay,
  readLanguageTag,
  readLink,
} from '@/rules/formats';
import { InvalidInput, readText } from '@/rules/input';
import { TEXT_LIMITS } from '@/rules/limits';

/** The reason a read refused its value, or 'accepted'. */
function problem(read: () => unknown): string {
  try {
    read();
    return 'accepted';
  } catch (error) {
    return error instanceof InvalidInput ? error.problem : `threw ${String(error)}`;
  }
}

describe('readLanguageTag: the language a portal or the browser names', () => {
  it.each(['ru', 'id-ID', 'en-GB', 'zh-Hant-TW', 'pt-BR'])('reads %s', (tag) => {
    expect(readLanguageTag(tag)).toBe(tag);
  });

  it('reads a tag exactly as long as its limit', () => {
    const tag = `fr-${'abcdefgh-'.repeat(3)}abcdefg`.slice(0, TEXT_LIMITS.languageTag);
    expect(tag).toHaveLength(TEXT_LIMITS.languageTag);
    expect(readLanguageTag(tag)).toBe(tag);
  });

  it.each([
    { name: 'a number', value: 7 },
    { name: 'null', value: null },
    { name: 'a list', value: ['ru'] },
    { name: 'an object', value: { lang: 'ru' } },
    { name: 'an empty text', value: '' },
    { name: 'a space inside', value: 'ru RU' },
    { name: 'an underscore', value: 'ru_RU' },
    { name: 'markup', value: 'ru<script>' },
    { name: 'one letter', value: 'r' },
    { name: 'a tag one character over its limit', value: `fr-${'abcdefgh-'.repeat(3)}abcdefgh` },
  ])('names no language for $name', ({ value }) => {
    expect(readLanguageTag(value)).toBeNull();
  });
});

describe('readLink: a link to share that a platform gives', () => {
  it.each(['https://www.crazygames.com/game/ballmania?day=20261109', 'http://localhost:4174/'])(
    'reads %s as it is',
    (link) => {
      expect(readLink(link)).toBe(link);
    },
  );

  it.each([
    { name: 'a script link', value: 'javascript:alert(1)' },
    { name: 'a data link', value: 'data:text/html,<script>alert(1)</script>' },
    { name: 'a file link', value: 'file:///etc/passwd' },
    { name: 'a text that is no link', value: 'ballmania' },
    { name: 'a number', value: 42 },
    { name: 'an object', value: { href: 'https://example.org' } },
    { name: 'a link one character over its limit', value: `https://a.io/${'a'.repeat(2036)}` },
  ])('gives no link for $name', ({ value }) => {
    expect(readLink(value)).toBeNull();
  });
});

describe('readDay: a day as the saves key it', () => {
  it.each(['20261109', '20240229', '19991231'])('reads %s', (day) => {
    expect(readDay(day, 'day')).toBe(day);
  });

  it.each([
    { name: 'a month that does not exist', value: '20261309' },
    { name: 'the 30th of February', value: '20260230' },
    { name: 'the 29th of February of a common year', value: '20250229' },
    { name: 'a day zero', value: '20261100' },
    { name: 'a year before any clock', value: '09991231' },
  ])('refuses $name as no day', ({ value }) => {
    expect(problem(() => readDay(value, 'day'))).toMatch(/bad-format|out-of-range/);
  });

  it.each([
    { name: 'a date with dashes', value: '2026-11-09' },
    { name: 'nine digits', value: '202611090' },
    { name: 'full-width digits', value: '２０２６１１０９' },
    { name: 'a number', value: 20261109 },
  ])('refuses $name', ({ value }) => {
    expect(problem(() => readDay(value, 'day'))).not.toBe('accepted');
  });

  it.each([
    { name: 'a real day', key: '20261109', expected: true },
    { name: 'a day with an outer space', key: ' 20261109', expected: false },
    { name: 'the prototype key', key: '__proto__', expected: false },
  ])('takes $name as a key of the days: $expected', ({ key, expected }) => {
    expect(isDayKey(key)).toBe(expected);
  });
});

describe('ids and keys', () => {
  it.each([
    { key: 'nebula-01', expected: true },
    { key: 'singularity-12', expected: true },
    { key: 'nebula-1', expected: false },
    { key: '__proto__', expected: false },
    { key: 'constructor', expected: false },
    { key: 'Nebula-01', expected: false },
    { key: 'nebula-01 ', expected: false },
  ])('takes "$key" as a level: $expected', ({ key, expected }) => {
    expect(keyOf(LEVEL_ID)(key)).toBe(expected);
  });

  it.each([
    { value: 'board-neon', expected: 'accepted' },
    { value: 'world-singularity', expected: 'accepted' },
    { value: 'board_neon', expected: 'bad-format' },
    { value: '-board', expected: 'bad-format' },
    { value: 'board--neon', expected: 'bad-format' },
    { value: 'a'.repeat(TEXT_LIMITS.identifier + 1), expected: 'too-long' },
  ])('reads "$value" as an id: $expected', ({ value, expected }) => {
    expect(problem(() => readText(value, IDENTIFIER, 'id'))).toBe(expected);
  });

  it.each([
    { value: '#ff3b6b', expected: 'accepted' },
    { value: '#FFF', expected: 'accepted' },
    { value: '#ff3b6b80', expected: 'accepted' },
    { value: 'red', expected: 'bad-format' },
    { value: 'url(javascript:alert(1))', expected: 'too-long' },
    { value: '#ff3b6', expected: 'bad-format' },
  ])('reads "$value" as a colour token: $expected', ({ value, expected }) => {
    expect(problem(() => readText(value, COLOUR, 'colour'))).toBe(expected);
  });
});

describe('readCssPixels: a length the browser computed', () => {
  it.each([
    { text: '47px', expected: 47 },
    { text: '33.5px', expected: 33.5 },
    { text: '0px', expected: 0 },
  ])('reads $text as $expected', ({ text, expected }) => {
    expect(readCssPixels(text)).toBe(expected);
  });

  it.each([
    { name: 'nothing', value: undefined },
    { name: 'an empty text', value: '' },
    { name: 'an exponent', value: '1e3px' },
    { name: 'another unit', value: '2em' },
    { name: 'a negative length', value: '-4px' },
    { name: 'the word auto', value: 'auto' },
  ])('reads $name as no inset', ({ value }) => {
    expect(readCssPixels(value)).toBe(0);
  });
});
