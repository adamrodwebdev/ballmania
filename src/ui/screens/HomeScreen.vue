<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { playerTrace, useServices } from '@/app/AppServices';
import { GiftClaim } from '@/app/GiftClaim';
import { startsTraining } from '@/app/landing';
import { CAMPAIGN } from '@/levels/campaign';
import { DailyChallenge } from '@/player/DailyChallenge';
import { GIFT_SHARDS } from '@/player/DailyGift';
import type { Currency } from '@/ui/components/Currency';
import PlayerWallet from '@/ui/components/PlayerWallet.vue';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';
import SoundToggle from '@/ui/components/SoundToggle.vue';
import SparkFlight from '@/ui/components/SparkFlight.vue';
import TitleReel from '@/ui/title/TitleReel.vue';

const props = defineProps<{
  /** The studio intro still covers the screen (our site, once a visit). */
  covered: boolean;
}>();
const { t, locale } = useI18n();
const { player, progress, today } = useServices();
const emit = defineEmits<{
  play: [];
  daily: [challenge: DailyChallenge];
  arcade: [];
  observatory: [];
  shop: [];
  achievements: [];
  /** Today's gift is taken: its shards pour into the wallet (the app rings). */
  gift: [];
}>();

const challenge = DailyChallenge.of(today());
const record = computed(() => player.daily(challenge.day));
const number = computed(() => new Intl.NumberFormat(locale.value));
const ORDER = CAMPAIGN.map((level) => level.id);
/** Stars won in the campaign, out of three per level. */
const stars = computed(() => progress.totalStars(ORDER));
/** A returning player sees their stars and their wallet; a newcomer sees only the game. */
const returning = computed(
  () => stars.value > 0 || player.view.shards > 0 || player.view.fragments > 0,
);
/** The level "Play" leads to: the first open one not won yet, else the last open one. */
const nextLevel = computed(() => {
  const open = CAMPAIGN.filter((level) => progress.isUnlocked(ORDER, level.id));
  return open.find((level) => !progress.levels[level.id]?.stars) ?? open[open.length - 1];
});
const nextLabel = computed(() => {
  // A newcomer's first "Play" opens the training (v1.8.0).
  if (startsTraining(playerTrace(player, progress), player.training.done)) {
    return t('training.home');
  }
  const level = nextLevel.value;
  if (!level) return '';
  return t('home.next', { world: t(`worlds.${level.world}.name`), number: level.number });
});
/**
 * The daily gift (v1.7): today's day of a seven-day streak. Taken (v1.8.0),
 * its shards fly to the wallet while the day shows ticked; then the card
 * folds into a pill that says what tomorrow brings, and the reel glides into
 * the room it leaves. With reduced motion, the pill fades in at once.
 */
const GIFT_DAYS = GIFT_SHARDS.length;
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gift = computed(() => player.giftOffer(today()));
const claim = new GiftClaim(player, today, !still);
/** The card stays while its shards fly. */
const showCard = computed(() => !gift.value.taken || claim.flying);
const giftMessage = ref('');

/** The gift's sparks: how many, each one's flight and the gap between two, in milliseconds. */
const SPARKS = 9;
const SPARK_TIME = 480;
const SPARK_GAP = 24;
type Point = { readonly x: number; readonly y: number };
const screen = ref<HTMLElement | null>(null);
const collect = ref<HTMLButtonElement | null>(null);
/** The wallet, as far as a reward flying to it needs. */
const wallet = ref<{
  coinOf: (currency: Currency) => HTMLElement | null;
  pulse: (currency: Currency) => void;
} | null>(null);
/** From the button to the wallet's coin, on the screen: measured at the tap. */
const flight = ref<{ readonly from: Point; readonly to: Point; readonly lift: number } | null>(
  null,
);
const timers: ReturnType<typeof setTimeout>[] = [];
onBeforeUnmount(() => {
  claim.stop();
  timers.forEach(clearTimeout);
});
const takeGift = async () => {
  const shards = claim.take();
  if (shards <= 0) return;
  giftMessage.value = t('gift.received', { shards: number.value.format(shards) }, shards);
  emit('gift');
  if (still) return;
  // A newcomer's wallet comes with its first shards: measured once it is there.
  await nextTick();
  const box = screen.value?.getBoundingClientRect();
  const from = collect.value?.getBoundingClientRect();
  const to = wallet.value?.coinOf('shards')?.getBoundingClientRect();
  if (!box || !from || !to) return;
  const start = {
    x: from.left + from.width / 2 - box.left,
    y: from.top + from.height / 2 - box.top,
  };
  const end = { x: to.left + to.width / 2 - box.left, y: to.top + to.height / 2 - box.top };
  // The arc rises with the distance, up to 4rem.
  const lift = Math.min(4, Math.hypot(end.x - start.x, end.y - start.y) / 64);
  flight.value = { from: start, to: end, lift };
  timers.push(
    setTimeout(() => wallet.value?.pulse('shards'), SPARK_TIME + SPARK_GAP),
    setTimeout(() => (flight.value = null), SPARK_TIME + SPARKS * SPARK_GAP + 50),
  );
};

