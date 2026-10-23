<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { PlayMode } from '@/app/modes';
import { ingredients, SECONDARIES } from '@/engine/chain/Alchemy';
import type { HudState } from '@/play/PlaySession';
import SoundToggle from '@/ui/components/SoundToggle.vue';
import StarGauge from '@/ui/components/StarGauge.vue';
import { useMessage } from './useMessage';

/**
 * The game's top bar (v1.7.6, from the game screen): pause, the level, the
 * score and its star gauge, the badges; what comes and goes floats beside it
 * (the chips), and a boss's health, the recipes or the rope get a second line.
 * On a wide screen, the bar becomes the left rail.
 */
const props = defineProps<{
  mode: PlayMode;
  hud: HudState | null;
  assisted: boolean;
  /** The second line is kept from the start, so that the board never moves. */
  extraRow: boolean;
}>();
const emit = defineEmits<{ pause: []; reached: [stars: number] }>();

const { t, locale } = useI18n();
const { settings } = useServices();
const say = useMessage();
const number = computed(() => new Intl.NumberFormat(locale.value));
/** Jewel world: the three mixes, always on screen. */
const RECIPES = SECONDARIES.map((result) => {
  const [a, b] = ingredients(result)!;
  return { a, b, result };
});
/** The sign of star fragments in the top bar. */
const FRAGMENT = '✦';

const bar = ref<HTMLElement | null>(null);
const extra = ref<HTMLElement | null>(null);
/** The bar and the second line, which the board is fitted beside. */
defineExpose({ bar, extra });
</script>

