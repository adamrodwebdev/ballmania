import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import type { Locale, MessageSchema } from '@/i18n';

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
    messages: { [locale]: messages } as Record<Locale, MessageSchema>,
  }).global.t;
};

/** French no-break space, before two-part punctuation. */
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
});