/**
 * The fold, played by hand: the card leaves the flow at once, folding where it
 * stood, so the pill and the reel take their places while it does; the reel
 * glides there from where it was (or fades in, where it had no room before).
 */
const reel = ref<{ readonly frame: HTMLElement | null } | null>(null);
let reelBefore: DOMRect | null = null;
const beforeFold = () => {
  reelBefore = still ? null : (reel.value?.frame?.getBoundingClientRect() ?? null);
};
const fold = (element: Element, done: () => void) => {
  const card = element as HTMLElement;
  if (still) {
    done();
    return;
  }
  const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = card;
  Object.assign(card.style, {
    position: 'absolute',
    top: `${offsetTop}px`,
    left: `${offsetLeft}px`,
    width: `${offsetWidth}px`,
    height: `${offsetHeight}px`,
    margin: '0',
    // Behind the reel and the pill, which take its place as it fades.
    zIndex: '-1',
    pointerEvents: 'none',
  });
  card
    .animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-0.75rem) scale(0.9, 0.55)' },
      ],
      { duration: 260, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    )
    .finished.then(done, done);
};
const unfold = (element: Element, done: () => void) => {
  glideReel();
  const frames = still
    ? [{ opacity: 0 }, { opacity: 1 }]
    : [
        { opacity: 0, transform: 'scale(0.85)' },
        { opacity: 1, transform: 'none' },
      ];
  element
    .animate(frames, {
      duration: still ? 180 : 300,
      delay: still ? 0 : 120,
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.3)',
      fill: 'backwards',
    })
    .finished.then(done, done);
};
/** The reel takes the room the card left: from its old place and size to its new ones. */
const glideReel = () => {
  const frame = reel.value?.frame;
  const first = reelBefore;
  reelBefore = null;
  if (!frame || still) return;
  const last = frame.getBoundingClientRect();
  if (last.width === 0) return;
  if (!first || first.width === 0) {
    frame.animate(
      [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 380, easing: 'ease-out' },
    );
    return;
  }
  const scale = first.width / last.width;
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(scale - 1) < 0.005) return;
  frame.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
};

/** A day of the streak: past, today (ticked once taken), the last. */
const isDone = (day: number) =>
  day < gift.value.day || (gift.value.taken && day === gift.value.day);
