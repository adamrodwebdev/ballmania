import { expect, test, type Page } from './fixtures';

/**
 * The training (v1.8.0, specification § 3.13): three showcases for a new
 * player, before the campaign. These journeys start from a fresh profile.
 */
test.use({ trained: false });

const PORTAL = `http://localhost:${process.env.E2E_PORTAL_PORT ?? 4175}/`;

const english = async (page: Page, player: object | null = null) => {
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    if (saved) localStorage.setItem('ballmania:player', JSON.stringify({ version: 2, ...saved }));
  }, player);
};

const log = (page: Page) =>
  page.evaluate(() => (window as unknown as { platformLog: string[] }).platformLog);

test.describe('the training', () => {
  test("opens at a newcomer's first Play on our site, with only what it needs", async ({
    page,
  }) => {
    await english(page);
    await page.goto('./');
    await expect(page.getByTestId('play')).toContainText('Training');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('board')).toBeVisible();
    // Pause, the dots of the three showcases, Skip and the sound; no score, no level.
    await expect(page.getByTestId('training-steps')).toHaveAttribute('aria-label', 'Step 1 of 3');
    await expect(page.getByTestId('skip-training')).toBeVisible();
    await expect(page.getByTestId('score')).toHaveCount(0);
    await expect(page.getByTestId('level')).toHaveCount(0);
    await expect(page.getByTestId('hint')).toContainText('Your first marble is a Nova bomb');
    // Its pause offers nothing else than going on, again, or skipping it.
    await page.getByTestId('pause').click();
    const pause = page.getByRole('dialog', { name: 'Game paused' });
    await expect(pause.getByRole('button')).toHaveText([
      'Resume',
      'Restart this step',
      'Skip the training',
    ]);
    await pause.getByRole('button', { name: 'Resume' }).click();
    await expect(pause).toBeHidden();
  });

  test('can be skipped for good: the campaign starts at its first level', async ({ page }) => {
    await english(page);
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('skip-training').click();
    await expect(page.getByTestId('level')).toHaveText('1-1');
    await expect(page.getByTestId('score')).toBeVisible();
    await expect(page.getByTestId('hint')).toContainText('Aim at the chain and release');
    // Over for good: the next visit's Play leads to the campaign.
    await page.reload();
    await expect(page.getByTestId('play')).toContainText('Nebula');
  });

  test('resumes at the showcase it stopped at, named by its card', async ({ page }) => {
    await english(page, { training: { step: 3, done: false } });
    await page.goto('./');
    await page.getByTestId('play').click();
    const card = page.getByTestId('training-card');
    await expect(card).toContainText('Step 3 of 3');
    await expect(card).toContainText('The black hole');
    // It goes by itself, and the hint comes with the game.
    await expect(card).toBeHidden({ timeout: 4000 });
    await expect(page.getByTestId('hint')).toContainText('The black hole bends your shots');
    await expect(page.getByTestId('training-steps')).toHaveAttribute('aria-label', 'Step 3 of 3');
  });

  test('is where a new player lands on a portal, playing from the first frame', async ({
    page,
  }) => {
    await english(page);
    await page.goto(PORTAL);
    await expect(page.getByTestId('training-steps')).toHaveAttribute('aria-label', 'Step 1 of 3');
    await expect(page.getByTestId('play')).toHaveCount(0);
    await expect.poll(() => log(page)).toContain('gameplayStart');
    expect((await log(page)).slice(0, 2)).toEqual(['init', 'loaded']);
  });
});
