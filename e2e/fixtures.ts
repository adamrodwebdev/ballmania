import { test as base } from '@playwright/test';

/**
 * The journeys start where players land after the studio intro: it plays
 * once per visit, so it is marked as seen (its own test uses the bare test).
 * They run without Web Audio (see below); the sound is measured on its own.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('ballmania:intro', '1');
      // No sound card here: Web Audio would synthesise the music in real time
      // against the fast-forwarded clock of the long journeys. The game runs
      // silently without it, as on a browser without Web Audio.
      Object.assign(window, { AudioContext: undefined });
    });
    await use(page);
  },
});

export { expect, type Page } from '@playwright/test';
