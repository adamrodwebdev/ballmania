<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { CAMPAIGN } from '@/levels/campaign';
import { DailyChallenge } from '@/player/DailyChallenge';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';

const { t, locale } = useI18n();
const { player, progress, today } = useServices();
const emit = defineEmits<{
  play: [];
  daily: [challenge: DailyChallenge];
  arcade: [];
  observatory: [];
  shop: [];
  achievements: [];
}>();

const challenge = DailyChallenge.of(today());
const record = computed(() => player.daily(challenge.day));
const number = computed(() => new Intl.NumberFormat(locale.value));
const ORDER = CAMPAIGN.map((level) => level.id);
/** Stars won in the campaign, out of three per level. */
const stars = computed(() => progress.totalStars(ORDER));
/** A returning player sees their stars and shards; a newcomer sees only the game. */
const returning = computed(() => stars.value > 0 || player.view.shards > 0);
/** The level "Play" leads to: the first open one not won yet, else the last open one. */
const nextLevel = computed(() => {
  const open = CAMPAIGN.filter((level) => progress.isUnlocked(ORDER, level.id));
  return open.find((level) => !progress.levels[level.id]?.stars) ?? open[open.length - 1];
});
const nextLabel = computed(() => {
  const level = nextLevel.value;
  if (!level) return '';
  return t('home.next', { world: t(`worlds.${level.world}.name`), number: level.number });
});
const version = __APP_VERSION__;
const settingsDialog = ref<{ open: () => void } | null>(null);

/** The living backdrop is drawn after the first paint, from its own small module. */
const sceneCanvas = ref<HTMLCanvasElement | null>(null);
let stopScene = () => {};
onMounted(async () => {
  const canvas = sceneCanvas.value;
  if (!canvas) return;
  const [{ TitleScene }, { Palette }] = await Promise.all([
    import('@/ui/title/TitleScene'),
    import('@/play/Palette'),
  ]);
  if (!sceneCanvas.value) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new TitleScene(
    canvas,
    Palette.fromStyle(getComputedStyle(document.documentElement)),
    still,
  );
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    scene.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  });
  observer.observe(canvas);
  scene.start();
  stopScene = () => {
    scene.stop();
    observer.disconnect();
  };
});
onBeforeUnmount(() => stopScene());
</script>

<template>
  <section class="title-screen" aria-labelledby="home-title">
    <canvas ref="sceneCanvas" class="scene" aria-hidden="true"></canvas>

    <div class="top">
      <div class="chips">
        <template v-if="returning">
          <p class="chip" data-testid="stars-total">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="star">
              <path
                fill="currentColor"
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
              />
            </svg>
            {{ t('campaign.stars', { count: stars, total: ORDER.length * 3 }) }}
          </p>
          <p class="chip" data-testid="wallet">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="shard">
              <path fill="currentColor" d="M12 2l7 7-7 13L5 9z" />
            </svg>
            {{ t('player.balance', { count: number.format(player.view.shards) }) }}
          </p>
        </template>
      </div>
      <div class="tools">
        <button
          class="round"
          type="button"
          :aria-label="t('achievements.title')"
          data-testid="achievements"
          @click="emit('achievements')"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          class="round"
          type="button"
          :aria-label="t('settings.open')"
          data-testid="open-settings"
          @click="settingsDialog?.open()"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.7 7.7 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
              transform="translate(-1 0)"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="content">
      <div class="brand">
        <h1 id="home-title" class="game-title title">{{ t('app.name') }}</h1>
        <p class="tagline">{{ t('home.tagline') }}</p>
      </div>
      <div class="spacer" aria-hidden="true"></div>
      <div class="actions">
        <button class="btn btn-primary play" type="button" data-testid="play" @click="emit('play')">
          <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true" class="play-icon">
            <circle cx="24" cy="24" r="22" fill="currentColor" />
            <path d="M19 14 L35 24 L19 34 Z" class="play-arrow" />
          </svg>
          <span class="play-text">
            <span class="play-word">{{ t('home.play') }}</span>
            <small>{{ nextLabel }}</small>
          </span>
        </button>
        <div class="tiles">
          <button class="tile" type="button" data-testid="arcade" @click="emit('arcade')">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="icon cyan">
              <rect x="4" y="11" width="24" height="14" rx="7" />
              <path d="M10 15v6M7 18h6M16 11V6" />
              <circle cx="21" cy="16" r="1.4" class="dot" />
              <circle cx="24" cy="20" r="1.4" class="dot" />
            </svg>
            <span>{{ t('arcade.title') }}</span>
          </button>
          <button class="tile" type="button" data-testid="daily" @click="emit('daily', challenge)">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="icon gold">
              <rect x="5" y="7" width="22" height="20" rx="4" />
              <path d="M5 13h22M11 4v6M21 4v6" />
              <path
                d="M16 16.5l1.4 2.8 3.1.4-2.2 2.1.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.1 3.1-.4z"
                class="dot"
              />
            </svg>
            <span>{{ t('daily.short') }}</span>
            <small v-if="record" class="done" data-testid="daily-done">
              {{ t('daily.doneShort', { score: number.format(record.score) }) }}
            </small>
            <span v-else class="badge" data-testid="daily-new">{{ t('daily.new') }}</span>
          </button>
          <button class="tile" type="button" data-testid="shop" @click="emit('shop')">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="icon rose">
              <circle cx="16" cy="16" r="10" />
              <circle cx="12.5" cy="12.5" r="2.5" class="dot" />
              <path d="M16 6v4M16 22v4M6 16h4M22 16h4" />
            </svg>
            <span>{{ t('shop.title') }}</span>
          </button>
          <button class="tile" type="button" data-testid="observatory" @click="emit('observatory')">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="icon violet">
              <path d="M6 18l16-8 3 6-16 8zM14 22l-4 7M16 21l4 8" />
              <path d="M24 5l1 2 2 .5-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L21 7.5 23 7z" class="dot" />
            </svg>
            <span>{{ t('observatory.title') }}</span>
            <span v-if="player.upgradeAffordable" class="badge" data-testid="upgrade-ready">
              {{ t('observatory.ready') }}
            </span>
          </button>
        </div>
      </div>
      <p class="version">{{ t('app.version', { version }) }}</p>
    </div>
    <SettingsDialog ref="settingsDialog" />
  </section>
