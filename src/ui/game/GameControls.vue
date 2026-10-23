<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PlayMode } from '@/app/modes';
import type { HudState } from '@/play/PlaySession';
import { useMessage } from './useMessage';

/**
 * The game's buttons (v1.7.6, from the game screen): swap, the Nova's gauge
 * and the magnet, in a strip along the bottom, or the right rail on a wide
 * screen.
 */
const props = defineProps<{ mode: PlayMode; hud: HudState | null }>();
const emit = defineEmits<{ swap: []; magnet: [] }>();

const { t } = useI18n();
const say = useMessage();
const bar = ref<HTMLElement | null>(null);
/** The strip, which the board is fitted beside. */
defineExpose({ bar });
</script>

<template>
  <div ref="bar" class="controls">
    <button class="btn control swap" type="button" data-testid="swap" @click="emit('swap')">
      <span class="balls" aria-hidden="true">
        <span class="dot" :class="`tone-${hud?.current ?? 0}`"></span>
        <span class="dot small" :class="`tone-${hud?.next ?? 0}`"></span>
      </span>
      <span class="control-label">{{ say(props.mode.swapLabel) }}</span>
    </button>
    <label v-if="hud && hud.nova !== null" class="control nova" data-testid="nova">
      <span class="control-label">
        {{ t(hud.nova >= 1 ? 'upgrades.nova.ready' : 'upgrades.nova.name') }}
      </span>
      <progress class="gauge" max="1" :value="hud.nova"></progress>
    </label>
    <button
      v-if="hud?.magnet"
      class="btn control magnet"
      :class="{ armed: hud.magnetArmed }"
      type="button"
      :aria-pressed="hud.magnetArmed"
      :aria-label="t('magnet.label', { count: hud.magnet.charges, max: hud.magnet.max })"
      :disabled="hud.magnet.charges === 0 && !hud.magnetArmed"
      data-testid="magnet"
      @click="emit('magnet')"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M6 3v9a6 6 0 0 0 12 0V3h-4v9a2 2 0 0 1-4 0V3z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
      <span class="control-label" aria-hidden="true">{{ t('magnet.button') }}</span>
      <span class="charges" aria-hidden="true">
        <span
          v-for="index in hud.magnet.max"
          :key="index"
          class="charge"
          :class="{ full: index <= hud.magnet.charges }"
        ></span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.controls {
  position: absolute;
  z-index: 2;
  margin: 0;
  pointer-events: none;
  /* A drag that starts on the buttons' strip neither scrolls nor zooms the page. */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.controls :is(button, label) {
  pointer-events: auto;
}

/* Upright screens: the buttons along the bottom. */
.controls {
  inset: auto 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: calc(var(--controls-row) + env(safe-area-inset-bottom));
  padding: 0 max(var(--space-3), env(safe-area-inset-right)) env(safe-area-inset-bottom)
    max(var(--space-3), env(safe-area-inset-left));
  background: linear-gradient(to top, var(--scrim), transparent);
}

.control {
  flex-direction: row;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  border-radius: 999px;
  font-weight: 800;
  white-space: nowrap;
}

.control:active:not(:disabled) {
  transform: translateY(2px);
}

/* The buttons pressed all game long (swap, magnet, Nova): 48 px under a finger (v1.7.6). */
@media (pointer: coarse) {
  .control {
    min-height: 3rem;
  }
}

/* On the narrowest phones, a long label takes two balanced lines rather than leave its button. */
.control-label {
  white-space: normal;
  text-wrap: balance;
}

/* From 22.5rem (360 px), the button decides: one line in the bottom bar, two in the side rail. */
@container game (width >= 22.5rem) {
  .control-label {
    white-space: inherit;
  }
}

.balls {
  display: inline-flex;
  align-items: center;
}

.magnet.armed {
  border-color: var(--orb-cyan);
  background: var(--orb-cyan);
  color: var(--on-accent);
}

.charges {
  display: inline-flex;
  gap: 0.2rem;
}

.charge {
  width: 0.55rem;
  height: 0.55rem;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.charge.full {
  background: currentColor;
}

.nova {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.gauge {
  width: 4.5rem;
  height: 0.6rem;
  accent-color: var(--orb-cyan);
}

.dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
}

.dot.small {
  width: 0.8rem;
  height: 0.8rem;
  margin-left: -0.35rem;
}

/* Wide screens (phones on their side, desktop windows): the buttons become a rail on the right. */
@container game (aspect-ratio >= 3/2) {
  .controls {
    inset: 0 var(--side) 0 auto;
    flex-direction: column;
    width: calc(var(--rail) + env(safe-area-inset-right));
    height: auto;
    padding: max(var(--space-3), env(safe-area-inset-top))
      max(var(--space-2), env(safe-area-inset-right))
      max(var(--space-3), env(safe-area-inset-bottom)) var(--space-2);
    background: linear-gradient(to left, var(--scrim), transparent);
  }

  .control,
  .nova {
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
    padding: var(--space-2) var(--space-1);
    border-radius: var(--radius);
    white-space: normal;
    text-align: center;
  }

  .gauge {
    width: 100%;
  }
}

/* A desktop window wider than 2:1: the rail at the playing frame's edge, its shade from the window's. */
@media (pointer: fine) {
  @container game (aspect-ratio >= 2/1) {
    .controls {
      --side: max(0px, (100cqw - 200cqh) / 2);
      isolation: isolate;
      background: none;
    }

    .controls::before {
      content: '';
      position: absolute;
      inset: 0;
      right: calc(-1 * var(--side));
      z-index: -1;
      background: linear-gradient(to left, var(--scrim), transparent);
      pointer-events: none;
    }
  }
}
</style>
