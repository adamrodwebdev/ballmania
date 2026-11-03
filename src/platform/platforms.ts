/** Where the game is published (specification § 3.7), chosen at build time. */
export type PlatformId =
  'standalone' | 'crazygames' | 'poki' | 'gamedistribution' | 'playgama' | 'yandex' | 'simulated';

export const PLATFORM_IDS: readonly PlatformId[] = [
  'standalone',
  'crazygames',
  'poki',
  'gamedistribution',
  'playgama',
  'yandex',
  'simulated',
];

/** CrazyGames SDK v3: in the <head> of the CrazyGames build (vite.config.ts), as they ask. */
export const CRAZYGAMES_SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

/**
 * Yandex Games SDK v2, served by Yandex next to an archive game: always this
 * relative path, never an absolute address (rules 1.7 and 1.19.1).
 */
export const YANDEX_SDK = '/sdk.js';

/**
 * The game's name where a portal lists it in two words, the same in the game,
 * on its page and in its listing: Playgama asks for two to four words, Yandex
 * for the title of its draft everywhere (rules 5.1.3 and 5.12).
 */
const LISTED_NAMES: Partial<Record<PlatformId, string>> = {
  playgama: 'Ball Mania',
  yandex: 'Ball Mania',
};

/** `text`, with the game's name as `platform` lists it. */
export const withListedName = (platform: PlatformId, text: string): string => {
  const name = LISTED_NAMES[platform];
  return name ? text.replace('Ballmania', name) : text;
};
