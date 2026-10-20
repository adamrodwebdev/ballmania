<script setup lang="ts">
/** Three stars, `count` of them lit; the label is read instead of the drawing. */
defineProps<{ count: number; label: string; size?: 'small' | 'large' }>();
</script>

<template>
  <span class="stars" :class="size ?? 'small'" role="img" :aria-label="label">
    <span v-for="index in 3" :key="index" class="star" :class="index <= count ? 'on' : 'off'">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          :class="index <= count ? 'lit' : 'unlit'"
          d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        />
      </svg>
    </span>
  </span>
</template>

<style scoped>
.stars {
  display: inline-flex;
  gap: 0.1rem;
}

.star {
  position: relative;
  display: inline-grid;
  place-items: center;
}

.small svg {
  width: 1rem;
  height: 1rem;
}

.large {
  gap: var(--space-2);
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

/*
 * The stars of a result light up one after the other (§ 3.9): each one
 * materialises out of a blur, flashes, settles, and sends out a ring of
 * light. The game plays a chime at the same moments (GameScreen STAR_TIMES).
 */
@media (prefers-reduced-motion: no-preference) {
  .large .star {
    animation: star-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .large .star:nth-child(1) {
    animation-delay: 0.35s;
  }

  .large .star:nth-child(2) {
    animation-delay: 0.6s;
  }

  .large .star:nth-child(3) {
    animation-delay: 0.85s;
  }

  .large .star.on::after {
    position: absolute;
    inset: -15%;
    border: 2px solid var(--star);
    border-radius: 50%;
    box-shadow: 0 0 0.75rem var(--star);
    content: '';
    opacity: 0;
    animation: star-ring 0.75s ease-out both;
    animation-delay: inherit;
    pointer-events: none;
  }
}

@keyframes star-in {
  0% {
    opacity: 0;
    transform: scale(0.35);
    filter: blur(4px);
  }

  55% {
    opacity: 1;
    transform: scale(1.14);
    filter: blur(0) brightness(1.9) drop-shadow(0 0 0.7rem var(--star));
  }

  100% {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes star-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.4);
  }

  100% {
    opacity: 0;
    transform: scale(1.9);
  }
}
</style>
