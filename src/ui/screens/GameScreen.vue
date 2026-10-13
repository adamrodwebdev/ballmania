<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { createMode, type Message, type Settlement } from '@/app/modes';
import type { PlayRequest } from '@/app/PlayRequest';
import { ingredients, SECONDARIES } from '@/engine/chain/Alchemy';
import { CAMPAIGN } from '@/levels/campaign';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import { frameFor, type Frame } from '@/levels/tracks';
import { ASSIST_AFTER } from '@/player/rewards';
import { KeyboardControls, PointerControls, type PlayCommands } from '@/play/Controls';
import { resolveLook } from '@/play/cosmetics/Look';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { sharedFeedback } from '@/play/feedback';
import { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';
import StarRow from '@/ui/components/StarRow.vue';

const props = defineProps<{ request: PlayRequest }>();
const emit = defineEmits<{ quit: []; play: [request: PlayRequest] }>();

const { t, locale } = useI18n();
const services = useServices();
const { theme, settings, player, share } = services;

const request = props.request;
/** What kind of game this is decides the level, the texts and the records (§ 3.2). */
const mode = createMode(request);
const daily = request.kind === 'daily' ? request.challenge : null;
const say = (message: Message) => t(message.key, { ...message.params });

const settlement = shallowRef<Settlement | null>(null);
const assisted = ref(request.kind === 'campaign' && request.assisted === true);
const shareOutcome = ref<'shared' | 'copied' | 'cancelled' | 'unavailable' | null>(null);
const hintVisible = ref(mode.hint !== null);
/** Jewel world: the three mixes, always on screen. */
const alchemy = mode.alchemy;
const RECIPES = SECONDARIES.map((result) => {
  const [a, b] = ingredients(result)!;
  return { a, b, result };
});
/** Where "back" leads, as the end dialog's button says it. */
const HOME_LABELS = {
  campaign: 'game.map',
  home: 'game.homeButton',
  arcade: 'game.arcadeButton',
} as const;

const canvas = ref<HTMLCanvasElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
const surface = ref<HTMLElement | null>(null);
const settingsDialog = ref<{ open: () => void } | null>(null);
const pauseDialog = ref<HTMLDialogElement | null>(null);
const endDialog = ref<HTMLDialogElement | null>(null);
const session = shallowRef<PlaySession | null>(null);
const announcement = ref('');

const hud = computed(() => session.value?.hud ?? null);
const number = computed(() => new Intl.NumberFormat(locale.value));
const dayLabel = computed(() =>
  daily ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(daily.date) : '',
);

const readPalette = () => Palette.fromStyle(getComputedStyle(document.documentElement));

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(motionQuery.matches);
const onMotionChange = (event: MediaQueryListEvent) => (reducedMotion.value = event.matches);
motionQuery.addEventListener('change', onMotionChange);
const profile = () => EffectProfile.for(settings.current.effects, reducedMotion.value);
const feedback = sharedFeedback(settings.current.volume, settings.current.vibration);

let frame: Frame | null = null;
/** The level for this board shape, slowed down when the assistance is on. */
const definition = (): LevelDefinition => mode.definition(frame!, assisted.value);

let cleanups: (() => void)[] = [];

onMounted(() => {
  if (!canvas.value || !surface.value) return;
  const box = surface.value.getBoundingClientRect();
  frame = frameFor(box.width, box.height);
  const seed = mode.seed;
  const play = new PlaySession({
    canvas: canvas.value,
    distortion: overlay.value ? DistortionLayer.create(overlay.value) : null,
    level: definition(),
    palette: readPalette(),
    profile: profile(),
    feedback,
    look: resolveLook(player.view.equipped, mode.world),
    ...(seed === null ? {} : { seed: () => seed }),
    ...(request.kind === 'rhythm' ? { root: request.song.root } : {}),
    aimAssist: settings.current.aimAssist,
  });
  session.value = play;
  if (hintVisible.value) window.setTimeout(() => (hintVisible.value = false), 6000);

  const commands: PlayCommands = {
    aimAt: (x, y) => play.aimAt(x, y),
    isOnShooter: (x, y) => play.isOnShooter(x, y),
    flipSwitchAt: (x, y) => play.flipSwitchAt(x, y),
    flipNextSwitch: () => play.flipNextSwitch(),
    charge: () => play.charge(),
    fire: () => play.fire(),
    swap: () => play.swap(),
    turn: (direction) => play.turn(direction),
    togglePause: () => play.togglePause(),
    toggleMagnet: () => play.toggleMagnet(),
  };
  const pointer = new PointerControls(canvas.value, commands);
  const keyboard = new KeyboardControls(window, commands);

  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    play.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  });
  observer.observe(surface.value);

  const onVisibility = () => {
    if (document.hidden) play.pause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  cleanups = [
    () => pointer.destroy(),
    () => keyboard.destroy(),
    () => observer.disconnect(),
    () => document.removeEventListener('visibilitychange', onVisibility),
    () => play.destroy(),
    () => motionQuery.removeEventListener('change', onMotionChange),
  ];
  play.start();
  canvas.value.focus();
});

