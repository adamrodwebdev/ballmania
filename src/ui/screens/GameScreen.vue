<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { createMode, type Message, type Settlement } from '@/app/modes';
import type { PlayRequest } from '@/app/PlayRequest';
import { ingredients, SECONDARIES } from '@/engine/chain/Alchemy';
import { puzzleHint } from '@/levels/arcade/hint';
import { CAMPAIGN } from '@/levels/campaign';
import { DEMO } from '@/levels/edition';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';
import { nextLauncher } from '@/player/catalog';
import { ASSIST_AFTER, CONTINUE_PRICE, HINT_COOLDOWN, HINT_PRICE } from '@/player/rewards';
import { KeyboardControls, PointerControls, type PlayCommands } from '@/play/Controls';
import { resolveLook } from '@/play/cosmetics/Look';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { sharedFeedback } from '@/play/feedback';
import { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';
import { chooseFrame, contentBounds, NO_INSETS, type Insets } from '@/play/BoardView';
import type { Silence } from '@/platform/AdService';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';
import AdIcon from '@/ui/components/AdIcon.vue';
import CosmeticPreview from '@/ui/components/CosmeticPreview.vue';
import SoundToggle from '@/ui/components/SoundToggle.vue';
import StarGauge from '@/ui/components/StarGauge.vue';
import StarRow from '@/ui/components/StarRow.vue';

const props = defineProps<{ request: PlayRequest }>();
const emit = defineEmits<{ quit: []; play: [request: PlayRequest] }>();

const { t, locale } = useI18n();
const services = useServices();
const { theme, settings, player, share, platform, ads, gameplay } = services;

const request = props.request;
/** What kind of game this is decides the level, the texts and the records (§ 3.2). */
const mode = createMode(request);
const daily = request.kind === 'daily' ? request.challenge : null;
/** A message in the player's language; a message among its values is translated first. */
const say = (message: Message): string =>
  t(
    message.key,
    Object.fromEntries(
      Object.entries(message.params ?? {}).map(([name, value]) => [
        name,
        typeof value === 'object' ? say(value) : value,
      ]),
    ),
  );

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
/** The sign of star fragments in the top bar. */
const FRAGMENT = '✦';
/** Where "back" leads, as the end dialog's button says it. */
const HOME_LABELS = {
  campaign: 'game.map',
  home: 'game.homeButton',
  arcade: 'game.arcadeButton',
} as const;

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
const surface = ref<HTMLElement | null>(null);
const hudBar = ref<HTMLElement | null>(null);
const hudExtra = ref<HTMLElement | null>(null);
const controlsBar = ref<HTMLElement | null>(null);
/**
 * A boss's health, the alchemy recipes or the duel's rope: a second line of
 * the HUD, whose room is kept from the start so that the board never moves.
 */
const extraRow =
  alchemy ||
  request.kind === 'duel' ||
  (request.kind === 'campaign' && request.level.colossus !== undefined);
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

// A cosmetic being tried (rewarded ad, § 3.7) is worn for this game only.
const look = resolveLook(player.takeLook(), mode.world);
/** A night world's board keeps the cosmos colours in both themes (§ 3.5). */
const night = look.theme.night;
const readPalette = () =>
  Palette.fromStyle(
    getComputedStyle(night && canvas.value ? canvas.value : document.documentElement),
  );

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(motionQuery.matches);
const onMotionChange = (event: MediaQueryListEvent) => (reducedMotion.value = event.matches);
motionQuery.addEventListener('change', onMotionChange);
const profile = () => EffectProfile.for(settings.current.effects, reducedMotion.value);
/** The portal may ask for silence (§ 3.7): it overrides the game's own volume. */
const portalMuted = ref(platform.muted());
const silent = () => portalMuted.value || settings.current.muted;
const volume = () => (silent() ? 0 : settings.current.volume);
const musicVolume = () => (silent() ? 0 : settings.current.music);
const feedback = sharedFeedback(volume(), settings.current.vibration, musicVolume());
// Each world has its theme; Rhythm mode plays its own song, beat by beat.
feedback.sound.playMusic(request.kind === 'rhythm' ? null : mode.world);
const stopListeningToPortal = platform.onMutedChange((muted) => (portalMuted.value = muted));

/** An ad covers the game (§ 3.7): time and sound stop until it is over. */
const adPlaying = ref(false);
/** What became of the last rewarded ad, for the end dialog and the screen reader. */
const adMessage = ref('');
const silence = (): Silence => ({
  start: () => {
    adPlaying.value = true;
    session.value?.hold();
  },
  end: () => {
    adPlaying.value = false;
    session.value?.release();
  },
});

let frame: Frame | null = null;
/** The level for a board shape, slowed down when the assistance is on. */
const definitionOn = (shape: Frame): LevelDefinition =>
  mode.definition(shape, {
    assisted: assisted.value,
    difficulty: settings.current.difficulty,
    upgrades: player.upgrades,
  });
const definition = (): LevelDefinition => definitionOn(frame!);

/**
 * Room the HUD and the buttons take along the screen's edges, in CSS pixels:
 * strips along the top and the bottom on an upright screen, rails along the
 * sides on a wide one. Their sizes are fixed, so the board never moves when
 * their content changes (a streak, a weather badge).
 */
const measureInsets = (): Insets => {
  const box = root.value?.getBoundingClientRect();
  if (!box) return NO_INSETS;
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const element of [hudBar.value, hudExtra.value, controlsBar.value]) {
    if (!element) continue;
    const area = element.getBoundingClientRect();
    if (area.width === 0 || area.height === 0) continue;
    if (area.width >= area.height) {
      if (area.top - box.top < box.height / 2) {
        insets.top = Math.max(insets.top, area.bottom - box.top);
      } else insets.bottom = Math.max(insets.bottom, box.bottom - area.top);
    } else if (area.left - box.left < box.width / 2) {
      insets.left = Math.max(insets.left, area.right - box.left);
    } else insets.right = Math.max(insets.right, box.right - area.left);
  }
  return insets;
};

