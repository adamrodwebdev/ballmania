<script setup lang="ts">
import { watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import AppHeader from '@/ui/components/AppHeader.vue';
import HomeScreen from '@/ui/screens/HomeScreen.vue';

const { t, locale } = useI18n();
const { settings } = useServices();
const version = __APP_VERSION__;

// Language: interface, <html lang>, title and description follow the setting.
watchEffect(() => {
  locale.value = settings.current.locale;
  document.documentElement.lang = settings.current.locale;
  document.title = t('meta.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('meta.description'));
});
</script>

<template>
  <a class="skip" href="#main">{{ t('nav.skip') }}</a>
  <AppHeader />
  <main id="main" tabindex="-1">
    <HomeScreen />
  </main>
  <footer class="footer">
    <p>{{ t('app.version', { version }) }}</p>
  </footer>
</template>

<style scoped>
.skip {
  position: absolute;
  left: var(--space-2);
  top: -3rem;
  z-index: 10;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--on-accent);
}

.skip:focus {
  top: var(--space-2);
}

main {
  outline: none;
}

.footer {
  padding: var(--space-6) var(--space-4);
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
}
</style>
