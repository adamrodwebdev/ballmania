<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { CAMPAIGN, WORLDS, type CampaignLevel } from '@/levels/campaign';
import { DEMO } from '@/levels/edition';
import { DIFFICULTIES } from '@/levels/difficulty';
import StarRow from '@/ui/components/StarRow.vue';
import SwiperDeck from '@/ui/components/SwiperDeck.vue';

const emit = defineEmits<{ play: [level: CampaignLevel]; home: []; observatory: [] }>();
const { t } = useI18n();
const { progress, settings, player } = useServices();

const order = CAMPAIGN.map((level) => level.id);
/** Stars won in the whole campaign. */
const total = computed(() => progress.totalStars(order));

const worlds = computed(() =>
  WORLDS.map((world, index) => ({
    ...world,
    index: index + 1,
    open: world.levels.some((level) => progress.isUnlocked(order, level.id)),
    stars: progress.totalStars(world.levels.map((level) => level.id)),
    tiles: world.levels.map((level) => ({
      level,
      unlocked: progress.isUnlocked(order, level.id),
      stars: progress.levels[level.id]?.stars ?? 0,
    })),
  })),
);
const names = computed(() => WORLDS.map((world) => t(`worlds.${world.id}.name`)));
/** The deck opens on the world of the furthest level the player can play. */
const current = computed(() => {
  const furthest = [...CAMPAIGN].reverse().find((level) => progress.isUnlocked(order, level.id));
  return Math.max(
    0,
    WORLDS.findIndex((world) => world.id === furthest?.world),
  );
});
/** Decorative orbs of each card's banner: a few tones per world, peeking over its edge. */
const ORBS = [0, 1, 2, 3, 4] as const;
</script>

<template>
  <section class="campaign" aria-labelledby="campaign-title">
    <div class="top">
      <button class="btn back" type="button" data-testid="home" @click="emit('home')">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
        <span>{{ t('campaign.back') }}</span>
      </button>
      <h1 id="campaign-title">{{ t('campaign.title') }}</h1>
      <p v-if="DEMO" class="demo" data-testid="demo-note">{{ t('demo.note') }}</p>
      <p class="total" data-testid="stars-total">
        {{ t('campaign.stars', { count: total, total: order.length * 3 }) }}
      </p>
      <button
        class="btn observatory"
        type="button"
        data-testid="observatory"
        @click="emit('observatory')"
      >
        <span>{{ t('observatory.title') }}</span>
        <span v-if="player.upgradeAffordable" class="badge">{{ t('observatory.ready') }}</span>
      </button>
    </div>

    <fieldset class="difficulty">
      <legend>{{ t('difficulty.title') }}</legend>
      <label v-for="level in DIFFICULTIES" :key="level" class="option">
        <input
          type="radio"
          name="difficulty"
          :value="level"
          :checked="settings.current.difficulty === level"
          :data-testid="`difficulty-${level}`"
          @change="settings.update({ difficulty: level })"
        />
        <span>
          <strong>{{ t(`difficulty.${level}.name`) }}</strong>
          <small>{{ t(`difficulty.${level}.hint`) }}</small>
        </span>
      </label>
    </fieldset>

    <SwiperDeck :label="t('campaign.worldsLabel')" :names="names" :initial="current">
      <div v-for="world in worlds" :key="world.id" class="swiper-slide">
        <article
          class="world"
          :class="[`world-${world.id}`, { locked: !world.open }]"
          :aria-labelledby="`world-${world.id}`"
          :data-testid="`world-${world.id}`"
        >
          <div class="banner" aria-hidden="true">
            <span v-for="orb in ORBS" :key="orb" class="orb" :class="`orb-${orb}`"></span>
          </div>
          <header class="world-head">
            <p class="world-number">{{ t('campaign.world', { number: world.index }) }}</p>
            <h2 :id="`world-${world.id}`">{{ t(`worlds.${world.id}.name`) }}</h2>
            <p class="tagline">{{ t(`worlds.${world.id}.tagline`) }}</p>
            <p v-if="world.levels.length > 0" class="world-stars">
              {{ t('campaign.stars', { count: world.stars, total: world.levels.length * 3 }) }}
            </p>
          </header>

          <ol v-if="world.levels.length > 0" class="levels stagger">
            <li v-for="tile in world.tiles" :key="tile.level.id">
              <button
                class="tile"
                :class="{ boss: tile.level.colossus, done: tile.stars > 0 }"
                type="button"
                :disabled="!tile.unlocked"
                :data-testid="`level-${tile.level.id}`"
                :aria-label="
                  tile.unlocked
                    ? t('campaign.levelLabel', {
                        number: tile.level.number,
                        stars: tile.stars,
                      })
                    : t('campaign.lockedLabel', { number: tile.level.number })
                "
                @click="emit('play', tile.level)"
              >
                <span class="number" aria-hidden="true">{{ tile.level.number }}</span>
                <svg
                  v-if="!tile.unlocked"
                  class="lock"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"
                  />
                </svg>
                <StarRow v-else :count="tile.stars" label="" aria-hidden="true" />
              </button>
            </li>
          </ol>
          <p v-else class="soon">{{ t(DEMO ? 'demo.fullGame' : 'campaign.comingSoon') }}</p>
        </article>
      </div>
    </SwiperDeck>
  </section>
