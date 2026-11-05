// Renders the CrazyGames kit (covers and trailers) into marketing/crazygames/out/.
// Usage: npm run kit:crazygames [-- covers|videos [landscape|portrait]|playgama|yandex|og]
// Needs Google Chrome (H.264 encoding) and the network (the title's typeface).
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [only, which] = process.argv.slice(2);
// `playgama` and `yandex`: that portal's sizes and its two-word title, in marketing/<portal>/out/.
const portal = only === 'playgama' || only === 'yandex' ? only : null;
const out = fileURLToPath(new URL(portal ? `../${portal}/out/` : './out/', import.meta.url));
const TITLE = portal ? 'Ball Mania' : 'Ballmania';
// `og`: our site's share image (and the README's), the landscape cover at 1200×630.
const og = only === 'og';

const COVERS = {
  playgama: [
    ['cover-landscape-1920x1080', 1920, 1080],
    ['cover-portrait-1080x1920', 1080, 1920],
    ['cover-square-800x800', 800, 800],
  ],
  // Yandex: the icon and the cover of its draft, in PNG only.
  yandex: [
    ['icon-512x512', 512, 512],
    ['cover-800x470', 800, 470],
  ],
  crazygames: [
    ['cover-landscape-1920x1080', 1920, 1080],
    ['cover-portrait-800x1200', 800, 1200],
    ['cover-square-800x800', 800, 800],
  ],
}[portal ?? 'crazygames'];
const FORMATS = portal === 'yandex' ? ['png'] : ['png', 'jpg'];
// Yandex: a horizontal video is mandatory, a vertical one in 9:16 optional (28 s at most).
const VIDEOS =
  portal === 'yandex'
    ? [
        ['trailer-landscape-1920x1080', 1920, 1080],
        ['trailer-vertical-1080x1920', 1080, 1920],
      ]
    : [
        ['trailer-landscape-1920x1080', 1920, 1080],
        ['trailer-portrait-1080x1620', 1080, 1620],
      ];

const save = async (name, dataUrl, dir = out) => {
  const file = `${dir}${name}`;
  await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  console.log(`✓ ${file}`);
};

await mkdir(out, { recursive: true });
const server = await createServer({
  root,
  server: { port: 5299, strictPort: true },
  logLevel: 'warn',
});
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('console', (message) => console.log(`  ${message.text()}`));
  page.on('pageerror', (error) => console.error(error));
  await page.goto('http://localhost:5299/marketing/crazygames/kit.html');
  await page.waitForSelector('body[data-ready="true"]', { state: 'attached', timeout: 60_000 });
  if (og) {
    await save(
      'og.jpg',
      await page.evaluate(() => window.kit.cover(1200, 630, 'image/jpeg', 'Ballmania')),
      fileURLToPath(new URL('../../public/', import.meta.url)),
    );
  } else if (only !== 'videos') {
    for (const [name, width, height] of COVERS) {
      for (const format of FORMATS) {
        await save(
          `${name}.${format}`,
          await page.evaluate(
            ([w, h, type, t]) => window.kit.cover(w, h, type, t),
            [width, height, format === 'png' ? 'image/png' : 'image/jpeg', TITLE],
          ),
        );
      }
    }
  }
  if (only !== 'covers' && portal !== 'playgama' && !og) {
    for (const [name, width, height] of VIDEOS.filter(([file]) => !which || file.includes(which))) {
      const video = await page.evaluate(
        ([w, h, t]) => window.kit.trailer(w, h, t),
        [width, height, TITLE],
      );
      await save(`${name}.mp4`, video);
    }
  }
} finally {
  await browser.close();
  await server.close();
}
