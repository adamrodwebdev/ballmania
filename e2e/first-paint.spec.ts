import { expect, test } from './fixtures';

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

  test('gives way to the game, with no error from the CSP', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(page.locator('#first-paint')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('draws the title scene in a worker, off the page main thread', async ({ page }) => {
    const worker = page.waitForEvent('worker');
    await page.goto('./');
    expect((await worker).url()).toMatch(/\/assets\/worker-[\w-]+\.js$/);
  });
});