</template>

<style scoped>
.campaign {
  display: grid;
  gap: var(--space-6);
  width: min(100%, 60rem);
  margin-inline: auto;
  padding: var(--space-4) var(--space-4) var(--space-12);
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

.back {
  flex-direction: row;
  padding-inline: var(--space-3);
}

.demo {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 800;
}

h1 {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.4rem + 2vw, 2.6rem);
}

/* Each world is a card of the deck; its neighbours peek out behind it. */
.swiper-slide {
  display: flex;
  justify-content: center;
  padding-top: 2.25rem;
}

.world {
  --w1: var(--orb-violet);
  --w2: var(--orb-cyan);
  position: relative;
  display: grid;
  gap: var(--space-4);
  width: min(calc(100% - 2.5rem), 46rem);
  padding: calc(var(--space-6) + 1.75rem) var(--space-4) var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  isolation: isolate;
}

/* A wash of the world's colours along the top of the card. */
.world::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  z-index: -1;
  height: 7rem;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(135deg, var(--w1), var(--w2));
  opacity: 0.22;
  mask-image: linear-gradient(to bottom, #000, transparent);
}

.world-nebula {
  --w1: var(--orb-violet);
  --w2: var(--orb-cyan);
}
.world-neon {
  --w1: var(--orb-rose);
  --w2: var(--orb-cyan);
}
.world-abyss {
  --w1: var(--orb-cyan);
  --w2: var(--orb-lime);
}
.world-jewel {
  --w1: var(--orb-ruby);
  --w2: var(--orb-amber);
}
.world-volcano {
  --w1: var(--orb-amber);
  --w2: var(--orb-ruby);
}
.world-singularity {
  --w1: var(--orb-violet);
  --w2: var(--orb-rose);
}

/* Glass orbs straddling the top edge of the card, overlapping one another. */
.banner {
  position: absolute;
  top: -1.75rem;
  left: 50%;
  display: flex;
  transform: translateX(-50%);
}

.orb {
  width: 3.5rem;
  height: 3.5rem;
  margin-inline: -0.45rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.85), transparent 30%),
    radial-gradient(circle at 60% 75%, rgb(0 0 0 / 0.3), transparent 60%), var(--w1);
  box-shadow:
    0 0.5rem 1.2rem rgb(0 0 0 / 0.3),
    0 0 0 3px var(--surface);
}

.orb-1,
.orb-3 {
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.85), transparent 30%),
    radial-gradient(circle at 60% 75%, rgb(0 0 0 / 0.3), transparent 60%), var(--w2);
}

.orb-2 {
  z-index: 1;
  transform: translateY(-0.4rem) scale(1.15);
}

@media (prefers-reduced-motion: no-preference) {
  .orb {
    animation: bob 3.2s ease-in-out infinite alternate;
  }

  .orb-1,
  .orb-3 {
    animation-delay: -1.6s;
  }

  .orb-2 {
    animation-name: bob-centre;
  }
}

@keyframes bob {
  to {
    transform: translateY(-0.3rem);
  }
}

@keyframes bob-centre {
  from {
    transform: translateY(-0.4rem) scale(1.15);
  }
  to {
    transform: translateY(-0.7rem) scale(1.15);
  }
}

.world.locked {
  border-style: dashed;
}

.world.locked .banner {
  filter: grayscale(1);
  opacity: 0.6;
}

.world-number {
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h2 {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 1.2rem + 1vw, 1.9rem);
}

.tagline,
.soon {
  color: var(--text-muted);
}

.world-stars {
  margin-top: var(--space-2);
  font-weight: 700;
}

