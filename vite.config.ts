import { createHash } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { CRAZYGAMES_SDK, PLATFORM_IDS, type PlatformId } from './src/platform/platforms.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/**
 * Content Security Policy of the standalone site, added to the built page only:
 * the dev server needs inline scripts for hot reload. Portal builds have none:
 * their ad networks load scripts and frames from origins nobody can list, and
 * the portal's own frame already isolates the game.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const contentSecurityPolicy = (): Plugin => ({
  name: 'ballmania:csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
      injectTo: 'head-prepend',
    },
  ],
});

/** Public address of the site, for absolute links (canonical, social cards, sitemap). */
const SITE_URL = process.env.SITE_URL?.replace(/\/?$/, '/') ?? null;

/** A page's title and description are the game's own messages: one text per language. */
const metaOf = (locale: 'fr' | 'en') =>
  (
    JSON.parse(
      readFileSync(new URL(`./src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'),
    ) as { meta: { title: string; description: string } }
  ).meta;

const { title: TITLE, description: DESCRIPTION } = metaOf('fr');

/**
 * Search engines and social networks (specification § 4): Open Graph and
 * Twitter cards, structured data for a video game, and, when the site's
 * address is known (`SITE_URL`), a canonical link and a sitemap.
 */
const seo = (): Plugin => ({
  name: 'ballmania:seo',
  apply: 'build',
  transformIndexHtml: () => {
    const image = `${SITE_URL ?? './'}og.jpg`;
    const meta = (property: string, content: string) => ({
      tag: 'meta',
      attrs: property.startsWith('og:') ? { property, content } : { name: property, content },
      injectTo: 'head' as const,
    });
    const structured = {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Ballmania',
      description: DESCRIPTION,
      genre: ['Puzzle', 'Arcade'],
      gamePlatform: ['Web browser'],
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      inLanguage: ['fr', 'en', 'id', 'ru'],
      playMode: 'SinglePlayer',
      isAccessibleForFree: true,
      version: pkg.version,
      ...(SITE_URL ? { url: SITE_URL, image } : {}),
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
    };
    return [
      meta('og:type', 'website'),
      meta('og:site_name', 'Ballmania'),
      meta('og:title', TITLE),
      meta('og:description', DESCRIPTION),
      meta('og:locale', 'fr_FR'),
      meta('og:locale:alternate', 'en_GB'),
      meta('og:locale:alternate', 'id_ID'),
      meta('og:locale:alternate', 'ru_RU'),
      meta('og:image', image),
      meta('og:image:width', '1200'),
      meta('og:image:height', '630'),
      meta('og:image:alt', 'Une chaîne de billes de verre colorées et le titre Ballmania'),
      meta('twitter:card', 'summary_large_image'),
      meta('twitter:title', TITLE),
      meta('twitter:description', DESCRIPTION),
      meta('twitter:image', image),
      ...(SITE_URL
        ? [
            meta('og:url', SITE_URL),
            { tag: 'link', attrs: { rel: 'canonical', href: SITE_URL }, injectTo: 'head' as const },
          ]
        : []),
      // Data for search engines, never run: the CSP's script rules do not apply to it.
      {
        tag: 'script',
        attrs: { type: 'application/ld+json' },
        children: JSON.stringify(structured),
        injectTo: 'head' as const,
      },
    ];
  },
  generateBundle() {
    if (!SITE_URL) return;
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc></url>
</urlset>
`,
    });
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: `User-agent: *
Allow: /

Sitemap: ${SITE_URL}sitemap.xml
`,
    });
  },
});

/** A CSP source matching one inline script or style exactly. */
const cspHash = (content: string) =>
  `'sha256-${createHash('sha256').update(content).digest('base64')}'`;

/**
 * The inline script that fetches our site's styles and code once the first
 * screen is painted: the stylesheets first (the title card hides the page
 * until the app mounts, so nothing shows unstyled), the modules in parallel.
 * It waits for the browser to report that paint (the frame is on screen),
 * not just for the frame to be drawn: nothing it fetches can then count as
 * needed for the first paint. A page opened in the background has no paint
 * to wait for; a browser that does not report it waits one frame.
 */
