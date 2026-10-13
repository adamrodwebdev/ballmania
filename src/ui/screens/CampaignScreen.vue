<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { CAMPAIGN, WORLDS, type CampaignLevel } from '@/levels/campaign';
import { DIFFICULTIES } from '@/levels/difficulty';
import StarRow from '@/ui/components/StarRow.vue';

const emit = defineEmits<{ play: [level: CampaignLevel]; home: [] }>();
const { t } = useI18n();
const { progress, settings } = useServices();

const order = CAMPAIGN.map((level) => level.id);

const worlds = computed(() =>
  WORLDS.map((world, index) => ({
    ...world,
    index: index + 1,
    stars: progress.totalStars(world.levels.map((level) => level.id)),
    tiles: world.levels.map((level) => ({
      level,
      unlocked: progress.isUnlocked(order, level.id),
      stars: progress.levels[level.id]?.stars ?? 0,
    })),
  })),
);
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

    <article
      v-for="world in worlds"
      :key="world.id"
      class="world"
      :class="[`world-${world.id}`, { locked: world.levels.length === 0 }]"
      :aria-labelledby="`world-${world.id}`"
    >
      <header class="world-head">
        <p class="world-number">{{ t('campaign.world', { number: world.index }) }}</p>
        <h2 :id="`world-${world.id}`">{{ t(`worlds.${world.id}.name`) }}</h2>
        <p class="tagline">{{ t(`worlds.${world.id}.tagline`) }}</p>
        <p v-if="world.levels.length > 0" class="world-stars">
          {{ t('campaign.stars', { count: world.stars, total: world.levels.length * 3 }) }}
        </p>
      </header>

      <ol v-if="world.levels.length > 0" class="levels">
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
      <p v-else class="soon">{{ t('campaign.comingSoon') }}</p>
    </article>
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

h1 {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.4rem + 2vw, 2.6rem);
}

.world {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.world.locked {
  box-shadow: none;
  background: transparent;
  border-style: dashed;
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
.difficulty {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
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
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.option small {
  color: var(--text-muted);
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
