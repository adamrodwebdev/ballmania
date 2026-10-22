<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Swiper from 'swiper';
import { A11y, EffectCreative, Keyboard, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-creative';

/**
 * A deck of cards to swipe through (§ 3.9, navigation): the cards on each
 * side peek out behind the one in front, smaller and tilted, so the deck
 * reads at a glance. Arrows, named bullets, the keyboard and the mouse wheel
 * of a trackpad all move it; with reduced motion, it simply slides.
 * The cards are the `.swiper-slide` children given in the default slot.
 */
const props = defineProps<{
  /** What the deck holds, for screen readers ("Worlds"). */
  label: string;
  /** The name of each card, shown in the bullets. */
  names: readonly string[];
  /** The card in front at first. */
  initial?: number;
}>();
const emit = defineEmits<{ change: [index: number] }>();
const { t } = useI18n();

const root = ref<HTMLElement | null>(null);
const previous = ref<HTMLButtonElement | null>(null);
const next = ref<HTMLButtonElement | null>(null);
const bullets = ref<HTMLElement | null>(null);
const active = ref(props.initial ?? 0);
let swiper: Swiper | null = null;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Only the card in front can be read and used: the others are scenery. */
const markInert = () => {
  if (!swiper) return;
  swiper.slides.forEach((slide, index) => {
    slide.inert = index !== swiper?.activeIndex;
  });
};

/** Each bullet is read by the name of its card, and says which one is in front. */
const nameBullets = () => {
  bullets.value?.querySelectorAll('button').forEach((bullet, index) => {
    bullet.setAttribute('aria-label', props.names[index] ?? '');
    bullet.setAttribute('aria-current', String(index === swiper?.activeIndex));
  });
};

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

onMounted(() => {
  if (!root.value) return;
  swiper = new Swiper(root.value, {
    modules: [A11y, EffectCreative, Keyboard, Navigation, Pagination],
    initialSlide: props.initial ?? 0,
    speed: reduced ? 0 : 520,
    grabCursor: true,
    autoHeight: true,
    effect: reduced ? 'slide' : 'creative',
    creativeEffect: {
      limitProgress: 2,
      shadowPerProgress: true,
      prev: { translate: ['-78%', 24, -260], rotate: [0, 0, -6], scale: 0.86, shadow: true },
      next: { translate: ['78%', 24, -260], rotate: [0, 0, 6], scale: 0.86, shadow: true },
    },
    keyboard: { enabled: true, onlyInViewport: true },
    navigation: { prevEl: previous.value, nextEl: next.value },
    pagination: {
      el: bullets.value,
      clickable: true,
      renderBullet: (index, className) =>
        `<button type="button" class="${className}">${escape(props.names[index] ?? '')}</button>`,
    },
    a11y: {
      prevSlideMessage: t('deck.previous'),
      nextSlideMessage: t('deck.next'),
      slideLabelMessage: t('deck.position', { index: '{{index}}', total: '{{slidesLength}}' }),
    },
    on: {
      slideChange: (instance) => {
        active.value = instance.activeIndex;
        markInert();
        emit('change', instance.activeIndex);
      },
      paginationUpdate: () => nameBullets(),
    },
  });
  markInert();
  nameBullets();
});

watch(
  () => props.initial,
  (index) => {
    if (index !== undefined && swiper && index !== swiper.activeIndex) swiper.slideTo(index);
  },
);

onBeforeUnmount(() => swiper?.destroy(true, false));

defineExpose({ slideTo: (index: number) => swiper?.slideTo(index) });
</script>

<template>
  <section class="deck" :aria-label="label" :aria-roledescription="t('deck.role')">
    <div ref="bullets" class="bullets"></div>
    <div ref="root" class="swiper">
      <div class="swiper-wrapper">
        <slot />
      </div>
    </div>
    <div class="arrows">
      <button
        ref="previous"
        class="btn arrow"
        type="button"
        :aria-label="t('deck.previous')"
        data-testid="deck-previous"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
      </button>
      <p class="count" aria-hidden="true">{{ active + 1 }} / {{ names.length }}</p>
      <button
        ref="next"
        class="btn arrow"
        type="button"
        :aria-label="t('deck.next')"
        data-testid="deck-next"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.deck {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.swiper {
  width: 100%;
  /* Room for the cards peeking out on each side, and for their tilt. */
  padding: var(--space-6) 0 var(--space-8);
  overflow: hidden;
}

.bullets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
}

/* Each name is a button to touch: 44 px tall at least (v1.7.6). */
.bullets :deep(.swiper-pagination-bullet) {
  min-height: var(--touch);
  padding: 0 var(--space-4);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.bullets :deep(.swiper-pagination-bullet-active) {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  transform: translateY(-1px);
}

.arrows {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.arrow {
  padding: 0;
  border-radius: 50%;
}

.arrow:disabled {
  opacity: 0.4;
}

.count {
  min-width: 4ch;
  color: var(--text-muted);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
</style>
