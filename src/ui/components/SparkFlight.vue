<script setup lang="ts">
import { computed } from 'vue';

/** A point, in the coordinates of the nearest positioned ancestor. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Golden sparks that leave a point in an arc and fly into another (v1.8.0):
 * the shards a launcher costs, poured into its picture on the victory panel,
 * or the daily gift's, poured into the wallet. Decoration only: hidden from
 * screen readers, and never under the finger.
 */
const props = withDefaults(
  defineProps<{
    from: Point;
    to: Point;
    count?: number;
    /** Each spark's flight and the gap between two departures, in milliseconds. */
    duration?: number;
    stagger?: number;
    /** How far the arc rises above the straight line at its middle, in rem. */
    lift?: number;
  }>(),
  { count: 7, duration: 300, stagger: 20, lift: 1.6 },
);

const style = computed(() => ({
  left: `${props.from.x}px`,
  top: `${props.from.y}px`,
  '--dx': `${props.to.x - props.from.x}px`,
  '--dy': `${props.to.y - props.from.y}px`,
  '--flight': `${props.duration}ms`,
  '--stagger': `${props.stagger}ms`,
  '--lift': `${props.lift}rem`,
}));
</script>

<template>
  <span class="sparks" :style="style" aria-hidden="true">
    <span v-for="i in count" :key="i" class="spark" :style="{ '--i': i }"></span>
  </span>
</template>

<style scoped>
.sparks {
  position: absolute;
  z-index: 3;
  width: 0;
  height: 0;
  pointer-events: none;
}

.spark {
  --size: calc(0.25rem + var(--i) * 0.06rem);

  position: absolute;
  top: calc(var(--size) / -2);
  left: calc(var(--size) / -2);
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: var(--primary-top);
  box-shadow: 0 0 0.6rem var(--primary-top);
  opacity: 0;
  animation: spark var(--flight) ease-in calc(var(--i) * var(--stagger)) forwards;
}

@keyframes spark {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }

  50% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.5), calc(var(--dy) * 0.5 - var(--lift))) scale(0.85);
  }

  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.4);
  }
}

/* With reduced motion, nothing flies: the sparks stay unseen. */
@media (prefers-reduced-motion: reduce) {
  .spark {
    animation: none;
  }
}
</style>