onBeforeUnmount(() => {
  for (const cleanup of cleanups) cleanup();
});

watch([() => settings.current.effects, reducedMotion], () => session.value?.setProfile(profile()));
watch(
  () => settings.current.volume,
  (volume) => feedback.sound.setVolume(volume),
);
watch(
  () => settings.current.aimAssist,
  (enabled) => session.value?.setAimAssist(enabled),
);
watch(
  () => settings.current.vibration,
  (enabled) => feedback.haptics.setEnabled(enabled),
);

// The board follows the theme: colours are read again once <html> has switched.
watch(theme.resolved, async () => {
  await nextTick();
  session.value?.setPalette(readPalette());
});

watch(
  () => hud.value?.paused,
  (paused) => {
    if (paused) pauseDialog.value?.showModal();
    else if (pauseDialog.value?.open) {
      pauseDialog.value.close();
      canvas.value?.focus();
    }
  },
);

watch(
  () => hud.value?.over,
  (over) => {
    if (over) {
      announcement.value = say(mode.outcome(over === 'won'));
      endDialog.value?.showModal();
    } else if (endDialog.value?.open) endDialog.value.close();
  },
);

// A finished game is saved at once, even if the player leaves before the dialog.
watch(
  () => hud.value?.state,
  (state) => {
    const play = session.value;
    if (!play || state === undefined || state === 'playing') return;
    settlement.value = mode.settle(play.summary(), services);
  },
);

watch(
  () => hud.value?.switched,
  (switched) => {
    if (switched) {
      announcement.value = t('switch.flipped', { branch: t(`switch.${switched.branch}`) });
    }
  },
);

watch(
  () => hud.value?.reaction,
  (reaction) => {
    if (reaction) announcement.value = t('game.reaction', { depth: reaction.depth });
  },
);

watch(
  () => hud.value?.stage,
  (stage) => {
    if (stage) announcement.value = t('arcade.endless.stage', { stage: stage + 1 });
  },
);

const resume = () => session.value?.resume();
const restart = () => {
  settlement.value = null;
  shareOutcome.value = null;
  session.value?.restart(definition());
  canvas.value?.focus();
};
const restartWithAssist = () => {
  assisted.value = true;
  restart();
};
/** What to play after a win: the next level, puzzle, song or rival, when it is open. */
const following = computed(() =>
  hud.value?.over === 'won' && settlement.value ? mode.next(services) : null,
);
const goNext = () => {
  if (following.value) emit('play', following.value.request);
};
const offerAssist = computed(
  () =>
    request.kind === 'campaign' &&
    hud.value?.over === 'lost' &&
    !assisted.value &&
    player.failures(request.level.id) >= ASSIST_AFTER,
);
/** The last level of the campaign is won: the game is finished. */
const campaignDone = computed(
  () =>
    hud.value?.over === 'won' &&
    request.kind === 'campaign' &&
    request.level.id === CAMPAIGN[CAMPAIGN.length - 1]?.id,
);
/** The result that counts for today: the first attempt. */
const dailyRecord = computed(() =>
  daily && settlement.value ? player.daily(daily.day) : undefined,
);
/** Puzzle mode: shots used against par, once the game is over. */
const puzzleResult = computed(() =>
  request.kind === 'puzzle' && settlement.value && session.value
    ? { shots: session.value.summary().shots, par: request.puzzle.par }
    : null,
);
const primaryReplay = computed(() => !following.value && !offerAssist.value && !daily);

const shareResult = async () => {
  const record = dailyRecord.value;
  if (!daily || !record) return;
  const stars = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
  const text = t('daily.shareText', {
    date: dayLabel.value,
    score: number.value.format(record.score),
    stars,
    url: `${window.location.origin}${window.location.pathname}`,
  });
  shareOutcome.value = await share.share(text);
};
const quit = () => emit('quit');
</script>

