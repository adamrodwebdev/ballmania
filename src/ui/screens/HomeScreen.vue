<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { CAMPAIGN } from '@/levels/campaign';
import { DailyChallenge } from '@/player/DailyChallenge';
import { GIFT_SHARDS } from '@/player/DailyGift';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';
import SoundToggle from '@/ui/components/SoundToggle.vue';
import { whenIdle } from '@/ui/idle';

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
/**
 * The daily gift (v1.7): today's day of a seven-day streak. Taken, the card
 * folds into a pill that says what tomorrow brings.
 */
const GIFT_DAYS = GIFT_SHARDS.length;
const gift = computed(() => player.giftOffer(today()));
const giftMessage = ref('');
const takeGift = () => {
  const shards = player.takeGift(today());
  if (shards > 0) {
    giftMessage.value = t('gift.received', { shards: number.value.format(shards) }, shards);
  }
};
const dayState = (day: number) => ({
  done: day < gift.value.day,
  today: day === gift.value.day,
  last: day === GIFT_DAYS,
});
const dayLabel = (day: number, shards: number) =>
  t(
    day < gift.value.day
      ? 'gift.dayDone'
      : day === gift.value.day
        ? 'gift.dayToday'
        : 'gift.dayLater',
    {
      day,
      shards: number.value.format(shards),
    },
    shards,
  );
const version = __APP_VERSION__;
/** Playgama wants a two-to-four-word title, the same in the game and on its page. */
const gameName = __PLATFORM__ === 'playgama' ? 'Ball Mania' : t('app.name');

const settingsDialog = ref<{ open: () => void } | null>(null);

/**
 * The living backdrop is drawn from its own small module, once the page has
 * loaded and the browser is idle, and by a worker where the browser allows
 * (v1.7.6): it never weighs on the first screen.
 */
const sceneCanvas = ref<HTMLCanvasElement | null>(null);
/** The room the menu leaves the black hole on an upright screen. */
const spacer = ref<HTMLElement | null>(null);
let stopScene = () => {};
const startScene = async () => {
  const canvas = sceneCanvas.value;
  if (!canvas) return;
  const [{ openTitleBackdrop }, { Palette }] = await Promise.all([
    import('@/ui/title/TitleBackdrop'),
    import('@/play/Palette'),
  ]);
  if (!sceneCanvas.value) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = await openTitleBackdrop(
    canvas,
    Palette.fromStyle(getComputedStyle(document.documentElement)),
    still,
  );
  // Left the title screen while the scene was starting.
  if (sceneCanvas.value !== canvas) {
    scene.stop();
    return;
  }
  // The hole's room changes with the screen, and as the gift card folds away.
  const observer = new ResizeObserver(() => {
    const box = canvas.getBoundingClientRect();
    const room = spacer.value?.getBoundingClientRect();
    scene.resize(
      box.width,
      box.height,
      Math.min(window.devicePixelRatio || 1, 2),
      room && { top: room.top - box.top, bottom: room.bottom - box.top },
    );
  });
  observer.observe(canvas);
  if (spacer.value) observer.observe(spacer.value);
  stopScene = () => {
    scene.stop();
    observer.disconnect();
  };
};
onMounted(() => whenIdle(() => void startScene()));
onBeforeUnmount(() => stopScene());
</script>

