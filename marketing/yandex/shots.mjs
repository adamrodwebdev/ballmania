// Takes the screenshots of the Yandex Games draft from the Yandex build into
// marketing/yandex/out/: real play, two on a computer (landscape, 1920 × 1080) and two on a
// phone (portrait, 1080 × 1920), in the language given (rule 5.1.1.2: real gameplay).
// Usage: npm run build:yandex && node marketing/yandex/shots.mjs [ru|en|fr|id]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = fileURLToPath(new URL('./out/', import.meta.url));
const lang = process.argv[2] ?? 'ru';
const PORT = 4288;

const WORLDS = ['nebula', 'neon', 'abyss', 'jewel', 'volcano', 'singularity'];
/** A player well into the game: every world open, so any level can be shown. */
const levels = Object.fromEntries(
  WORLDS.flatMap((world) =>
    Array.from({ length: 12 }, (_, i) => [
      `${world}-${String(i + 1).padStart(2, '0')}`,
      { stars: 3, best: 9000 },
    ]),
  ),
);
const DATA = {
  'ballmania:player': JSON.stringify({
    version: 2,
    training: { step: 1, done: true },
    worlds: WORLDS,
  }),
  'ballmania:progress': JSON.stringify({ version: 1, levels }),
};

const DESKTOP = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };
const PHONE = {
  viewport: { width: 450, height: 800 },
  deviceScaleFactor: 2.4,
  isMobile: true,
  hasTouch: true,
};
/** Each a world's own twist: neon mirrors, the black hole, the jewels, the magnet. */
const SHOTS = [
  { name: 'desktop-neon', level: 'neon-05', device: DESKTOP },
  { name: 'desktop-singularity', level: 'singularity-02', device: DESKTOP },
  { name: 'phone-jewel', level: 'jewel-02', device: PHONE },
  { name: 'phone-abyss', level: 'abyss-02', device: PHONE },
];

/** Yandex's SDK as the game uses it, with the player's data, in the language given. */
const standIn = ({ lang, data }) => {
  const sdk = {
    features: { LoadingAPI: { ready() {} }, GameplayAPI: { start() {}, stop() {} } },
    environment: { i18n: { lang } },
    adv: {
      showFullscreenAdv: ({ callbacks }) => callbacks.onClose?.(false),
      showRewardedVideo: ({ callbacks }) => callbacks.onError?.('none'),
    },
    getPlayer: () =>
      Promise.resolve({ getData: () => Promise.resolve(data), setData: () => Promise.resolve() }),
    on() {},
  };
  Object.assign(window, { yandexStandIn: { init: () => Promise.resolve(sdk) } });
};

await mkdir(out, { recursive: true });
const server = await preview({
  root,
  mode: 'yandex',
  logLevel: 'warn',
  preview: { port: PORT, strictPort: true },
});
const browser = await chromium.launch();
try {
  for (const { name, level, device } of SHOTS) {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    page.on('pageerror', (error) => console.error(error));
    await page.addInitScript(standIn, { lang, data: DATA });
    await page.route('**/sdk.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'window.YaGames = window.yandexStandIn;',
      }),
    );
    await page.goto(`http://localhost:${PORT}/`);
    await page.getByTestId('play').click();
    // The map opens on the last world: bring the level's world to the front first.
    const world = WORLDS.indexOf(level.split('-')[0]);
    await page.locator('.swiper-pagination-bullet').nth(world).click();
    await page.waitForTimeout(800);
    await page.getByTestId(`level-${level}`).click();
    await page.getByTestId('board').waitFor();
    // The chain rolls in along the track, then shots at it: the board at play.
    await page.waitForTimeout(9000);
    for (let shot = 0; shot < 8; shot++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(450);
    }
    const file = `${out}screenshot-${name}-${lang}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    console.log(`✓ ${file}`);
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
