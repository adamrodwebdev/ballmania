import { createApp } from 'vue';
import App from './App.vue';
import { APP_SERVICES, createBrowserServices } from './app/AppServices';
import { createAppI18n } from './i18n';
import './styles/tokens.css';
import './styles/base.css';

const services = createBrowserServices();

createApp(App)
  .provide(APP_SERVICES, services)
  .use(createAppI18n(services.settings.current.locale))
  .mount('#app');
