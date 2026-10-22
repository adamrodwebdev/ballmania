import { expect, test, type Page } from './fixtures';

/**
 * The longest languages, where text runs out of room first (specification § 3.7):
 * every screen keeps its text inside its controls and on the screen.
 */
const LONG = ['ru', 'id', 'fr'] as const;
/** The smallest common phone, a tall one, and a portal's frame. */
const SIZES = [
  [360, 640],
  [390, 844],
  [1280, 720],
] as const;

/** A returning player: every menu has something to show, the gift waits, an upgrade is affordable. */
const seed = (page: Page, locale: string) =>
  page.addInitScript((code) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(
      'ballmania:settings',
      JSON.stringify({ locale: code, difficulty: 'explorer' }),
    );
    localStorage.setItem(
      'ballmania:player',
      JSON.stringify({
        version: 1,
        shards: 120,
        fragments: 30,
        worlds: ['nebula', 'neon', 'abyss', 'jewel'],
        upgrades: { nova: 1 },
        failures: { 'nebula-02': 3 },
      }),
    );
    localStorage.setItem(
      'ballmania:progress',
      JSON.stringify({
        version: 1,
        levels: { 'nebula-01': { stars: 3, best: 2000 }, 'nebula-02': { stars: 1, best: 900 } },
      }),
    );
  }, locale);

/**
 * What is wrong with the text on screen: a word out of its button, tile or pill, text out
 * of the screen, a pill or a title on two lines, the page scrolling sideways, a result panel
 * that must scroll to show its choices.
 */
const problems = (page: Page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const found: string[] = [];
    const shown = (el: Element) => {
      if (el.closest('[inert], .sr-only')) return false;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const name = (el: Element) => `"${el.textContent.trim().slice(0, 40)}"`;
    for (const el of document.querySelectorAll('#app *')) {
      const ownText = [...el.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
      );
      if (!ownText || !shown(el)) continue;
      const box = el.getBoundingClientRect();
      if (box.left < -0.5 || box.right > width + 0.5) found.push(`off screen ${name(el)}`);
      if (getComputedStyle(el).position === 'absolute') continue;
      const control = el.parentElement?.closest('button, .tile, .chip, .badge, .control, li');
      if (!control) continue;
      const room = control.getBoundingClientRect();
      if (box.left < room.left - 1 || box.right > room.right + 1)
        found.push(`out of its box ${name(el)}`);
    }
    for (const pill of document.querySelectorAll('.chip, .badge, .collect')) {
      if (!shown(pill)) continue;
      // The lines of its visible text only: an icon beside it sits at another height.
      const lines = new Set<number>();
      const walker = document.createTreeWalker(pill, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!(node.textContent ?? '').trim() || node.parentElement?.closest('.sr-only')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) lines.add(Math.round(rect.top));
      }
      if (lines.size > 1) found.push(`pill on ${lines.size} lines ${name(pill)}`);
    }
    if (document.documentElement.scrollWidth > width) found.push('page scrolls sideways');
    const result = document.querySelector('dialog[open] [data-testid="map"]')?.closest('dialog');
    if (result && result.scrollHeight > result.clientHeight + 1) found.push('result panel scrolls');
    return found;
  });

/** Measures a screen once its entrances are over (screens slide in, lists rise). */
const check = async (page: Page, what: string) => {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
  expect(await problems(page), what).toEqual([]);
};

/** Each menu, by the home tile that opens it. */
const MENUS = [
  ['shop', 'workshop'],
  ['observatory', 'observatory'],
  ['achievements', 'goals'],
  ['arcade', 'arcade'],
  ['play', 'campaign'],
] as const;

test.describe('languages', () => {
  for (const locale of LONG) {
    for (const [width, height] of SIZES) {
      test(`keeps the menus' text in place in ${locale} at ${width}×${height}`, async ({
        page,
      }) => {
        // The viewport is set per test: one project is enough.
        test.skip(test.info().project.name !== 'desktop', 'desktop project only');
        await page.setViewportSize({ width, height });
        await seed(page, locale);
        const at = `${locale} ${width}×${height}`;
        await page.goto('./');
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await check(page, `${at} home`);
        for (const [tile, menu] of MENUS) {
          await page.goto('./');
          await page.getByTestId(tile).click();
          await check(page, `${at} ${menu}`);
        }
      });
    }

    test(`keeps the game's text in place in ${locale} at every size`, async ({ page }) => {
      test.skip(test.info().project.name !== 'desktop', 'desktop project only');
      // A level simulated frame by frame until the chain reaches the hole takes a while: one
      // game per language, measured at every size.
      test.setTimeout(150_000);
      const everySize = async (screen: string) => {
        for (const [width, height] of SIZES) {
          await page.setViewportSize({ width, height });
          await check(page, `${locale} ${width}×${height} ${screen}`);
        }
      };
      await page.setViewportSize({ width: SIZES[0][0], height: SIZES[0][1] });
      await seed(page, locale);
      await page.clock.install();
      await page.goto('./');
      await page.getByTestId('play').click();
      await page.getByTestId('level-nebula-02').click();
      await expect(page.getByTestId('board')).toBeVisible();
      await everySize('game');
      await page.getByTestId('pause').click();
      await everySize('pause');
      await page.locator('dialog[open]').getByRole('button').first().click();
      // Nobody shoots: the chain reaches the hole, and the level failed three times already
      // offers help.
      const assist = page.getByTestId('assist');
      for (let ran = 0; ran < 200_000 && !(await assist.isVisible()); ran += 10_000) {
        await page.clock.runFor(10_000);
      }
      await expect(assist).toBeVisible();
      await everySize('defeat');
    });
  }

  test('serves Russian its own font, before the first paint, and never Fredoka', async ({
    page,
  }) => {
    const fonts: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.woff2')) fonts.push(request.url().split('/').pop()!);
    });
    await seed(page, 'ru');
    await page.addInitScript(() => {
      // Were the Russian letters' faces ready when the title screen first appeared?
      new MutationObserver((_, observer) => {
        if (!document.querySelector('[data-testid="play"]')) return;
        observer.disconnect();
        Object.assign(window, {
          fontReady: document.fonts.check('700 16px "Ballmania Russian"', 'Ж'),
        });
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    expect(await page.evaluate(() => (window as Window & { fontReady?: boolean }).fontReady)).toBe(
      true,
    );
    expect(fonts.some((font) => font.startsWith('nunito-russian'))).toBe(true);
    expect(fonts.filter((font) => font.startsWith('fredoka'))).toEqual([]);
  });

  test('never downloads the Russian font in another language', async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.woff2')) fonts.push(request.url().split('/').pop()!);
    });
    await seed(page, 'en');
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(fonts.some((font) => font.startsWith('nunito'))).toBe(false);
  });
});
