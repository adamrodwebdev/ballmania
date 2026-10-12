<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { CampaignLevel } from '@/levels/campaign';
import AppHeader from '@/ui/components/AppHeader.vue';
import HomeScreen from '@/ui/screens/HomeScreen.vue';

/** The campaign map, the game screen and the engine are downloaded only when needed. */
const CampaignScreen = defineAsyncComponent(() => import('@/ui/screens/CampaignScreen.vue'));
const GameScreen = defineAsyncComponent(() => import('@/ui/screens/GameScreen.vue'));

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'campaign' }
  | { readonly kind: 'game'; readonly level: CampaignLevel; readonly id: number };

const { t, locale } = useI18n();
const { settings } = useServices();
const version = __APP_VERSION__;

const screen = shallowRef<Screen>({ kind: 'home' });
let games = 0;

const show = (next: Screen) => {
  screen.value = next;
  window.scrollTo(0, 0);
};
const home = () => show({ kind: 'home' });
const campaign = () => show({ kind: 'campaign' });
const play = (level: CampaignLevel) => show({ kind: 'game', level, id: ++games });

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
      <HomeScreen @play="campaign" />
    </main>
    <footer class="footer">
      <p>{{ t('app.version', { version }) }}</p>
    </footer>
  </template>
  <main v-else-if="screen.kind === 'campaign'" id="main" tabindex="-1">
    <CampaignScreen @play="play" @home="home" />
  </main>
  <main v-else id="main" tabindex="-1">
    <GameScreen :key="screen.id" :level="screen.level" @quit="campaign" @next="play" />
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
