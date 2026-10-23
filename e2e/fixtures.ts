import { test as base, type Page } from '@playwright/test';

/**
 * The journeys start where players land after the studio intro: it plays
 * once per visit, so it is marked as seen (its own test uses the bare test).
 * The training (v1.8.0) is done too, unless a test brings a profile of its
 * own or opts out (`test.use({ trained: false })`, the training's journeys).
 * They run without Web Audio (see below); the sound is measured on its own.
 */
export const test = base.extend<{ trained: boolean }>({
  trained: [true, { option: true }],
  page: async ({ page, trained }, use) => {
    await page.addInitScript((trained) => {
      sessionStorage.setItem('ballmania:intro', '1');
      if (trained && !localStorage.getItem('ballmania:player')) {
        const training = { step: 1, done: true };
        localStorage.setItem('ballmania:player', JSON.stringify({ version: 2, training }));
      }
      // No sound card here: Web Audio would synthesise the music in real time
      // against the fast-forwarded clock of the long journeys. The game runs
      // silently without it, as on a browser without Web Audio.
      Object.assign(window, { AudioContext: undefined });
    }, trained);
    await use(page);
  },
});

/**
 * How far the current screen scrolls, in CSS pixels (0 when it all fits): in
 * its own frame, the `<main>` (v1.7.6), or in the page, should anything ever
 * spill out of that frame.
 */
export const overflowOf = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const root = document.documentElement;
    const screen = document.querySelector('main');
    return Math.max(
      root.scrollHeight - root.clientHeight,
      screen ? screen.scrollHeight - screen.clientHeight : 0,
    );
  });

export { expect, type Page } from '@playwright/test';
