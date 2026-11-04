import { expect, test as base, type Locator, type Page } from '@playwright/test';

/** What a project plays on: a phone under a finger, or a computer with a mouse. */
export type FormFactor = 'mobile' | 'desktop';

/** The options a project or a spec sets (`use` in playwright.config.ts, `test.use`). */
export interface TestOptions {
  /** The training is done before the journey starts. */
  trained: boolean;
  /**
   * The form factor of the project (v1.9.0): a check meant for one of them
   * skips the other with it, on every engine.
   */
  formFactor: FormFactor;
  /**
   * Whether the page may hand its canvases to workers (OffscreenCanvas) as the
   * browser allows (v1.9.0). Off, every canvas draws in the page, as on a browser
   * without OffscreenCanvas: the WebKit projects' choice (playwright.config.ts).
   */
  canvasWorkers: boolean;
}

/** What a test reads at its end: the console errors of its page so far. */
type ConsoleErrors = () => Promise<string[]>;

/** The words WebKit logs for every style it refuses under the page's CSP. */
const WEBKIT_STYLE_REFUSAL =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";

/** Tells the test, through `refusedSelectStyle`, of each style refused to a `<select>`. */
const watchSelects = () => {
  document.addEventListener(
    'securitypolicyviolation',
    (event) => {
      if (event.violatedDirective === 'style-src-attr' && event.target instanceof HTMLSelectElement)
        void (
          window as unknown as { refusedSelectStyle: () => Promise<void> }
        ).refusedSelectStyle();
    },
    true,
  );
};

/**
 * The journeys start where players land after the studio intro: it plays
 * once per visit, so it is marked as seen (its own test uses the bare test).
 * The training (v1.8.0) is done too, unless a test brings a profile of its
 * own or opts out (`test.use({ trained: false })`, the training's journeys).
 * They run without Web Audio (see below); the sound is measured on its own.
 */
export const test = base.extend<TestOptions & { consoleErrors: ConsoleErrors }>({
  trained: [true, { option: true }],
  formFactor: ['desktop', { option: true }],
  canvasWorkers: [true, { option: true }],
  /**
   * The page's console errors, collected from the moment a test asks for them.
   * Playwright's WebKit refuses, under the page's CSP, a style it gives the
   * inner parts of each `<select>` (03/11/2026), in the very words and at the
   * very place it would refuse a style of the game's own: on WebKit, one such
   * message is left out per refusal aimed at a `<select>`, and every other
   * refusal stays an error.
   */
  consoleErrors: async ({ page, browserName }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    let refusedToSelects = 0;
    if (browserName === 'webkit') {
      await page.exposeFunction('refusedSelectStyle', () => {
        refusedToSelects += 1;
      });
      await page.addInitScript(watchSelects);
      if (page.url() !== 'about:blank') await page.evaluate(watchSelects);
    }
    await use(async () => {
      // A refusal's event is a task queued behind its message: one round trip lets it through.
      await page.evaluate(() => undefined);
      let left = refusedToSelects;
      return errors.filter((text) => !(text === WEBKIT_STYLE_REFUSAL && left-- > 0));
    });
  },
  page: async ({ page, trained, canvasWorkers }, use) => {
    await page.addInitScript((trained) => {
      sessionStorage.setItem('ballmania:intro', '1');
      if (trained && !localStorage.getItem('ballmania:player')) {
        const training = { step: 1, done: true };
        localStorage.setItem('ballmania:player', JSON.stringify({ version: 2, training }));
      }
      // No sound card here: Web Audio would synthesise the music in real time
      // against the fast-forwarded clock of the long journeys. The game runs
      // silently without it, as on a browser without Web Audio.
      Object.assign(window, { AudioContext: undefined });
    }, trained);
    if (!canvasWorkers)
      await page.addInitScript(() =>
        Reflect.deleteProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen'),
      );
    await use(page);
  },
});

/**
 * How far the current screen scrolls, in CSS pixels (0 when it all fits): in
 * its own frame, the `<main>` (v1.7.6), or in the page, should anything ever
 * spill out of that frame.
 */
export const overflowOf = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const root = document.documentElement;
    const screen = document.querySelector('main');
    return Math.max(
      root.scrollHeight - root.clientHeight,
      screen ? screen.scrollHeight - screen.clientHeight : 0,
    );
  });

/**
 * Waits until the page has followed a new size. The CSS does at once; the
 * deck of cards (Swiper) sizes its cards a frame after its resize observer
 * fires, so a measure taken one or two frames after `setViewportSize` can
 * still see the cards of the size before (WebKit under Linux, 03/11/2026:
 * cards of 288 px at 1280 px). The canvases' observers only resize their
 * pixels. The wait is on the cards' width, polled on timers: a screen with no
 * deck needs no frame at all.
 */
export async function settled(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.swiper')].every((deck) => {
            const card = deck.querySelector<HTMLElement>('.swiper-slide');
            return !card || Math.abs(card.offsetWidth - deck.clientWidth) <= 1;
          }),
        ),
      { message: 'every deck has sized its cards to its own width', intervals: [50, 100, 250] },
    )
    .toBe(true);
}

/**
 * Spends a puzzle's shots from the keyboard, Space pressed again until the
 * shots badge counts each one: a press while the launcher reloads is no shot,
 * and on a loaded machine the game's clock falls behind the test's (30/10/2026:
 * three shots out of four, pressed 250 ms apart, under four workers). The badge
 * counts a shot in the same task as the key that fired it, so no press is ever
 * a shot too many.
 */
export async function spendShots(page: Page): Promise<void> {
  const badge = page.getByTestId('shots');
  const left = async (): Promise<number> =>
    Number(/\d+/.exec((await badge.textContent()) ?? '')?.[0]);
  for (let count = await left(); count > 0; count--) {
    await expect(async () => {
      if ((await left()) === count) await page.keyboard.press('Space');
      expect(await left()).toBe(count - 1);
    }).toPass({ intervals: [250] });
  }
}

/**
 * Lets `ms` of the fake clock go by, as `page.clock.runFor` does, but plays
 * frame by frame only while the game lasts: once `end` shows (its result),
 * the rest of the time passes in one jump. Behind a result the board still
 * draws every frame, and Playwright's clock gives each frame a real
 * `setTimeout(0)`, which nested timers hold to 4 ms at least. Measured on
 * 03/11/2026: a second of play costs Chromium 0.3 s, WebKit under Windows
 * 1.4 to 1.8 s (its timers wake on the system's 15.6 ms tick, and it draws a
 * frame in 7 to 12 ms).
 */
export async function playFor(page: Page, ms: number, end: Locator): Promise<void> {
  let played = 0;
  while (played < ms && !(await end.isVisible())) {
    const step = Math.min(1000, ms - played);
    await page.clock.runFor(step);
    played += step;
  }
  if (played < ms) await page.clock.fastForward(ms - played);
}

/** Why a game played frame by frame gets three times its time on WebKit (see `playFor`). */
export const WEBKIT_FRAMES =
  'a simulated frame costs WebKit four to six times what it costs Chromium';

export { expect, type Page };
