import { defineConfig, devices } from '@playwright/test';

/**
 * Ports of the two builds. Another project may already serve on them, and a
 * server found there is reused: `E2E_PORT` and `E2E_PORTAL_PORT` move them.
 */
const PORT = Number(process.env.E2E_PORT ?? 4174);
/** The portal build, against the simulated portal (e2e/portal.spec.ts). */
const PORTAL_PORT = Number(process.env.E2E_PORTAL_PORT ?? 4175);

/** A phone or a tablet: touch, a coarse pointer, its own viewport. */
const handheld = (width: number, height: number) => ({
  ...devices['Desktop Chrome'],
  viewport: { width, height },
  isMobile: true,
  hasTouch: true,
});

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
    use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
  },
  {
    name: 'desktop-1440',
    use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } },
  },
  {
    name: 'zoom-200',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 640, height: 400 },
      deviceScaleFactor: 2,
    },
  },
  {
    name: 'zoom-400',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 320, height: 200 },
      deviceScaleFactor: 4,
    },
  },
].map((project) => ({ ...project, testMatch: 'matrix.spec.ts' }));

/**
 * Journeys run on the production build, in the two viewports of the
 * specification; the test matrix adds its sizes.
 */
export default defineConfig({
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
  ],
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    ...MATRIX,
  ],
});