.levels {
  display: grid;
  /* Six columns at most: twelve levels make two even rows. */
  grid-template-columns: repeat(
    auto-fill,
    minmax(max(4.25rem, calc((100% - 5 * var(--space-2)) / 6)), 1fr)
  );
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: var(--space-1);
  width: 100%;
  min-height: 4.25rem;
  padding: var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-weight: 800;
}

.tile:disabled {
  color: var(--text-muted);
  background: transparent;
}

.tile.done {
  border-color: var(--accent);
}

.tile.boss:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}

.number {
  font-family: var(--font-display);
  font-size: 1.35rem;
}
.total {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--surface-2);
  font-weight: 800;
}

.observatory {
  flex-direction: row;
  margin-left: auto;
}

.badge {
  padding: 0 var(--space-2);
  border-radius: 999px;
  background: var(--orb-cyan);
  color: #04131a;
  font-size: 0.75rem;
  font-weight: 800;
}

.difficulty {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.difficulty legend {
  margin-bottom: var(--space-2);
  font-weight: 800;
}

.option {
  position: relative;
  display: flex;
  min-height: 44px;
  cursor: pointer;
}

.option input {
  position: absolute;
  opacity: 0;
}

.option span {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  text-align: center;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.option small {
  display: none;
  color: var(--text-muted);
}

@media (min-width: 640px) {
  .option small {
    display: block;
  }
}

/*
 * Landscape frames up to 800 px tall (portal iframes, laptops, phones on their
 * side): the menu in a column on the left and the world deck on the right, so
 * the twelve levels show without scrolling the page.
 */
@media (min-width: 640px) and (min-aspect-ratio: 5/4) and (max-height: 800px) {
  .campaign {
    grid-template-columns: 15rem minmax(0, 1fr);
    grid-template-rows: repeat(4, auto) 1fr auto;
    gap: var(--space-2) var(--space-6);
    align-items: start;
    width: 100%;
    max-width: 72rem;
    min-height: 100dvh;
    padding: var(--space-4);
  }

  .top {
    display: contents;
  }

  .back {
    grid-area: 1 / 1;
    justify-self: start;
  }

  h1 {
    grid-area: 2 / 1;
    font-size: clamp(1.75rem, 1.2rem + 2vh, 2.3rem);
  }

  .total {
    grid-area: 3 / 1;
    justify-self: start;
  }

  .difficulty {
    grid-area: 4 / 1;
    grid-template-columns: minmax(0, 1fr);
  }

  /* The demo's note, in the room left above the Observatory. */
  .demo {
    grid-area: 5 / 1;
    justify-self: start;
  }

  .option span {
    padding: var(--space-2) var(--space-3);
    text-align: left;
  }

  /* Only the chosen difficulty says what it means. */
  .option small {
    display: none;
  }

  .option input:checked + span small {
    display: block;
  }

  .observatory {
    grid-area: 6 / 1;
    justify-content: space-between;
    margin-left: 0;
  }

  .deck {
    grid-column: 2;
    grid-row: 1 / -1;
    align-self: center;
    gap: var(--space-2);
  }

  .deck :deep(.swiper) {
    padding: var(--space-2) 0 var(--space-3);
  }

  .swiper-slide {
    padding-top: 1.5rem;
  }

  .world {
    gap: var(--space-2);
    padding: calc(var(--space-3) + 1.25rem) var(--space-4) var(--space-3);
  }

  /* The world's stars beside its name, its tagline below. */
  .world-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: var(--space-3);
  }

  .world-head > * {
    grid-column: 1;
  }

  .world-stars {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: end;
    margin: 0;
  }

  .tagline {
    grid-column: 1 / -1;
  }

  .banner {
    top: -1.3rem;
  }

  .orb {
    width: 2.6rem;
    height: 2.6rem;
  }

  h2 {
    font-size: 1.6rem;
  }

  .world-stars {
    margin-top: var(--space-1);
  }

  /* Two rows of six, whatever the width left to the deck. */
  .levels {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .tile {
    min-height: 3.4rem;
    padding: var(--space-1);
  }
}

/* The shortest frames (phones on their side): the levels before the words. */
@media (min-width: 640px) and (min-aspect-ratio: 5/4) and (max-height: 480px) {
  .campaign {
    padding-block: var(--space-3);
  }

  .tagline,
  .option input:checked + span small {
    display: none;
  }
}

.option input:checked + span {
  border-color: var(--accent);
  background: var(--surface-2);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.option input:focus-visible + span {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
</style>
