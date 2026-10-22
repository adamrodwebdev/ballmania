<script setup lang="ts">
import { computed, useId, watch } from 'vue';

/**
 * Under the score (specification § 3.2): how far the points are from the
 * second and third stars, which light up as the score reaches them. The first
 * star is the win itself, so it has no mark. Drawn in SVG: its sizes are
 * attributes, never inline styles (the content security policy forbids them).
 */
const props = defineProps<{ score: number; thresholds: readonly [number, number] }>();
const emit = defineEmits<{ reached: [stars: number] }>();

/** The drawing's frame, in its own units: the bar runs from LEFT to RIGHT. */
const WIDTH = 120;
const LEFT = 4;
const RIGHT = WIDTH - 11;
const SPAN = RIGHT - LEFT;
/** A star of 24 units scaled to 21.6, centred on the bar. */
const STAR = 'M12 2.6l2.85 6 6.55.8-4.85 4.55 1.3 6.5L12 17.2l-5.85 3.25 1.3-6.5L2.6 9.4l6.55-.8z';

const gradient = useId();
const fill = computed(() => SPAN * Math.min(1, Math.max(0, props.score / props.thresholds[1])));
const marks = computed(() =>
  props.thresholds.map((threshold, index) => ({
    stars: index + 2,
    x: LEFT + SPAN * (threshold / props.thresholds[1]),
    lit: props.score >= threshold,
  })),
);

// A star that lights up rings (a jump past both rings once, for the higher one).
watch(
  () => marks.value.filter((mark) => mark.lit).length,
  (now, before) => {
    if (now > before) emit('reached', now + 1);
  },
);
</script>

<template>
  <svg class="star-gauge" :viewBox="`0 0 ${WIDTH} 26`" aria-hidden="true" data-testid="star-gauge">
    <defs>
      <linearGradient :id="gradient" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" class="from" />
        <stop offset="1" class="to" />
      </linearGradient>
    </defs>
    <rect class="track" :x="LEFT" y="11" :width="SPAN" height="5" rx="2.5" />
    <rect :x="LEFT" y="11" :width="fill" height="5" rx="2.5" :fill="`url(#${gradient})`" />
    <g
      v-for="mark in marks"
      :key="mark.stars"
      :transform="`translate(${mark.x - 10.8} 2.7) scale(0.9)`"
    >
      <path class="star" :class="{ lit: mark.lit }" :d="STAR" />
    </g>
  </svg>
</template>

<style scoped>
.star-gauge {
  display: block;
  width: 7rem;
  height: auto;
  overflow: visible;
}

.track {
  fill: color-mix(in srgb, var(--text-muted) 32%, transparent);
}

.from {
  stop-color: var(--primary-mid);
}

.to {
  stop-color: var(--primary-top);
}

.star {
  fill: color-mix(in srgb, var(--text-muted) 55%, var(--surface));
  stroke: var(--star-edge);
  stroke-width: 1.4;
  transform-box: fill-box;
  transform-origin: center;
}

.star.lit {
  fill: var(--star);
  filter: drop-shadow(0 0 0.3rem var(--primary-glow));
}

@media (prefers-reduced-motion: no-preference) {
  .star.lit {
    animation: star-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

@keyframes star-pop {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.45);
  }

  100% {
    transform: scale(1);
  }
}
</style>