const dayState = (day: number) => ({
  done: isDone(day),
  today: day === gift.value.day,
  last: day === GIFT_DAYS,
});
const dayLabel = (day: number, shards: number) =>
  t(
    isDone(day) ? 'gift.dayDone' : day === gift.value.day ? 'gift.dayToday' : 'gift.dayLater',
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
/** The settings cover the screen: the reel waits behind them. */
const settingsOpen = ref(false);
const openSettings = () => {
  settingsOpen.value = true;
  settingsDialog.value?.open();
};
</script>

<template>
  <section ref="screen" class="title-screen" aria-labelledby="home-title">
    <div class="top">
      <div class="chips">
        <!-- The icon says what is counted: the numbers alone stay on one line in every
             language, and screen readers hear the whole sentence. The wallet does the same. -->
        <Transition name="arrive">
          <p v-if="returning" class="chip" data-testid="stars-total">
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
        </Transition>
      </div>
      <!-- The round buttons, and the wallet beside them (under them on a phone). -->
      <div class="tools">
        <div class="buttons">
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
            @click="openSettings"
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
        <Transition name="arrive">
          <PlayerWallet v-if="returning" ref="wallet" class="wallet" />
        </Transition>
      </div>
    </div>

    <div class="content">
      <div class="brand">
        <h1 id="home-title" class="game-title title">{{ gameName }}</h1>
        <p class="tagline">{{ t('home.tagline') }}</p>
      </div>
      <!-- The reel and the gift: between the title and Play, or on the right of a wide screen. -->
      <div class="side">
        <TitleReel ref="reel" class="reel-room" :paused="settingsOpen || props.covered" />
        <Transition :css="false" @before-leave="beforeFold" @leave="fold" @enter="unfold">
          <section
            v-if="showCard"
            key="card"
            class="gift"
            aria-labelledby="gift-title"
            data-testid="gift"
          >
            <div class="gift-head">
              <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="gift-icon">
                <path d="M5 14h22v13H5zM3 9.5h26V14H3zM16 9.5V27" />
                <path
                  d="M16 9.5C14 4.5 8.5 4 8.5 7S12 9.5 16 9.5ZM16 9.5C18 4.5 23.5 4 23.5 7S20 9.5 16 9.5Z"
                />
              </svg>
              <div class="gift-title">
                <h2 id="gift-title" class="gift-name">{{ t('gift.title') }}</h2>
                <span class="gift-day">{{
                  t('gift.day', { day: gift.day, days: GIFT_DAYS })
                }}</span>
              </div>
              <button
                ref="collect"
                class="collect"
                type="button"
                data-testid="gift-collect"
                :disabled="claim.flying"
                @click="takeGift"
              >
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
                <svg v-if="isDone(index + 1)" viewBox="0 0 24 24" aria-hidden="true" class="done">
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
          <p v-else key="taken" class="gift-taken" data-testid="gift-taken">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {{ t('gift.taken', { day: gift.day, shards: number.format(gift.tomorrow) }) }}
          </p>
        </Transition>
      </div>
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
    <!-- The gift's shards, on their way to the wallet. -->
    <SparkFlight
      v-if="flight"
      :from="flight.from"
      :to="flight.to"
      :lift="flight.lift"
      :count="SPARKS"
      :duration="SPARK_TIME"
      :stagger="SPARK_GAP"
    />
    <SettingsDialog ref="settingsDialog" @close="settingsOpen = false" />
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
  /* The night sky: still stars over the glows, as on the covers (in tiles that never line up). */
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='416' height='416'%3E%3Cg fill='%23fff'%3E%3Ccircle cx='221' cy='138' r='0.77' opacity='0.89'/%3E%3Ccircle cx='284' cy='264' r='0.90' opacity='0.66'/%3E%3Ccircle cx='294' cy='290' r='0.30' opacity='0.86'/%3E%3Ccircle cx='382' cy='335' r='0.30' opacity='0.78'/%3E%3Ccircle cx='286' cy='267' r='0.51' opacity='0.96'/%3E%3Ccircle cx='125' cy='179' r='0.33' opacity='0.97'/%3E%3Ccircle cx='302' cy='364' r='0.30' opacity='0.67'/%3E%3Ccircle cx='153' cy='144' r='0.62' opacity='0.97'/%3E%3C/g%3E%3Cg fill='%23ffd9a8'%3E%3Ccircle cx='155' cy='140' r='0.95' opacity='0.70'/%3E%3Ccircle cx='212' cy='176' r='0.31' opacity='0.96'/%3E%3C/g%3E%3C/svg%3E")
      0 0 / 26rem 26rem,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='592' height='592'%3E%3Cg fill='%23fff'%3E%3Ccircle cx='242' cy='306' r='0.41' opacity='0.76'/%3E%3Ccircle cx='130' cy='422' r='0.30' opacity='0.72'/%3E%3Ccircle cx='488' cy='227' r='0.30' opacity='0.65'/%3E%3Ccircle cx='350' cy='328' r='0.42' opacity='0.66'/%3E%3Ccircle cx='470' cy='9' r='0.31' opacity='0.81'/%3E%3Ccircle cx='472' cy='559' r='0.73' opacity='1.00'/%3E%3Ccircle cx='256' cy='152' r='0.56' opacity='0.56'/%3E%3Ccircle cx='491' cy='209' r='1.03' opacity='0.55'/%3E%3Ccircle cx='561' cy='325' r='0.64' opacity='0.78'/%3E%3Ccircle cx='257' cy='547' r='1.39' opacity='0.74'/%3E%3Ccircle cx='301' cy='135' r='0.30' opacity='0.57'/%3E%3C/g%3E%3Cg fill='%23ffd9a8'%3E%3Ccircle cx='10' cy='228' r='1.07' opacity='0.78'/%3E%3Ccircle cx='361' cy='566' r='0.34' opacity='0.96'/%3E%3Ccircle cx='424' cy='477' r='1.24' opacity='0.68'/%3E%3C/g%3E%3C/svg%3E")
      9rem 5rem / 37rem 37rem,
    radial-gradient(ellipse 50% 40% at 10% 8%, var(--scene-pink), transparent 70%),
    radial-gradient(ellipse 45% 40% at 92% 6%, var(--scene-cyan), transparent 70%),
    radial-gradient(
      ellipse 80% 70% at 50% 52%,
      var(--scene-core) 0%,
      var(--scene-mid) 45%,
      var(--scene-edge) 100%
    );
}

