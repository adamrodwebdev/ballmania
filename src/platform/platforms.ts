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
