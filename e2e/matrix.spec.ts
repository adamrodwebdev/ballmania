import AxeBuilder from '@axe-core/playwright';
import { expect, spendShots, test, type Page } from './fixtures';

/**
 * The test matrix (v1.7.6): each Playwright project is one size of the
 * responsive directive (phones, a phone on its side, a tablet, desktops,
 * 200 % and 400 % zoom). On each, every screen keeps the page still, scrolls
 * nothing sideways, and passes the WCAG 2.2 A and AA audit, target sizes
 * included; the Observatory bubble is audited where it shows.
 */

/** A player who has seen the first worlds: every screen shows its full content. */
const prepare = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem(
      'ballmania:player',
      JSON.stringify({
        version: 1,
        shards: 400,
        fragments: 30,
        worlds: ['nebula', 'neon', 'abyss', 'jewel', 'volcano'],
      }),
    );
    const levels: Record<string, { stars: number; best: number }> = {};
    for (let i = 1; i <= 12; i++) {
      levels[`nebula-${String(i).padStart(2, '0')}`] = { stars: 2, best: 1 };
    }
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
};

/** The page never scrolls, and nothing scrolls sideways, in the page or the screen's frame. */
const holdsStill = async (page: Page, name: string) => {
  const scroll = await page.evaluate(() => {
    const root = document.documentElement;
    const screen = document.querySelector('main');
    return {
      down: root.scrollHeight - root.clientHeight,
      across: Math.max(
        root.scrollWidth - root.clientWidth,
        screen ? screen.scrollWidth - screen.clientWidth : 0,
      ),
    };
  });
  expect(scroll, name).toEqual({ down: 0, across: 0 });
};

/** WCAG 2.0, 2.1 and 2.2 A and AA rules on the whole page, target sizes included. */
const audit = async (page: Page, name: string) => {
  // Let entrance animations end, so colours and boxes are measured at rest.
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const problems = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
  expect(problems, name).toEqual([]);
};

const check = async (page: Page, name: string) => {
  await holdsStill(page, name);
  await audit(page, name);
};

test.describe('test matrix', () => {
  test('menus hold still and pass the audit', async ({ page }) => {
    await prepare(page);
    await check(page, 'home');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-12')).toBeAttached();
    // A player with fragments sees the Observatory bubble once, on this visit of the map.
    await expect(page.getByTestId('observatory-tip')).toBeVisible();
    await check(page, 'campaign, with the Observatory bubble');
    await page.getByTestId('observatory').click();
    await check(page, 'observatory');
    await page.getByTestId('back').click();
    await page.getByTestId('home').click();
    await page.getByTestId('arcade').click();
    await check(page, 'arcade');
    await page.getByTestId('home').click();
    await page.getByTestId('shop').click();
    await check(page, 'workshop');
    await page.getByTestId('home').click();
    await page.getByTestId('achievements').click();
    await check(page, 'achievements');
    await page.getByTestId('home').click();
    await page.getByTestId('open-settings').click();
    await check(page, 'settings');
  });

  test('the training, its card and its pause hold still and pass the audit', async ({ page }) => {
    // A newcomer back at the second showcase (v1.8.0): its card, then its game.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
      const training = { step: 2, done: false };
      localStorage.setItem('ballmania:player', JSON.stringify({ version: 2, training }));
    });
    await page.goto('./');
    await page.getByTestId('play').click();
    const card = page.getByTestId('training-card');
    await expect(card).toBeVisible();
    await holdsStill(page, 'training card');
    await expect(card).toBeHidden({ timeout: 4000 });
    await check(page, 'training');
    await page.getByTestId('pause').click();
    await check(page, 'training pause');
  });

  test('the game, its pause and its result hold still and pass the audit', async ({ page }) => {
    await prepare(page);
    await page.getByTestId('play').click();
    // All of world 1 is won: the map opens on world 2.
    await page.getByTestId('level-neon-01').click();
    await expect(page.getByTestId('board')).toBeVisible();
    await check(page, 'game');
    await page.getByTestId('pause').click();
    await check(page, 'pause');
    // The quickest way to a result: spend the four shots of the first puzzle.
    await page.getByRole('button', { name: 'Quit' }).click();
    await page.getByTestId('home').click();
    await page.getByTestId('arcade').click();
    await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByTestId('puzzle-1').click();
    await expect(page.getByTestId('board')).toBeFocused();
    await spendShots(page);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    await check(page, 'result');
  });
});
