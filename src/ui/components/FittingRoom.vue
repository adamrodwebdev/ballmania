<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { pixelRatioFor } from '@/play/canvas';
import { SLOTS, type Cosmetic, type CosmeticSlot } from '@/player/catalog';
import type { FittingPlayer } from '@/showcase/ReelPlayer';
import type { ReelPalettes } from '@/showcase/Take';
import CosmeticPreview from './CosmeticPreview.vue';
import { PLAY_PATH } from './icons';

/**
 * The Workshop's fitting room (v1.8.0): the cosmetic touched, played by the
 * game's own engine in a loop, as the title's reel plays its highlights: the
 * launcher aims and fires, the trail follows a long shot, the burst style
 * sets a cascade off, the board shows its chain. Played by a worker where the
 * browser allows, only while it can be seen; with reduced motion, one still
 * image. Until the first frame, the cosmetic's own picture stands in.
 * Its corners hold what the screen adds: the try for an ad, a note.
 */
const props = defineProps<{ item: Cosmetic }>();

const { t } = useI18n();
const { theme, settings, player } = useServices();
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = ref<HTMLCanvasElement | null>(null);
/** The engine draws: the stand-in picture goes. */
const live = ref(false);

let room: FittingPlayer | null = null;
let opening = false;
let gone = false;
let onScreen = false;
let readPalettes: (() => ReelPalettes) | null = null;
const cleanups: (() => void)[] = [];

/** What the player wears, with the cosmetic tried on in its slot. */
const lookWith = (item: Cosmetic) =>
  Object.fromEntries(
    SLOTS.map((slot) => [slot, slot === item.slot ? item.id : player.equipped(slot)]),
  ) as Record<CosmeticSlot, string>;

/** It plays only where it can be seen: on screen, in a visible tab. */
const wanted = () => onScreen && document.visibilityState === 'visible';
const update = () => {
  if (gone) return;
  if (wanted() && !room && !opening) void open();
  room?.run(wanted());
};

/** Loads the fitting room's code and opens it, on the cosmetic touched by then. */
const open = async () => {
  const element = canvas.value;
  if (!element) return;
  opening = true;
  const [{ openFitting }, { Palette }] = await Promise.all([
    import('@/showcase/FittingPlayer'),
    import('@/play/Palette'),
  ]);
  // A night world's board keeps the cosmos colours in both themes (§ 3.5): the canvas wears them.
  readPalettes = () => ({
    day: Palette.fromStyle(getComputedStyle(document.documentElement)),
    night: Palette.fromStyle(getComputedStyle(element)),
  });
  const item = props.item;
  const opened = await openFitting(
    element,
    {
      palettes: readPalettes(),
      equipped: lookWith(item),
      effects: settings.current.effects,
      still,
    },
    item.slot,
    () => (live.value = true),
  );
  opening = false;
  if (gone) {
    opened.stop();
    return;
  }
  room = opened;
  // Touched while it loaded: the latest one.
  if (props.item.id !== item.id) room.fit(props.item.slot, lookWith(props.item));
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    opened.resize(width, height, pixelRatioFor(width, height, window.devicePixelRatio));
  });
  observer.observe(element);
  cleanups.push(() => observer.disconnect());
  update();
};

watch(
  () => props.item,
  (item) => room?.fit(item.slot, lookWith(item)),
);
watch(theme.resolved, () => {
  if (room && readPalettes) room.setPalettes(readPalettes());
});

onMounted(() => {
  const element = canvas.value;
  if (!element) return;
  const sight = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      update();
    },
    { threshold: 0.1 },
  );
  sight.observe(element);
  document.addEventListener('visibilitychange', update);
  cleanups.push(
    () => sight.disconnect(),
    () => document.removeEventListener('visibilitychange', update),
  );
});

onBeforeUnmount(() => {
  gone = true;
  room?.stop();
  room = null;
  for (const cleanup of cleanups) cleanup();
});
</script>

<template>
  <div class="room" data-testid="fitting-room">
    <canvas ref="canvas" class="board" data-art="night" aria-hidden="true"></canvas>
    <div v-if="!live" class="stand-in" aria-hidden="true" data-testid="fitting-stand-in">
      <CosmeticPreview :item="item" />
    </div>
    <p class="badge" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path :d="PLAY_PATH" /></svg>
      {{ t('shop.fitting') }}
    </p>
    <div class="corner"><slot name="corner" /></div>
    <div class="foot"><slot name="note" /></div>
  </div>
</template>

<style scoped>
.room {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--tile-edge);
  border-radius: 1.1rem;
  background: var(--scene-edge);
  box-shadow:
    0 0.3rem 0 var(--tile-shadow),
    0 1rem 2rem rgb(0 0 0 / 0.35);
}

.board {
  display: block;
  width: 100%;
  height: 100%;
}

/* The cosmetic's own picture, until the engine's first frame. */
.stand-in {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 45%, var(--scene-core), var(--scene-edge) 70%);
}

.stand-in :deep(.preview) {
  width: min(7rem, 60cqh, 40%);
}

.badge {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.2rem 0.65rem 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgb(8 3 26 / 0.72);
  color: var(--scene-text);
  font-size: 0.75rem;
  font-weight: 800;
}

.badge svg {
  width: 0.75rem;
  height: 0.75rem;
}

.badge path {
  fill: var(--primary-mid);
}

.corner {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  max-width: calc(100% - 8rem);
}

.foot {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-2);
  left: var(--space-2);
  display: grid;
  justify-items: start;
}

.corner:empty,
.foot:empty {
  display: none;
}
</style>
