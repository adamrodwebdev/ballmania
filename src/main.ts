import { createApp } from 'vue';
import App from './App.vue';
import { APP_SERVICES, createBrowserServices } from './app/AppServices';
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

// Portal builds: no text selection or magnifier on long presses (CrazyGames asks for it).
document.documentElement.dataset.platform = platform.id;
createApp(App).provide(APP_SERVICES, services).use(i18n).mount('#app');
platform.loaded();
