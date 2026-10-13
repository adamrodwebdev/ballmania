<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * The studio's signature before the home page, the same as Catapulte Mania's:
 * a gold hexagon draws itself and turns, an "A" appears inside, a spark runs
 * around it, then the name writes itself letter by letter, "presents".
 * About 2.6 s; any key (but Tab) or a tap skips it. With reduced motion, the
 * final picture shows at once for 1.4 s. CSS only: no image, font or sound.
 */
const emit = defineEmits<{ done: [] }>();
const { t } = useI18n();

const leaving = ref(false);
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** "AdamRod" in light, "WebTech" in gold. */
const NAME = [
  ...Array.from('AdamRod', (char) => ({ char, gold: false })),
  ...Array.from('WebTech', (char) => ({ char, gold: true })),
];
let timer: number | undefined;

const finish = () => {
  if (leaving.value) return;
  leaving.value = true;
  window.clearTimeout(timer);
  window.setTimeout(() => emit('done'), 350);
};
const onKey = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') finish();
};

onMounted(() => {
  timer = window.setTimeout(finish, still ? 1400 : 2600);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  window.clearTimeout(timer);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div
    class="studio"
    :class="{ still, leaving }"
    role="img"
    :aria-label="t('studio.label')"
    data-testid="studio-intro"
    @pointerdown="finish"
  >
    <div class="glow" aria-hidden="true"></div>
    <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
      <path class="hex" pathLength="100" d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" />
      <path class="a" pathLength="100" d="M15 33 24 13l9 20" />
      <path class="bar" pathLength="100" d="M19 26h10" />
      <path class="shine" pathLength="100" d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" />
    </svg>
    <p class="name" aria-hidden="true">
      <span
        v-for="(letter, index) in NAME"
        :key="index"
        class="letter"
        :class="{ gold: letter.gold }"
        v-text="letter.char"
      ></span>
    </p>
    <p class="presents" aria-hidden="true">{{ t('studio.presents') }}</p>
  </div>
</template>

<style scoped>
.studio {
  --gold: #e0b04a;
  --gold-hi: #f5cf6e;
  --fg: #f4efe4;
  --studio-font: 'Rajdhani', 'Bahnschrift', 'DIN Alternate', 'Arial Narrow', system-ui, sans-serif;
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #000;
  color: var(--fg);
  cursor: pointer;
  overflow: hidden;
  transition: opacity 0.35s ease;
}

.leaving {
  opacity: 0;
}

.glow {
  position: absolute;
  inset: -20%;
  background: radial-gradient(
    closest-side at 50% 44%,
    rgb(224 176 74 / 0.28),
    rgb(154 116 32 / 0.12) 45%,
    transparent 75%
  );
  opacity: 0;
  animation: studio-fade 1s 0.9s ease-out forwards;
}

.mark {
  position: relative;
  width: min(30vw, 8.5rem);
  height: auto;
  overflow: visible;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hex {
  stroke: var(--gold);
  stroke-width: 2;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  transform-origin: 24px 24px;
  animation:
    studio-draw 0.75s 0.1s cubic-bezier(0.6, 0, 0.3, 1) forwards,
    studio-turn 0.7s 1.05s cubic-bezier(0.3, 0, 0.2, 1) forwards;
}

.a,
.bar {
  stroke: var(--gold-hi);
  stroke-width: 2.4;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
}

.a {
  animation: studio-draw 0.45s 0.6s ease-out forwards;
}

.bar {
  animation: studio-draw 0.2s 0.95s ease-out forwards;
}

.shine {
  stroke: #fff6d6;
  stroke-width: 2.6;
  stroke-dasharray: 10 90;
  stroke-dashoffset: 100;
  opacity: 0;
  filter: drop-shadow(0 0 2px var(--gold-hi));
  transform-origin: 24px 24px;
  animation:
    studio-shine 0.9s 1.05s ease-in-out forwards,
    studio-turn 0.7s 1.05s cubic-bezier(0.3, 0, 0.2, 1) forwards;
}

.name {
  position: relative;
  margin: 0.5rem 0 0;
  font-family: var(--studio-font);
  font-weight: 600;
  font-size: clamp(1.8rem, 7vw, 3.4rem);
  letter-spacing: 0.04em;
  line-height: 1.1;
  white-space: nowrap;
}

/* Letter by letter, 35 ms apart (no inline style: the CSP forbids them). */
.letter {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.35em);
  filter: blur(6px);
  animation: studio-letter 0.45s 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.letter:nth-child(2) {
  animation-delay: 1.335s;
}
.letter:nth-child(3) {
  animation-delay: 1.37s;
}
.letter:nth-child(4) {
  animation-delay: 1.405s;
}
.letter:nth-child(5) {
  animation-delay: 1.44s;
}
.letter:nth-child(6) {
  animation-delay: 1.475s;
}
.letter:nth-child(7) {
  animation-delay: 1.51s;
}
.letter:nth-child(8) {
  animation-delay: 1.545s;
}
.letter:nth-child(9) {
  animation-delay: 1.58s;
}
.letter:nth-child(10) {
  animation-delay: 1.615s;
}
.letter:nth-child(11) {
  animation-delay: 1.65s;
}
.letter:nth-child(12) {
  animation-delay: 1.685s;
}
.letter:nth-child(13) {
  animation-delay: 1.72s;
}
.letter:nth-child(14) {
  animation-delay: 1.755s;
}

.gold {
  color: var(--gold);
  font-weight: 700;
}

.presents {
  position: relative;
  margin: 0;
  font-family: var(--studio-font);
  font-size: clamp(0.85rem, 2.4vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0;
  animation: studio-fade 0.5s 1.95s ease forwards;
}

@keyframes studio-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes studio-turn {
  to {
    transform: rotate(60deg);
  }
}

@keyframes studio-shine {
  0% {
    opacity: 0;
    stroke-dashoffset: 100;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    stroke-dashoffset: 0;
  }
}

@keyframes studio-letter {
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes studio-fade {
  to {
    opacity: 1;
  }
}

/* Reduced motion: the final picture, at once. */
.still * {
  animation: none !important;
}

.still .hex,
.still .a,
.still .bar {
  stroke-dashoffset: 0;
}

.still .shine {
  opacity: 0;
}

.still .letter {
  transform: none;
  opacity: 1;
  filter: none;
}

.still .glow,
.still .presents {
  opacity: 1;
}
</style>
