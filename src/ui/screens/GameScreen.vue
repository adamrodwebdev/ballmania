<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { Aiming, DefeatSummary } from '@/app/DefeatSummary';
import type { Lesson } from '@/levels/LevelDefinition';
import { EndOfGame } from '@/app/EndOfGame';
import { createMode, type Message, type Settlement } from '@/app/modes';
import { shortName } from '@/app/modes/CampaignModes';
import type { PlayRequest } from '@/app/PlayRequest';
import { puzzleHint } from '@/levels/arcade/hint';
import { CAMPAIGN } from '@/levels/campaign';
import { resolveLook } from '@/play/cosmetics/Look';
import type { PlaySession } from '@/play/PlaySession';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';
import GameControls from '@/ui/game/GameControls.vue';
import GameHud from '@/ui/game/GameHud.vue';
import PausePanel from '@/ui/game/PausePanel.vue';
import ResultPanel from '@/ui/game/ResultPanel.vue';
import TrainingCard from '@/ui/game/TrainingCard.vue';
import TrainingEndPanel from '@/ui/game/TrainingEndPanel.vue';
import { useAnnouncements } from '@/ui/game/useAnnouncements';
import { useGameSession } from '@/ui/game/useGameSession';
import { useMessage } from '@/ui/game/useMessage';

const props = defineProps<{ request: PlayRequest }>();
const emit = defineEmits<{ quit: []; play: [request: PlayRequest] }>();

const { t, locale } = useI18n();
const services = useServices();
const { player, platform, ads } = services;
/** What kind of game this is decides the level, the texts and the records (§ 3.2). */
const mode = createMode(props.request);
const say = useMessage();
const number = computed(() => new Intl.NumberFormat(locale.value));
/** The rules of the end of a game: what is offered after it, once, and when. */
const endOfGame = new EndOfGame(mode, { portal: platform.isPortal, ads, player });

// A cosmetic being tried (rewarded ad, § 3.7) is worn for this game only.
const look = resolveLook(player.takeLook(), mode.world);
/** A night world's board keeps the cosmos colours in both themes (§ 3.5). */
const night = look.theme.night;
const assisted = ref(mode.assisted);
/**
 * The training (v1.8.0, § 3.13): its showcases follow one another, a card
 * naming each from the second while the board waits; its hint stays until
 * the hand's gesture is done.
 */
const training = mode.training;
const card = ref(training !== null && training.step > 1);
/** Milliseconds the card shows, the board still behind it. */
const CARD_TIME = 1800;
/** Where the young Colossus of the promise waits: its level, "1-3". */
const promised: Message = shortName(CAMPAIGN.find((level) => level.colossus?.young)!);
const hintVisible = ref(mode.hint !== null && !card.value);
/**
 * A boss's health, the alchemy recipes or the duel's rope: a second line of
 * the HUD, whose room is kept from the start so that the board never moves.
 */
