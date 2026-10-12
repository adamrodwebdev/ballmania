<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { PlayRequest } from '@/app/PlayRequest';
import { DUEL_DIFFICULTIES } from '@/levels/arcade/duel';
import { ARCADE_MODES } from '@/levels/arcade/modes';
import { dailyPuzzle, PUZZLES } from '@/levels/arcade/puzzles';
import { SONGS } from '@/levels/arcade/rhythm';
import { DailyChallenge } from '@/player/DailyChallenge';
import StarRow from '@/ui/components/StarRow.vue';

const emit = defineEmits<{ play: [request: PlayRequest]; home: [] }>();
const { t, locale } = useI18n();
const { arcade, player, today } = useServices();

const number = computed(() => new Intl.NumberFormat(locale.value));
const day = DailyChallenge.of(today()).day;
const ids = PUZZLES.map((puzzle) => puzzle.id);
const dailyRecord = computed(() => arcade.dailyPuzzle(day));

/** Each mode opens when its world of the campaign is finished (specification § 3.2). */
const modes = computed(() =>
  ARCADE_MODES.map((mode) => ({ ...mode, open: player.view.worlds.includes(mode.unlockedBy) })),
);

const puzzles = computed(() =>
  PUZZLES.map((puzzle) => ({
    puzzle,
    open: arcade.isPuzzleOpen(ids, puzzle.id),
    stars: arcade.view.puzzles[puzzle.id]?.stars ?? 0,
  })),
);

/** The puzzle of the day is drawn when asked for: drawing it runs the solver. */
const playDailyPuzzle = () => emit('play', { kind: 'puzzle', puzzle: dailyPuzzle(day), day });
</script>

<template>
  <section class="arcade" aria-labelledby="arcade-title">
    <div class="top">
      <button class="btn back" type="button" data-testid="home" @click="emit('home')">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
        <span>{{ t('campaign.back') }}</span>
      </button>
      <h1 id="arcade-title">{{ t('arcade.title') }}</h1>
    </div>
    <p class="intro">{{ t('arcade.intro') }}</p>

    <article
      v-for="mode in modes"
      :key="mode.id"
      class="mode"
      :class="{ locked: !mode.open }"
      :aria-labelledby="`mode-${mode.id}`"
      :data-testid="`mode-${mode.id}`"
    >
      <header>
        <h2 :id="`mode-${mode.id}`">{{ t(`arcade.${mode.id}.name`) }}</h2>
        <p class="tagline">{{ t(`arcade.${mode.id}.tagline`) }}</p>
      </header>

      <p v-if="!mode.open" class="soon">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"
          />
        </svg>
        {{ t('arcade.locked', { world: t(`worlds.${mode.unlockedBy}.name`) }) }}
      </p>

      <div v-else-if="mode.id === 'endless'" class="choices">
        <button
          class="btn btn-primary"
          type="button"
          data-testid="play-endless"
          @click="emit('play', { kind: 'endless' })"
        >
          <span>{{ t('arcade.start') }}</span>
          <small>{{
            t('arcade.endless.best', { score: number.format(arcade.view.endless) })
          }}</small>
        </button>
      </div>

      <template v-else-if="mode.id === 'puzzle'">
        <div class="choices">
          <button
            class="btn btn-primary"
            type="button"
            data-testid="play-daily-puzzle"
            @click="playDailyPuzzle"
          >
            <span>{{ t('arcade.puzzle.daily') }}</span>
            <small v-if="dailyRecord">
              {{
                dailyRecord.won
                  ? t('arcade.puzzle.dailyDone', { shots: dailyRecord.shots })
                  : t('arcade.puzzle.dailyTried')
              }}
            </small>
            <small v-else>{{ t('arcade.puzzle.dailyTodo') }}</small>
          </button>
        </div>
        <p class="detail">
          {{
            t('arcade.puzzle.solvedCount', { count: arcade.puzzlesSolved, total: PUZZLES.length })
          }}
        </p>
        <ol class="tiles">
          <li v-for="tile in puzzles" :key="tile.puzzle.id">
            <button
              class="tile"
              :class="{ done: tile.stars > 0 }"
              type="button"
              :disabled="!tile.open"
              :data-testid="`puzzle-${tile.puzzle.number}`"
              :aria-label="
                tile.open
                  ? t('arcade.puzzle.tileLabel', { number: tile.puzzle.number, stars: tile.stars })
                  : t('arcade.puzzle.lockedLabel', { number: tile.puzzle.number })
              "
              @click="emit('play', { kind: 'puzzle', puzzle: tile.puzzle })"
            >
              <span class="number" aria-hidden="true">{{ tile.puzzle.number }}</span>
              <StarRow v-if="tile.open" :count="tile.stars" label="" aria-hidden="true" />
            </button>
          </li>
        </ol>
      </template>

      <div v-else-if="mode.id === 'rhythm'" class="choices">
        <button
          v-for="song in SONGS"
          :key="song.id"
          class="btn"
          type="button"
          :data-testid="`song-${song.id}`"
          @click="emit('play', { kind: 'rhythm', song })"
        >
          <span>{{ t(`arcade.rhythm.songs.${song.id}`) }}</span>
          <small>
            {{ t('arcade.rhythm.bpm', { bpm: song.bpm }) }}
            <template v-if="arcade.view.songs[song.id] !== undefined">
              · {{ t('game.best', { score: number.format(arcade.view.songs[song.id] ?? 0) }) }}
            </template>
          </small>
        </button>
      </div>

      <div v-else class="choices">
        <button
          v-for="difficulty in DUEL_DIFFICULTIES"
          :key="difficulty"
          class="btn"
          type="button"
          :data-testid="`duel-${difficulty}`"
          @click="emit('play', { kind: 'duel', difficulty })"
        >
          <span>{{ t(`arcade.duel.levels.${difficulty}`) }}</span>
          <small>
            {{
              t(
                'arcade.duel.wins',
                { count: arcade.duelsWon(difficulty) },
                arcade.duelsWon(difficulty),
              )
            }}
          </small>
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.arcade {
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

.intro,
.tagline,
.soon,
.detail {
  color: var(--text-muted);
}

.mode {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.mode.locked {
  box-shadow: none;
  background: transparent;
  border-style: dashed;
}

h2 {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 1.2rem + 1vw, 1.9rem);
}

.soon {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: var(--space-3);
}

.tiles {
  display: grid;
  /* Ten columns at most: thirty puzzles make three even rows. */
  grid-template-columns: repeat(
    auto-fill,
    minmax(max(3.5rem, calc((100% - 9 * var(--space-2)) / 10)), 1fr)
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
  min-height: 3.5rem;
  padding: var(--space-1);
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

.number {
  font-family: var(--font-display);
  font-size: 1.1rem;
}
</style>
