<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { pixelRatioFor } from '@/play/canvas';
import { SLOTS, type CosmeticSlot } from '@/player/catalog';
import { LINEUP, type Venue } from '@/showcase/lineup';
import type { ReelPlayer } from '@/showcase/ReelPlayer';
import type { ReelPalettes } from '@/showcase/Take';
import { whenIdle } from '@/ui/idle';

const props = defineProps<{
  /** Something covers the title screen (the settings): the reel waits. */
  paused: boolean;
}>();

const { t } = useI18n();
const { theme, settings, player } = useServices();

/** A caption's first word when the moment is not a world's level. */
const VENUES: Readonly<Record<Venue, string>> = { boss: 'reel.boss', duel: 'arcade.duel.name' };

/** With reduced motion, one still image: the Nova at its peak. */
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The moment showing, by its place in the lineup; null until the reel has started. */
const showing = ref<number | null>(null);
const caption = computed(() => {
  const highlight = showing.value === null ? undefined : LINEUP[showing.value];
  if (!highlight) return null;
  return {
    place: t(highlight.venue ? VENUES[highlight.venue] : `worlds.${highlight.world}.name`),
    text: t(`reel.${highlight.id}`),
  };
});

const frame = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

let reel: ReelPlayer | null = null;
let opening = false;
let gone = false;
let idle = false;
let onScreen = false;
let readPalettes: (() => ReelPalettes) | null = null;
const cleanups: (() => void)[] = [];

/** It plays only where it can be seen: on screen, in a visible tab, with nothing over it. */
const wanted = () => idle && onScreen && document.visibilityState === 'visible' && !props.paused;

const update = () => {
  if (gone) return;
  if (wanted() && !reel && !opening) void open();
  reel?.run(wanted());
};

/**
 * Loads the reel's code and opens it the first time it is wanted (v1.8.0):
 * after the page has loaded and the browser is idle, and only if the window
 * shows. A worker plays it where the browser allows.
 */
const open = async () => {
  const element = canvas.value;
  if (!element) return;
  opening = true;
  const [{ openReel }, { Palette }] = await Promise.all([
    import('@/showcase/ReelPlayer'),
    import('@/play/Palette'),
  ]);
  // A night world's board keeps the cosmos colours in both themes (§ 3.5): the canvas wears them.
  readPalettes = () => ({
    day: Palette.fromStyle(getComputedStyle(document.documentElement)),
    night: Palette.fromStyle(getComputedStyle(element)),
  });
  const equipped = Object.fromEntries(SLOTS.map((slot) => [slot, player.equipped(slot)])) as Record<
    CosmeticSlot,
    string
  >;
  const opened = await openReel(
    element,
    { palettes: readPalettes(), equipped, effects: settings.current.effects, still },
    (index) => (showing.value = index),
  );
  opening = false;
  if (gone) {
    opened.stop();
    return;
  }
  reel = opened;
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    opened.resize(width, height, pixelRatioFor(width, height, window.devicePixelRatio));
  });
  observer.observe(element);
  cleanups.push(() => observer.disconnect());
  update();
};

watch(theme.resolved, () => {
  if (reel && readPalettes) reel.setPalettes(readPalettes());
});
watch(() => props.paused, update);

onMounted(() => {
  const element = frame.value;
  if (!element) return;
  // Hidden for want of room, or scrolled away: it waits.
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
  whenIdle(() => {
    idle = true;
    update();
  });
});

onBeforeUnmount(() => {
  gone = true;
  reel?.stop();
  reel = null;
  for (const cleanup of cleanups) cleanup();
});

/** The window, for a screen that moves it smoothly when its room changes. */
defineExpose({ frame });
</script>

<template>
  <!-- The game's highlights, played by the game itself (v1.8.0): decoration for the eyes only. -->
  <div class="reel-stage" aria-hidden="true">
    <div ref="frame" class="reel" data-testid="reel">
      <canvas ref="canvas" class="board" data-art="night"></canvas>
      <Transition name="caption">
        <p v-if="caption" :key="showing ?? -1" class="caption" data-testid="reel-caption">
          <span class="place">{{ caption.place }}</span>
          {{ caption.text }}
        </p>
      </Transition>
      <ol v-if="!still && showing !== null" class="ticks">
        <li
          v-for="(highlight, index) in LINEUP"
          :key="highlight.id"
          :class="{ on: index === showing }"
        ></li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
/*
 * The room the title screen leaves between the title and Play: the window
 * takes as much of it as the board's shape allows, and is not shown at all
 * when the room is too small for the board to read.
 */
.reel-stage {
  container: reel-stage / size;
  display: grid;
  place-items: var(--reel-place, center);
  min-width: 0;
}

.reel {
  container: reel / inline-size;
  position: relative;
  width: min(100cqw, 170cqh, var(--reel-width, 26rem));
  aspect-ratio: 17 / 10;
  overflow: hidden;
  border: 1px solid var(--tile-edge);
  border-radius: 1rem;
  background: var(--scene-edge);
  box-shadow:
    0 0.3rem 0 var(--tile-shadow),
    0 1.1rem 2.5rem rgb(0 0 0 / 0.45);
}

@container reel-stage (height < 7.5rem) or (width < 12rem) {
  .reel {
    display: none;
  }
}

.board {
  display: block;
  width: 100%;
  height: 100%;
}

/* Scrims under the caption and the ticks: they read over a light board as over the night. */
.caption {
  position: absolute;
  bottom: var(--space-2);
  left: var(--space-2);
  max-width: calc(100% - var(--space-4));
  margin: 0;
  padding: 0.3em 0.8em;
  border-radius: 1em;
  background: rgb(8 3 26 / 0.72);
  color: var(--scene-text);
  font-size: clamp(0.75rem, 0.5rem + 2cqi, 0.95rem);
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  text-wrap: balance;
}

.place {
  margin-inline-end: 0.3em;
  color: var(--primary-mid);
}

.ticks {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: flex;
  gap: 0.25rem;
  margin: 0;
  padding: 0.35rem 0.5rem;
  border-radius: 999px;
  background: rgb(8 3 26 / 0.55);
  list-style: none;
}

.ticks li {
  width: clamp(0.55rem, 2.6cqi, 1rem);
  height: 0.2rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.4);
}

.ticks li.on {
  background: var(--primary-mid);
}

/* The caption fades as the board does, one moment into the next. */
.caption-enter-active,
.caption-leave-active {
  transition: opacity 0.4s ease;
}

.caption-enter-from,
.caption-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .caption-enter-active,
  .caption-leave-active {
    transition: none;
  }
}
</style>