</template>

<style scoped>
.title-screen {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  color: var(--scene-text);
  background:
    radial-gradient(ellipse 50% 40% at 10% 8%, var(--scene-pink), transparent 70%),
    radial-gradient(ellipse 45% 40% at 92% 6%, var(--scene-cyan), transparent 70%),
    radial-gradient(
      ellipse 80% 70% at 50% 52%,
      var(--scene-core) 0%,
      var(--scene-mid) 45%,
      var(--scene-edge) 100%
    );
}

.scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.top,
.content {
  position: relative;
  z-index: 1;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) clamp(var(--space-4), 3vw, var(--space-8)) 0;
}

.chips,
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch);
  padding: 0 var(--space-4);
  border: 1px solid var(--tile-edge);
  border-radius: 999px;
  background: rgb(20 8 50 / 0.72);
  font-weight: 700;
}

.star {
  color: var(--primary-mid);
}

.shard {
  color: var(--orb-cyan);
}

.round {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--tile-edge);
  border-radius: 50%;
  background: rgb(30 14 70 / 0.8);
  color: var(--scene-text);
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100dvh - 4rem);
  padding: 0 var(--space-4) var(--space-4);
  text-align: center;
}

.brand {
  margin-top: clamp(var(--space-4), 6vh, 4rem);
}

.title {
  font-size: clamp(3.75rem, 2.4rem + 7vw, 8.5rem);
  transform: rotate(-4deg);
}

.tagline {
  margin-top: var(--space-4);
  color: var(--scene-text);
  font-size: clamp(1.1rem, 0.95rem + 0.8vw, 1.65rem);
  font-weight: 700;
  text-shadow: 0 2px 12px rgb(0 0 0 / 0.6);
}

/* Room for the black hole between the title and the buttons. */
.spacer {
  flex: 1 0 34vh;
}

.actions {
  display: grid;
  gap: var(--space-6);
  width: min(100%, 26rem);
}

.play {
  position: relative;
  flex-direction: row;
  gap: var(--space-4);
  min-height: 5.5rem;
  border-radius: 1.5rem;
}

.play-icon {
  flex: none;
  color: var(--on-primary);
}

.play-arrow {
  fill: var(--primary-mid);
}

.play-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1;
}

.play-word {
  font-family: var(--font-display);
  font-size: 2.6rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.play-text small {
  margin-top: var(--space-1);
  font-size: 1rem;
  font-weight: 700;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 5.5rem;
  padding: var(--space-2) var(--space-1);
  border: 1px solid var(--tile-edge);
  border-radius: 1.2rem;
  background: linear-gradient(180deg, var(--tile-top), var(--tile-bottom));
  color: var(--scene-text);
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.15;
  box-shadow:
    0 0.3rem 0 var(--tile-shadow),
    inset 0 1px 0 rgb(255 255 255 / 0.16);
  transition: transform 0.15s;
}

.icon {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon .dot {
  stroke: none;
}

.cyan {
  stroke: var(--orb-cyan);
}
.cyan .dot {
  fill: var(--orb-cyan);
}
.gold {
  stroke: var(--primary-mid);
}
.gold .dot {
  fill: var(--primary-mid);
}
.rose {
  stroke: var(--orb-rose);
}
.rose .dot {
  fill: var(--orb-rose);
}
.violet {
  stroke: var(--orb-violet);
}
.violet .dot {
  fill: var(--orb-violet);
}

.badge {
  position: absolute;
  top: -0.65rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--badge);
  color: #fff;
  font-size: 0.75rem;
  box-shadow: 0 0 0 3px var(--scene-mid);
}

.done {
  color: var(--scene-muted);
  font-size: 0.7rem;
}

.version {
  margin-top: var(--space-4);
  color: var(--scene-muted);
  font-size: 0.8rem;
}

@media (prefers-reduced-motion: no-preference) {
  .tile:hover {
    transform: translateY(-2px);
  }

  .tile:active {
    transform: scale(0.97);
  }

  /* A halo breathes around Play; the button itself stays put. */
  .play::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 1.8rem;
    box-shadow: 0 0 1.6rem 0.2rem var(--primary-glow);
    opacity: 0;
    animation: breathe 2.4s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes breathe {
  50% {
    opacity: 1;
  }
}

/* Wide screens: the menu on the left, the black hole on the right, as on the cover. */
@media (min-width: 900px) and (min-aspect-ratio: 5/4) {
  .content {
    align-items: flex-start;
    justify-content: center;
    padding: 0 clamp(var(--space-8), 5vw, 5rem) var(--space-6);
    text-align: left;
  }

  .brand {
    margin-top: 0;
  }

  .title {
    transform-origin: left center;
  }

  .spacer {
    flex: 0 0 clamp(var(--space-6), 6vh, 4rem);
  }

  .actions {
    width: min(100%, 30rem);
  }

  .play {
    justify-content: flex-start;
    width: 22rem;
    padding-inline: var(--space-6);
  }

  .tile {
    min-height: 6.5rem;
    font-size: 0.95rem;
  }

  .version {
    position: absolute;
    right: clamp(var(--space-4), 3vw, var(--space-8));
    bottom: var(--space-4);
  }
}
</style>
