import { readFileSync } from 'node:fs';
import { test as bare } from '@playwright/test';
import { expect, test, type Page } from './fixtures';

/** The captions in every language, read from the game's own messages. */
const CAPTIONS = (['fr', 'en', 'id', 'ru'] as const).map((locale) => {
  const messages = JSON.parse(
    readFileSync(new URL(`../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'),
  ) as {
    worlds: Record<string, { name: string }>;
    arcade: { duel: { name: string } };
    reel: Record<string, string>;
  };
  const { reel, worlds, arcade } = messages;
  const places = [...Object.values(worlds).map((world) => world.name), reel.boss, arcade.duel.name];
  const lines = Object.entries(reel)
    .filter(([key]) => key !== 'boss')
    .map(([, line]) => line);
  return { locale, places, lines };
});

const caption = (page: Page) => page.getByTestId('reel-caption').last();

/** Waits until the reel's caption is `text`. */
const showing = (page: Page, text: string, timeout = 10_000) =>
  expect(caption(page)).toHaveText(text, { timeout });

/** The tab hidden, or shown again, as the browser tells a page. */
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (hidden ? 'hidden' : 'visible'),
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

/**
 * The title screen's reel (v1.8.0): the game's highlights, played by the
 * game's own engine in a window between the title and Play.
 */
test.describe('the title reel', () => {
  test('plays the highlights one after the other, each with its caption', async ({ page }) => {
    await page.goto('./');
    await showing(page, 'Nebula The Nova bomb');
    await showing(page, 'Neon Bounce your shots', 8_000);
    await expect(page.getByTestId('reel').locator('.ticks li.on')).toHaveCount(1);
  });

  test('stops in a hidden tab, and plays on once it shows again', async ({ page }) => {
    await page.goto('./');
    await showing(page, 'Nebula The Nova bomb');
    await setHidden(page, true);
    // Longer than the first moment: it would have moved on.
    await page.waitForTimeout(5_500);
    await expect(caption(page)).toHaveText('Nebula The Nova bomb');
    await setHidden(page, false);
    await showing(page, 'Neon Bounce your shots', 8_000);
  });

  test('waits behind the settings', async ({ page }) => {
    await page.goto('./');
    await showing(page, 'Nebula The Nova bomb');
    await page.getByTestId('open-settings').click();
    await page.waitForTimeout(5_500);
    await expect(caption(page)).toHaveText('Nebula The Nova bomb');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows one still image of the Nova, without ticks', async ({ page }) => {
      await page.goto('./');
      await showing(page, 'Nebula The Nova bomb');
      await expect(page.getByTestId('reel').locator('.ticks')).toHaveCount(0);
      await page.waitForTimeout(5_500);
      await expect(caption(page)).toHaveText('Nebula The Nova bomb');
    });
  });

  test.describe('on a short phone', () => {
    test.use({ viewport: { width: 320, height: 568 } });

    test('gives way to the menu, without loading its code', async ({ page }) => {
      const requested: string[] = [];
      page.on('request', (request) => requested.push(request.url()));
      await page.goto('./');
      await expect(page.getByTestId('play')).toBeVisible();
      await expect(page.getByTestId('reel')).toBeHidden();
      await page.waitForTimeout(3_000);
      expect(page.workers()).toHaveLength(0);
      expect(requested.filter((url) => /ReelPlayer|worker-/.test(url))).toEqual([]);
    });
  });

  for (const size of [
    { width: 360, height: 780 },
    { width: 1280, height: 800 },
  ]) {
    test.describe(`at ${size.width} × ${size.height}`, () => {
      test.use({ viewport: size });

      test('keeps every caption, in every language, inside the window', async ({ page }) => {
        await page.goto('./');
        await showing(page, 'Nebula The Nova bomb');
        const window = (await page.getByTestId('reel').boundingBox())!;
        const ticks = (await page.getByTestId('reel').locator('.ticks').boundingBox())!;
        const longestPlace = (places: string[]) =>
          places.reduce((longest, place) => (place.length > longest.length ? place : longest));
        for (const { locale, places, lines } of CAPTIONS) {
          for (const line of lines) {
            // The longest first word with each line: the hardest caption of that line.
            const box = await caption(page).evaluate(
              (element, [place, text]) => {
                element.firstElementChild!.textContent = place!;
                element.lastChild!.textContent = ` ${text}`;
                const rect = element.getBoundingClientRect();
                return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
              },
              [longestPlace(places), line],
            );
            const label = `${locale}: ${line}`;
            expect(box.left, label).toBeGreaterThanOrEqual(window.x);
            expect(box.right, label).toBeLessThanOrEqual(window.x + window.width);
            expect(box.bottom, label).toBeLessThanOrEqual(window.y + window.height);
            // Clear of the ticks above it.
            expect(box.top, label).toBeGreaterThan(ticks.y + ticks.height);
          }
        }
      });
    });
  }
});

bare.describe('the title reel after the studio intro', () => {
  bare('waits for the intro to end before it loads', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await page.goto('./');
    const intro = page.getByTestId('studio-intro');
    await expect(intro).toBeVisible();
    // The page has loaded and the browser is idle: without the intro, the reel would load now.
    await page.waitForTimeout(1_500);
    await expect(intro).toBeVisible();
    expect(requested.filter((url) => /ReelPlayer|worker-/.test(url))).toEqual([]);
    // Once the intro is gone, it loads and plays.
    await expect(intro).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId('reel-caption')).toBeVisible({ timeout: 10_000 });
    expect(requested.filter((url) => /ReelPlayer/.test(url))).toHaveLength(1);
  });
});
