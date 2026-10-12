import { createApp } from 'vue';
import App from './App.vue';
import { APP_SERVICES, createBrowserServices } from './app/AppServices';
import { createAppI18n } from './i18n';
import './styles/tokens.css';
import './styles/base.css';

const services = createBrowserServices();
const i18n = await createAppI18n(services.settings.current.locale);

createApp(App).provide(APP_SERVICES, services).use(i18n).mount('#app');
