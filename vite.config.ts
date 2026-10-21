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

const TITLE = 'Ballmania — le tir de billes réinventé';
const DESCRIPTION =
  'Tir de billes en chaîne réinventé : campagne de six mondes, modes Arcade, explosions spectaculaires. Gratuit, sans inscription, sur mobile et ordinateur.';

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
      inLanguage: ['fr', 'en', 'id'],
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
 * A portal's page speaks English first, the language of the portals'
 * moderators and of most of their players: its language, title and
 * description. The game then follows each player's language (§ 3.7).
 */
const PORTAL_TITLE = 'Ballmania — marble shooting reinvented';
const PORTAL_DESCRIPTION =
  'Chain marble shooting reinvented: a six-world campaign, Arcade modes, spectacular explosions. Free, no sign-up, on mobile and desktop.';

const portalPage = (platform: PlatformId): Plugin => ({
  name: 'ballmania:portal-page',
  apply: 'build',
  transformIndexHtml: (html) =>
    html
      .replace('<html lang="fr">', '<html lang="en">')
      .replace(
        /<title>[^<]*<\/title>/,
        // Playgama: the two-word title, as on its page.
        `<title>${platform === 'playgama' ? PORTAL_TITLE.replace('Ballmania', 'Ball Mania') : PORTAL_TITLE}</title>`,
      )
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${PORTAL_DESCRIPTION}$2`),
});

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
      ...(platform === 'standalone' ? [] : [portalPage(platform)]),
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
