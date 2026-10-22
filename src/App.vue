<script setup lang="ts">
import { defineAsyncComponent, ref, shallowRef, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { SoundEngine } from '@/audio/SoundEngine';
import { loadMessages } from '@/i18n';
import type { PlayRequest } from '@/app/PlayRequest';
import type { CampaignLevel } from '@/levels/campaign';
import HomeScreen from '@/ui/screens/HomeScreen.vue';
import StudioIntro from '@/ui/components/StudioIntro.vue';
import { ScrollKeyGuard } from '@/ui/ScrollKeys';

/** The campaign map, the game screen and the engine are downloaded only when needed. */
const CampaignScreen = defineAsyncComponent(() => import('@/ui/screens/CampaignScreen.vue'));
const GameScreen = defineAsyncComponent(() => import('@/ui/screens/GameScreen.vue'));
const ShopScreen = defineAsyncComponent(() => import('@/ui/screens/ShopScreen.vue'));
const ArcadeScreen = defineAsyncComponent(() => import('@/ui/screens/ArcadeScreen.vue'));
const ObservatoryScreen = defineAsyncComponent(() => import('@/ui/screens/ObservatoryScreen.vue'));
const AchievementsScreen = defineAsyncComponent(
  () => import('@/ui/screens/AchievementsScreen.vue'),
);

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'campaign' }
  | { readonly kind: 'arcade' }
  | { readonly kind: 'observatory'; readonly from: 'home' | 'campaign' }
  | { readonly kind: 'shop' }
  | { readonly kind: 'achievements' }
  | { readonly kind: 'game'; readonly request: PlayRequest; readonly id: number };

/** `opening`: the game to start in at once (a new player on a portal), instead of the title. */
const props = defineProps<{ opening?: PlayRequest | null }>();

const i18n = useI18n();
const { t, locale } = i18n;
const { settings, theme, platform, progress } = useServices();

let games = 0;
const screen = shallowRef<Screen>(
  props.opening ? { kind: 'game', request: props.opening, id: ++games } : { kind: 'home' },
);

/** Session key of the studio intro: it plays once per visit. */
const INTRO_KEY = 'ballmania:intro';
const introSeen = () => {
  try {
    if (new URLSearchParams(window.location.search).has('nointro')) return true;
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
};
// Portals want players in the game at once: the studio intro plays on our site only.
const showIntro = ref(platform.id === 'standalone' && !introSeen());
const introDone = () => {
  showIntro.value = false;
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Without storage, the intro plays again on the next visit.
  }
};

/**
 * The conductor (§ 3.5): sound and music wake at the player's first gesture
 * (browsers require it) and the engine is downloaded only then. Menus play
 * the title theme; the game screen chooses its world's.
 */
const engine = shallowRef<SoundEngine | null>(null);
const portalMuted = ref(platform.muted());
platform.onMutedChange((muted) => (portalMuted.value = muted));
const silent = () => portalMuted.value || settings.current.muted;
const musicVolume = () => (silent() ? 0 : settings.current.music);
const start = async () => {
  const { sharedFeedback } = await import('@/play/feedback');
  const feedback = sharedFeedback(
    silent() ? 0 : settings.current.volume,
    settings.current.vibration,
    musicVolume(),
  );
  feedback.sound.unlock();
  engine.value = feedback.sound;
};
let started = false;
const wake = () => {
  // iOS interrupts the audio when the app goes to the background or a call
  // comes in; only a gesture may resume it, so every gesture tries.
  if (started) {
    engine.value?.unlock();
    return;
  }
  started = true;
  void start();
};
window.addEventListener('pointerdown', wake);
window.addEventListener('keydown', wake);
/*
 * Escape is the browser's: it leaves fullscreen on CrazyGames, so the game
 * never answers it. Cancelling it also keeps the dialogs open (a browser
 * closes a dialog on Escape, and lets the page veto that only once).
 */
window.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Escape') event.preventDefault();
  },
  true,
);
// The arrows, Page Up and Down, Home, End and Space never scroll a portal's page.
new ScrollKeyGuard(window);
watch([() => settings.current.music, () => settings.current.muted, portalMuted], () =>
  engine.value?.setMusicVolume(musicVolume()),
);
watch([() => settings.current.volume, () => settings.current.muted, portalMuted], () =>
  engine.value?.setVolume(silent() ? 0 : settings.current.volume),
);
// The portal pauses the game (its own ads, a hidden tab): silence until it resumes.
platform.onPausedChange((paused) => {
  if (paused) engine.value?.suspend();
  else engine.value?.resume();
});