<template>
  <section class="title-screen" aria-labelledby="home-title">
    <canvas ref="sceneCanvas" class="scene" aria-hidden="true"></canvas>

    <div class="top">
      <div class="chips">
        <template v-if="returning">
          <!-- The icon says what is counted: the numbers alone stay on one line in every
               language, and screen readers hear the whole sentence. -->
          <p class="chip" data-testid="stars-total">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="star">
              <path
                fill="currentColor"
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
              />
            </svg>
            <span aria-hidden="true">
              {{ number.format(stars) }} / {{ number.format(ORDER.length * 3) }}
            </span>
            <span class="sr-only">
              {{ t('campaign.stars', { count: stars, total: ORDER.length * 3 }) }}
            </span>
          </p>
          <p class="chip" data-testid="wallet">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="shard">
              <path fill="currentColor" d="M12 2l7 7-7 13L5 9z" />
            </svg>
            <span aria-hidden="true">{{ number.format(player.view.shards) }}</span>
            <span class="sr-only">
              {{
                t(
                  'player.balance',
                  { count: number.format(player.view.shards) },
                  player.view.shards,
                )
              }}
            </span>
          </p>
        </template>
      </div>
      <div class="tools">
        <SoundToggle />
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
        <h1 id="home-title" class="game-title title">{{ gameName }}</h1>
        <p class="tagline">{{ t('home.tagline') }}</p>
      </div>
      <div ref="spacer" class="spacer" aria-hidden="true"></div>
      <section v-if="!gift.taken" class="gift" aria-labelledby="gift-title" data-testid="gift">
        <div class="gift-head">
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="gift-icon">
            <path d="M5 14h22v13H5zM3 9.5h26V14H3zM16 9.5V27" />
            <path
              d="M16 9.5C14 4.5 8.5 4 8.5 7S12 9.5 16 9.5ZM16 9.5C18 4.5 23.5 4 23.5 7S20 9.5 16 9.5Z"
            />
          </svg>
          <div class="gift-title">
            <h2 id="gift-title" class="gift-name">{{ t('gift.title') }}</h2>
            <span class="gift-day">{{ t('gift.day', { day: gift.day, days: GIFT_DAYS }) }}</span>
          </div>
          <button class="collect" type="button" data-testid="gift-collect" @click="takeGift">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M12 2l7 7-7 13L5 9z" />
            </svg>
            {{ t('gift.collect', { shards: number.format(gift.shards) }) }}
          </button>
        </div>
        <ol class="streak" :aria-label="t('gift.streak')">
          <li
            v-for="(shards, index) in GIFT_SHARDS"
            :key="index"
            :class="dayState(index + 1)"
            :aria-label="dayLabel(index + 1, shards)"
          >
            <svg v-if="index + 1 < gift.day" viewBox="0 0 24 24" aria-hidden="true" class="done">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <svg
              v-else-if="index + 1 === GIFT_DAYS"
              viewBox="0 0 32 24"
              aria-hidden="true"
              class="big"
            >
              <path class="crystal" d="M16 1l5.5 6.5L16 22 10.5 7.5z" />
              <path class="crystal cyan" d="M7 6l4 4.5L7 20l-4-9.5z" />
              <path class="crystal gold" d="M25 6l4 4.5-4 9.5-4-9.5z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="shard">
              <path d="M12 2l7 7-7 13L5 9z" />
            </svg>
            <span aria-hidden="true">{{ number.format(shards) }}</span>
          </li>
        </ol>
        <p class="gift-note">{{ t('gift.note', { shards: number.format(gift.tomorrow) }) }}</p>
      </section>
      <p v-else class="gift-taken" data-testid="gift-taken">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {{ t('gift.taken', { day: gift.day, shards: number.format(gift.tomorrow) }) }}
      </p>
      <p class="sr-only" role="status">{{ giftMessage }}</p>
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
  display: flex;
  flex-direction: column;
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
  /* Clear of the notch and rounded corners in the CrazyGames app. */
  padding: max(var(--space-4), env(safe-area-inset-top))
    max(clamp(var(--space-4), 3vw, var(--space-8)), env(safe-area-inset-right)) 0
    max(clamp(var(--space-4), 3vw, var(--space-8)), env(safe-area-inset-left));
}