<template>
  <section class="game" :aria-label="t('game.board')">
    <div class="bar">
      <p class="level" data-testid="level">{{ say(mode.label) }}</p>
      <p v-if="assisted" class="assisted" data-testid="assisted">{{ t('assist.active') }}</p>
      <p class="score">
        <span class="label">{{ t('game.score') }}</span>
        <span class="value" data-testid="score">{{ number.format(hud?.score ?? 0) }}</span>
      </p>
      <p v-if="(hud?.streak ?? 0) >= 2" class="streak">
        {{ t('game.streak', { count: hud?.streak ?? 0 }) }}
      </p>
      <p v-if="hud && hud.shotsLeft !== null" class="badge" data-testid="shots">
        {{ t('arcade.puzzle.shotsLeft', { count: hud.shotsLeft }, hud.shotsLeft) }}
      </p>
      <p v-if="hud?.groove" class="badge groove" data-testid="groove">
        {{ t('arcade.rhythm.groove', { multiplier: hud.groove }) }}
      </p>
      <p v-if="hud && hud.stage !== null" class="badge" data-testid="stage">
        {{ t('arcade.endless.stage', { stage: hud.stage + 1 }) }}
      </p>
      <button
        class="btn icon"
        type="button"
        :aria-label="t('game.pause')"
        data-testid="pause"
        @click="session?.pause()"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
          <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
        </svg>
      </button>
      <p v-if="alchemy" class="alchemy" :aria-label="t('alchemy.title')" data-testid="alchemy">
        <span v-for="recipe in RECIPES" :key="recipe.result" class="recipe">
          <span class="sr-only">
            {{
              t('alchemy.formula', {
                a: t(`tones.${recipe.a}`),
                b: t(`tones.${recipe.b}`),
                result: t(`tones.${recipe.result}`),
              })
            }}
          </span>
          <span class="dot" :class="`tone-${recipe.a}`" aria-hidden="true"></span>
          <span class="op" aria-hidden="true">+</span>
          <span class="dot" :class="`tone-${recipe.b}`" aria-hidden="true"></span>
          <span class="op" aria-hidden="true">=</span>
          <span class="dot" :class="`tone-${recipe.result}`" aria-hidden="true"></span>
        </span>
      </p>
      <label v-if="hud?.colossus" class="colossus">
        <span>{{ t(`colossus.${mode.world}`) }}</span>
        <progress
          class="health"
          :max="hud.colossus.maxHp"
          :value="hud.colossus.hp"
          data-testid="colossus"
        ></progress>
      </label>
      <div v-if="hud && hud.tug !== null" class="duel" data-testid="duel">
        <span class="side">{{ t('arcade.duel.you') }}</span>
        <meter
          class="rope"
          min="0"
          max="1"
          low="0.3"
          high="0.7"
          optimum="1"
          :value="1 - hud.tug"
          :aria-label="t('arcade.duel.rope')"
          data-testid="tug"
        ></meter>
        <span class="side rival">
          {{ t('arcade.duel.rival', { score: number.format(hud.rivalScore ?? 0) }) }}
        </span>
      </div>
    </div>

    <div class="stage">
      <div ref="surface" class="surface">
        <canvas
          ref="canvas"
          class="board"
          tabindex="0"
          :aria-label="t('game.board')"
          aria-describedby="game-help"
          data-testid="board"
        ></canvas>
        <canvas ref="overlay" class="overlay" aria-hidden="true" hidden></canvas>
        <p v-if="hintVisible && mode.hint" class="hint" role="status" data-testid="hint">
          {{ t(`hints.${mode.hint}`) }}
        </p>
      </div>
    </div>

    <div class="controls">
      <button class="btn swap" type="button" data-testid="swap" @click="session?.swap()">
        <span class="dot" :class="`tone-${hud?.current ?? 0}`" aria-hidden="true"></span>
        <span class="dot small" :class="`tone-${hud?.next ?? 0}`" aria-hidden="true"></span>
        <span>{{ t(request.kind === 'puzzle' ? 'arcade.puzzle.nextColour' : 'game.swap') }}</span>
      </button>
      <button
        v-if="hud?.magnet"
        class="btn magnet"
        :class="{ armed: hud.magnetArmed }"
        type="button"
        :aria-pressed="hud.magnetArmed"
        :aria-label="t('magnet.label', { count: hud.magnet.charges, max: hud.magnet.max })"
        :disabled="hud.magnet.charges === 0 && !hud.magnetArmed"
        data-testid="magnet"
        @click="session?.toggleMagnet()"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M6 3v9a6 6 0 0 0 12 0V3h-4v9a2 2 0 0 1-4 0V3z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
        <span aria-hidden="true">{{ t('magnet.button') }}</span>
        <span class="charges" aria-hidden="true">
          <span
            v-for="index in hud.magnet.max"
            :key="index"
            class="charge"
            :class="{ full: index <= hud.magnet.charges }"
          ></span>
        </span>
      </button>
    </div>
    <p v-if="hud?.magnetArmed" class="sr-only" role="status">{{ t('magnet.armed') }}</p>
    <p id="game-help" class="sr-only">{{ t('game.help') }}</p>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <dialog ref="pauseDialog" class="dialog" aria-labelledby="pause-title" @cancel.prevent="resume">
      <h2 id="pause-title">{{ t('game.paused') }}</h2>
      <div class="actions">
        <button class="btn btn-primary" type="button" autofocus @click="resume">
          {{ t('game.resume') }}
        </button>
        <button class="btn" type="button" @click="restart">{{ t('game.restart') }}</button>
        <button
          class="btn"
          type="button"
          data-testid="open-settings"
          @click="settingsDialog?.open()"
        >
          {{ t('game.settings') }}
        </button>
        <button class="btn" type="button" @click="quit">{{ t('game.quit') }}</button>
      </div>
    </dialog>
    <SettingsDialog ref="settingsDialog" />

    <dialog ref="endDialog" class="dialog" aria-labelledby="end-title" @cancel.prevent="quit">
      <p v-if="daily" class="eyebrow">{{ t('daily.title') }} · {{ dayLabel }}</p>
      <h2 id="end-title">{{ say(mode.outcome(hud?.over === 'won')) }}</h2>
      <StarRow
        v-if="hud?.over === 'won' && settlement?.stars"
        class="earned"
        size="large"
        :count="settlement.stars"
        :label="t('game.starsLabel', { count: settlement.stars }, settlement.stars)"
        data-testid="stars"
      />
      <p class="result">{{ t('game.finalScore', { score: number.format(hud?.score ?? 0) }) }}</p>
      <p v-if="(hud?.bonus ?? 0) > 0" class="detail">
        {{ t('game.bonus', { points: number.format(hud?.bonus ?? 0) }) }}
      </p>
      <p v-if="campaignDone" class="record" data-testid="campaign-done">
        {{ t('game.campaignDone') }}
      </p>
      <p v-if="puzzleResult" class="detail" data-testid="puzzle-result">
        {{ t('arcade.puzzle.result', { shots: puzzleResult.shots, par: puzzleResult.par }) }}
      </p>
      <p v-if="hud && hud.stage !== null" class="detail">
        {{ t('arcade.endless.reached', { stage: hud.stage + 1 }) }}
      </p>
      <p v-if="hud && hud.rivalScore !== null" class="detail">
        {{ t('arcade.duel.final', { score: number.format(hud.rivalScore) }) }}
      </p>
      <p v-if="settlement?.record?.newBest" class="record" data-testid="new-best">
        {{ t('game.newBest') }}
      </p>
      <p v-else-if="settlement?.record?.unit === 'wins'" class="detail" data-testid="wins">
        {{ t('arcade.duel.wins', { count: settlement.record.value }, settlement.record.value) }}
      </p>
      <p v-else-if="settlement?.record && settlement.record.value > 0" class="detail">
        {{ t('game.best', { score: number.format(settlement.record.value) }) }}
      </p>
      <p v-if="(hud?.bestDepth ?? 0) > 1" class="detail">
        {{ t('game.bestDepth', { depth: hud?.bestDepth ?? 0 }) }}
      </p>
      <p
        v-if="daily && settlement && !settlement.rewards.firstDailyAttempt && dailyRecord"
        class="detail"
      >
        {{ t('daily.counted', { score: number.format(dailyRecord.score) }) }}
      </p>

      <ul
        v-if="
          settlement && (settlement.rewards.shards > 0 || settlement.rewards.unlocked.length > 0)
        "
        class="gains"
      >
        <li v-if="settlement.rewards.shards > 0" class="shards" data-testid="shards-earned">
          {{ t('player.earned', { count: number.format(settlement.rewards.shards) }) }}
        </li>
        <li v-for="achievement in settlement.rewards.achievements" :key="achievement.id">
          {{ t('achievements.reached', { name: t(`achievements.list.${achievement.id}.name`) }) }}
        </li>
        <li v-for="item in settlement.rewards.unlocked" :key="item.id" class="unlock">
          {{ t('shop.unlocked', { name: t(`cosmetics.${item.id}`) }) }}
        </li>
      </ul>

      <div class="actions">
        <button
          v-if="following"
          class="btn btn-primary"
          type="button"
          autofocus
          data-testid="next"
          @click="goNext"
        >
          {{ say(following.label) }}
        </button>
        <button
          v-if="daily && dailyRecord"
          class="btn btn-primary"
          type="button"
          autofocus
          data-testid="share"
          @click="shareResult"
        >
          {{ t('daily.share') }}
        </button>
        <p v-if="shareOutcome" class="detail" role="status">
          {{ t(`daily.shareOutcome.${shareOutcome}`) }}
        </p>
        <button
          v-if="offerAssist"
          class="btn btn-primary"
          type="button"
          autofocus
          data-testid="assist"
          @click="restartWithAssist"
        >
          <span>{{ t('assist.retry') }}</span>
          <small>{{ t('assist.detail') }}</small>
        </button>
        <button
          class="btn"
          :class="{ 'btn-primary': primaryReplay }"
          type="button"
          :autofocus="primaryReplay"
          data-testid="replay"
          @click="restart"
        >
          {{ t('game.playAgain') }}
        </button>
        <button class="btn" type="button" data-testid="map" @click="quit">
          {{ t(HOME_LABELS[mode.home]) }}
        </button>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.game {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100vh;
  height: 100dvh;
  width: min(100%, 120rem);
  margin-inline: auto;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
}

