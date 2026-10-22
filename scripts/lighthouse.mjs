// Lighthouse audit of the production build, mobile profile (the default).
// Usage: npm run build && npm run lighthouse  [-- --desktop] [-- --lang=ru]
// `--lang` sets the browser's language, so the game opens in it (Russian loads its own font).
// Fails when a category scores below the specification's threshold: 100 in all four
// (since 2026-10-22), on mobile and on desktop; judge the worst of three mobile runs.
import { mkdirSync, writeFileSync } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { preview } from 'vite';

const THRESHOLDS = { performance: 100, accessibility: 100, 'best-practices': 100, seo: 100 };
const PORT = 4176;
const desktop = process.argv.includes('--desktop');
const lang = process.argv.find((arg) => arg.startsWith('--lang='))?.slice('--lang='.length);

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'error' });
const chrome = await chromeLauncher.launch({
  // Installed Chrome, found by chrome-launcher; CHROME_PATH overrides it.
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
  chromeFlags: [
    '--headless=new',
    '--no-sandbox',
    ...(lang ? [`--lang=${lang}`, `--accept-lang=${lang}`] : []),
  ],
});

let failed = false;
try {
  const result = await lighthouse(
    `http://localhost:${PORT}/`,
    { port: chrome.port, output: 'html', logLevel: 'error' },
    desktop ? desktopConfig : undefined,
  );
  if (!result) throw new Error('Lighthouse returned no result');

  mkdirSync('reports', { recursive: true });
  const name = `reports/lighthouse-${desktop ? 'desktop' : 'mobile'}${lang ? `-${lang}` : ''}.html`;
  writeFileSync(name, result.report);

  for (const category of Object.values(result.lhr.categories)) {
    const score = Math.round((category.score ?? 0) * 100);
    const threshold = THRESHOLDS[category.id];
    const required = threshold !== undefined;
    const ok = required && score >= threshold;
    if (required) failed ||= !ok;
    const mark = required ? (ok ? '✓' : '✗') : '·';
    console.log(`${mark} ${category.title.padEnd(16)} ${score}`);
  }
  console.log(`Report: ${name}`);
} finally {
  await chrome.kill();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (failed) {
  console.error('At least one category is below 100.');
  process.exit(1);
}