/** True after the first change of screen: from then on, screens slide in. */
const navigated = ref(false);
// Each screen scrolls in its own <main>, which starts at the top.
const show = (next: Screen) => {
  navigated.value = true;
  screen.value = next;
};
const home = () => show({ kind: 'home' });
const campaign = () => show({ kind: 'campaign' });
const arcade = () => show({ kind: 'arcade' });
const play = (request: PlayRequest) => show({ kind: 'game', request, id: ++games });
const playLevel = (level: CampaignLevel) => play({ kind: 'campaign', level });
/**
 * "Play": the campaign map, except for a new player on a portal, who lands
 * straight in the first level (portals ask for one click to play).
 */
const startCampaign = async () => {
  if (platform.id === 'standalone') {
    campaign();
    return;
  }
  const { CAMPAIGN } = await import('@/levels/campaign');
  const first = CAMPAIGN[0];
  if (first && !progress.get(first.id)) playLevel(first);
  else campaign();
};
/** After a game: the map for the campaign, home for the daily challenge, else the Arcade. */
const leave = (request: PlayRequest) => {
  if (request.kind === 'campaign') campaign();
  else if (request.kind === 'daily') home();
  else arcade();
};

// Every screen but the game plays the title theme (the game sets its own).
watchEffect(() => {
  if (screen.value.kind !== 'game') engine.value?.playMusic('title');
});

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
// The browser's bar takes the colour of the theme shown, not the system's (v1.7.6).
watch(
  () => theme.resolved.value,
  () => {
    const colour = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (colour) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
  },
  { immediate: true },
);
watchEffect(() => {
  document.documentElement.lang = locale.value;
  // Playgama: the two-word title, the same in the game and on the portal's page.
  const title = t('meta.title');
  document.title = __PLATFORM__ === 'playgama' ? title.replace('Ballmania', 'Ball Mania') : title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('meta.description'));
});
</script>

<template>
  <StudioIntro v-if="showIntro" @done="introDone" />
  <template v-if="screen.kind === 'home'">
    <a class="skip" href="#main">{{ t('nav.skip') }}</a>
    <main id="main" class="home" tabindex="-1" :class="{ enter: navigated }">
      <HomeScreen
        @play="startCampaign"
        @arcade="arcade"
        @observatory="show({ kind: 'observatory', from: 'home' })"
        @daily="(challenge) => play({ kind: 'daily', challenge })"
        @shop="show({ kind: 'shop' })"
        @achievements="show({ kind: 'achievements' })"
      />
    </main>
  </template>
  <main
    v-else-if="screen.kind === 'campaign'"
    id="main"
    tabindex="-1"
    :class="{ enter: navigated }"
  >
    <CampaignScreen
      @play="playLevel"
      @home="home"
      @observatory="show({ kind: 'observatory', from: 'campaign' })"
    />
  </main>
  <main
    v-else-if="screen.kind === 'observatory'"
    id="main"
    tabindex="-1"
    :class="{ enter: navigated }"
  >
    <ObservatoryScreen @back="screen.from === 'campaign' ? campaign() : home()" />
  </main>
  <main v-else-if="screen.kind === 'arcade'" id="main" tabindex="-1" :class="{ enter: navigated }">
    <ArcadeScreen @play="play" @home="home" />
  </main>
  <main v-else-if="screen.kind === 'shop'" id="main" tabindex="-1" :class="{ enter: navigated }">
    <ShopScreen @home="home" />
  </main>
  <main
    v-else-if="screen.kind === 'achievements'"
    id="main"
    tabindex="-1"
    :class="{ enter: navigated }"
  >
    <AchievementsScreen @home="home" />
  </main>
  <main v-else id="main" class="game" tabindex="-1" :class="{ enter: navigated }">
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

/*
 * A screen fills the window and scrolls inside it when its content is taller
 * (v1.7.6): the page never does, nor the portal's page around the game.
 */
main {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
}

/* The game screen is held still (GameScreen). */
main.game {
  overflow: hidden;
}

/*
 * The menus keep clear of a notch and of the home bar (v1.7.6). The title
 * screen and the game paint to the edges and place their own content.
 */
main:not(.game, .home) {
  box-sizing: border-box;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}
</style>
