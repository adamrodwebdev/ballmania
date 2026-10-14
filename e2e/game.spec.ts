import { expect, test } from './fixtures';

test.describe('game', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
    );
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('level-nebula-01').click();
    await expect(page.getByTestId('board')).toBeVisible();
  });

  test('plays without errors nor horizontal scroll', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const board = page.getByTestId('board');
    const box = (await board.boundingBox())!;
    for (let i = 0; i < 5; i++) {
      await board.click({ position: { x: box.width * (0.3 + i * 0.1), y: box.height * 0.2 } });
    }
    await page.getByTestId('swap').click();
    await page.keyboard.press('Space');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    expect(errors).toEqual([]);
  });

  test('pauses, resumes and quits', async ({ page }) => {
    await page.getByTestId('pause').click();
    const dialog = page.getByRole('dialog', { name: 'Game paused' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Resume' }).click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('board').focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Quit' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Campaign' })).toBeVisible();
  });

  test('keeps touch targets large enough', async ({ page }) => {
    for (const id of ['pause', 'swap']) {
      const box = (await page.getByTestId(id).boundingBox())!;
      // Rounded: the screen's entrance animation can leave a sub-pixel fraction.
      expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('settings', () => {
  test('changes the effects, volume and vibrations, and remembers them', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
        sessionStorage.setItem('seeded', '1');
      }
    });
    await page.goto('./');
    await page.getByTestId('open-settings').click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('effects-subtle').check();
    await dialog.getByTestId('volume').fill('30');
    await dialog.getByTestId('vibration').uncheck();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    const saved = await page.evaluate(() => localStorage.getItem('ballmania:settings'));
    expect(JSON.parse(saved!)).toMatchObject({ effects: 'subtle', volume: 0.3, vibration: false });
  });

  test('opens from the pause menu', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('level-nebula-01').click();
    await page.getByTestId('pause').click();
    await page.getByRole('dialog').getByTestId('open-settings').click();
    await expect(page.getByTestId('settings')).toBeVisible();
  });
});

