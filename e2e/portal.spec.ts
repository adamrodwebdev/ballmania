import { expect, test, type Page } from './fixtures';

/**
 * The portal build (specification § 3.7), against the simulated portal
 * (`vite build --mode simulated`): its ads are a dark box that closes by
 * itself, and every call to the platform lands in `window.platformLog`.
 */
test.use({ baseURL: 'http://localhost:4175/' });

const log = (page: Page) =>
  page.evaluate(() => (window as unknown as { platformLog: string[] }).platformLog);

const english = async (page: Page, player: object = {}) => {
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem('ballmania:player', JSON.stringify({ version: 1, ...saved }));
  }, player);
};

/** A player who finished the first level before: the visit opens on the title screen. */
const returning = async (page: Page) => {
  await page.addInitScript(() => {
    const levels = { 'nebula-01': { stars: 2, best: 1200 } };
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
};

test.describe('portal build', () => {
  test('serves its page in English, the language of the portals', async ({ request }) => {
    const html = await (await request.get('./')).text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Ballmania — marble shooting reinvented</title>');
    expect(html).toMatch(/<meta\s+name="description"\s+content="Chain marble shooting/);
  });

  test('tells the portal when the game is loaded and when the player plays', async ({ page }) => {
    await english(page, { worlds: ['nebula', 'neon'] });
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    expect(await log(page)).toEqual(['init', 'loaded']);
    await page.getByTestId('arcade').click();
    await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByTestId('puzzle-1').click();
    await expect(page.getByTestId('board')).toBeFocused();
    await expect.poll(() => log(page)).toContain('gameplayStart');
    await page.getByTestId('pause').click();
    await expect.poll(async () => (await log(page)).at(-1)).toBe('gameplayStop');
  });

  test('pauses on a hidden tab without telling the portal the player stopped', async ({ page }) => {
    await english(page, { worlds: ['nebula', 'neon'] });
    await page.goto('./');
    await page.getByTestId('arcade').click();
    await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByTestId('puzzle-1').click();
    await expect.poll(() => log(page)).toContain('gameplayStart');
    // CrazyGames: no gameplayStop on focus loss, the portal handles it.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByRole('dialog', { name: 'Game paused' })).toBeVisible();
    expect((await log(page)).at(-1)).toBe('gameplayStart');
    await page.getByRole('button', { name: 'Resume' }).click();
    expect((await log(page)).at(-1)).toBe('gameplayStart');
    // The player's own pause is told.
    await page.getByTestId('pause').click();
    await expect.poll(async () => (await log(page)).at(-1)).toBe('gameplayStop');
  });

  test('gives a puzzle hint for a rewarded ad', async ({ page }) => {
    await english(page, { worlds: ['nebula', 'neon'] });
    await page.goto('./');
    await page.getByTestId('arcade').click();
    await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByTestId('puzzle-1').click();
    // Never on the board while playing: in the pause menu.
    await expect(page.getByTestId('ad-hint')).toBeHidden();
    await page.getByTestId('pause').click();
    await page.getByTestId('ad-hint').click();
    await expect(page.getByTestId('simulated-ad')).toBeVisible();
    await expect(page.getByTestId('simulated-ad')).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: 'circled ball' })).toBeAttached();
    expect(await log(page)).toContain('rewarded');
    // Not offered again at once: a minute between two hints.
    await page.getByTestId('pause').click();
    await expect(page.getByTestId('ad-hint')).toHaveCount(0);
    await expect(page.getByTestId('shard-hint')).toHaveCount(0);
  });

  test('lands a new player straight in the first level, without the intro or the title', async ({
    page,
  }) => {
    await english(page);
    await page.addInitScript(() => sessionStorage.removeItem('ballmania:intro'));
    await page.goto('./');
    await expect(page.getByTestId('level')).toHaveText('1-1');
    await expect(page.getByTestId('studio-intro')).toHaveCount(0);
    await expect(page.getByTestId('play')).toHaveCount(0);
    await expect.poll(() => log(page)).toContain('gameplayStart');
    expect((await log(page)).slice(0, 2)).toEqual(['init', 'loaded']);
  });

  test('brings a returning player back to the title screen', async ({ page }) => {
    await english(page);
    await returning(page);
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(page.getByTestId('board')).toHaveCount(0);
  });

  test('continues once after a defeat, then shows an ad before replaying', async ({ page }) => {
    // Six and a half minutes of play, simulated frame by frame.
    test.setTimeout(300_000);
    await english(page);
    await page.clock.install();
    // A new player: the visit opens in the first level.
    await page.goto('./');
    await expect(page.getByTestId('board')).toBeVisible();
    await page.clock.runFor(100_000);
    const dialog = page.getByRole('dialog', { name: 'The chain reached the hole' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('ad-continue')).toContainText('Watch an ad');
    // The ad offer looks like any other choice, and shards are the way without an ad.
    await expect(dialog.getByTestId('ad-continue')).not.toHaveClass(/btn-primary/);
    await expect(dialog.getByTestId('shard-continue')).toContainText('For 60 shards');
    await expect(dialog.getByTestId('shard-continue')).toBeDisabled();
    await dialog.getByTestId('ad-continue').click();
    await page.clock.runFor(1000);
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('board')).toBeFocused();
    // Lost again: no second continue. Three minutes after the rewarded ad, an ad
    // may play between games.
    await page.clock.runFor(190_000);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('ad-continue')).toHaveCount(0);
    await dialog.getByTestId('replay').click();
    await expect(page.getByTestId('simulated-ad')).toBeVisible();
    await page.clock.runFor(1000);
    await expect(dialog).toBeHidden();
    expect(await log(page)).toEqual(expect.arrayContaining(['rewarded', 'interstitial']));
    // Back to a menu: never an ad.
    await page.clock.runFor(100_000);
    await dialog.getByTestId('map').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Campaign' })).toBeVisible();
    expect((await log(page)).filter((event) => event === 'interstitial')).toHaveLength(1);
  });

  test('doubles the shards of a game, and lends a cosmetic to try', async ({ page }) => {
    test.setTimeout(120_000);
    await english(page);
    await returning(page);
    await page.clock.install();
    await page.goto('./');
    await page.getByTestId('shop').click();
    await page.getByTestId('try-shooter-eye').click();
    await page.clock.runFor(1000);
    await expect(page.getByTestId('trial')).toBeVisible();
    await page.getByTestId('home').click();
    await page.getByTestId('daily').click();
    await expect(page.getByTestId('board')).toBeVisible();
    await page.clock.runFor(150_000);
    const dialog = page.getByRole('dialog', { name: 'The chain reached the hole' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('shards-earned')).toHaveText('+10 shards');
    await dialog.getByTestId('ad-double').click();
    await page.clock.runFor(1000);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('ad-message')).toHaveText('10 more shards!');
    await expect(dialog.getByTestId('ad-double')).toHaveCount(0);
    await dialog.getByTestId('map').click();
    await page.clock.runFor(1000);
    await expect(page.getByTestId('wallet')).toHaveText(/20 shards/);
  });

  test('offers no reward behind an ad blocker', async ({ page }) => {
    await english(page, { worlds: ['nebula', 'neon'] });
    await page.goto('./?ads=blocked');
    await page.getByTestId('shop').click();
    await expect(page.getByTestId('item-shooter-eye')).toBeVisible();
    await expect(page.getByTestId('try-shooter-eye')).toHaveCount(0);
    await expect(page.getByTestId('ads-blocked')).toContainText('Video bonuses are unavailable');
    await page.getByTestId('home').click();
    await page.getByTestId('arcade').click();
    await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByTestId('puzzle-1').click();
    await expect(page.getByTestId('board')).toBeVisible();
    await page.getByTestId('pause').click();
    await expect(page.getByTestId('ad-hint')).toHaveCount(0);
    await expect(page.getByTestId('ads-blocked')).toBeVisible();
  });
});
