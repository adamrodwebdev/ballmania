import { createApp } from 'vue';
import App from './App.vue';
import { APP_SERVICES, createBrowserServices } from './app/AppServices';
import { createAppI18n } from './i18n';
import { createPlatform } from './platform';
import './styles/tokens.css';
import './styles/base.css';

const platform = await createPlatform();
const services = createBrowserServices(platform);
const i18n = await createAppI18n(services.settings.current.locale);

createApp(App).provide(APP_SERVICES, services).use(i18n).mount('#app');
platform.loaded();