.level {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--surface-2);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.colossus {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  gap: var(--space-3);
  color: var(--danger);
  font-weight: 800;
}

.health {
  flex: 1;
  height: 0.75rem;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-2);
  accent-color: var(--danger);
  appearance: none;
}

.health::-webkit-progress-bar {
  background: var(--surface-2);
}

.health::-webkit-progress-value {
  background: var(--danger);
}

.health::-moz-progress-bar {
  background: var(--danger);
}

.hint {
  position: absolute;
  inset-inline: var(--space-4);
  top: var(--space-4);
  margin-inline: auto;
  width: fit-content;
  max-width: 32rem;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
  pointer-events: none;
  animation: hint 6s ease forwards;
}

@keyframes hint {
  0% {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  8%,
  85% {
    opacity: 1;
    transform: none;
  }
  100% {
    opacity: 0;
  }
}

.alchemy {
  display: flex;
  flex-basis: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2) var(--space-4);
  font-weight: 800;
}

.recipe {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.op {
  color: var(--text-muted);
}

.eyebrow {
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 700;
}

.assisted {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 0.875rem;
}

.gains {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-4) 0 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  list-style: none;
}

.shards {
  color: var(--accent);
  font-weight: 800;
}

.unlock {
  font-weight: 700;
}

.earned {
  justify-content: center;
  margin-bottom: var(--space-2);
}

