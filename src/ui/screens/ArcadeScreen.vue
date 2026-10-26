<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { PlayRequest } from '@/app/PlayRequest';
import { DUEL_DIFFICULTIES } from '@/levels/arcade/duel';
import { ARCADE_MODES } from '@/levels/arcade/modes';
import { dailyPuzzle, PUZZLES } from '@/levels/arcade/puzzles';
import { SONGS } from '@/levels/arcade/rhythm';
import { playable } from '@/levels/campaign';
import { DailyChallenge } from '@/player/DailyChallenge';
import ScreenHeader from '@/ui/components/ScreenHeader.vue';
import StarRow from '@/ui/components/StarRow.vue';
import SwiperDeck from '@/ui/components/SwiperDeck.vue';

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
const names = computed(() => ARCADE_MODES.map((mode) => t(`arcade.${mode.id}.name`)));
/** The deck opens on the mode opened last: the newest thing to try. */
const current = computed(() => {
  const last = modes.value.map((mode) => mode.open).lastIndexOf(true);
  return Math.max(0, last);
});
</script>

<template>
  <section class="arcade" aria-labelledby="arcade-title">
    <ScreenHeader
      :title="t('arcade.title')"
      title-id="arcade-title"
      currency="shards"
      @back="emit('home')"
    />
    <p class="intro">{{ t('arcade.intro') }}</p>

    <SwiperDeck :label="t('arcade.modesLabel')" :names="names" :initial="current">
      <div v-for="mode in modes" :key="mode.id" class="swiper-slide">
        <article
          class="mode"
          :class="{ locked: !mode.open }"
          :aria-labelledby="`mode-${mode.id}`"
          :data-testid="`mode-${mode.id}`"
        >
          <div class="emblem" :class="`emblem-${mode.id}`" aria-hidden="true"></div>
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
            {{
              playable(mode.unlockedBy)
                ? t('arcade.locked', { world: t(`worlds.${mode.unlockedBy}.name`) })
                : t('demo.fullGame')
            }}
          </p>

          <div v-else-if="mode.id === 'endless'" class="choices stagger">
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
            <div class="choices stagger">
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
                      ? t(
                          'arcade.puzzle.dailyDone',
                          { shots: dailyRecord.shots },
                          dailyRecord.shots,
                        )
                      : t('arcade.puzzle.dailyTried')
                  }}
                </small>
                <small v-else>{{ t('arcade.puzzle.dailyTodo') }}</small>
              </button>
            </div>
            <p class="detail">
              {{
                t('arcade.puzzle.solvedCount', {
                  count: arcade.puzzlesSolved,
                  total: PUZZLES.length,
                })
              }}
            </p>
            <ol class="tiles stagger">
              <li v-for="tile in puzzles" :key="tile.puzzle.id">
                <button
                  class="tile"
                  :class="{ done: tile.stars > 0 }"
                  type="button"
                  :disabled="!tile.open"
                  :data-testid="`puzzle-${tile.puzzle.number}`"
                  :aria-label="
                    tile.open
                      ? t(
                          'arcade.puzzle.tileLabel',
                          { number: tile.puzzle.number, stars: tile.stars },
                          tile.stars,
                        )
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

          <div v-else-if="mode.id === 'rhythm'" class="choices stagger">
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

          <div v-else class="choices stagger">
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
      </div>
    </SwiperDeck>
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

.intro,
.tagline,
.soon,
.detail {
  color: var(--text-muted);
}

.swiper-slide {
  display: flex;
  justify-content: center;
  padding-top: 2.5rem;
}

.mode {
  position: relative;
  display: grid;
  gap: var(--space-4);
  width: min(calc(100% - 2.5rem), 46rem);
  padding: calc(var(--space-6) + 2rem) var(--space-4) var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.mode.locked {
  border-style: dashed;
}

.mode.locked .emblem {
  filter: grayscale(1);
  opacity: 0.6;
}

/* Each mode's emblem straddles the top edge of its card. */
.emblem {
  position: absolute;
  top: -2.5rem;
  left: 50%;
  width: 5rem;
  height: 5rem;
  border-radius: 1.4rem;
  box-shadow:
    0 0.75rem 1.5rem rgb(0 0 0 / 0.3),
    0 0 0 4px var(--surface);
  transform: translateX(-50%) rotate(-8deg);
}

/* Endless: a spiral of rings; Puzzles: a grid of dots; Rhythm: bars; Duel: two halves. */
.emblem-endless {
  background:
    repeating-radial-gradient(
      circle at 50% 50%,
      transparent 0 6px,
      rgb(255 255 255 / 0.55) 6px 9px
    ),
    linear-gradient(135deg, var(--orb-violet), var(--orb-cyan));
}

.emblem-puzzle {
  background:
    radial-gradient(circle, rgb(255 255 255 / 0.75) 0 4px, transparent 5px) 0 0 / 1.25rem 1.25rem,
    linear-gradient(135deg, var(--orb-lime), var(--orb-cyan));
}

.emblem-rhythm {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.6) 0 5px, transparent 5px 12px),
    linear-gradient(135deg, var(--orb-rose), var(--orb-violet));
}

.emblem-duel {
  background: linear-gradient(135deg, var(--orb-ruby) 0 50%, var(--orb-amber) 50% 100%);
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