.chips,
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* The chips may wrap on a narrow phone; the round buttons stay in one row. */
.tools {
  flex: none;
  flex-wrap: nowrap;
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
  white-space: nowrap;
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
  flex: 1 0 auto;
  flex-direction: column;
  align-items: center;
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

/* Room for the black hole between the title and the gift above the buttons. */
.spacer {
  flex: 1 0 8vh;
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

/*
 * The daily gift (v1.7): a card above Play on an upright screen, the black
 * hole in the room above it; in the top corner on a wide one. Its sides widen
 * from 360 px: at 320 px, its header needs their room.
 */
.gift {
  display: grid;
  gap: var(--space-3);
  width: min(100%, 26rem);
  margin-block: var(--space-4) var(--space-6);
  padding: var(--space-3);
  border: 1px solid var(--tile-edge);
  border-radius: 1.25rem;
  background: linear-gradient(180deg, var(--tile-top), var(--tile-bottom));
  box-shadow:
    0 0.3rem 0 var(--tile-shadow),
    0 1.1rem 2.5rem rgb(0 0 0 / 0.45),
    inset 0 1px 0 rgb(255 255 255 / 0.16);
  text-align: left;
}

/* Narrow phones first: a tight header keeps the title on one line beside the button. */
.gift-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* At 360 px the title needs the room of the decorative box. */
.gift-icon {
  display: none;
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  fill: none;
  stroke: var(--primary-mid);
  stroke-width: 2.4;
  stroke-linejoin: round;
}

.gift-title {
  display: grid;
  flex: 1;
  min-width: 0;
  line-height: 1.15;
}

/* From 1rem at 320 px to 1.15rem from 384 px: the title stays on one line. */
.gift-name {
  margin: 0;
  font-size: clamp(1rem, 0.25rem + 3.75vw, 1.15rem);
}

.gift-day {
  color: var(--scene-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.collect {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--touch);
  padding: 0 var(--space-3);
  border: 0;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--orb-cyan) 55%, white) 0%,
    var(--orb-cyan) 55%,
    color-mix(in srgb, var(--orb-cyan) 70%, black) 100%
  );
  color: var(--scene-edge);
  font-weight: 700;
  box-shadow:
    0 0.25rem 0 color-mix(in srgb, var(--orb-cyan) 45%, black),
    0 0.5rem 1.25rem color-mix(in srgb, var(--orb-cyan) 35%, transparent),
    inset 0 2px 0 rgb(255 255 255 / 0.55);
  cursor: pointer;
}

