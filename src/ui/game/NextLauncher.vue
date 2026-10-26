<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { LauncherOffer, type OfferLine } from '@/app/LauncherOffer';
import type { Cosmetic } from '@/player/catalog';
import CosmeticPreview from '@/ui/components/CosmeticPreview.vue';

/**
 * The launcher a win's shards bring closer, on the victory panel (§ 3.5,
 * v1.8.0): it draws what `LauncherOffer` decides, and the tap's motion. The
 * shards fly from the bar into the picture, which swells and glows; then the
 * bar refills toward the next launcher. The row keeps its height throughout:
 * nothing moves under the finger.
 */
const props = defineProps<{
  /** The cheapest launcher on sale not owned yet, or null once all are. */
  goal: Cosmetic | null;
  reducedMotion: boolean;
}>();
const emit = defineEmits<{
  /** A tap bought and wore a launcher: the panel rings and moves the focus on. */
  equipped: [item: Cosmetic];
}>();

/** Sparks that fly into the picture. */
const SPARKS = 7;

const { t, locale } = useI18n();
const { player } = useServices();
const number = computed(() => new Intl.NumberFormat(locale.value));
const offer = new LauncherOffer(player, !props.reducedMotion);
onBeforeUnmount(() => offer.stop());
const view = computed(() => offer.view(props.goal));
const lineId = useId();

const title = computed(() => {
  const current = view.value;
  if (!current) return '';
  const id = current.item.id;
  return current.worn ? t(`game.reward.equipped.${id}`) : t(`cosmetics.${id}`);
});

const format = (count: number) => number.value.format(count);
const lineOf = (line: OfferLine): string => {
  switch (line.kind) {
    case 'progress':
      return t(
        'game.reward.progress',
        { have: format(line.have), price: format(line.price) },
        line.price,
      );
    case 'price':
      return t('game.reward.price', { price: format(line.price) }, line.price);
    case 'next':
      return t(
        'game.reward.next',
        {
          name: t(`cosmetics.${line.item.id}`),
          have: format(line.have),
          price: format(line.price),
        },
        line.price,
      );
    case 'blank':
      // A no-break space: the line keeps its height.
      return ' ';
  }
};
const line = computed(() => (view.value ? lineOf(view.value.line) : ''));

const row = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const picture = ref<HTMLElement | null>(null);
/** Where the sparks leave from, and how far they fly to the picture: measured at the tap. */
const sparks = ref<Record<string, string>>({});
const take = (item: Cosmetic) => {
  const box = row.value?.getBoundingClientRect();
  const from = track.value?.getBoundingClientRect();
  const to = picture.value?.getBoundingClientRect();
  if (box && from && to) {
    const start = {
      x: from.left + from.width * (view.value?.fill ?? 1) - box.left,
      y: from.top + from.height / 2 - box.top,
    };
    const end = { x: to.left + to.width / 2 - box.left, y: to.top + to.height / 2 - box.top };
    sparks.value = {
      left: `${start.x}px`,
      top: `${start.y}px`,
      '--dx': `${end.x - start.x}px`,
      '--dy': `${end.y - start.y}px`,
    };
  }
  if (offer.take(item)) emit('equipped', item);
};
</script>

<template>
  <li
    v-if="view"
    ref="row"
    class="reward"
    :class="{ offering: view.takeable !== null, still: reducedMotion }"
    data-testid="next-launcher"
  >
    <span ref="picture" class="picture" :class="{ popped: view.popped }">
      <CosmeticPreview :item="view.item" class="reward-preview" />
    </span>
    <span class="reward-text">
      <span :key="title" class="reward-name" data-testid="launcher-name">
        {{ title }}
        <svg
          v-if="view.worn"
          class="check"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span ref="track" class="reward-bar" :class="{ unseen: !view.bar }" aria-hidden="true">
        <span class="reward-fill" :style="{ transform: `scaleX(${view.fill})` }"></span>
      </span>
      <progress
        v-if="goal"
        class="sr-only"
        :max="goal.price"
        :value="Math.min(player.view.shards, goal.price)"
        :aria-label="t('game.reward.launcher', { name: t(`cosmetics.${goal.id}`) })"
      ></progress>
      <span :id="lineId" :key="line" class="reward-count" data-testid="launcher-line">
        {{ line }}
      </span>
    </span>
    <button
      v-if="view.takeable"
      class="btn take"
      type="button"
      :aria-describedby="lineId"
      data-testid="equip-launcher"
      @click="take(view.takeable)"
    >
      {{ t('shop.equip') }}
    </button>
    <span v-if="view.flying" class="sparks" :style="sparks" aria-hidden="true">
      <span v-for="i in SPARKS" :key="i" class="spark" :style="{ '--i': i }"></span>
    </span>
    <span class="sr-only" role="status">{{ view.worn ? title : '' }}</span>
  </li>
</template>

<style scoped>
/* The launcher the shards bring closer: its picture, a bar, what is left; and the tap. */
.reward {
  position: relative;
  display: grid;
  grid-template-columns: 3rem 1fr;
  align-items: center;
  gap: var(--space-3);
  text-align: start;
}

.reward.offering {
  grid-template-columns: 3rem 1fr auto;
}

.picture {
  position: relative;
  display: block;
  width: 3rem;
}

.reward-preview {
  width: 3rem;
  margin: 0;
}

.reward-text {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}

.reward-name {
  font-weight: 800;
}

.check {
  margin-inline-start: 0.2em;
  vertical-align: -0.15em;
}

.reward-bar {
  display: block;
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 26%, transparent);
}

/* Nothing left to aim at: the track keeps its place, so the row keeps its height. */
.reward-bar.unseen {
  visibility: hidden;
}

.reward-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary-mid), var(--primary-top));
  transform-origin: left center;
  transition: transform 0.3s ease-out;
}

.reward-count {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

/* « Équiper »: a secondary button outlined in gold; « Suivant » stays the one gold action. */
li.reward .btn.take {
  padding: 0 var(--space-4);
  border: 2px solid var(--primary-top);
}

/* The tap: the shards leave the bar in an arc and fly into the picture. */
.sparks {
  position: absolute;
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
  animation: spark 0.3s ease-in calc(var(--i) * 20ms) forwards;
}

@keyframes spark {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }

  50% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.5), calc(var(--dy) * 0.5 - 1.6rem)) scale(0.85);
  }

  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.4);
  }
}

/* The launcher is worn: its picture swells inside a ring of light. */
.picture.popped {
  animation: pop 0.38s ease-out;
}

.picture.popped::after {
  position: absolute;
  inset: -0.25rem;
  border: 0.18rem solid var(--primary-top);
  border-radius: 50%;
  box-shadow: 0 0 1rem var(--primary-top);
  content: '';
  opacity: 0;
  pointer-events: none;
  animation: ring 0.5s ease-out;
}

@keyframes pop {
  45% {
    transform: scale(1.18);
  }
}

@keyframes ring {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }

  35% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

/* The words fade in when they change: the one motion left with reduced motion. */
.reward-name,
.reward-count {
  animation: settle 0.25s ease-out;
}

@keyframes settle {
  from {
    opacity: 0;
  }
}

.still .reward-fill {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .reward-fill {
    transition: none;
  }

  .spark,
  .picture.popped,
  .picture.popped::after {
    animation: none;
  }
}
</style>
