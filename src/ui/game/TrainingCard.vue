<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Message } from '@/app/modes';
import { useMessage } from './useMessage';

/**
 * The card between two showcases of the training (v1.8.0, § 3.13): over the
 * next board, still for a moment, its place in the training, its name and
 * the gesture it shows. No button: it goes by itself, said to screen readers.
 */
defineProps<{ step: number; of: number; name: Message }>();

const { t } = useI18n();
const say = useMessage();
</script>

<template>
  <div class="training-card" role="status" data-testid="training-card">
    <p class="eyebrow">{{ t('training.step', { step, of }) }}</p>
    <p class="title">{{ say(name) }}</p>
    <p class="line">{{ t(`training.steps.${step}.line`) }}</p>
  </div>
</template>

<style scoped>
.training-card {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  background: radial-gradient(ellipse at 50% 48%, transparent, var(--scrim) 70%);
  text-align: center;
  pointer-events: none;
  animation: card 1.8s ease both;
}

.training-card p {
  margin: 0;
}

.eyebrow {
  color: var(--accent);
  font-size: clamp(0.875rem, 0.8rem + 0.3vw, 1.05rem);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* The showcase's name, in the gold of the game's titles. */
.title {
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 2rem + 3.5vw, 5rem);
  line-height: 1;
  letter-spacing: 0.02em;
  text-wrap: balance;
  background: linear-gradient(
    180deg,
    var(--title-top) 0%,
    var(--title-mid) 40%,
    var(--title-low) 75%,
    var(--title-bottom) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-stroke: 0.03em var(--title-edge);
  filter: drop-shadow(0 0.05em 0 var(--title-depth)) drop-shadow(0 0 0.3em var(--title-glow));
}

.line {
  max-width: 28rem;
  color: var(--text);
  font-size: clamp(1rem, 0.95rem + 0.3vw, 1.2rem);
  font-weight: 800;
  text-wrap: balance;
}

@keyframes card {
  0% {
    opacity: 0;
    transform: scale(0.96);
  }

  14%,
  80% {
    opacity: 1;
    transform: none;
  }

  100% {
    opacity: 0;
  }
}

/* Reduced motion: the card shows and goes, without growing. */
@media (prefers-reduced-motion: reduce) {
  .training-card {
    animation: none;
  }
}
</style>