let cleanups: (() => void)[] = [];

onMounted(() => {
  if (!canvas.value || !surface.value || !root.value) return;
  const box = surface.value.getBoundingClientRect();
  // The board shape that shows this level largest on this screen.
  frame = chooseFrame(
    (shape) => contentBounds(toLevelSetup(definitionOn(shape))),
    box.width,
    box.height,
    measureInsets(),
  );
  const seed = mode.seed;
  const play = new PlaySession({
    canvas: canvas.value,
    distortion: overlay.value ? DistortionLayer.create(overlay.value) : null,
    level: definition(),
    palette: readPalette(),
    profile: profile(),
    feedback,
    look,
    ...(seed === null ? {} : { seed: () => seed }),
    ...(request.kind === 'rhythm' ? { root: request.song.root } : {}),
    aimAssist: settings.current.aimAssist,
    // The very first level teaches by a gesture, not a sentence.
    tutorial: request.kind === 'campaign' && request.level.hint === 'aim',
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
    play.resize(width, height, Math.min(window.devicePixelRatio || 1, 2), measureInsets());
  });
  observer.observe(surface.value);

  // A hidden tab pauses the game, which the portal must not take for the player's pause.
  const onVisibility = () => {
    if (document.hidden) play.pause('auto');
  };
  document.addEventListener('visibilitychange', onVisibility);

  // The screen never moves while a level is played: no scroll, no bounce, no
  // pinch-zoom (iOS Safari heeds a touch that is held back better than CSS).
  // Only the dialogs may scroll, when their content is taller than the screen.
  document.documentElement.classList.add('in-game');
  const holdStill = (event: TouchEvent) => {
    const inDialog = event.target instanceof Element && event.target.closest('dialog');
    if (!inDialog || event.touches.length > 1) event.preventDefault();
  };
  const section = root.value;
  section.addEventListener('touchmove', holdStill, { passive: false });

  cleanups = [
    () => pointer.destroy(),
    () => keyboard.destroy(),
    () => observer.disconnect(),
    () => document.removeEventListener('visibilitychange', onVisibility),
    () => document.documentElement.classList.remove('in-game'),
    () => section.removeEventListener('touchmove', holdStill),
    () => play.destroy(),
    () => motionQuery.removeEventListener('change', onMotionChange),
  ];
  play.start();
  canvas.value.focus();
});

onBeforeUnmount(() => {
  stopCelebrating();
  clearTimeout(cheerTimer);
  clearTimeout(hintTimer);
  settleNow();
  gameplay.stop();
  stopListeningToPortal();
  stopFollowingPause();
  for (const cleanup of cleanups) cleanup();
});

// The portal is told when the player really plays: not paused by the player, not
// over, no ad. A pause of the game's own (hidden tab) is the portal's business.
watchEffect(() => {
  const state = hud.value;
  const playing = state?.state === 'playing' && (!state.paused || state.pausedBy === 'auto');
  if (playing && !adPlaying.value) gameplay.start();
  else gameplay.stop();
});

watch([() => settings.current.effects, reducedMotion], () => session.value?.setProfile(profile()));
watch([() => settings.current.volume, () => settings.current.muted, portalMuted], () =>
  feedback.sound.setVolume(volume()),
);
watch([() => settings.current.music, () => settings.current.muted, portalMuted], () =>
  feedback.sound.setMusicVolume(musicVolume()),
);
// The portal pauses the game (its own ads, a hidden tab): time and sound stop.
const stopFollowingPause = platform.onPausedChange((paused) => {
  if (paused) session.value?.hold();
  else session.value?.release();
});
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
      if (over === 'won') celebrate();
      else shownScore.value = hud.value?.score ?? 0;
      endDialog.value?.showModal();
    } else if (endDialog.value?.open) endDialog.value.close();
  },
  // Once the result is drawn: its first choice ("Next", the help) is there to take the focus.
  { flush: 'post' },
);

/** A won result: the futuristic panel, its score counting up, its stars chiming. */
const won = computed(() => hud.value?.over === 'won');
/** The score shown by the result: it counts up on a win (§ 3.5). */
const shownScore = ref(0);
/** Seconds the score takes to count up. */
const COUNT_TIME = 0.9;
/** When each star of a result lights up, in seconds (StarRow's animation delays). */
const STAR_TIMES = [0.35, 0.6, 0.85];
let counting = 0;
let starTimers: ReturnType<typeof setTimeout>[] = [];
const stopCelebrating = () => {
  cancelAnimationFrame(counting);
  starTimers.forEach(clearTimeout);
  starTimers = [];
};
const celebrate = () => {
  stopCelebrating();
  const target = hud.value?.score ?? 0;
  const stars = settlement.value?.stars ?? 0;
  // Each lit star rings as it pops, a step higher than the one before.
  starTimers = STAR_TIMES.slice(0, stars).map((at, index) =>
    setTimeout(() => feedback.sound.star(index), (at + 0.15) * 1000),
  );
  if (reducedMotion.value || target <= 0) {
    shownScore.value = target;
    return;
  }
  shownScore.value = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / (COUNT_TIME * 1000));
    shownScore.value = Math.round(target * (1 - (1 - t) ** 3));
    if (t < 1) counting = requestAnimationFrame(step);
  };
  counting = requestAnimationFrame(step);
};