const extraRow = mode.alchemy || mode.rope || mode.boss !== null;
const settlement = shallowRef<Settlement | null>(null);
/** A level lost to the chain, as its defeat screen tells it (v1.8.1), or null. */
const defeat = shallowRef<DefeatSummary | null>(null);
/** A finger or a mouse: the defeat's tip names the gesture as the player makes it. */
const aiming = (): Aiming => (window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse');
/** What became of the last rewarded ad, for the result and the screen reader. */
const adMessage = ref('');

/** A dialog of the game screen, opened and closed by the screen. */
interface Panel {
  show(): void;
  hide(): void;
}
const root = ref<HTMLElement | null>(null);
const surface = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
const safeArea = ref<HTMLElement | null>(null);
const hudPart = ref<Record<'bar' | 'extra', HTMLElement | null> | null>(null);
const controlsPart = ref<Record<'bar', HTMLElement | null> | null>(null);
const pausePanel = ref<(Panel & { isOpen(): boolean }) | null>(null);
const resultPanel = ref<Panel | null>(null);
const settingsDialog = ref<{ open: () => void } | null>(null);

// A defeat still kept is saved while the session lives: this hook runs before the session's own.
onBeforeUnmount(() => {
  settleNow();
  endOfGame.dispose();
});
const { session, hud, feedback, reducedMotion, silence, newGame, focusBoard, board } =
  useGameSession(
    { mode, look, assisted },
    {
      root,
      surface,
      canvas,
      overlay,
      safeArea,
      bars: () => [hudPart.value?.bar, hudPart.value?.extra, controlsPart.value?.bar],
    },
  );
const { announcement, cheer } = useAnnouncements(hud);
const ending = computed(() => hud.value?.over ?? null);
onMounted(() => {
  if (card.value) {
    // The board waits under the card; the next world's music has already begun.
    session.value?.hold(false);
    window.setTimeout(() => {
      card.value = false;
      session.value?.release();
      hintVisible.value = mode.hint !== null;
      focusBoard();
    }, CARD_TIME);
  }
  if (!training && hintVisible.value) {
    window.setTimeout(() => (hintVisible.value = false), 6000);
  }
});
/**
 * The line of a lesson of the training's hand (v1.8.1), as the player aims
 * (a finger or a mouse); a shot's lesson says its showcase's own hint.
 */
const LESSON_LINES: Readonly<
  Record<Lesson, ((aiming: Aiming, charged: boolean) => string) | null>
> = {
  shot: null,
  bank: null,
  curve: null,
  swap: (how) => `training.lessons.swap.${how}`,
  charge: (how, charged) =>
    charged ? 'training.lessons.release' : `training.lessons.charge.${how}`,
};
const hintKey = computed(() => {
  const lesson = hud.value?.lesson;
  const line = lesson ? LESSON_LINES[lesson] : null;
  return line ? line(aiming(), hud.value?.charged ?? false) : `hints.${mode.hint}`;
});
/** The training shows a lesson's line while the hand teaches it: a swap, only at its moment. */
const lessonShown = computed(() => !training || !hud.value || hud.value.lesson !== null);

// The training's hint goes once the hand's gestures are all done.
watch(
  () => hud.value?.taught,
  (taught) => {
    if (training && taught) hintVisible.value = false;
  },
);

watch(
  () => hud.value?.paused,
  (paused) => {
    if (paused) pausePanel.value?.show();
    else if (pausePanel.value?.isOpen()) {
      pausePanel.value.hide();
      focusBoard();
    }
  },
);
watch(
  ending,
  (over) => {
    if (over) announcement.value = say(mode.outcome(over === 'won'));
    // A showcase won: on to the next one at once, without a result or an ad.
    if (over === 'won' && training && training.step < training.of) {
      const next = mode.next(services);
      if (next) emit('play', next.request);
    }
  },
  { flush: 'post' },
);
/** What follows the training's last showcase, once it is won. */
const trainingNext = computed(() => (ending.value === 'won' ? mode.next(services) : null));
/** "Skip": the training is over for good, and the campaign begins. */
const skipTraining = () => {
  if (training) emit('play', training.skip(services));
};

/** Saves the finished game: its result, and the portal hears of it. */
const settle = () => {
  const play = session.value;
  if (!play) return;
  const report = play.summary();
  const result = mode.settle(report, services);
  platform.levelEnded(report.outcome === 'won');
  settlement.value = result;
  if (endOfGame.celebrates(report, result)) platform.celebrate();
};
/** Saves a defeat the player chose not to continue. */
const settleNow = () => {
  if (endOfGame.releaseDefeat()) settle();
};
// A finished game is saved at once, even if the player leaves before the result.
watch(
  () => hud.value?.state,
  (state) => {
    // The end of a game is the game's moment: the starting hint steps aside.
    if (state !== undefined && state !== 'playing') hintVisible.value = false;
    const play = session.value;
    if (state === 'playing') defeat.value = null;
    if (!play || state === undefined || state === 'playing') return;
    if (state === 'lost') defeat.value = mode.defeat(play.summary(), aiming());
    if (state === 'lost' && endOfGame.holdDefeat(play.revivable)) return;
    settle();
  },
);

const restart = () => {
  settleNow();
  settlement.value = null;
  defeat.value = null;
  endOfGame.restart();
  adMessage.value = '';
  newGame();
};
const restartWithAssist = () => {
  assisted.value = true;
  restart();
};
/** A star of the gauge lights up: its chime, and the news for screen readers. */
const starReached = (stars: number) => {
  feedback.sound.star(stars - 1);
  announcement.value = t('game.gaugeReached', { count: stars });
};
/** Puzzle mode: shots used against par, once the game is over. */
const puzzleResult = computed(() =>
  mode.par !== null && settlement.value && session.value
    ? { shots: session.value.summary().shots, par: mode.par }
    : null,
);

const offerAssist = computed(() => endOfGame.offersAssist(ending.value, assisted.value));
const offerContinue = computed(() => endOfGame.offersContinue(ending.value));
const offerDouble = computed(() => endOfGame.offersDouble(ending.value, settlement.value));
const offerHint = computed(() => endOfGame.offersHint(hud.value?.state === 'playing'));

const revived = (play: PlaySession) => {
  if (!play.revive()) return false;
  endOfGame.continuedOnce();
  adMessage.value = t('ads.continued');
  focusBoard();
  return true;
};
const continueGame = async () => {
  const play = session.value;
  if (!play) return;
  resultPanel.value?.hide();
  if ((await ads.revive(silence())) && revived(play)) return;
  adMessage.value = t('ads.unavailable');
  resultPanel.value?.show();
};
const continueForShards = () => {
  const play = session.value;
  if (!play || !play.revivable || !player.spendShards(endOfGame.continuePrice)) return;
  resultPanel.value?.hide();
  revived(play);
};
const doubleShards = async () => {
  const shards = settlement.value?.rewards.shards ?? 0;
  resultPanel.value?.hide();
  if (await ads.reward(silence())) {
    player.grantShards(shards);
    endOfGame.doubledOnce();
    adMessage.value = t('ads.doubled', { count: number.value.format(shards) }, shards);
  } else adMessage.value = t('ads.unavailable');
  resultPanel.value?.show();
};
/** A launcher bought and worn from the victory panel (v1.8.0): it rings, the phone answers. */
const launcherEquipped = () => {
  feedback.sound.equip();
  feedback.haptics.equip();
};

/** Puzzle mode: the best next shot circled, offered in the pause menu, never while playing. */
const giveHint = (play: PlaySession) => {
  play.resume();
  const shown = play.showHint(puzzleHint);
  if (shown) endOfGame.restHint();
  adMessage.value = shown ? t('ads.hintShown') : t('ads.unavailable');
  focusBoard();
};
const showHint = async () => {
  const play = session.value;
  if (!play) return;
  // The game stays paused while the ad is asked for and shown.
  pausePanel.value?.hide();
  if (await ads.reward(silence())) giveHint(play);
  else {
    play.resume();
    adMessage.value = t('ads.unavailable');
  }
};
const hintForShards = () => {
  const play = session.value;
  if (!play || !player.spendShards(endOfGame.hintPrice)) return;
  pausePanel.value?.hide();
  giveHint(play);
};

/**
 * Starting another game from the result is a natural break: maybe an ad
 * first (§ 3.7, at most one every three minutes), above the game once the
 * result is closed. Never on the way back to a menu, and never after offering
 * to continue for an ad: one ad offer per break.
 */
const afterBreak = async (action: () => void) => {
  const ad = endOfGame.adBetweenGames(ending.value);
  settleNow();
  resultPanel.value?.hide();
  // On a new player's first visit, the policy keeps defeats free of ads.
  if (ad) await ads.betweenGames(silence(), ending.value === 'lost');
  action();
};
const leaveToMenu = () => {
  settleNow();
  emit('quit');
};
</script>

<template>
  <section
    ref="root"
    class="game"
    :class="{ night, gauged: mode.stars !== null, training: training !== null }"
    :aria-label="t('game.board')"
    :data-board="board ?? undefined"
  >
    <!-- The level fills the screen; the HUD and the buttons float over its edges. -->
    <span ref="safeArea" class="safe-area" aria-hidden="true"></span>
    <div ref="surface" class="surface">
      <canvas
        ref="canvas"
        class="board"
        :data-art="night ? 'night' : undefined"
        tabindex="0"
        :aria-label="t('game.board')"
        aria-describedby="game-help"
        data-testid="board"
      ></canvas>
      <canvas ref="overlay" class="overlay" aria-hidden="true" hidden></canvas>
      <p v-if="cheer" :key="cheer.serial" class="cheer" aria-hidden="true">{{ cheer.word }}</p>
      <p
        v-if="hintVisible && mode.hint && lessonShown"
        :key="hintKey"
        class="hint"
        :class="{ lasting: training }"
        role="status"
        data-testid="hint"
      >
        {{ t(hintKey) }}
      </p>
      <TrainingCard
        v-if="card && training"
        :step="training.step"
        :of="training.of"
        :name="mode.label"
      />
    </div>

    <GameHud
      ref="hudPart"
      :mode="mode"
      :hud="hud"
      :assisted="assisted"
      :extra-row="extraRow"
      @pause="session?.pause()"
      @reached="starReached"
      @skip="skipTraining"
    />
    <GameControls
      ref="controlsPart"
      :mode="mode"
      :hud="hud"
      @swap="session?.swap()"
      @magnet="session?.toggleMagnet()"
    />
    <p v-if="hud?.magnetArmed" class="sr-only" role="status">{{ t('magnet.armed') }}</p>
    <p id="game-help" class="sr-only">{{ t('game.help') }}</p>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <p class="sr-only" role="status">{{ adMessage }}</p>

    <PausePanel
      ref="pausePanel"
      :offer-hint="offerHint"
      :training="training !== null"
      @resume="session?.resume()"
      @restart="restart"
      @settings="settingsDialog?.open()"
      @quit="emit('quit')"
      @ad-hint="showHint"
      @shard-hint="hintForShards"
      @skip="skipTraining"
    />
    <SettingsDialog ref="settingsDialog" />
    <TrainingEndPanel
      v-if="training"
      :over="ending === 'won' && training.step === training.of"
      :next="trainingNext"
      :promised="promised"
      @continue="(next) => emit('play', next)"
    />
    <ResultPanel
      v-else
      ref="resultPanel"
      :mode="mode"
      :hud="hud"
      :settlement="settlement"
      :defeat="defeat"
      :puzzle-result="puzzleResult"
      :offer-continue="offerContinue"
      :offer-assist="offerAssist"
      :offer-double="offerDouble"
      :ad-message="adMessage"
      :reduced-motion="reducedMotion"
      @ad-continue="continueGame"
      @shard-continue="continueForShards"
      @double="doubleShards"
      @next="(next) => afterBreak(() => emit('play', next))"
      @assist="afterBreak(restartWithAssist)"
      @replay="afterBreak(restart)"
      @leave="leaveToMenu"
      @chime="(index) => feedback.sound.star(index)"
      @equip="launcherEquipped"
    />
  </section>
</template>

<style scoped>
/*
 * The game screen is an application screen, not a page: the level fills the
 * whole screen and the HUD and buttons float over its edges, in strips of a
 * fixed size (the board is fitted beside them, so it never moves or resizes
 * while the level is played). Its parts take their sizes from here.
 */
.game {
  --hud-row: 3.25rem;
  /* On an upright screen, the line of the star gauge under the score (none without stars). */
  --gauge-row: 0rem;
  --gauge-width: clamp(6rem, 30vw, 7rem);
  --extra-row: 2.25rem;
  --controls-row: 3.75rem;
  --rail: 6rem;
  /* The HUD's small words (level, score, chips): 14 px at least (v1.7.6). */
  --hud-small: 0.875rem;
  /* Room left on each side of a 2:1 playing frame (desktop windows wider than that: the parts). */
  --side: 0px;
  --scrim: color-mix(in srgb, var(--bg) 84%, transparent);
  /* Its HUD, rails and dialogs follow its own size, not the window's (v1.7.6). */
  container: game / size;
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
  /* Nothing on the game screen scrolls or zooms: it is held still (useGameSession). */
  touch-action: none;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

.game.gauged {
  --gauge-row: 1.75rem;
}

/* The training's rails (v1.8.0) hold little, but "Skip" in its longest language. */
.game.training {
  --rail: 6.5rem;
}

/* A night board (§ 3.5) stays a night sky under the light theme: the scrims stay as dark as the sky. */
.game.night {
  --scrim: color-mix(in srgb, var(--scene-edge) 84%, transparent);
}

.surface {
  position: absolute;
  inset: 0;
}

.board {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.overlay[hidden] {
  display: none;
}

/* Zero-size: only its padding counts, the screen's safe area read by measureInsets. */
.safe-area {
  position: absolute;
  width: 0;
  height: 0;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
  visibility: hidden;
  pointer-events: none;
}

.hint {
  position: absolute;
  inset-inline: var(--space-4);
  /* Above the buttons: the chain enters from the top on many tracks. */
  bottom: calc(var(--controls-row) + env(safe-area-inset-bottom) + var(--space-2));
  z-index: 1;
  margin-inline: auto;
  width: fit-content;
  max-width: min(30rem, 100% - 2rem);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  box-shadow: var(--shadow);
  font-weight: 700;
  text-align: center;
  pointer-events: none;
  animation: hint 6s ease forwards;
}

/* The training's hint stays until the hand's gesture is done (§ 3.13). */
.hint.lasting {
  animation: hint-in 0.4s ease both;
}

@keyframes hint-in {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
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

/* Wide screens (phones on their side, desktop windows): the buttons' rail is on the right. */
@container game (aspect-ratio >= 3/2) {
  .hint {
    bottom: max(var(--space-4), env(safe-area-inset-bottom));
  }
}

.cheer {
  position: absolute;
  inset-inline: 0;
  top: 38%;
  z-index: 1;
  margin: 0;
  text-align: center;
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 2rem + 4vw, 5rem);
  line-height: 1;
  letter-spacing: 0.02em;
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
  filter: drop-shadow(0 0.05em 0 var(--title-depth)) drop-shadow(0 0 0.25em var(--title-glow));
  pointer-events: none;
  animation: cheer 1.4s ease-out forwards;
}

@keyframes cheer {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-6deg);
  }

  14% {
    opacity: 1;
    transform: scale(1.18) rotate(-3deg);
  }

  26% {
    transform: scale(1) rotate(-3deg);
  }

  75% {
    opacity: 1;
    transform: scale(1.04) rotate(-3deg);
  }

  100% {
    opacity: 0;
    transform: scale(1.1) translateY(-0.4em) rotate(-3deg);
  }
}

/*
 * Reduced motion: no animation at all. The opening hint, whose animation ends
 * faded out, would otherwise vanish at once; it now stays for its six seconds.
 */
@media (prefers-reduced-motion: reduce) {
  .hint,
  .hint.lasting,
  .cheer {
    animation: none;
  }
}
</style>