.streak {
  display: flex;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.streak li {
  display: grid;
  flex: 1;
  place-content: center;
  justify-items: center;
  gap: 0.1rem;
  min-height: 3.4rem;
  border: 1px solid color-mix(in srgb, var(--tile-edge) 75%, transparent);
  border-radius: 0.75rem;
  background: rgb(8 3 26 / 0.45);
  color: var(--scene-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.streak li.done {
  background: rgb(255 255 255 / 0.05);
}

.streak li.today {
  border: 2px solid var(--primary-mid);
  background: linear-gradient(180deg, var(--tile-top), var(--tile-bottom));
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--primary-mid) 22%, transparent),
    0 0 1rem color-mix(in srgb, var(--primary-mid) 45%, transparent);
  color: var(--scene-text);
  font-size: 0.9rem;
}

.streak li.last {
  flex: 1.6;
  border-color: color-mix(in srgb, var(--primary-mid) 65%, transparent);
  background: radial-gradient(
    circle at 50% 35%,
    color-mix(in srgb, var(--primary-mid) 30%, transparent),
    rgb(8 3 26 / 0.5) 70%
  );
  color: var(--primary-mid);
}

.streak svg {
  width: 0.9rem;
  height: 0.9rem;
}

.streak .done path,
.gift-taken path {
  fill: none;
  stroke: var(--orb-lime);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.streak .shard path {
  fill: var(--orb-cyan);
}

.streak .big {
  width: 1.7rem;
  height: 1.25rem;
}

.crystal {
  fill: color-mix(in srgb, var(--orb-cyan) 50%, white);
}

.crystal.cyan {
  fill: var(--orb-cyan);
}

.crystal.gold {
  fill: var(--primary-mid);
}

.gift-note {
  margin: 0;
  color: var(--scene-muted);
  font-size: 0.8rem;
}

.gift-taken {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch);
  margin: var(--space-4) 0 var(--space-6);
  padding: 0 var(--space-4);
  border: 1px solid color-mix(in srgb, var(--orb-lime) 55%, transparent);
  border-radius: 999px;
  background: rgb(20 8 50 / 0.8);
  font-weight: 700;
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

/* From 22.5rem (360 px): the card's sides widen. */
@media (min-width: 22.5rem) {
  .gift {
    padding-inline: var(--space-4);
  }
}

/* From 23.4375rem (375 px): room for the gift's decorative box. */
@media (min-width: 23.4375rem) {
  .gift-icon {
    display: block;
  }
}

/* Above 25rem (400 px): the gift header at its full size. */
@media (min-width: 25.0625rem) {
  .gift-head {
    gap: var(--space-3);
  }

  .gift-icon {
    width: 2rem;
    height: 2rem;
  }

  .gift-name {
    font-size: 1.3rem;
  }

  .collect {
    gap: var(--space-2);
    padding: 0 var(--space-4);
  }
}

/* Wide screens: the menu on the left, the black hole on the right, as on the cover. */
@media (min-width: 640px) and (min-aspect-ratio: 5/4) {
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

  .gift,
  .gift-taken {
    position: absolute;
    top: var(--space-4);
    right: max(clamp(var(--space-4), 3vw, var(--space-8)), env(safe-area-inset-right));
    margin: 0;
  }

  .gift {
    width: min(26rem, 40vw);
  }

  .version {
    position: absolute;
    right: clamp(var(--space-4), 3vw, var(--space-8));
    bottom: var(--space-4);
  }
}

/* Short landscape frames (portal iframes down to 821×462, phones on their side):
   everything shrinks with the height so Play and the tiles stay in view. */
@media (min-aspect-ratio: 5/4) and (max-height: 620px) {
  .top {
    padding-top: max(var(--space-2), env(safe-area-inset-top));
  }

  .round {
    width: 2.75rem;
    height: 2.75rem;
  }

  .content {
    padding-bottom: var(--space-2);
  }

  .title {
    font-size: clamp(2.6rem, 17vh, 6rem);
  }

  .tagline {
    margin-top: var(--space-2);
    font-size: clamp(0.95rem, 3.6vh, 1.4rem);
  }

  .spacer {
    flex-basis: clamp(var(--space-3), 4vh, var(--space-8));
  }

  .actions {
    gap: var(--space-3);
  }

  .play {
    min-height: clamp(3.5rem, 15vh, 5.5rem);
  }

  .play-word {
    font-size: clamp(1.8rem, 8vh, 2.6rem);
  }

  .tile {
    min-height: clamp(3.6rem, 17vh, 6.5rem);
    font-size: 0.85rem;
  }

  .tile .icon {
    width: 1.6rem;
    height: 1.6rem;
  }

  /* The gift folds to its first row, clear of the black hole. */
  .gift {
    padding: var(--space-2) var(--space-3);
  }

  .gift-name {
    font-size: 1.1rem;
  }

  .streak,
  .gift-note {
    display: none;
  }

  .version {
    display: none;
  }
}

/* A folded gift in the corner: wide enough for its title on one line. */
@media (min-width: 640px) and (min-aspect-ratio: 5/4) and (max-height: 620px) {
  .gift {
    width: min(30rem, 46vw);
  }
}

/* Short portrait screens (360×640 phones): tighter buttons and no version
   line, so nothing scrolls. */
@media (max-aspect-ratio: 5/4) and (max-height: 720px) {
  .brand {
    margin-top: var(--space-2);
  }

  .actions {
    gap: var(--space-4);
  }

  .play {
    min-height: 4.75rem;
  }

  .tile {
    min-height: 4.75rem;
  }

  /* The gift keeps its streak, without the note. */
  .gift,
  .gift-taken {
    margin-bottom: var(--space-4);
  }

  .streak li {
    min-height: 2.9rem;
  }

  .gift-note {
    display: none;
  }

  .version {
    display: none;
  }
}
</style>
