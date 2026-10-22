import { defineConfig, devices } from '@playwright/test';

/**
 * Ports of the two builds. Another project may already serve on them, and a
 * server found there is reused: `E2E_PORT` and `E2E_PORTAL_PORT` move them.
 */
const PORT = Number(process.env.E2E_PORT ?? 4174);
/** The portal build, against the simulated portal (e2e/portal.spec.ts). */
const PORTAL_PORT = Number(process.env.E2E_PORTAL_PORT ?? 4175);

/** Journeys run on the production build, in the two viewports of the specification. */
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
  ],
});
