<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import AppHeader from '@/ui/components/AppHeader.vue';
import HomeScreen from '@/ui/screens/HomeScreen.vue';

/** The game screen, the engine and the levels are downloaded only when a game starts. */
const GameScreen = defineAsyncComponent(() => import('@/ui/screens/GameScreen.vue'));
const loadDemo = async () => (await import('@/levels/demo')).DEMO_LEVEL;

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'game'; readonly level: LevelDefinition; readonly id: number };

const { t, locale } = useI18n();
const { settings } = useServices();
const version = __APP_VERSION__;

const screen = shallowRef<Screen>({ kind: 'home' });
let games = 0;

const play = async () => {
  screen.value = { kind: 'game', level: await loadDemo(), id: ++games };
  window.scrollTo(0, 0);
};
const home = () => {
  screen.value = { kind: 'home' };
};

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
  <template v-if="screen.kind === 'home'">
    <a class="skip" href="#main">{{ t('nav.skip') }}</a>
    <AppHeader />
    <main id="main" tabindex="-1">
      <HomeScreen @play="play" />
    </main>
    <footer class="footer">
      <p>{{ t('app.version', { version }) }}</p>
    </footer>
  </template>
  <main v-else id="main" tabindex="-1">
    <GameScreen :key="screen.id" :level="screen.level" @quit="home" />
  </main>
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
