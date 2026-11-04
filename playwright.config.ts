import { defineConfig, devices } from '@playwright/test';
import type { TestOptions } from './e2e/fixtures';

/**
 * Ports of the three builds. Another project may already serve on them, and a
 * server found there is reused: `E2E_PORT`, `E2E_PORTAL_PORT` and
 * `E2E_YANDEX_PORT` move them.
 */
const PORT = Number(process.env.E2E_PORT ?? 4174);
/** The portal build, against the simulated portal (e2e/portal.spec.ts). */
const PORTAL_PORT = Number(process.env.E2E_PORTAL_PORT ?? 4175);
/** The Yandex Games build, against a stand-in for its SDK (e2e/yandex.spec.ts). */
const YANDEX_PORT = Number(process.env.E2E_YANDEX_PORT ?? 4176);

/** A phone or a tablet: touch, a coarse pointer, its own viewport. */
const handheld = (width: number, height: number) => ({
  ...devices['Desktop Chrome'],
  viewport: { width, height },
  isMobile: true,
  hasTouch: true,
  formFactor: 'mobile' as const,
});

/**
 * The two form factors of the journeys, the same on every engine: a phone,
 * 390 × 844 under a finger, and a computer, 1280 × 800 with a mouse, both at
 * one pixel per CSS pixel, as Chromium's (the descriptors of Desktop Safari
 * and the iPhone say 2 and 3). The CI draws WebKit in software: at 3, the
 * iPhone drew nine times the pixels of Chromium's phone, and its long
 * journeys ran out of time (03/11/2026). Higher pixel ratios are the zoom
 * projects' part.
 */
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  formFactor: 'mobile',
} as const;
const COMPUTER = {
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  formFactor: 'desktop',
} as const;

/**
 * Twice the time for a test and for an assertion on WebKit: Playwright's
 * build has no OffscreenCanvas under Windows, so the title reel draws in the
 * page, in software (14 frames a second where Chromium draws 30), and its
 * timers wake on the system's 15.6 ms tick (03/11/2026).
 */
const WEBKIT_PACE = { timeout: 60_000, expect: { timeout: 10_000 } };

/**
 * Firefox and WebKit play the journeys too (v1.9.0, the cross-browser rule),
 * only when asked for (`--project="firefox-*"`, `--project="webkit-*"`): every
 * week on `dev` in CI, and before every release (.github/workflows/engines.yml).
 * Firefox plays the computer only, as the rule asks (Firefox for Android is
 * rare, and Playwright has no Firefox phone); WebKit plays both form factors,
 * the phone as an iPhone. Checks that need CDP, Chromium's own protocol (a
 * held finger, a notch's insets), are tagged `@cdp`.
 */
const ENGINES = [
  { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'], ...COMPUTER } },
  { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], ...COMPUTER }, ...WEBKIT_PACE },
  { name: 'webkit-mobile', use: { ...devices['iPhone 13'], ...PHONE }, ...WEBKIT_PACE },
].map((project) => ({ ...project, default: false, grepInvert: /@cdp/ }));

/**
 * The test matrix (v1.7.6, the responsive directive): each size runs the
 * matrix spec only (every screen still, nothing sideways, the WCAG 2.2 audit).
 * Browser zoom is its CSS size at a higher pixel ratio: 1280 × 800 at 200 %
 * is 640 × 400 CSS pixels, at 400 % 320 × 200.
 */
const MATRIX = [
  { name: 'phone-320', use: handheld(320, 568) },
  { name: 'phone-360', use: handheld(360, 800) },
  { name: 'phone-393', use: handheld(393, 659) },
  { name: 'phone-side', use: handheld(844, 390) },
  { name: 'tablet', use: handheld(768, 1024) },
  {
    name: 'desktop-1080',
    use: { ...devices['Desktop Chrome'], ...COMPUTER, viewport: { width: 1920, height: 1080 } },
  },
  {
    name: 'desktop-1440',
    use: { ...devices['Desktop Chrome'], ...COMPUTER, viewport: { width: 2560, height: 1440 } },
  },
  {
    name: 'zoom-200',
    use: {
      ...devices['Desktop Chrome'],
      ...COMPUTER,
      viewport: { width: 640, height: 400 },
      deviceScaleFactor: 2,
    },
  },
  {
    name: 'zoom-400',
    use: {
      ...devices['Desktop Chrome'],
      ...COMPUTER,
      viewport: { width: 320, height: 200 },
      deviceScaleFactor: 4,
    },
  },
].map((project) => ({ ...project, testMatch: 'matrix.spec.ts' }));

/**
 * Journeys run on the production build, in the two form factors of the
 * specification, on Chromium by default; the test matrix adds its sizes.
 */
export default defineConfig<TestOptions>({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build --mode simulated && npx vite preview --mode simulated --port ${PORTAL_PORT} --strictPort`,
      port: PORTAL_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build --mode yandex && npx vite preview --mode yandex --port ${YANDEX_PORT} --strictPort`,
      port: YANDEX_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'mobile', use: { ...devices['Desktop Chrome'], ...PHONE } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...COMPUTER } },
    ...MATRIX,
    ...ENGINES,
  ],
});
