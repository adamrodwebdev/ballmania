import { createApp } from 'vue';
import App from './App.vue';
import { APP_SERVICES, createBrowserServices, playerTrace } from './app/AppServices';
import { landing } from './app/landing';
import type { PlayRequest } from './app/PlayRequest';
import { fontsFor } from './app/fonts';
import { createAppI18n } from './i18n';
import { createPlatform } from './platform';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-700.css';
import './styles/russian.css';
import './styles/tokens.css';
import './styles/base.css';

const platform = await createPlatform();
const services = createBrowserServices(platform);
// The language's own letters arrive with its messages: no text jumps at the first paint.
const [i18n] = await Promise.all([
  createAppI18n(services.settings.current.locale),
  fontsFor(services.settings.current.locale),
]);

/**
 * A new player on a portal starts in the first level. Its code is fetched
 * before the first paint, so the first frame they see is the game itself.
 */
async function opening(): Promise<PlayRequest | null> {
  const where = landing(platform.id, playerTrace(services.player, services.progress));
  if (where === 'title') return null;
  const [{ CAMPAIGN }] = await Promise.all([
    import('./levels/campaign'),
    import('./ui/screens/GameScreen.vue'),
  ]);
  const level = CAMPAIGN[0];
  return level ? { kind: 'campaign', level } : null;
}

// Portal builds: no text selection or magnifier on long presses (CrazyGames asks for it).
document.documentElement.dataset.platform = platform.id;
createApp(App, { opening: await opening() })
  .provide(APP_SERVICES, services)
  .use(i18n)
  .mount('#app');
// Our site painted its static title first (v1.7.6): it gives way to the game's own.
const card = document.getElementById('first-paint');
if (card) {
  card.classList.add('gone');
  window.setTimeout(() => card.remove(), 600);
}
platform.loaded();
