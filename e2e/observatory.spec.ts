import { expect, overflowOf, test } from './fixtures';

test('spends star fragments on upgrades at the Observatory', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem('ballmania:player', JSON.stringify({ version: 1, fragments: 20 }));
  });
  await page.goto('./');
  await expect(page.getByTestId('upgrade-ready')).toHaveText('Upgrade');
  await page.getByTestId('observatory').click();
  await expect(page.getByRole('heading', { name: 'Observatory', level: 1 })).toBeVisible();
  await expect(page.getByTestId('fragments')).toContainText('20 fragments');
  // It opens on the first upgrade within reach, in the Shot tab.
  await expect(page.getByTestId('tab-shot')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('upgrade-eye')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('upgrade-nova').click();
  await page.getByTestId('buy-nova').click();
  await expect(page.getByTestId('fragments')).toContainText('15 fragments');
  await expect(page.getByLabel('Rank 1 of 3').first()).toBeVisible();
  await page.getByTestId('buy-nova').click();
  await expect(page.getByTestId('fragments')).toContainText('3 fragments');
  await expect(page.getByTestId('buy-nova')).toBeDisabled();
  await expect(page.getByTestId('buy-nova')).toHaveAccessibleName('Need 22 more fragments');
  // The Chain tab opens on its first upgrade, which says what is missing; the arrows move on.
  await page.getByTestId('tab-chain').click();
  await expect(page.getByTestId('upgrade-chronos')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('buy-chronos')).toHaveAccessibleName('Need 2 more fragments');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tab-weather')).toBeFocused();
  await expect(page.getByTestId('upgrade-shield')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('back').click();
  await expect(page.getByTestId('upgrade-ready')).toHaveCount(0);
});

test.describe('the bubble pointing at the Observatory', () => {
  test.beforeEach(async ({ page }) => {
    // A first upgrade within reach, seeded once: reloads keep what the visit saved.
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
      // The training (v1.8.0) is over: "Play" leads to the map.
      const training = { step: 1, done: true };
      localStorage.setItem(
        'ballmania:player',
        JSON.stringify({ version: 1, fragments: 5, training }),
      );
    });
    await page.goto('./');
    await page.getByTestId('play').click();
  });

  test('closes at a touch, hands the focus to the button, and never comes back', async ({
    page,
  }) => {
    const tip = page.getByTestId('observatory-tip');
    await expect(tip).toContainText('Upgrade your game here with your star fragments.');
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(tip).toHaveCount(0);
    await expect(page.getByTestId('observatory')).toBeFocused();
    await page.getByTestId('home').click();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-01')).toBeVisible();
    await expect(tip).toHaveCount(0);
    await page.reload();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-01')).toBeVisible();
    await expect(tip).toHaveCount(0);
  });

  test('shows on one visit of the map only, even left untouched', async ({ page }) => {
    // At rest, without its entrance.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const tip = page.getByTestId('observatory-tip');
    await expect(tip).toBeVisible();
    // In the page's flow, it covers neither the button nor the difficulty: under the
    // button on a phone, above it at the foot of the column on a landscape screen.
    const button = (await page.getByTestId('observatory').boundingBox())!;
    const bubble = (await tip.boundingBox())!;
    const difficulty = (await page.locator('.difficulty').boundingBox())!;
    if (button.y > difficulty.y) {
      expect(bubble.y).toBeGreaterThanOrEqual(difficulty.y + difficulty.height);
      expect(bubble.y + bubble.height).toBeLessThanOrEqual(button.y);
    } else {
      expect(bubble.y).toBeGreaterThanOrEqual(button.y + button.height);
      expect(bubble.y + bubble.height).toBeLessThanOrEqual(difficulty.y);
    }
    await page.getByTestId('home').click();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-01')).toBeVisible();
    await expect(tip).toHaveCount(0);
  });

  // The portals' short frames (CrazyGames, Playgama): the map stays on one screen.
  for (const [width, height] of [
    [821, 462],
    [915, 412],
  ] as const) {
    test(`floats above the button at ${width}×${height}, without scrolling the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height });
      const tip = page.getByTestId('observatory-tip');
      await expect(tip).toBeVisible();
      // The world deck takes a moment to follow a new window size.
      await expect.poll(() => overflowOf(page)).toBeLessThanOrEqual(0);
      const button = (await page.getByTestId('observatory').boundingBox())!;
      const bubble = (await tip.boundingBox())!;
      expect(button.y + button.height).toBeLessThanOrEqual(height);
      expect(bubble.y + bubble.height).toBeLessThanOrEqual(button.y);
      // It covers the last difficulties until touched; reaching them from the keyboard hides it.
      await page.getByTestId('difficulty-explorer').focus();
      await expect(tip).toHaveCount(0);
    });
  }
});