/* Brighter stars that twinkle, behind the menu. */
.title-screen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cg fill='%23fff'%3E%3Ccircle cx='20' cy='44' r='0.84' opacity='0.94'/%3E%3Ccircle cx='419' cy='483' r='0.65' opacity='0.97'/%3E%3Ccircle cx='95' cy='224' r='0.65' opacity='0.97'/%3E%3Ccircle cx='308' cy='406' r='0.78' opacity='0.91'/%3E%3Ccircle cx='478' cy='272' r='0.65' opacity='0.86'/%3E%3Ccircle cx='281' cy='282' r='0.70' opacity='0.97'/%3E%3C/g%3E%3Cg fill='%23ffd9a8'%3E%3Ccircle cx='63' cy='61' r='0.65' opacity='0.94'/%3E%3C/g%3E%3C/svg%3E")
    3rem 11rem / 32rem 32rem;
  pointer-events: none;
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
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* The round buttons stay in one row, the wallet under them on a phone, beside them wider. */
.tools {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.buttons {
  flex-wrap: nowrap;
}

@media (width >= 40rem) {
  .tools {
    flex-direction: row-reverse;
    align-items: center;
  }
}

/* The wallet wears the night sky, like the chips beside it. */
.wallet :deep(.coin) {
  border-color: var(--tile-edge);
  background: rgb(20 8 50 / 0.72);
  color: var(--scene-text);
}

.wallet :deep(.delta) {
  background: rgb(20 8 50 / 0.9);
  color: var(--scene-muted);
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

/* Shards are gold gems everywhere (v1.8.0), star fragments cyan stars. */
.shard {
  color: var(--primary-mid);
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
  /* Clear of a notch and of the home bar (v1.7.6). */
  padding: 0 max(var(--space-4), env(safe-area-inset-right))
    max(var(--space-4), env(safe-area-inset-bottom)) max(var(--space-4), env(safe-area-inset-left));
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

/*
 * Between the title and Play: the reel in the room the screen leaves (v1.8.0),
 * the daily gift under it.
 */
.side {
  /* The card folds from where it stands, out of the flow (see `fold`). */
  position: relative;
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
}

.reel-room {
  flex: 1 0 8vh;
  align-self: stretch;
  padding-top: var(--space-2);
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
  fill: var(--primary-mid);
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

/* While its shards fly, the button has done its work. */
.collect:disabled {
  cursor: default;
  filter: saturate(0.5) brightness(0.9);
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

/* A newcomer's first shards bring the wallet, and the stars beside it: they pop in. */
@media (prefers-reduced-motion: no-preference) {
  .arrive-enter-active {
    transition:
      opacity 0.25s ease-out,
      transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }

  .arrive-enter-from {
    opacity: 0;
    transform: scale(0.6);
  }

  /* Taken: today's check pops in while the shards fly. */
  .streak li.today.done svg {
    animation: tick 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.4);
  }
}

@keyframes tick {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .title-screen::before {
    animation: twinkle 3.6s ease-in-out infinite alternate;
  }
}

@keyframes twinkle {
  to {
    opacity: 0.25;
  }
}

/* From 22.5rem (360 px): the card's sides widen. */
@media (width >= 22.5rem) {
  .gift {
    padding-inline: var(--space-4);
  }
}

/* From 23.4375rem (375 px): room for the gift's decorative box. */
@media (width >= 23.4375rem) {
  .gift-icon {
    display: block;
  }
}

/* Above 25rem (400 px): the gift header at its full size. */
@media (width >= 25.0625rem) {
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

/* Upright tablets: a larger window, the room is there. */
@media (width >= 40rem) and (aspect-ratio < 5/4) {
  .reel-room {
    --reel-width: 36rem;
  }
}

/*
 * Wide screens: the menu on the left, centred on the height; on the right, the
 * gift in the corner and the reel under it, clear of the menu whatever its width.
 */
@media (width >= 40rem) and (aspect-ratio >= 5/4) {
  .content {
    display: grid;
    grid-template-rows: 1fr auto auto 1fr;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: clamp(var(--space-6), 4vw, var(--space-12));
    padding: 0 max(clamp(var(--space-4), 3vw, var(--space-8)), env(safe-area-inset-right))
      max(var(--space-6), env(safe-area-inset-bottom))
      max(clamp(var(--space-8), 5vw, 5rem), env(safe-area-inset-left));
    text-align: left;
  }

  .brand {
    grid-area: 2 / 1;
    margin-top: 0;
  }

  .title {
    transform-origin: left center;
  }

  .actions {
    grid-area: 3 / 1;
    width: 30rem;
    margin-top: clamp(var(--space-6), 6vh, 4rem);
  }

  /* The gift on top (a narrow column lets it reach over the menu, above it). */
  .side {
    grid-area: 1 / 2 / -1;
    flex-direction: column-reverse;
    align-items: flex-end;
  }

  .reel-room {
    --reel-width: 48rem;
    --reel-place: center end;
    flex: 1 1 0;
    min-height: 0;
    padding-block: var(--space-6) var(--space-8);
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
    margin: var(--space-4) 0 0;
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
@media (aspect-ratio >= 5/4) and (height <= 38.75rem) {
  .top {
    padding-top: max(var(--space-2), env(safe-area-inset-top));
  }

  .round {
    width: 2.75rem;
    height: 2.75rem;
  }

  .content {
    padding-bottom: max(var(--space-2), env(safe-area-inset-bottom));
  }

  .title {
    font-size: clamp(2.6rem, 17vh, 6rem);
  }

  .tagline {
    margin-top: var(--space-2);
    font-size: clamp(0.95rem, 3.6vh, 1.4rem);
  }

  .reel-room {
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
@media (width >= 40rem) and (aspect-ratio >= 5/4) and (height <= 38.75rem) {
  .gift {
    width: min(30rem, 46vw);
  }

  .actions {
    margin-top: clamp(var(--space-3), 4vh, var(--space-8));
  }

  .reel-room {
    padding-block: var(--space-3) var(--space-4);
  }
}

/* Mid-height phones (360×800): the gift's note gives its room to the reel,
   the streak still says what tomorrow brings. */
@media (aspect-ratio <= 5/4) and (height <= 52rem) {
  .gift-note {
    display: none;
  }
}

/* Short portrait screens (360×640 phones): tighter buttons and no version
   line, so nothing scrolls. */
@media (aspect-ratio <= 5/4) and (height <= 45rem) {
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

  .gift,
  .gift-taken {
    margin-bottom: var(--space-4);
  }

  .streak li {
    min-height: 2.9rem;
  }

  .version {
    display: none;
  }
}
</style>