/** The player continued once after a defeat (rewarded ad, § 3.7). */
const continued = ref(false);
/** A defeat that may still be continued is saved only once the player decides. */
const pendingLoss = ref(false);
const settle = () => {
  const play = session.value;
  if (!play) return;
  const report = play.summary();
  const result = mode.settle(report, services);
  platform.levelEnded(report.outcome === 'won');
  settlement.value = result;
  const finishedWorld = result.rewards.unlocked.length > 0 || campaignDone.value;
  const endlessRecord = request.kind === 'endless' && result.record?.newBest === true;
  if (finishedWorld || endlessRecord) platform.celebrate();
};
/** Saves a defeat the player chose not to continue. */
const settleNow = () => {
  if (!pendingLoss.value) return;
  pendingLoss.value = false;
  settle();
};

// A finished game is saved at once, even if the player leaves before the dialog.
watch(
  () => hud.value?.state,
  (state) => {
    // The end of a game is the game's moment: the starting hint steps aside.
    if (state !== undefined && state !== 'playing') hintVisible.value = false;
    const play = session.value;
    if (!play || state === undefined || state === 'playing') return;
    if (state === 'lost' && platform.isPortal && mode.continuable && !continued.value) {
      pendingLoss.value = play.revivable;
      if (pendingLoss.value) return;
    }
    settle();
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

/** A word of praise for a big chain reaction (depth 3 and more), popping over the board. */
const cheer = ref<{ readonly word: string; readonly serial: number } | null>(null);
let cheerTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => hud.value?.reaction,
  (reaction) => {
    if (!reaction) return;
    announcement.value = t('game.reaction', { depth: reaction.depth });
    if (reaction.depth < 3) return;
    cheer.value = { word: t(`game.cheer.${Math.min(reaction.depth, 6)}`), serial: reaction.serial };
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(() => (cheer.value = null), 1400);
  },
);

watch(
  () => hud.value?.bombs,
  (bombs) => {
    if (!bombs) return;
    cheer.value = { word: t('game.cheer.nova'), serial: -bombs };
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(() => (cheer.value = null), 1400);
  },
);

/** A power set off (v1.7): its name pops over the board, and the screen reader says what it does. */
watch(
  () => hud.value?.power,
  (power) => {
    if (!power) return;
    announcement.value = t(`power.${power.kind}.announce`);
    cheer.value = { word: t(`power.${power.kind}.cheer`), serial: 100_000 + power.serial };
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(() => (cheer.value = null), 1400);
  },
);

watch(
  () => hud.value?.danger,
  (danger) => {
    if (danger) announcement.value = t('game.danger');
  },
);

watch(
  () => hud.value?.secondChance,
  (used) => {
    if (used) announcement.value = t('upgrades.secondChance.used');
  },
);

watch(
  () => hud.value?.weather,
  (weather) => {
    if (weather) announcement.value = t(`weather.${weather}.announce`);
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
  settleNow();
  settlement.value = null;
  shareOutcome.value = null;
  continued.value = false;
  doubled.value = false;
  adMessage.value = '';
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
/** A star of the gauge lights up: its chime, and the news for screen readers. */
const starReached = (stars: number) => {
  feedback.sound.star(stars - 1);
  announcement.value = t('game.gaugeReached', { count: stars });
};
/** After a win that paid shards: the launcher they bring closer (§ 3.6). */
const goal = computed(() =>
  hud.value?.over === 'won' && (settlement.value?.rewards.shards ?? 0) > 0
    ? nextLauncher((id) => player.owns(id))
    : null,
);
/** The end bonus and the best score, on one line. */
const scoreLine = computed(() => {
  const parts: string[] = [];
  const bonus = hud.value?.bonus ?? 0;
  if (bonus > 0) parts.push(t('game.bonus', { points: number.value.format(bonus) }));
  const record = settlement.value?.record;
  if (record && !record.newBest && record.unit !== 'wins' && record.value > 0) {
    parts.push(t('game.best', { score: number.value.format(record.value) }));
  }
  return parts.join(' · ');
});
const offerAssist = computed(
  () =>
    request.kind === 'campaign' &&
    hud.value?.over === 'lost' &&
    !assisted.value &&
    // A defeat not saved yet counts already.
    player.failures(request.level.id) + (pendingLoss.value ? 1 : 0) >= ASSIST_AFTER,
);

/**
 * After a defeat on a portal, continue once per game: for a rewarded ad (once
 * per visit, portals' rule) or for shards, the way without an ad.
 */
const offerContinue = computed(() => pendingLoss.value && hud.value?.over === 'lost');
const revived = (play: PlaySession) => {
  if (!play.revive()) return false;
  continued.value = true;
  pendingLoss.value = false;
  adMessage.value = t('ads.continued');
  canvas.value?.focus();
  return true;
};
const continueGame = async () => {
  const play = session.value;
  if (!play) return;
  endDialog.value?.close();
  if ((await ads.revive(silence())) && revived(play)) return;
  adMessage.value = t('ads.unavailable');
  endDialog.value?.showModal();
};
const continueForShards = () => {
  const play = session.value;
  if (!play || !play.revivable || !player.spendShards(CONTINUE_PRICE)) return;
  endDialog.value?.close();
  revived(play);
};

/** The shards of a game doubled by a rewarded ad, once. */
const doubled = ref(false);
const offerDouble = computed(
  () =>
    !doubled.value &&
    Boolean(hud.value?.over) &&
    (settlement.value?.rewards.shards ?? 0) > 0 &&
    ads.rewardsOffered,
);
const doubleShards = async () => {
  const shards = settlement.value?.rewards.shards ?? 0;
  endDialog.value?.close();
  if (await ads.reward(silence())) {
    player.grantShards(shards);
    doubled.value = true;
    adMessage.value = t('ads.doubled', { count: number.value.format(shards) });
  } else adMessage.value = t('ads.unavailable');
  endDialog.value?.showModal();
};

/**
 * Puzzle mode: a hint for a rewarded ad, offered in the pause menu (never on
 * the board while playing); the best next shot is then circled.
 */
/** A minute between two hints: offers are not made too often (portals' rule). */
const hintResting = ref(false);
let hintTimer: ReturnType<typeof setTimeout> | undefined;
const rest = () => {
  hintResting.value = true;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => (hintResting.value = false), HINT_COOLDOWN * 1000);
};
const offerHint = computed(
  () =>
    request.kind === 'puzzle' &&
    platform.isPortal &&
    hud.value?.state === 'playing' &&
    !hintResting.value,
);
const giveHint = (play: PlaySession) => {
  play.resume();
  const shown = play.showHint(puzzleHint);
  if (shown) rest();
  adMessage.value = shown ? t('ads.hintShown') : t('ads.unavailable');
  canvas.value?.focus();
};
const showHint = async () => {
  const play = session.value;
  if (!play) return;
  // The game stays paused while the ad is asked for and shown.
  pauseDialog.value?.close();
  if (await ads.reward(silence())) giveHint(play);
  else {
    play.resume();
    adMessage.value = t('ads.unavailable');
  }
};
const hintForShards = () => {
  const play = session.value;
  if (!play || !player.spendShards(HINT_PRICE)) return;
  pauseDialog.value?.close();
  giveHint(play);
};
/** The price of a choice paid in shards, with the balance when it can't be paid yet. */
const shardPrice = (price: number) =>
  player.view.shards < price
    ? t('ads.forShardsShort', { price, balance: player.view.shards })
    : t('ads.forShards', { price });

/** A portal with ads, but none can be offered: an ad blocker. Said, never punished. */
const adsBlocked = computed(() => platform.hasAds && !ads.rewardsOffered);

/**
 * Starting another game from the end dialog is a natural break: maybe an ad
 * first (§ 3.7, at most one every three minutes), above the game once the
 * dialog is closed. Never on the way back to a menu, and never after offering
 * to continue for an ad: one ad offer per break (continuing for shards only
 * is no ad offer).
 */
const afterBreak = async (action: () => void, ad = !(offerContinue.value && ads.reviveOffered)) => {
  settleNow();
  endDialog.value?.close();
  // On a new player's first visit, the policy keeps defeats free of ads.
  if (ad) await ads.betweenGames(silence(), hud.value?.over === 'lost');
  action();
};
const leaveToMenu = () => {
  settleNow();
  quit();
};
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
const primaryReplay = computed(
  () => !following.value && !offerAssist.value && !offerContinue.value && !daily,
);

const shareResult = async () => {
  const record = dailyRecord.value;
  if (!daily || !record) return;
  const stars = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
  // On a portal, the link is the portal's own (or none where links are not allowed).
  const url = await platform.shareLink({ day: daily.day });
  const params = { date: dayLabel.value, score: number.value.format(record.score), stars };
  const text = url ? t('daily.shareText', { ...params, url }) : t('daily.shareTextNoLink', params);
  shareOutcome.value = await share.share(text);
};
const quit = () => emit('quit');
</script>

<template>
  <section
    ref="root"
    class="game"
    :class="{ night, gauged: mode.stars !== null }"
    :aria-label="t('game.board')"
  >
    <!-- The level fills the screen; the HUD and the buttons float over its edges. -->
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
      <p v-if="hintVisible && mode.hint" class="hint" role="status" data-testid="hint">
        {{ t(`hints.${mode.hint}`) }}
      </p>
    </div>

    <div ref="hudBar" class="hud">
      <button
        class="btn hud-button"
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
      <p class="level">
        <span class="level-name" data-testid="level">{{ say(mode.label) }}</span>
        <span v-if="request.kind === 'campaign'" class="level-detail" data-testid="difficulty">
          {{ t(`difficulty.${settings.current.difficulty}.name`) }}
        </span>
      </p>
      <p class="score">
        <span class="label">{{ t('game.score') }}</span>
        <span class="value" data-testid="score">{{ number.format(hud?.score ?? 0) }}</span>
        <StarGauge
          v-if="mode.stars"
          :score="hud?.score ?? 0"
          :thresholds="mode.stars"
          @reached="starReached"
        />
        <span v-if="(hud?.streak ?? 0) >= 2" class="streak">
          {{ t('game.streak', { count: hud?.streak ?? 0 }) }}
        </span>
      </p>
      <div class="hud-end">
        <p v-if="hud && hud.shotsLeft !== null" class="badge" data-testid="shots">
          {{ t('arcade.puzzle.shotsLeft', { count: hud.shotsLeft }, hud.shotsLeft) }}
        </p>
        <p
          v-if="hud && hud.fragments !== null"
          class="badge fragments"
          :aria-label="t('observatory.caught', { count: hud.fragments }, hud.fragments)"
          data-testid="fragments"
        >
          {{ FRAGMENT }} {{ hud.fragments }}
        </p>
        <p v-if="hud && hud.stage !== null" class="badge" data-testid="stage">
          {{ t('arcade.endless.stage', { stage: hud.stage + 1 }) }}
        </p>
        <SoundToggle class="btn hud-sound" />
      </div>
    </div>

    <!-- What comes and goes floats beside the HUD: it never takes room from the board. -->
    <div class="chips" :class="{ low: extraRow }">
      <p v-if="assisted" class="chip" data-testid="assisted">{{ t('assist.active') }}</p>
      <p v-if="hud?.groove" class="chip groove" data-testid="groove">
        {{ t('arcade.rhythm.groove', { multiplier: hud.groove }) }}
      </p>
      <p v-if="hud?.weather" class="chip weather" :class="hud.weather" data-testid="weather">
        {{ t(`weather.${hud.weather}.name`) }}
      </p>
      <p v-if="hud?.slow" class="chip power slow" data-testid="slow">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M7 4h10v2.2l-3.6 5.8 3.6 5.8V20H7v-2.2l3.6-5.8L7 6.2z" fill="currentColor" />
        </svg>
        {{ t('power.slow.chip', { seconds: hud.slow }) }}
      </p>
      <p v-if="hud?.powerShot" class="chip power" :class="hud.powerShot" data-testid="power-shot">
        <span v-if="hud.powerShot === 'wild'" class="prism" aria-hidden="true"></span>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M13 2 5 13h5.2L8 22l9-11.5h-5.2z" fill="currentColor" />
        </svg>
        {{ t(`power.${hud.powerShot === 'wild' ? 'rainbow' : 'laser'}.ready`) }}
      </p>
    </div>

    <div v-if="extraRow" ref="hudExtra" class="hud-extra">
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

    <div ref="controlsBar" class="controls">
      <button class="btn control swap" type="button" data-testid="swap" @click="session?.swap()">
        <span class="balls" aria-hidden="true">
          <span class="dot" :class="`tone-${hud?.current ?? 0}`"></span>
          <span class="dot small" :class="`tone-${hud?.next ?? 0}`"></span>
        </span>
        <span class="control-label">
          {{ t(request.kind === 'puzzle' ? 'arcade.puzzle.nextColour' : 'game.swap') }}
        </span>
      </button>
      <label v-if="hud && hud.nova !== null" class="control nova" data-testid="nova">
        <span class="control-label">
          {{ t(hud.nova >= 1 ? 'upgrades.nova.ready' : 'upgrades.nova.name') }}
        </span>
        <progress class="gauge" max="1" :value="hud.nova"></progress>
      </label>
      <button
        v-if="hud?.magnet"
        class="btn control magnet"
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
        <span class="control-label" aria-hidden="true">{{ t('magnet.button') }}</span>
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
    <p class="sr-only" role="status">{{ adMessage }}</p>

    <dialog ref="pauseDialog" class="dialog" aria-labelledby="pause-title" @cancel.prevent>
      <h2 id="pause-title">{{ t('game.paused') }}</h2>
      <div class="actions">
        <button class="btn btn-primary" type="button" autofocus @click="resume">
          {{ t('game.resume') }}
        </button>
        <template v-if="offerHint">
          <button
            v-if="ads.rewardsOffered"
            class="btn"
            type="button"
            data-testid="ad-hint"
            @click="showHint"
          >
            <span class="ad-label"><AdIcon />{{ t('ads.hint') }}</span>
            <small>{{ t('ads.hintDetail') }}</small>
          </button>
          <p v-else class="detail" data-testid="ads-blocked">{{ t('ads.blocked') }}</p>
          <button
            class="btn"
            type="button"
            :disabled="player.view.shards < HINT_PRICE"
            data-testid="shard-hint"
            @click="hintForShards"
          >
            <span>{{ t('ads.hint') }}</span>
            <small>{{ shardPrice(HINT_PRICE) }}</small>
          </button>
        </template>
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

    <dialog
      ref="endDialog"
      class="dialog"
      :class="{ victory: won }"
      aria-labelledby="end-title"
      @cancel.prevent
    >
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
      <p v-if="(settlement?.starsGained ?? 0) > 0" class="record" data-testid="stars-gained">
        {{
          t(
            'game.starsGained',
            { count: settlement?.starsGained ?? 0 },
            settlement?.starsGained ?? 0,
          )
        }}
      </p>
      <p class="result">
        <span aria-hidden="true">
          {{ t('game.finalScore', { score: number.format(shownScore) }) }}
        </span>
        <span class="sr-only">
          {{ t('game.finalScore', { score: number.format(hud?.score ?? 0) }) }}
        </span>
      </p>
      <p v-if="campaignDone" class="record" data-testid="campaign-done">
        {{ t(DEMO ? 'demo.done' : 'game.campaignDone') }}
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
      <p v-if="scoreLine" class="detail" data-testid="score-line">{{ scoreLine }}</p>
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
          settlement &&
          (settlement.rewards.shards > 0 ||
            settlement.rewards.unlocked.length > 0 ||
            (hud?.fragments ?? 0) > 0)
        "
        class="gains"
      >
        <!-- Goals first, then what was earned and the launcher it brings closer. -->
        <li v-for="achievement in settlement.rewards.achievements" :key="achievement.id">
          {{ t('achievements.reached', { name: t(`achievements.list.${achievement.id}.name`) }) }}
        </li>
        <li v-for="item in settlement.rewards.unlocked" :key="item.id" class="unlock">
          {{ t('shop.unlocked', { name: t(`cosmetics.${item.id}`) }) }}
        </li>
        <li v-if="(hud?.fragments ?? 0) > 0" class="shards total" data-testid="fragments-earned">
          {{ t('observatory.caught', { count: hud?.fragments ?? 0 }, hud?.fragments ?? 0) }}
        </li>
        <li v-if="settlement.rewards.shards > 0" class="shards total" data-testid="shards-earned">
          {{ t('player.earned', { count: number.format(settlement.rewards.shards) }) }}
        </li>
        <li v-if="goal" class="reward" data-testid="next-launcher">
          <CosmeticPreview :item="goal" class="reward-preview" />
          <span class="reward-text">
            <span class="reward-name">
              {{ t('game.reward.launcher', { name: t(`cosmetics.${goal.id}`) }) }}
            </span>
            <progress
              class="reward-bar"
              :max="goal.price"
              :value="Math.min(player.view.shards, goal.price)"
              :aria-label="t('game.reward.launcher', { name: t(`cosmetics.${goal.id}`) })"
            ></progress>
            <span class="reward-count">
              {{
                player.view.shards >= goal.price
                  ? t('game.reward.ready')
                  : t('game.reward.progress', {
                      have: number.format(player.view.shards),
                      price: number.format(goal.price),
                    })
              }}
            </span>
          </span>
        </li>
      </ul>

      <p v-if="adMessage" class="detail" data-testid="ad-message">{{ adMessage }}</p>
      <p
        v-else-if="
          adsBlocked &&
          ((hud?.over === 'lost' && mode.continuable) || (settlement?.rewards.shards ?? 0) > 0)
        "
        class="detail"
        data-testid="ads-blocked"
      >
        {{ t('ads.blocked') }}
      </p>

      <div class="actions">
        <template v-if="offerContinue">
          <!-- The offer looks like every other choice: no button pushes the ad. -->
          <button
            v-if="ads.reviveOffered"
            class="btn"
            type="button"
            data-testid="ad-continue"
            @click="continueGame"
          >
            <span class="ad-label"><AdIcon />{{ t('ads.continue') }}</span>
            <small>{{ t('ads.continueDetail') }}</small>
          </button>
          <button
            class="btn"
            type="button"
            :disabled="player.view.shards < CONTINUE_PRICE"
            data-testid="shard-continue"
            @click="continueForShards"
          >
            <span>{{ t('ads.continue') }}</span>
            <small>{{ shardPrice(CONTINUE_PRICE) }}</small>
          </button>
        </template>
        <button
          v-if="offerDouble"
          class="btn"
          type="button"
          data-testid="ad-double"
          @click="doubleShards"
        >
          <span class="ad-label"><AdIcon />{{ t('ads.double') }}</span>
          <small>{{ t('ads.doubleDetail') }}</small>
        </button>
        <button
          v-if="following"
          class="btn btn-primary"
          type="button"
          autofocus
          data-testid="next"
          @click="afterBreak(goNext)"
        >
          <span>{{ say(following.label) }}</span>
          <small v-if="following.detail" class="next-detail" data-testid="next-detail">
            {{ say(following.detail) }}
          </small>
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
          @click="afterBreak(restartWithAssist)"
        >
          <span>{{ t('assist.retry') }}</span>
          <small>{{ t('assist.detail') }}</small>
        </button>
        <!-- Side by side under "Next": the whole panel stays in a short window. -->
        <div class="pair" :class="{ split: !primaryReplay }">
          <button
            class="btn"
            :class="{ 'btn-primary': primaryReplay }"
            type="button"
            :autofocus="primaryReplay"
            data-testid="replay"
            @click="afterBreak(restart)"
          >
            {{ t('game.playAgain') }}
          </button>
          <button class="btn" type="button" data-testid="map" @click="leaveToMenu">
            {{ t(HOME_LABELS[mode.home]) }}
          </button>
        </div>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
/*
 * The game screen is an application screen, not a page: the level fills the
 * whole screen and the HUD and buttons float over its edges, in strips of a
 * fixed size (the board is fitted beside them, so it never moves or resizes
 * while the level is played).
 */
.game {
  --hud-row: 3.25rem;
  /* On an upright screen, the line of the star gauge under the score (none without stars). */
  --gauge-row: 0rem;
  --gauge-width: clamp(6rem, 30vw, 7rem);
  --extra-row: 2.25rem;
  --controls-row: 3.75rem;
  --rail: 6rem;
  --scrim: color-mix(in srgb, var(--bg) 84%, transparent);
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
  /* Nothing on the game screen scrolls or zooms: it is held still (see onMounted). */
  touch-action: none;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

.game.gauged {
  --gauge-row: 1.75rem;
}

/*
 * A night board (§ 3.5) stays a night sky under the light theme: the scrims
 * stay as dark as the sky, and what floats over the board without a pill of
 * its own gets one.
 */
.game.night {
  --scrim: color-mix(in srgb, var(--scene-edge) 84%, transparent);
}

:root:not([data-theme='dark']) .game.night :is(.score, .colossus, .alchemy, .duel) {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: var(--shadow);
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

.hud,
.hud-extra,
.chips,
.controls {
  position: absolute;
  z-index: 2;
  margin: 0;
  pointer-events: none;
  /* A drag that starts on the HUD neither scrolls nor zooms the page. */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.hud :is(button, label),
.hud-extra :is(button, label),
.controls :is(button, label) {
  pointer-events: auto;
}

/* Upright screens: a strip along the top, with the gauge's line under its buttons… */
.hud {
  inset: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: calc(var(--hud-row) + var(--gauge-row) + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) max(var(--space-3), env(safe-area-inset-right)) var(--gauge-row)
    max(var(--space-3), env(safe-area-inset-left));
  background: linear-gradient(to bottom, var(--scrim), transparent);
}

.hud-button,
.hud-sound {
  flex: none;
  width: var(--touch);
  height: var(--touch);
  min-width: 0;
  padding: 0;
  border-color: var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
}

.level {
  display: grid;
  min-width: 0;
  max-width: 32%;
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-2) 88%, transparent);
  line-height: 1.15;
}

.level-name {
  overflow: hidden;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-detail {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score {
  position: absolute;
  top: calc(env(safe-area-inset-top) + var(--hud-row) / 2);
  left: 50%;
  display: grid;
  justify-items: center;
  margin: 0;
  line-height: 1;
  transform: translate(-50%, -50%);
}

.label {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.value {
  color: var(--accent);
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 1.25rem + 1.2vw, 2.1rem);
  font-weight: 400;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

/* The star gauge hangs under the score, in the strip's own line: it covers nothing. */
.score .star-gauge {
  position: absolute;
  top: calc(100% + 0.2rem);
  left: 50%;
  width: var(--gauge-width);
  transform: translateX(-50%);
}

/* Under the score, out of the flow: a streak never moves anything. */
.streak {
  position: absolute;
  top: calc(100% + 0.2rem);
  padding: 0.1rem var(--space-2);
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
}

/*
 * With a gauge, the streak goes beside it, level with its bar: under the
 * strip, it would hide the top of the track.
 */
.gauged .streak {
  top: calc(100% + 0.5rem);
  left: calc(50% + var(--gauge-width) / 2 + 0.4rem);
}

.hud-end {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.badge,
.chip {
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-2) 88%, transparent);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chip {
  font-size: 0.8rem;
  box-shadow: var(--shadow);
}

.groove,
.fragments {
  box-shadow: inset 0 0 0 2px var(--orb-cyan);
}

/* The powers at work (v1.7): their colour on the ring of the chip, their icon in front. */
.chip.power {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.chip.slow {
  box-shadow:
    inset 0 0 0 2px var(--orb-cyan),
    var(--shadow);
}

.chip.slow svg {
  color: var(--orb-cyan);
}

.chip.laser {
  box-shadow:
    inset 0 0 0 2px var(--orb-violet),
    var(--shadow);
}

.chip.laser svg {
  color: var(--orb-violet);
}

.chip.wild {
  box-shadow:
    inset 0 0 0 2px var(--text-muted),
    var(--shadow);
}

.prism {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: conic-gradient(
    var(--orb-ruby),
    var(--orb-amber),
    var(--orb-lime),
    var(--orb-cyan),
    var(--orb-violet),
    var(--orb-rose),
    var(--orb-ruby)
  );
}

/* …what comes and goes floats just below it, on the right… */
.chips {
  top: calc(env(safe-area-inset-top) + var(--hud-row) + var(--gauge-row) + var(--space-1));
  right: max(var(--space-3), env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}

.chips.low {
  top: calc(
    env(safe-area-inset-top) + var(--hud-row) + var(--gauge-row) + var(--extra-row) + var(--space-1)
  );
}

/* …a boss's health, the recipes or the rope get a second line of their own… */
.hud-extra {
  top: calc(env(safe-area-inset-top) + var(--hud-row) + var(--gauge-row));
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--extra-row);
  padding-inline: max(var(--space-4), env(safe-area-inset-right))
    max(var(--space-4), env(safe-area-inset-left));
}

.colossus {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(100%, 32rem);
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

.alchemy {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1) var(--space-4);
  margin: 0;
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

.duel {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(100%, 32rem);
  font-weight: 800;
}

.rope {
  flex: 1;
  height: 0.75rem;
}

.side.rival {
  color: var(--danger);
}

/* …and the buttons along the bottom. */
.controls {
  inset: auto 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: calc(var(--controls-row) + env(safe-area-inset-bottom));
  padding: 0 max(var(--space-3), env(safe-area-inset-right)) env(safe-area-inset-bottom)
    max(var(--space-3), env(safe-area-inset-left));
  background: linear-gradient(to top, var(--scrim), transparent);
}

.control {
  flex-direction: row;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  border-radius: 999px;
  font-weight: 800;
  white-space: nowrap;
}

.control:active:not(:disabled) {
  transform: translateY(2px);
}

.balls {
  display: inline-flex;
  align-items: center;
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

.nova {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.gauge {
  width: 4.5rem;
  height: 0.6rem;
  accent-color: var(--orb-cyan);
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

/*
 * Wide screens (phones on their side, desktop windows): the height is what
 * the level lacks, so the HUD becomes a rail on the left and the buttons a
 * rail on the right.
 */
@media (min-aspect-ratio: 3/2) {
  .hud {
    inset: 0 auto 0 0;
    flex-direction: column;
    gap: var(--space-3);
    width: calc(var(--rail) + env(safe-area-inset-left));
    height: auto;
    padding: max(var(--space-3), env(safe-area-inset-top)) var(--space-2)
      max(var(--space-3), env(safe-area-inset-bottom))
      max(var(--space-2), env(safe-area-inset-left));
    background: linear-gradient(to right, var(--scrim), transparent);
  }

  .level {
    max-width: 100%;
    justify-items: center;
    padding-inline: var(--space-2);
    text-align: center;
  }

  .level-name {
    white-space: normal;
  }

  /* In the rail, the gauge follows the score and the streak goes under both. */
  .score {
    position: relative;
    inset: auto;
    transform: none;
  }

  .score .star-gauge {
    position: static;
    width: 100%;
    margin-top: 0.35rem;
    transform: none;
  }

  .gauged .streak {
    top: calc(100% + 0.2rem);
    left: auto;
  }

  .value {
    font-size: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  }

  .hud-end {
    flex-direction: column;
    margin: auto 0 0;
  }

  .chips {
    top: max(var(--space-3), env(safe-area-inset-top));
    right: auto;
    left: calc(var(--rail) + env(safe-area-inset-left) + var(--space-2));
    align-items: flex-start;
  }

  .chips.low {
    top: calc(var(--extra-row) + max(var(--space-3), env(safe-area-inset-top)));
  }

  .hud-extra {
    top: 0;
    right: calc(var(--rail) + env(safe-area-inset-right));
    left: calc(var(--rail) + env(safe-area-inset-left));
    height: calc(var(--extra-row) + env(safe-area-inset-top));
    padding-top: env(safe-area-inset-top);
  }

  .controls {
    inset: 0 0 0 auto;
    flex-direction: column;
    width: calc(var(--rail) + env(safe-area-inset-right));
    height: auto;
    padding: max(var(--space-3), env(safe-area-inset-top))
      max(var(--space-2), env(safe-area-inset-right))
      max(var(--space-3), env(safe-area-inset-bottom)) var(--space-2);
    background: linear-gradient(to left, var(--scrim), transparent);
  }

  .control,
  .nova {
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
    padding: var(--space-2) var(--space-1);
    border-radius: var(--radius);
    white-space: normal;
    text-align: center;
  }

  .gauge {
    width: 100%;
  }

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

.weather {
  animation: weather 1.2s ease-in-out infinite alternate;
}

.weather.solar {
  box-shadow: inset 0 0 0 2px var(--orb-amber);
}

.weather.cold {
  box-shadow: inset 0 0 0 2px var(--orb-cyan);
}

.weather.wind {
  box-shadow: inset 0 0 0 2px var(--orb-violet);
}

@keyframes weather {
  to {
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cheer,
  .weather {
    animation: none;
  }
}

.eyebrow {
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 700;
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

/* What was earned, set apart from the goals above it. */
.total:not(:first-child) {
  margin-top: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid color-mix(in srgb, var(--text-muted) 24%, transparent);
}

/* The launcher the shards bring closer: its picture, a bar, what is left. */
.reward {
  display: grid;
  grid-template-columns: 3rem 1fr;
  align-items: center;
  gap: var(--space-3);
  text-align: start;
}

.reward-preview {
  width: 3rem;
  margin: 0;
}

.reward-text {
  display: grid;
  gap: 0.3rem;
}

.reward-name {
  font-weight: 800;
}

.reward-bar {
  width: 100%;
  height: 0.5rem;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 26%, transparent);
  appearance: none;
}

.reward-bar::-webkit-progress-bar {
  background: transparent;
}

.reward-bar::-webkit-progress-value {
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary-mid), var(--primary-top));
}

.reward-bar::-moz-progress-bar {
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary-mid), var(--primary-top));
}

.reward-count {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.next-detail {
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.85;
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

.ad-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dialog {
  width: min(100% - 2rem, 24rem);
  max-height: calc(100% - 2rem);
  /* A dialog taller than a small phone scrolls inside itself, and only itself. */
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
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

.pair {
  display: grid;
  gap: var(--space-2);
}

.pair.split {
  grid-template-columns: 1fr 1fr;
}

.pair.split .btn {
  padding-inline: var(--space-2);
}

/* Short windows (portal frames): the result keeps every choice in view without scrolling. */
@media (max-height: 760px) {
  .actions {
    margin-top: var(--space-4);
  }

  .gains {
    margin-top: var(--space-3);
  }
}

/*
 * A won result (§ 3.5): a pane of frosted glass with a ring of light running
 * round its edge, which rises into place as the supernova fades; the title
 * catches a sweep of light, the score glows and counts up, the stars chime.
 */
@property --spin {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.dialog.victory {
  border-color: transparent;
  background: color-mix(in srgb, var(--surface) 74%, transparent);
  box-shadow:
    0 1.5rem 4rem rgb(0 0 0 / 0.5),
    0 0 3.5rem color-mix(in srgb, var(--accent) 22%, transparent);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  backdrop-filter: blur(18px) saturate(1.4);
}

.dialog.victory::before {
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--spin),
    var(--accent),
    var(--orb-cyan),
    var(--orb-rose),
    var(--orb-violet),
    var(--accent)
  );
  content: '';
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.dialog.victory::backdrop {
  background: radial-gradient(ellipse at 50% 45%, rgb(8 4 24 / 0.2), rgb(4 2 12 / 0.72));
}

/* The title of light on the dark theme; plain text stays more legible on the light one. */
:root[data-theme='dark'] .dialog.victory h2 {
  background: linear-gradient(
    100deg,
    var(--title-mid) 0%,
    var(--title-top) 38%,
    #ffffff 48%,
    var(--title-top) 58%,
    var(--title-low) 100%
  );
  background-size: 260% 100%;
  background-position: 0 0;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 0.45em color-mix(in srgb, var(--accent) 45%, transparent));
}

.dialog.victory .result {
  color: var(--accent);
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 1.3rem + 1vw, 2rem);
  font-weight: 400;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 1.2rem color-mix(in srgb, var(--accent) 55%, transparent);
}

@media (prefers-reduced-motion: no-preference) {
  .dialog.victory[open] {
    animation: panel-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .dialog.victory::before {
    animation: spin 5s linear infinite;
  }

  .dialog.victory[open]::backdrop {
    animation: backdrop-in 0.6s ease both;
  }

  .dialog.victory h2 {
    animation:
      title-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both,
      shimmer 1.5s ease-in-out 0.3s both;
  }

  .dialog.victory .actions {
    animation: rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dialog.victory[open] {
    animation: fade-in 0.3s ease both;
  }
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.94);
    filter: blur(6px);
  }

  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }
}

@keyframes spin {
  to {
    --spin: 360deg;
  }
}

@keyframes title-in {
  from {
    opacity: 0;
    letter-spacing: 0.25em;
    filter: blur(6px);
  }
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}
</style>
