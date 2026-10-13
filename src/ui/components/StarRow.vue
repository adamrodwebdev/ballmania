<script setup lang="ts">
/** Three stars, `count` of them lit; the label is read instead of the drawing. */
defineProps<{ count: number; label: string; size?: 'small' | 'large' }>();
</script>

<template>
  <span class="stars" :class="size ?? 'small'" role="img" :aria-label="label">
    <svg v-for="index in 3" :key="index" viewBox="0 0 24 24" aria-hidden="true">
      <path
        :class="index <= count ? 'lit' : 'unlit'"
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      />
    </svg>
  </span>
</template>

<style scoped>
.stars {
  display: inline-flex;
  gap: 0.1rem;
}

.small svg {
  width: 1rem;
  height: 1rem;
}

.large svg {
  width: clamp(2.5rem, 2rem + 3vw, 3.5rem);
  height: clamp(2.5rem, 2rem + 3vw, 3.5rem);
}

.lit {
  fill: var(--star);
  stroke: var(--star-edge);
  stroke-width: 1;
}

.unlit {
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.4;
}

/* The stars of a result light up one after the other, with a flash (§ 3.9). */
@media (prefers-reduced-motion: no-preference) {
  .large svg {
    animation: star-pop 0.55s cubic-bezier(0.2, 1.6, 0.4, 1) both;
    transform-origin: center;
  }

  .large svg:nth-child(1) {
    animation-delay: 0.15s;
  }

  .large svg:nth-child(2) {
    animation-delay: 0.4s;
  }

  .large svg:nth-child(3) {
    animation-delay: 0.65s;
  }

  .large .lit {
    animation: star-flash 0.9s ease-out both;
    animation-delay: inherit;
  }
}

@keyframes star-pop {
  from {
    opacity: 0;
    transform: scale(0.2) rotate(-40deg);
  }
}

@keyframes star-flash {
  0% {
    filter: brightness(2.2) drop-shadow(0 0 0.6rem var(--star));
  }
  100% {
    filter: none;
  }
}
</style>
