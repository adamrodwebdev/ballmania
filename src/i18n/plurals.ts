import type { PluralizationRule } from 'vue-i18n';

const russian = new Intl.PluralRules('ru');

/**
 * Russian plurals, from the language's own rule: a message gives four forms,
 * "zero | one | few | many", zero written apart as in the other languages
 * (0 звёзд | 1, 21 звезда | 2–4, 22–24 звезды | 5–20, 25 звёзд).
 */
export const russianPlural: PluralizationRule = (choice, choicesLength, orgRule) => {
  if (choicesLength !== 4) return orgRule ? orgRule(choice, choicesLength) : 0;
  const count = Math.abs(choice);
  if (count === 0) return 0;
  switch (russian.select(count)) {
    case 'one':
      return 1;
    case 'few':
      return 2;
    default:
      return 3;
  }
};

/** The languages whose plurals vue-i18n's default rule ("zero | one | other") cannot pick. */
export const PLURAL_RULES = { ru: russianPlural } as const;
