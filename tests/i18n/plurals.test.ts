import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import { PLURAL_RULES, type Locale, type MessageSchema } from '@/i18n';
import { russianPlural } from '@/i18n/plurals';

/**
 * The game's messages for a language, compiled by vue-i18n as the game uses them.
 * Raw files: the build's precompiled modules are virtual and do not load in tests.
 */
const translator = (locale: Locale) => {
  const messages = JSON.parse(
    readFileSync(new URL(`../../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'),
  ) as MessageSchema;
  return createI18n<[MessageSchema], Locale, false>({
    legacy: false,
    locale,
    pluralRules: PLURAL_RULES,
    messages: { [locale]: messages } as Record<Locale, MessageSchema>,
  }).global.t;
};

/** No-break space: French two-part punctuation, Russian thousands. */
const NBSP = ' ';

describe('plurals', () => {
  it('counts English nouns, zero taking the plural', () => {
    const t = translator('en');
    expect(t('player.balance', { count: '0' }, 0)).toBe('0 shards');
    expect(t('player.balance', { count: '1' }, 1)).toBe('1 shard');
    expect(t('player.balance', { count: '1,250' }, 1250)).toBe('1,250 shards');
    expect(t('game.starsLabel', { count: 0 }, 0)).toBe('0 stars out of 3');
    expect(t('campaign.levelLabel', { number: 3, stars: 1 }, 1)).toBe('Level 3, 1 star out of 3');
    expect(t('arcade.puzzle.result', { shots: 1, par: 1 }, 1)).toBe('1 shot (best possible: 1)');
  });

  it('chooses the form from a numeric count by itself', () => {
    const t = translator('en');
    expect(t('game.gaugeReached', { count: 1 })).toBe('1 star within reach');
    expect(t('game.gaugeReached', { count: 2 })).toBe('2 stars within reach');
  });

  it('puts 0 and 1 in the singular in French', () => {
    const t = translator('fr');
    expect(t('player.balance', { count: '0' }, 0)).toBe('0 éclat');
    expect(t('player.balance', { count: '1' }, 1)).toBe('1 éclat');
    expect(t('player.balance', { count: '2' }, 2)).toBe('2 éclats');
    expect(t('magnet.label', { count: 1, max: 3 })).toBe('Aimant, 1 charge sur 3');
    expect(t('campaign.levelLabel', { number: 4, stars: 0 }, 0)).toBe('Niveau 4, 0 étoile sur 3');
    expect(t('daily.counted', { score: '0' }, 0)).toBe(
      `Seul le premier essai du jour compte${NBSP}: 0 point.`,
    );
  });

  it('keeps Indonesian nouns unchanged with any number', () => {
    const t = translator('id');
    expect(t('player.balance', { count: '1' }, 1)).toBe('1 kepingan');
    expect(t('player.balance', { count: '5' }, 5)).toBe('5 kepingan');
  });

  it('gives Russian nouns their three forms, by the last digits', () => {
    const t = translator('ru');
    const shards = (count: number) => t('player.balance', { count: String(count) }, count);
    expect(shards(0)).toBe('0 осколков');
    expect(shards(1)).toBe('1 осколок');
    expect(shards(2)).toBe('2 осколка');
    expect(shards(4)).toBe('4 осколка');
    expect(shards(5)).toBe('5 осколков');
    expect(shards(11)).toBe('11 осколков');
    expect(shards(14)).toBe('14 осколков');
    expect(shards(21)).toBe('21 осколок');
    expect(shards(22)).toBe('22 осколка');
    expect(shards(111)).toBe('111 осколков');
    expect(t('player.balance', { count: `1${NBSP}250` }, 1250)).toBe(`1${NBSP}250 осколков`);
  });

  it('declines Russian nouns after a preposition, and picks the form of a numeric count', () => {
    const t = translator('ru');
    const bounces = (target: number) =>
      t('achievements.list.bank-shot.text', { target: String(target) }, target);
    expect(bounces(1)).toBe('Взорвите группу после 1 отскока.');
    expect(bounces(2)).toBe('Взорвите группу после 2 отскоков.');
    expect(bounces(21)).toBe('Взорвите группу после 21 отскока.');
    expect(t('game.gaugeReached', { count: 1 })).toBe('Можно взять 1 звезду');
    expect(t('game.gaugeReached', { count: 3 })).toBe('Можно взять 3 звезды');
    expect(t('arcade.duel.wins', { count: 0 }, 0)).toBe('Ни одной победы');
  });
});

describe('russianPlural', () => {
  it('maps counts to zero, one, few and many', () => {
    const form = (count: number) => russianPlural(count, 4);
    expect([0, 1, 2, 3, 4, 5, 10, 11, 12, 19, 20, 21, 24, 25, 101, 112].map(form)).toEqual([
      0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 1, 2, 3, 1, 3,
    ]);
  });

  it('leaves a message of another shape to the default rule', () => {
    const fallback = (choice: number, length: number) => (choice === 1 ? 0 : length - 1);
    expect(russianPlural(1, 2, fallback)).toBe(0);
    expect(russianPlural(5, 2, fallback)).toBe(1);
  });
});
