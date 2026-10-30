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

/** The line over the buttons, or nothing while it is hidden. */
const lineOf = async (page: Page) => {
  const hint = page.getByTestId('hint');
  return (await hint.isVisible()) ? ((await hint.textContent()) ?? '') : '';
};

/**
 * Shoots the Nova all around the launcher until it lands (a miss brings it
 * back): its line goes, the first lesson done.
 */
const landTheNova = async (page: Page, shoot: (x: number, y: number) => Promise<void>) => {
  const box = (await page.getByTestId('board').boundingBox())!;
  for (let k = 0; k < 12; k++) {
    const angle = (k / 12) * Math.PI * 2 - Math.PI / 2;
    await shoot(
      box.width / 2 + Math.cos(angle) * box.width * 0.3,
      box.height / 2 + Math.sin(angle) * box.height * 0.3,
    );
    const landed = await expect
      .poll(() => lineOf(page), { timeout: 1500 })
      .not.toContain('Nova bomb')
      .then(() => true)
      .catch(() => false);
    if (landed) return;
  }
  throw new Error('The Nova never landed');
};

/**
 * E1 teaches every control, one at a time (v1.8.1): after the Nova, a swap
 * when the next marble does better, then a charged shot; each line stays
 * until its gesture is done, as the player aims (a finger, or a mouse).
 */
const SWAP = /next marble fits better here/;

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

  test("teaches E1's controls one at a time, with the keyboard", async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', "a desktop's keys");
    await english(page);
    await page.goto('./');
    await page.getByTestId('play').click();
    const board = page.getByTestId('board');
    await expect(board).toBeVisible();
    await landTheNova(page, (x, y) => board.click({ position: { x, y } }));
    const hint = page.getByTestId('hint');
    // The next marble does better: the swap's line, and its button pulses.
    await expect(hint).toContainText('Right-click, or press X');
    await expect(page.getByTestId('swap')).toHaveClass(/lesson/);
    await board.focus();
    await page.keyboard.press('KeyX');
    await expect(page.getByTestId('swap')).not.toHaveClass(/lesson/);
    // Then the charge: held, the line says to let go.
    await expect(hint).toContainText('Hold the click, or Space');
    await page.keyboard.down('Space');
    await expect(hint).toContainText('release: the charged shot flies twice as fast');
    await page.keyboard.up('Space');
    // Every control done: the line goes for good.
    await expect(hint).toBeHidden();
  });

  test("teaches E1's controls with the mouse", async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'a desktop mouse');
    await english(page);
    await page.goto('./');
    await page.getByTestId('play').click();
    const board = page.getByTestId('board');
    await expect(board).toBeVisible();
    await landTheNova(page, (x, y) => board.click({ position: { x, y } }));
    const hint = page.getByTestId('hint');
    await expect(hint).toContainText(SWAP);
    await board.click({ button: 'right', position: { x: 12, y: 12 } });
    await expect(hint).toContainText('Hold the click, or Space');
    const box = (await board.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2);
    await page.mouse.down();
    await expect(hint).toContainText('release: the charged shot');
    await page.mouse.up();
    await expect(hint).toBeHidden();
  });

  test("teaches E1's controls with a finger", async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'a touch screen');
    await english(page);
    await page.goto('./');
    await page.getByTestId('play').tap();
    const board = page.getByTestId('board');
    await expect(board).toBeVisible();
    await landTheNova(page, (x, y) => board.tap({ position: { x, y } }));
    const hint = page.getByTestId('hint');
    await expect(hint).toContainText(SWAP);
    await page.getByTestId('swap').tap();
    await expect(hint).toContainText(/Keep your finger still|Hold the click/);
    // A finger held still, then lifted: real touches, which the board captures.
    const box = (await board.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height * 0.22 };
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await expect(hint).toContainText('release: the charged shot');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(hint).toBeHidden();
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