test.describe('campaign', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
    );
  });

  test('opens the first level only, then the next one once finished', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-01')).toBeEnabled();
    await expect(page.getByTestId('level-nebula-02')).toBeDisabled();

    await page.evaluate(() =>
      localStorage.setItem(
        'ballmania:progress',
        JSON.stringify({ version: 1, levels: { 'nebula-01': { stars: 2, best: 900 } } }),
      ),
    );
    await page.reload();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-02')).toBeEnabled();
    await expect(page.getByText('2 / 36 stars')).toBeVisible();
  });

  test('shows the result when the chain reaches the hole, and goes back to the map', async ({
    page,
  }) => {
    // Simulating a whole level frame by frame takes a while.
    test.setTimeout(90_000);
    await page.clock.install();
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('level-nebula-01').click();
    await expect(page.getByTestId('board')).toBeVisible();
    await expect(page.getByTestId('level')).toHaveText('1-1');
    // Nobody shoots: the chain reaches the hole.
    await page.clock.runFor(100_000);
    const dialog = page.getByRole('dialog', { name: 'The chain reached the hole' });
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('map').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Campaign' })).toBeVisible();
  });

  test('shows the health of the Colossus on the boss level', async ({ page }) => {
    await page.addInitScript(() => {
      const levels: Record<string, { stars: number; best: number }> = {};
      for (let i = 1; i <= 11; i++) {
        levels[`nebula-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
      }
      localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
    });
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('level-nebula-12').click();
    await expect(page.getByTestId('colossus')).toHaveAttribute('max', '60');
    await expect(page.getByTestId('hint')).toBeVisible();
  });
});

test.describe('progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
      localStorage.setItem(
        'ballmania:player',
        JSON.stringify({
          version: 1,
          shards: 200,
          owned: [],
          equipped: {},
          stats: { levelsWon: 1 },
          achievements: ['first-win'],
          worlds: [],
          daily: {},
          failures: {},
        }),
      );
    });
  });

  test('buys and equips a cosmetic in the workshop, and remembers it', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('wallet')).toHaveText(/200 shards/);
    await page.getByTestId('shop').click();
    const comet = page.getByTestId('item-trail-comet');
    await comet.getByRole('button', { name: /Buy/ }).click();
    await expect(comet.getByText('Equipped')).toBeVisible();
    await expect(page.getByTestId('wallet')).toHaveText(/120 shards/);
    await expect(
      page.getByTestId('item-shooter-eye').getByRole('button', { name: /Buy/ }),
    ).toBeDisabled();
    await expect(page.getByTestId('item-board-neon')).toContainText('Finish the Nebula world');
    await page.reload();
    await page.getByTestId('shop').click();
    await expect(page.getByTestId('item-trail-comet').getByText('Equipped')).toBeVisible();
  });

  test('lists the goals with their progress', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('achievements')).toContainText(/1 \/ \d+ reached/);
    await page.getByTestId('achievements').click();
    await expect(page.getByTestId('achievement-first-win')).toContainText('Reached');
    await expect(page.getByTestId('achievement-colossus')).toContainText('+100 shards');
  });

  test('plays the daily challenge once for rewards, then offers to share', async ({ page }) => {
    test.setTimeout(90_000);
    await page.clock.install();
    await page.goto('./');
    await expect(page.getByTestId('daily-new')).toBeVisible();
    await page.getByTestId('daily').click();
    await expect(page.getByTestId('board')).toBeVisible();
    await expect(page.getByTestId('level')).toHaveText('Daily');
    await page.clock.runFor(150_000);
    const dialog = page.getByRole('dialog', { name: 'The chain reached the hole' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('shards-earned')).toHaveText('+10 shards');
    await expect(dialog.getByTestId('share')).toBeVisible();
    await dialog.getByTestId('map').click();
    await expect(page.getByTestId('daily-done')).toBeVisible();
  });
});

test('offers help after three failures in a row on a level', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem(
      'ballmania:player',
      JSON.stringify({ version: 1, shards: 0, failures: { 'nebula-01': 2 } }),
    );
  });
  await page.clock.install();
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('level-nebula-01').click();
  await expect(page.getByTestId('board')).toBeVisible();
  await page.clock.runFor(100_000);
  const dialog = page.getByRole('dialog', { name: 'The chain reached the hole' });
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('assist').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('assisted')).toHaveText('Help on');
});

test('opens the Neon world once the Nebula is finished, up to the Prism Colossus', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    const levels: Record<string, { stars: number; best: number }> = {};
    for (let i = 1; i <= 12; i++) {
      levels[`nebula-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
      if (i < 12) levels[`neon-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
    }
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
  await page.getByTestId('play').click();
  await expect(page.getByTestId('level-neon-01')).toBeEnabled();
  await page.getByTestId('level-neon-12').click();
  await expect(page.getByTestId('level')).toHaveText('2-12');
  await expect(page.getByText('Prism Colossus')).toBeVisible();
});

test('arms the magnet and pulls a ball out of the chain in the Abyss world', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    const levels: Record<string, { stars: number; best: number }> = {};
    for (const world of ['nebula', 'neon']) {
      for (let i = 1; i <= 12; i++)
        levels[`${world}-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
    }
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('level-abyss-01').click();
  const magnet = page.getByTestId('magnet');
  await expect(magnet).toHaveAttribute('aria-label', 'Magnet, 3 of 3 charges');
  // Let the chain enter, then aim straight up at it.
  await page.waitForTimeout(2500);
  await page.getByTestId('board').focus();
  await page.keyboard.press('KeyM');
  await expect(magnet).toHaveAttribute('aria-pressed', 'true');
  const box = (await page.getByTestId('board').boundingBox())!;
  await page.getByTestId('board').click({ position: { x: box.width / 2, y: box.height * 0.08 } });
  await expect(magnet).toHaveAttribute('aria-label', 'Magnet, 2 of 3 charges');
  await expect(magnet).toHaveAttribute('aria-pressed', 'false');
});

test('shows the colour mixes in the Jewel world, up to the Crystal Colossus', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    const levels: Record<string, { stars: number; best: number }> = {};
    for (const world of ['nebula', 'neon', 'abyss', 'jewel']) {
      for (let i = 1; i <= 12; i++) {
        if (world === 'jewel' && i === 12) continue;
        levels[`${world}-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
      }
    }
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('level-jewel-12').click();
  await expect(page.getByTestId('alchemy')).toContainText('ruby + lime = amber');
  await expect(page.getByText('Crystal Colossus')).toBeVisible();
});

test('flips the switches of the Volcano world by touch and by keyboard', async ({ page }) => {
  // Time stands still: the chain cannot reach (and lock) the first switch before the click.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    const levels: Record<string, { stars: number; best: number }> = {};
    for (const world of ['nebula', 'neon', 'abyss', 'jewel']) {
      for (let i = 1; i <= 12; i++)
        levels[`${world}-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
    }
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('level-volcano-01').click();
  const board = page.getByTestId('board');
  const box = (await board.boundingBox())!;
  // The first fork starts 30 % along the first row (y = 110), on any board shape.
  const ratio = box.width / box.height;
  const [width, height] =
    box.height / box.width >= 1.2 ? [1000, 1400] : ratio >= 1.25 ? [1400, 1000] : [1000, 1000];
  const scale = Math.min(box.width / width, box.height / height);
  const left = (box.width - width * scale) / 2;
  const top = (box.height - height * scale) / 2;
  const turn = Math.min(300, (height * 0.62 - 110) / 2) / 2;
  const forkX = 90 + (width - 90 - turn - 90) * 0.3;
  const live = page.locator('[aria-live="polite"]');
  await board.click({ position: { x: left + forkX * scale, y: top + 110 * scale } });
  await expect(live).toHaveText('Switch set to the detour');
  await board.focus();
  await page.keyboard.press('KeyS');
  await expect(live).toHaveText('Switch set to the shortcut');
});

test('plays around the black hole of the Singularity world', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    const levels: Record<string, { stars: number; best: number }> = {};
    for (const world of ['nebula', 'neon', 'abyss', 'jewel', 'volcano']) {
      for (let i = 1; i <= 12; i++)
        levels[`${world}-${String(i).padStart(2, '0')}`] = { stars: 1, best: 1 };
    }
    levels['singularity-01'] = { stars: 1, best: 1 };
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
  await page.getByTestId('play').click();
  await expect(page.getByRole('heading', { name: 'Singularity' })).toBeVisible();
  await page.getByTestId('level-singularity-02').click();
  await expect(page.getByTestId('hint')).toContainText('glides around the black hole');
  const board = page.getByTestId('board');
  const box = (await board.boundingBox())!;
  for (let i = 0; i < 4; i++) {
    await board.click({ position: { x: box.width * (0.25 + i * 0.15), y: box.height * 0.3 } });
  }
  await page.keyboard.press('Space');
  expect(errors).toEqual([]);
});

test('chooses the difficulty of the campaign on the map', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
  );
  await page.goto('./');
  await page.getByTestId('play').click();
  await expect(page.getByTestId('difficulty-pilot')).toBeChecked();
  await page.getByText('Legend', { exact: true }).click();
  await expect(page.getByTestId('difficulty-legend')).toBeChecked();
  await page.getByTestId('level-nebula-01').click();
  await expect(page.getByTestId('difficulty')).toHaveText('Legend');
});

test('plays with the keyboard alone, from the home page to the pause menu', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
  );
  await page.goto('./');
  await page.getByTestId('play').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('level-nebula-01').focus();
  await page.keyboard.press('Enter');
  const board = page.getByTestId('board');
  await expect(board).toBeFocused();
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.up('ArrowLeft');
  // A plain shot, then a charged one (Space held), then a swap.
  await page.keyboard.press('Space');
  await page.keyboard.down('Space');
  await page.waitForTimeout(500);
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyX');
  await page.keyboard.press('Escape');
  const dialog = page.getByRole('dialog', { name: 'Game paused' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Resume' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(board).toBeFocused();
});
