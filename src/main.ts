import { createApp } from 'vue';
import App from './App.vue';
import { APP_SERVICES, createBrowserServices } from './app/AppServices';
import { landing } from './app/landing';
import type { PlayRequest } from './app/PlayRequest';
import { createAppI18n } from './i18n';
import { createPlatform } from './platform';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';

const platform = await createPlatform();
const services = createBrowserServices(platform);
const i18n = await createAppI18n(services.settings.current.locale);

/**
 * A new player on a portal starts in the first level. Its code is fetched
 * before the first paint, so the first frame they see is the game itself.
 */
async function opening(): Promise<PlayRequest | null> {
  const where = landing(platform.id, {
    gamesPlayed: services.player.view.stats.gamesPlayed,
    levelsFinished: Object.keys(services.progress.levels).length,
    worldsFinished: services.player.view.worlds.length,
  });
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
platform.loaded();