.detail {
  color: var(--text-muted);
}

.record {
  color: var(--accent);
  font-weight: 800;
}

.score {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-right: auto;
}

.label {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.value {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 1.2rem + 1vw, 1.9rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.streak {
  color: var(--accent);
  font-weight: 800;
}

.badge {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--surface-2);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.groove {
  color: var(--orb-cyan);
}

.duel {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  gap: var(--space-3);
  font-weight: 800;
}

.rope {
  flex: 1;
  height: 0.75rem;
}

.side.rival {
  color: var(--danger);
}

.icon {
  padding: 0;
}

.stage {
  position: relative;
  min-height: 0;
  padding-inline: var(--space-2);
}

.surface {
  position: relative;
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--radius);
  pointer-events: none;
}

.overlay[hidden] {
  display: none;
}

.board {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--radius);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-4) max(var(--space-2), env(safe-area-inset-bottom));
}

.swap,
.magnet {
  flex-direction: row;
}

.magnet.armed {
  border-color: var(--orb-cyan);
  background: var(--orb-cyan);
  color: var(--on-accent);
}

.charges {
  display: inline-flex;
  gap: 0.2rem;
}

.charge {
  width: 0.55rem;
  height: 0.55rem;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.charge.full {
  background: currentColor;
}

.dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
}

.dot.small {
  width: 0.8rem;
  height: 0.8rem;
  margin-left: -0.35rem;
}

.dialog {
  width: min(100% - 2rem, 24rem);
  padding: var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
  text-align: center;
}

.dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}

.dialog h2 {
  margin-bottom: var(--space-3);
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 1.2rem + 0.8vw, 1.75rem);
}

.result {
  font-size: 1.25rem;
  font-weight: 700;
}

.actions {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-6);
}
</style>