const firstPaintLoader = (entry: string, modules: readonly string[], sheets: readonly string[]) =>
  `(function () {
  var started = false;
  var load = function () {
    if (started) return;
    started = true;
    var styles = ${JSON.stringify(sheets)}.map(function (href) {
      return new Promise(function (done) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = link.onerror = done;
        document.head.appendChild(link);
      });
    });
    ${JSON.stringify(modules)}.forEach(function (href) {
      var link = document.createElement('link');
      link.rel = 'modulepreload';
      link.crossOrigin = '';
      link.href = href;
      document.head.appendChild(link);
    });
    Promise.all(styles).then(function () {
      import(${JSON.stringify(entry)});
    });
  };
  var types = window.PerformanceObserver && PerformanceObserver.supportedEntryTypes;
  if (document.visibilityState !== 'visible') {
    load();
  } else if (types && types.indexOf('paint') >= 0) {
    new PerformanceObserver(function (list, observer) {
      if (!list.getEntriesByName('first-contentful-paint').length) return;
      observer.disconnect();
      load();
    }).observe({ type: 'paint', buffered: true });
    // Should that report never come (the page sent to the background meanwhile).
    setTimeout(load, 1000);
  } else {
    // requestAnimationFrame runs before the next paint, the timeout after it.
    requestAnimationFrame(function () {
      setTimeout(load, 0);
    });
  }
})();
`;

/**
 * First paint of our site (v1.7.6, Lighthouse 100): the page paints the
 * game's title from its own HTML before any other request.
 * - Inline: the colour tokens and the title card's styles
 *   (src/styles/first-paint.css), the theme script, and a loader that
 *   fetches the app's stylesheets and code after that paint. Each block is
 *   allowed by its hash in the CSP, which stays free of 'unsafe-inline'.
 * - Gone from the page: Vite's entry script, module preloads and stylesheets
 *   (the loader adds them back). No web font is asked for before the paint,
 *   and the body holds no stray text.
 * - The app dissolves the card once mounted (src/main.ts).
 * Portal builds keep their usual start: a new player lands straight in play.
 */
const firstPaint = (): Plugin => ({
  name: 'ballmania:first-paint',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => {
      const entry = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/.exec(html);
      if (!entry) throw new Error('first-paint: no entry script in index.html');
      const preloads = [
        ...html.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)">\s*/g),
      ];
      const sheets = [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">\s*/g)];
      const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
      const style = read('./src/styles/tokens.css') + read('./src/styles/first-paint.css');
      const theme = read('./public/theme-boot.js');
      const loader = firstPaintLoader(
        entry[1],
        preloads.map((link) => link[1]),
        sheets.map((link) => link[1]),
      );
      const card =
        '<div id="first-paint" class="first-paint" aria-hidden="true"><p class="first-paint-title">Ballmania</p></div>';
      const page = [entry[0], ...preloads.map((link) => link[0]), ...sheets.map((link) => link[0])]
        .reduce((text, tag) => text.replace(tag, ''), html)
        .replace(
          '<script src="./theme-boot.js"></script>',
          `<style>${style}</style><script>${theme}</script>`,
        )
        .replace('</head>', `<script>${loader}</script></head>`)
        .replace(/<body>[\s\S]*<\/body>/, (body) =>
          body
            .replace('<div id="app"></div>', `${card}<div id="app"></div>`)
            .replace(/>\s+</g, '><'),
        );
      // The CSP meta (our site's build only) lets exactly these inline blocks run.
      return page.replace(
        /(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/,
        (_, open: string, policy: string, close: string) =>
          open +
          policy
            .replace(/&#39;/g, "'")
            .replace("script-src 'self'", `script-src 'self' ${cspHash(theme)} ${cspHash(loader)}`)
            .replace("style-src 'self'", `style-src 'self' ${cspHash(style)}`) +
          close,
      );
    },
  },
});

/**
 * Playgama: its Bridge SDK loaded in the <head> before the game (the portal's
 * build check looks for it there), and its configuration next to index.html.
 * Interstitials between games, rewarded ads for bonuses, both orientations.
 */
const PLAYGAMA_CONFIG = {
  advertisement: {
    minimumDelayBetweenInterstitial: 60,
    interstitial: {
      placementFallback: 'between_games',
      placements: [{ id: 'between_games' }],
    },
    rewarded: {
      preloadOnStart: 'bonus',
      placementFallback: 'bonus',
      placements: [{ id: 'bonus' }],
    },
  },
  device: {
    useBuiltInOrientationPopup: false,
    supportedOrientations: ['portrait', 'landscape'],
  },
};

const playgama = (): Plugin => ({
  name: 'ballmania:playgama',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'script',
      attrs: { src: 'https://bridge.playgama.com/v2/stable/playgama-bridge.js' },
      injectTo: 'head-prepend',
    },
  ],
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'playgama-bridge-config.json',
      source: `${JSON.stringify(PLAYGAMA_CONFIG, null, 2)}
`,
    });
  },
});

