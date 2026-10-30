import { expect, test as base, type Page } from '@playwright/test';

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

/**
 * Spends a puzzle's shots from the keyboard, Space pressed again until the
 * shots badge counts each one: a press while the launcher reloads is no shot,
 * and on a loaded machine the game's clock falls behind the test's (30/10/2026:
 * three shots out of four, pressed 250 ms apart, under four workers). The badge
 * counts a shot in the same task as the key that fired it, so no press is ever
 * a shot too many.
 */
export async function spendShots(page: Page): Promise<void> {
  const badge = page.getByTestId('shots');
  const left = async (): Promise<number> =>
    Number(/\d+/.exec((await badge.textContent()) ?? '')?.[0]);
  for (let count = await left(); count > 0; count--) {
    await expect(async () => {
      if ((await left()) === count) await page.keyboard.press('Space');
      expect(await left()).toBe(count - 1);
    }).toPass({ intervals: [250] });
  }
}

export { expect, type Page };
