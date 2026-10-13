import { expect, test, type Page } from './fixtures';

/** English, and the given worlds of the campaign already finished. */
const prepare = async (page: Page, worlds: readonly string[]) => {
  await page.addInitScript((finished) => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem('ballmania:player', JSON.stringify({ version: 1, worlds: finished }));
  }, worlds);
  await page.goto('./');
};

test('opens the Arcade modes one world after the other', async ({ page }) => {
  await prepare(page, ['nebula']);
  await expect(page.getByTestId('arcade')).toContainText('1 / 4 modes open');
  await page.getByTestId('arcade').click();
  await expect(page.getByRole('heading', { name: 'Arcade', level: 1 })).toBeVisible();
  await expect(page.getByTestId('play-endless')).toBeVisible();
  await expect(page.getByTestId('mode-puzzle')).toContainText('Finish the Neon world to open it.');
  await expect(page.getByTestId('mode-duel')).toContainText('Finish the Jewels world to open it.');
  await page.getByTestId('home').click();
  await expect(page.getByTestId('play')).toBeVisible();
});

test('plays Endless mode and comes back to the Arcade', async ({ page }) => {
  await prepare(page, ['nebula']);
  await page.getByTestId('arcade').click();
  await page.getByTestId('play-endless').click();
  await expect(page.getByTestId('level')).toHaveText('Endless');
  await expect(page.getByTestId('stage')).toHaveText('Stage 1');
  await expect(page.getByTestId('hint')).toContainText('never stops');
  await page.getByTestId('pause').click();
  await page
    .getByRole('dialog', { name: 'Game paused' })
    .getByRole('button', { name: 'Quit' })
    .click();
  await expect(page.getByRole('heading', { name: 'Arcade', level: 1 })).toBeVisible();
});

test('counts the shots of a puzzle and lets the player pick the colour', async ({ page }) => {
  await prepare(page, ['nebula', 'neon']);
  await page.getByTestId('arcade').click();
  await expect(page.getByTestId('puzzle-2')).toBeDisabled();
  await page.getByTestId('puzzle-1').click();
  await expect(page.getByTestId('level')).toHaveText('Puzzle 1');
  await expect(page.getByTestId('shots')).toHaveText('4 shots');
  const swap = page.getByTestId('swap');
  await expect(swap).toContainText('Next colour');
  await swap.click();
  const board = page.getByTestId('board');
  const box = (await board.boundingBox())!;
  await board.click({ position: { x: box.width * 0.5, y: box.height * 0.1 } });
  await expect(page.getByTestId('shots')).toHaveText('3 shots');
});

test('plays to the beat and duels a rival', async ({ page }) => {
  await prepare(page, ['nebula', 'neon', 'abyss', 'jewel']);
  await page.getByTestId('arcade').click();
  // The deck opens on the newest mode, the duel: bring the rhythm card forward.
  await page.getByRole('button', { name: 'Rhythm', exact: true }).click();
  await page.getByTestId('song-pulse').click();
  await expect(page.getByTestId('level')).toHaveText('Pulse');
  await expect(page.getByTestId('groove')).toHaveText('Groove ×1');
  await page.getByTestId('pause').click();
  await page
    .getByRole('dialog', { name: 'Game paused' })
    .getByRole('button', { name: 'Quit' })
    .click();
  await page.getByRole('button', { name: 'Duel', exact: true }).click();
  await page.getByTestId('duel-easy').click();
  await expect(page.getByTestId('level')).toHaveText('Rookie rival');
  await expect(page.getByTestId('duel')).toContainText('Rival');
  await expect(page.getByTestId('tug')).toBeVisible();
});
