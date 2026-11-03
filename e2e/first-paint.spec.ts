import { expect, test, type Page } from './fixtures';

/** When the page first painted, and when each file of the reel matching `files` was asked for. */
const loads = (page: Page, files: RegExp) =>
  page.evaluate(
    (source) => ({
      paint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? Infinity,
      reel: performance
        .getEntriesByType('resource')
        .filter((entry) => new RegExp(source).test(entry.name))
        .map((entry) => entry.startTime),
    }),
    files.source,
  );

/**
 * Our site's first paint (v1.7.6): the page paints the game's title from its
 * own HTML, then fetches its styles and code (Lighthouse 100).
 */
test.describe('first paint', () => {
  test('serves a page that paints its title before any other request', async ({ request }) => {
    const html = await (await request.get('./')).text();
    expect(html).toContain('<div id="first-paint"');
    // No script, stylesheet or preload to fetch before that paint.
    expect(html).not.toMatch(/<script type="module"|<link rel="(?:stylesheet|modulepreload)"/);
    expect(html).not.toMatch(/<script src=/);
    // Its inline blocks are allowed one by one: the CSP has no 'unsafe-inline'.
    const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1];
    expect(policy).toMatch(/script-src 'self' 'sha256-[^']+' 'sha256-[^']+'/);
    expect(policy).toMatch(/style-src 'self' 'sha256-[^']+'/);
    expect(policy).not.toContain('unsafe-inline');
  });

  test('gives way to the game, with no error from the CSP', async ({ page, consoleErrors }) => {
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(page.locator('#first-paint')).toHaveCount(0);
    expect(await consoleErrors()).toEqual([]);
  });

  test('plays the title reel in a worker, loaded after the first paint', async ({ page }) => {
    // Safari has had OffscreenCanvas since 16.4; Playwright's WebKit has none on Windows
    // (03/11/2026), so its reel plays in the page, as the next test checks.
    test.skip(
      !(await page.evaluate(() => 'transferControlToOffscreen' in HTMLCanvasElement.prototype)),
      'this browser cannot hand a canvas to a worker',
    );
    const worker = page.waitForEvent('worker');
    await page.goto('./');
    expect((await worker).url()).toMatch(/\/assets\/worker-[\w-]+\.js$/);
    // No code of the reel before the page has painted (roadmap 1.8.0, step 3).
    const timing = await loads(page, /ReelPlayer|worker-/);
    expect(timing.reel.length).toBeGreaterThan(0);
    for (const start of timing.reel) expect(start).toBeGreaterThan(timing.paint);
  });

  test('plays the title reel in the page where a canvas cannot go to a worker, after the first paint', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Reflect.deleteProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen'),
    );
    await page.goto('./');
    await expect(page.getByTestId('reel-caption').last()).toHaveText('Nebula The Nova bomb');
    expect(page.workers()).toHaveLength(0);
    const timing = await loads(page, /ReelPlayer|Reel-|moments-/);
    expect(timing.reel.length).toBeGreaterThan(2);
    for (const start of timing.reel) expect(start).toBeGreaterThan(timing.paint);
  });
});