/**
 * The page's language, title and description. Our site speaks French first; a
 * portal's page speaks English, the language of the portals' moderators and of
 * most of their players. The game then follows each player's language (§ 3.7).
 */
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pageText = (platform: PlatformId): Plugin => {
  const locale = platform === 'standalone' ? 'fr' : 'en';
  const { title, description } = metaOf(locale);
  // Playgama: the two-word title, as on its page.
  const shown = platform === 'playgama' ? title.replace('Ballmania', 'Ball Mania') : title;
  return {
    name: 'ballmania:page-text',
    apply: 'build',
    transformIndexHtml: (page) =>
      page
        .replace('<html lang="fr">', `<html lang="${locale}">`)
        .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(shown)}</title>`)
        .replace(
          /(<meta\s+name="description"\s+content=")[^"]*(")/,
          (_, start: string, end: string) => `${start}${escapeHtml(description)}${end}`,
        ),
  };
};

/** CrazyGames: its SDK in the <head>, loaded before the game, as their documentation asks. */
const crazygames = (): Plugin => ({
  name: 'ballmania:crazygames',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'script', attrs: { src: CRAZYGAMES_SDK }, injectTo: 'head' }],
});

/**
 * The platform of a build (specification § 3.7): `vite build --mode poki`
 * builds for Poki into `dist-poki/`; any other mode builds our own site.
 */
const platformOf = (mode: string): PlatformId =>
  (PLATFORM_IDS as readonly string[]).includes(mode) ? (mode as PlatformId) : 'standalone';

// Relative base: the build can be served from any sub-folder or game portal.
export default defineConfig(({ mode }) => {
  const platform = platformOf(mode);
  // The demo of the portfolio (lot 14): our site's build, two worlds, in dist-demo/.
  const demo = mode === 'demo';
  const site = platform === 'standalone' && !demo;
  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __PLATFORM__: JSON.stringify(platform),
      __DEMO__: JSON.stringify(demo),
      // CrazyGames: no ads in the Basic Launch build, which goes out by default.
      __CRAZYGAMES_ADS__: JSON.stringify(process.env.CRAZYGAMES_LAUNCH === 'full'),
    },
    plugins: [
      vue(),
      // Messages are precompiled at build time: no runtime message compiler,
      // no `eval`, a smaller bundle and a strict CSP stays possible.
      VueI18nPlugin({
        include: [fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url))],
        runtimeOnly: true,
        compositionOnly: true,
        fullInstall: false,
        strictMessage: false,
      }),
      // Search engines and the CSP concern our own site: on a portal, the
      // portal's page is the one indexed.
      ...(site ? [contentSecurityPolicy(), seo()] : demo ? [contentSecurityPolicy()] : []),
      pageText(platform),
      ...(platform === 'standalone' ? [firstPaint()] : []),
      ...(platform === 'playgama' ? [playgama()] : []),
      ...(platform === 'crazygames' ? [crazygames()] : []),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      outDir: site ? 'dist' : demo ? 'dist-demo' : `dist-${platform}`,
      target: 'es2022',
      cssCodeSplit: true,
      reportCompressedSize: true,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
