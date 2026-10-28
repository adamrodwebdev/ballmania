<script setup lang="ts">
import { computed } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';
import type { DefeatSummary, Gesture } from '@/app/DefeatSummary';

/**
 * The top of a defeat's screen (v1.8.1, spec § 3.17): the hole that won, how
 * close it came, honestly (what was left, the share destroyed, the deepest
 * reaction), and one tip. The choices that follow stay the result's.
 */
const props = defineProps<{
  summary: DefeatSummary;
  /** The level, as the top bar names it. */
  label: string;
}>();

/** A tip's picture, in a box of 40 × 28: marbles of the game's palette, and strokes. */
interface Picture {
  readonly marbles: readonly {
    readonly x: number;
    readonly y: number;
    readonly r: number;
    readonly tone: 'rose' | 'cyan' | 'amber' | 'violet';
  }[];
  readonly strokes: readonly string[];
}

/** The gesture a tip teaches, as the mockup drew it, or a group bursting for a level's hint. */
const PICTURES: Record<Gesture | 'hint', Picture> = {
  swap: {
    marbles: [
      { x: 11, y: 15, r: 8, tone: 'rose' },
      { x: 29, y: 15, r: 8, tone: 'cyan' },
    ],
    strokes: ['M8 4c6-4 18-4 24 0M28 1l3 3-3 3'],
  },
  charge: {
    marbles: [{ x: 20, y: 14, r: 7.5, tone: 'amber' }],
    strokes: ['M20 1.5a12.5 12.5 0 1 1-12.5 12.5'],
  },
  hint: {
    marbles: [
      { x: 8, y: 19, r: 6, tone: 'violet' },
      { x: 20, y: 19, r: 6, tone: 'violet' },
      { x: 32, y: 19, r: 6, tone: 'violet' },
    ],
    strokes: ['M20 2v4M12 4l2.5 3M28 4l-2.5 3'],
  },
};

const { t, locale } = useI18n();
const count = computed(() => new Intl.NumberFormat(locale.value).format(props.summary.left.count));
const share = computed(() =>
  new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }).format(
    props.summary.share,
  ),
);
const colossus = computed(() => props.summary.left.what === 'colossus');
const picture = computed(() => PICTURES[props.summary.gesture ?? 'hint']);
</script>

<template>
  <div class="defeat" data-testid="defeat">
    <p class="eyebrow">{{ label }}</p>
    <svg class="vortex" viewBox="0 0 64 64" aria-hidden="true">
      <circle class="halo" cx="32" cy="32" r="30" />
      <circle class="orbit" cx="32" cy="32" r="25" />
      <circle class="core" cx="32" cy="32" r="12" />
    </svg>
    <h2 id="end-title">{{ t(summary.close ? 'game.defeat.close' : 'game.defeat.lost') }}</h2>
    <I18nT
      :keypath="`game.defeat.${colossus ? 'colossusLeft' : 'marblesLeft'}.${summary.close ? 'close' : 'far'}`"
      :plural="summary.left.count"
      tag="p"
      class="left"
      scope="global"
      data-testid="defeat-left"
    >
      <template #count>
        <strong>{{ count }}</strong>
      </template>
    </I18nT>
    <span class="meter" aria-hidden="true">
      <span class="fill" :style="{ transform: `scaleX(${summary.share})` }"></span>
    </span>
    <progress
      class="sr-only"
      max="1"
      :value="summary.share"
      :aria-label="t(colossus ? 'game.defeat.shareColossus' : 'game.defeat.shareChain', { share })"
    ></progress>
    <p class="caption">
      <span data-testid="defeat-share">{{
        t(colossus ? 'game.defeat.shareColossus' : 'game.defeat.shareChain', { share })
      }}</span>
      <span v-if="summary.reaction > 1">{{
        t('game.defeat.reaction', { depth: summary.reaction })
      }}</span>
    </p>
    <div class="tip" data-testid="defeat-tip">
      <svg viewBox="0 0 40 28" aria-hidden="true">
        <circle
          v-for="(marble, index) in picture.marbles"
          :key="index"
          :class="`tone-${marble.tone}`"
          :cx="marble.x"
          :cy="marble.y"
          :r="marble.r"
        />
        <path v-for="stroke in picture.strokes" :key="stroke" class="stroke" :d="stroke" />
      </svg>
      <p>
        <b>{{ t('game.defeat.tip') }}</b>
        {{ t(summary.tip) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.defeat {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.eyebrow {
  margin-bottom: var(--space-2);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.vortex {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto var(--space-2);
}

.halo {
  fill: color-mix(in srgb, var(--danger) 22%, transparent);
}

.orbit {
  fill: none;
  stroke: var(--danger);
  stroke-width: 2.5;
  stroke-dasharray: 6 7;
  transform-origin: center;
  animation: orbit 6s linear infinite;
}

.core {
  fill: var(--hole);
  stroke: var(--danger);
  stroke-width: 2;
}

@keyframes orbit {
  to {
    transform: rotate(-1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .orbit {
    animation: none;
  }
}

h2 {
  margin-bottom: var(--space-2);
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 1.4rem + 0.8vw, 2rem);
  line-height: 1.1;
  text-wrap: balance;
}

.left {
  margin-bottom: var(--space-3);
  font-size: 1.1rem;
  font-weight: 800;
}

.left strong {
  color: var(--danger);
  font-size: 1.3em;
}

.meter {
  display: block;
  height: 0.85rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--danger) 22%, var(--surface-2));
}

.fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent) 70%, var(--surface)),
    var(--accent)
  );
  transform-origin: left;
}

.caption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
  margin: var(--space-2) 0 var(--space-4);
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

.tip {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  text-align: start;
  font-size: 0.95rem;
  line-height: 1.35;
}

.tip svg {
  flex: none;
  width: 2.5rem;
  height: 1.75rem;
}

.tone-rose {
  fill: var(--orb-rose);
}

.tone-cyan {
  fill: var(--orb-cyan);
}

.tone-amber {
  fill: var(--orb-amber);
}

.tone-violet {
  fill: var(--orb-violet);
}

.stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tip b {
  display: block;
  color: var(--text-muted);
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Short windows (portal frames): the tip's title runs into its text. */
@container game (height <= 47.5rem) {
  .vortex {
    width: 2.75rem;
    height: 2.75rem;
  }

  .left {
    margin-bottom: var(--space-2);
  }

  .caption {
    margin-bottom: var(--space-3);
  }

  .tip {
    padding: var(--space-2) var(--space-3);
  }

  .tip b {
    display: inline;
    margin-inline-end: var(--space-1);
  }
}

/* Phones of 640 px and less, a phone on its side: the hole, a decoration, gives way to the
   choices, which all stay in view. */
@container game (height <= 42.5rem) {
  .vortex {
    display: none;
  }

  h2 {
    font-size: 1.5rem;
  }

  .caption {
    margin-top: var(--space-1);
  }

  .tip {
    font-size: 0.875rem;
  }
}
</style>