<template>
  <div ref="bar" class="hud">
    <button
      class="btn hud-button"
      type="button"
      :aria-label="t('game.pause')"
      data-testid="pause"
      @click="emit('pause')"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
        <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
      </svg>
    </button>
    <p class="level">
      <span class="level-name" data-testid="level">{{ say(props.mode.label) }}</span>
      <span v-if="props.mode.ranked" class="level-detail" data-testid="difficulty">
        {{ t(`difficulty.${settings.current.difficulty}.name`) }}
      </span>
    </p>
    <p class="score">
      <span class="label">{{ t('game.score') }}</span>
      <span class="value" data-testid="score">{{ number.format(hud?.score ?? 0) }}</span>
      <StarGauge
        v-if="props.mode.stars"
        :score="hud?.score ?? 0"
        :thresholds="props.mode.stars"
        @reached="(stars) => emit('reached', stars)"
      />
      <span v-if="(hud?.streak ?? 0) >= 2" class="streak">
        {{ t('game.streak', { count: hud?.streak ?? 0 }) }}
      </span>
    </p>
    <div class="hud-end">
      <p v-if="hud && hud.shotsLeft !== null" class="badge" data-testid="shots">
        {{ t('arcade.puzzle.shotsLeft', { count: hud.shotsLeft }, hud.shotsLeft) }}
      </p>
      <p
        v-if="hud && hud.fragments !== null"
        class="badge fragments"
        :aria-label="t('observatory.caught', { count: hud.fragments }, hud.fragments)"
        data-testid="fragments"
      >
        {{ FRAGMENT }} {{ hud.fragments }}
      </p>
      <p v-if="hud && hud.stage !== null" class="badge" data-testid="stage">
        {{ t('arcade.endless.stage', { stage: hud.stage + 1 }) }}
      </p>
      <SoundToggle class="btn hud-sound" />
    </div>
  </div>

  <!-- What comes and goes floats beside the HUD: it never takes room from the board. -->
  <div class="chips" :class="{ low: extraRow }">
    <p v-if="assisted" class="chip" data-testid="assisted">{{ t('assist.active') }}</p>
    <p v-if="hud?.groove" class="chip groove" data-testid="groove">
      {{ t('arcade.rhythm.groove', { multiplier: hud.groove }) }}
    </p>
    <p v-if="hud?.weather" class="chip weather" :class="hud.weather" data-testid="weather">
      {{ t(`weather.${hud.weather}.name`) }}
    </p>
    <p v-if="hud?.slow" class="chip power slow" data-testid="slow">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M7 4h10v2.2l-3.6 5.8 3.6 5.8V20H7v-2.2l3.6-5.8L7 6.2z" fill="currentColor" />
      </svg>
      {{ t('power.slow.chip', { seconds: hud.slow }) }}
    </p>
    <p v-if="hud?.powerShot" class="chip power" :class="hud.powerShot" data-testid="power-shot">
      <span v-if="hud.powerShot === 'wild'" class="prism" aria-hidden="true"></span>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M13 2 5 13h5.2L8 22l9-11.5h-5.2z" fill="currentColor" />
      </svg>
      {{ t(`power.${hud.powerShot === 'wild' ? 'rainbow' : 'laser'}.ready`) }}
    </p>
  </div>

  <div v-if="extraRow" ref="extra" class="hud-extra">
    <p
      v-if="props.mode.alchemy"
      class="alchemy"
      :aria-label="t('alchemy.title')"
      data-testid="alchemy"
    >
      <span v-for="recipe in RECIPES" :key="recipe.result" class="recipe">
        <span class="sr-only">
          {{
            t('alchemy.formula', {
              a: t(`tones.${recipe.a}`),
              b: t(`tones.${recipe.b}`),
              result: t(`tones.${recipe.result}`),
            })
          }}
        </span>
        <span class="dot" :class="`tone-${recipe.a}`" aria-hidden="true"></span>
        <span class="op" aria-hidden="true">+</span>
        <span class="dot" :class="`tone-${recipe.b}`" aria-hidden="true"></span>
        <span class="op" aria-hidden="true">=</span>
        <span class="dot" :class="`tone-${recipe.result}`" aria-hidden="true"></span>
      </span>
    </p>
    <label v-if="hud?.colossus && props.mode.boss" class="colossus">
      <span>{{ say(props.mode.boss) }}</span>
      <progress
        class="health"
        :max="hud.colossus.maxHp"
        :value="hud.colossus.hp"
        data-testid="colossus"
      ></progress>
    </label>
    <div v-if="hud && hud.tug !== null" class="duel" data-testid="duel">
      <span class="side">{{ t('arcade.duel.you') }}</span>
      <meter
        class="rope"
        min="0"
        max="1"
        low="0.3"
        high="0.7"
        optimum="1"
        :value="1 - hud.tug"
        :aria-label="t('arcade.duel.rope')"
        data-testid="tug"
      ></meter>
      <span class="side rival">
        {{ t('arcade.duel.rival', { score: number.format(hud.rivalScore ?? 0) }) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/*
 * The bar floats over the board's top edge, in a strip of a fixed size: the
 * board is fitted beside it, so it never moves or resizes while the level is
 * played. Its sizes come from the game screen (--hud-row, --gauge-row…).
 */
.hud,
.hud-extra,
.chips {
  position: absolute;
  z-index: 2;
  margin: 0;
  pointer-events: none;
  /* A drag that starts on the HUD neither scrolls nor zooms the page. */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.hud :is(button, label),
.hud-extra :is(button, label) {
  pointer-events: auto;
}

/*
 * A night board (§ 3.5) stays a night sky under the light theme: what floats
 * over the board without a pill of its own gets one. One selector per part:
 * scoped, an `:is()` would take its scope on `.game`, which is the screen's.
 */
:root:not([data-theme='dark']) .game.night .score,
:root:not([data-theme='dark']) .game.night .colossus,
:root:not([data-theme='dark']) .game.night .alchemy,
:root:not([data-theme='dark']) .game.night .duel {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: var(--shadow);
}

/* Upright screens: a strip along the top, with the gauge's line under its buttons… */
.hud {
  inset: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: calc(var(--hud-row) + var(--gauge-row) + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) max(var(--space-3), env(safe-area-inset-right)) var(--gauge-row)
    max(var(--space-3), env(safe-area-inset-left));
  background: linear-gradient(to bottom, var(--scrim), transparent);
}

.hud-button,
.hud-sound {
  flex: none;
  width: var(--touch);
  height: var(--touch);
  min-width: 0;
  padding: 0;
  border-color: var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
}

.level {
  display: grid;
  min-width: 0;
  max-width: 32%;
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-2) 88%, transparent);
  line-height: 1.15;
}

.level-name {
  overflow: hidden;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-detail {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--hud-small);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score {
  position: absolute;
  top: calc(env(safe-area-inset-top) + var(--hud-row) / 2);
  left: 50%;
  display: grid;
  justify-items: center;
  margin: 0;
  line-height: 1;
  transform: translate(-50%, -50%);
}

.label {
  color: var(--text-muted);
  font-size: var(--hud-small);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.value {
  color: var(--accent);
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 1.25rem + 1.2vw, 2.1rem);
  font-weight: 400;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

/* The star gauge hangs under the score, in the strip's own line: it covers nothing. */
.score .star-gauge {
  position: absolute;
  top: calc(100% + 0.2rem);
  left: 50%;
  width: var(--gauge-width);
  transform: translateX(-50%);
}

/* Under the score, out of the flow: a streak never moves anything. */
.streak {
  position: absolute;
  top: calc(100% + 0.2rem);
  padding: 0.1rem var(--space-2);
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: var(--hud-small);
  font-weight: 800;
  white-space: nowrap;
}

/*
 * With a gauge, the streak goes beside it, level with its bar: under the
 * strip, it would hide the top of the track.
 */
.gauged .streak {
  top: calc(100% + 0.5rem);
  left: calc(50% + var(--gauge-width) / 2 + 0.4rem);
}

.hud-end {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.badge,
.chip {
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-2) 88%, transparent);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chip {
  font-size: var(--hud-small);
  box-shadow: var(--shadow);
}

.groove,
.fragments {
  box-shadow: inset 0 0 0 2px var(--orb-cyan);
}

/* The powers at work (v1.7): their colour on the ring of the chip, their icon in front. */
.chip.power {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.chip.slow {
  box-shadow:
    inset 0 0 0 2px var(--orb-cyan),
    var(--shadow);
}

.chip.slow svg {
  color: var(--orb-cyan);
}

.chip.laser {
  box-shadow:
    inset 0 0 0 2px var(--orb-violet),
    var(--shadow);
}

.chip.laser svg {
  color: var(--orb-violet);
}

.chip.wild {
  box-shadow:
    inset 0 0 0 2px var(--text-muted),
    var(--shadow);
}

.prism {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: conic-gradient(
    var(--orb-ruby),
    var(--orb-amber),
    var(--orb-lime),
    var(--orb-cyan),
    var(--orb-violet),
    var(--orb-rose),
    var(--orb-ruby)
  );
}

/* …what comes and goes floats just below it, on the right… */
.chips {
  top: calc(env(safe-area-inset-top) + var(--hud-row) + var(--gauge-row) + var(--space-1));
  right: max(var(--space-3), env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}

.chips.low {
  top: calc(
    env(safe-area-inset-top) + var(--hud-row) + var(--gauge-row) + var(--extra-row) + var(--space-1)
  );
}

/* …and a boss's health, the recipes or the rope get a second line of their own. */
.hud-extra {
  top: calc(env(safe-area-inset-top) + var(--hud-row) + var(--gauge-row));
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--extra-row);
  padding-inline: max(var(--space-4), env(safe-area-inset-right))
    max(var(--space-4), env(safe-area-inset-left));
}

.colossus {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(100%, 32rem);
  color: var(--danger);
  font-weight: 800;
}

.health {
  flex: 1;
  height: 0.75rem;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-2);
  accent-color: var(--danger);
  appearance: none;
}

.health::-webkit-progress-bar {
  background: var(--surface-2);
}

.health::-webkit-progress-value {
  background: var(--danger);
}

.health::-moz-progress-bar {
  background: var(--danger);
}

.alchemy {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1) var(--space-4);
  margin: 0;
  font-weight: 800;
}

.recipe {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.op {
  color: var(--text-muted);
}

.dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
}

.duel {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(100%, 32rem);
  font-weight: 800;
}

.rope {
  flex: 1;
  height: 0.75rem;
}

.side.rival {
  color: var(--danger);
}

.weather {
  animation: weather 1.2s ease-in-out infinite alternate;
}

.weather.solar {
  box-shadow: inset 0 0 0 2px var(--orb-amber);
}

.weather.cold {
  box-shadow: inset 0 0 0 2px var(--orb-cyan);
}

.weather.wind {
  box-shadow: inset 0 0 0 2px var(--orb-violet);
}

@keyframes weather {
  to {
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .weather {
    animation: none;
  }
}

/*
 * Wide screens (phones on their side, desktop windows): the height is what
 * the level lacks, so the HUD becomes a rail on the left.
 */
@container game (aspect-ratio >= 3/2) {
  .hud {
    inset: 0 auto 0 var(--side);
    flex-direction: column;
    gap: var(--space-3);
    width: calc(var(--rail) + env(safe-area-inset-left));
    height: auto;
    padding: max(var(--space-3), env(safe-area-inset-top)) var(--space-2)
      max(var(--space-3), env(safe-area-inset-bottom))
      max(var(--space-2), env(safe-area-inset-left));
    background: linear-gradient(to right, var(--scrim), transparent);
  }

  .level {
    max-width: 100%;
    justify-items: center;
    padding-inline: var(--space-2);
    text-align: center;
  }

  .level-name {
    white-space: normal;
  }

  /* In the rail, the gauge follows the score and the streak goes under both. */
  .score {
    position: relative;
    inset: auto;
    transform: none;
  }

  .score .star-gauge {
    position: static;
    width: 100%;
    margin-top: 0.35rem;
    transform: none;
  }

  .gauged .streak {
    top: calc(100% + 0.2rem);
    left: auto;
  }

  .value {
    font-size: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  }

  .hud-end {
    flex-direction: column;
    margin: auto 0 0;
  }

  .chips {
    top: max(var(--space-3), env(safe-area-inset-top));
    right: auto;
    left: calc(var(--side) + var(--rail) + env(safe-area-inset-left) + var(--space-2));
    align-items: flex-start;
  }

  .chips.low {
    top: calc(var(--extra-row) + max(var(--space-3), env(safe-area-inset-top)));
  }

  .hud-extra {
    top: 0;
    right: calc(var(--side) + var(--rail) + env(safe-area-inset-right));
    left: calc(var(--side) + var(--rail) + env(safe-area-inset-left));
    height: calc(var(--extra-row) + env(safe-area-inset-top));
    padding-top: env(safe-area-inset-top);
  }
}

/*
 * A desktop window wider than 2:1 (v1.7.6, Playgama's rule): the playing
 * frame stays 2:1 in the middle; the rail's shade starts at the window's
 * edge, so the frame shows no seam.
 */
@media (pointer: fine) {
  @container game (aspect-ratio >= 2/1) {
    .hud,
    .chips,
    .hud-extra {
      --side: max(0px, (100cqw - 200cqh) / 2);
    }

    .hud {
      isolation: isolate;
      background: none;
    }

    .hud::before {
      content: '';
      position: absolute;
      inset: 0;
      left: calc(-1 * var(--side));
      z-index: -1;
      background: linear-gradient(to right, var(--scrim), transparent);
      pointer-events: none;
    }
  }
}
</style>
