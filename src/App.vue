<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { loadMessages } from '@/i18n';
import type { PlayRequest } from '@/app/PlayRequest';
import type { CampaignLevel } from '@/levels/campaign';
import AppHeader from '@/ui/components/AppHeader.vue';
import HomeScreen from '@/ui/screens/HomeScreen.vue';

/** The campaign map, the game screen and the engine are downloaded only when needed. */
const CampaignScreen = defineAsyncComponent(() => import('@/ui/screens/CampaignScreen.vue'));
const GameScreen = defineAsyncComponent(() => import('@/ui/screens/GameScreen.vue'));
const ShopScreen = defineAsyncComponent(() => import('@/ui/screens/ShopScreen.vue'));
const ArcadeScreen = defineAsyncComponent(() => import('@/ui/screens/ArcadeScreen.vue'));
const AchievementsScreen = defineAsyncComponent(
  () => import('@/ui/screens/AchievementsScreen.vue'),
);

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'campaign' }
  | { readonly kind: 'arcade' }
  | { readonly kind: 'shop' }
  | { readonly kind: 'achievements' }
  | { readonly kind: 'game'; readonly request: PlayRequest; readonly id: number };

const i18n = useI18n();
const { t, locale } = i18n;
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
const arcade = () => show({ kind: 'arcade' });
const play = (request: PlayRequest) => show({ kind: 'game', request, id: ++games });
const playLevel = (level: CampaignLevel) => play({ kind: 'campaign', level });
/** After a game: the map for the campaign, home for the daily challenge, else the Arcade. */
const leave = (request: PlayRequest) => {
  if (request.kind === 'campaign') campaign();
  else if (request.kind === 'daily') home();
  else arcade();
};

// Language: the messages are downloaded on first use, then the interface,
// <html lang>, title and description follow.
watch(
  () => settings.current.locale,
  async (code) => {
    if (!i18n.availableLocales.includes(code)) {
      i18n.setLocaleMessage(code, await loadMessages(code));
    }
    locale.value = code;
  },
);
watchEffect(() => {
  document.documentElement.lang = locale.value;
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
      <HomeScreen
        @play="campaign"
        @arcade="arcade"
        @daily="(challenge) => play({ kind: 'daily', challenge })"
        @shop="show({ kind: 'shop' })"
        @achievements="show({ kind: 'achievements' })"
      />
    </main>
    <footer class="footer">
      <p>{{ t('app.version', { version }) }}</p>
    </footer>
  </template>
  <main v-else-if="screen.kind === 'campaign'" id="main" tabindex="-1">
    <CampaignScreen @play="playLevel" @home="home" />
  </main>
  <main v-else-if="screen.kind === 'arcade'" id="main" tabindex="-1">
    <ArcadeScreen @play="play" @home="home" />
  </main>
  <main v-else-if="screen.kind === 'shop'" id="main" tabindex="-1">
    <ShopScreen @home="home" />
  </main>
  <main v-else-if="screen.kind === 'achievements'" id="main" tabindex="-1">
    <AchievementsScreen @home="home" />
  </main>
  <main v-else id="main" tabindex="-1">
    <GameScreen
      :key="screen.id"
      :request="screen.request"
      @quit="leave(screen.request)"
      @play="play"
    />
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
