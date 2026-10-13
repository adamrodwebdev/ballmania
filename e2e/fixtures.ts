import { test as base } from '@playwright/test';

/**
 * The journeys start where players land after the studio intro: it plays
 * once per visit, so it is marked as seen (its own test uses the bare test).
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => sessionStorage.setItem('ballmania:intro', '1'));
    await use(page);
  },
});

export { expect, type Page } from '@playwright/test';
