<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits<{ play: [] }>();

/** A decorative chain of orbs along a wave: position and colour of each orb. */
const ORBS = [
  { x: 24, y: 78, tone: 'ruby' },
  { x: 62, y: 62, tone: 'ruby' },
  { x: 100, y: 52, tone: 'amber' },
  { x: 140, y: 50, tone: 'cyan' },
  { x: 180, y: 56, tone: 'cyan' },
  { x: 220, y: 66, tone: 'cyan' },
  { x: 260, y: 72, tone: 'violet' },
  { x: 300, y: 70, tone: 'lime' },
  { x: 336, y: 60, tone: 'rose' },
] as const;
</script>

<template>
  <section class="hero" aria-labelledby="home-title">
    <svg class="chain" viewBox="0 0 360 120" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="orb-shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stop-color="#fff" stop-opacity="0.9" />
          <stop offset="0.35" stop-color="#fff" stop-opacity="0.15" />
          <stop offset="1" stop-color="#000" stop-opacity="0.35" />
        </radialGradient>
      </defs>
      <path class="path" d="M0 90 C 80 30, 160 40, 220 66 S 330 80, 360 50" />
      <g v-for="(orb, index) in ORBS" :key="index" :class="['orb', `orb-${orb.tone}`]">
        <circle :cx="orb.x" :cy="orb.y" r="17" />
        <circle :cx="orb.x" :cy="orb.y" r="17" fill="url(#orb-shine)" />
      </g>
    </svg>
    <h1 id="home-title" class="title">{{ t('app.name') }}</h1>
    <p class="tagline">{{ t('home.tagline') }}</p>
    <p class="pitch">{{ t('home.pitch') }}</p>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-testid="play" @click="emit('play')">
        <span>{{ t('home.play') }}</span>
        <small>{{ t('home.demo') }}</small>
      </button>
      <button class="btn" type="button" disabled>
        <span>{{ t('home.arcade') }}</span>
        <small>{{ t('home.soon') }}</small>
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  width: min(100%, 48rem);
  margin-inline: auto;
  padding: var(--space-8) var(--space-4) var(--space-12);
  text-align: center;
}

.chain {
  width: min(100%, 30rem);
  height: auto;
  aspect-ratio: 3 / 1;
  overflow: visible;
}

.path {
  fill: none;
  stroke: var(--path);
  stroke-width: 22;
  stroke-linecap: round;
}

.orb {
  animation: float 4s ease-in-out infinite;
}

.orb:nth-child(odd) {
  animation-delay: -2s;
}

.orb-ruby {
  fill: var(--orb-ruby);
}
.orb-amber {
  fill: var(--orb-amber);
}
.orb-lime {
  fill: var(--orb-lime);
}
.orb-cyan {
  fill: var(--orb-cyan);
}
.orb-violet {
  fill: var(--orb-violet);
}
.orb-rose {
  fill: var(--orb-rose);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(2.75rem, 2rem + 5vw, 5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.tagline {
  color: var(--accent);
  font-size: clamp(1.15rem, 1rem + 1vw, 1.6rem);
  font-weight: 700;
}

.pitch {
  max-width: 36rem;
  color: var(--text-muted);
}

.actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: var(--space-3);
  width: min(100%, 26rem);
  margin-top: var(--space-4);
}

@keyframes float {
  50% {
    transform: translateY(-4px);
  }
}
</style>
