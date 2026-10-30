import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
  type Ref,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { PlayMode } from '@/app/modes';
import type { Silence } from '@/platform/AdService';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import type { Aiming, Seat } from '@/levels/seat';
import type { Frame, FrameKind } from '@/levels/tracks';
import { chooseFrame, contentBounds, NO_INSETS, type Insets } from '@/play/BoardView';
import { pixelRatioFor } from '@/play/canvas';
import { KeyboardControls, PointerControls, type PlayCommands } from '@/play/Controls';
import type { Look } from '@/play/cosmetics/Look';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { sharedFeedback } from '@/play/feedback';
import { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';
import { frameRateCap } from '@/ui/frameRate';

/** The game screen's elements the session draws on and measures. */
export interface SessionElements {
  readonly root: Ref<HTMLElement | null>;
  readonly surface: Ref<HTMLElement | null>;
  readonly canvas: Ref<HTMLCanvasElement | null>;
  readonly overlay: Ref<HTMLCanvasElement | null>;
  /** Holds the screen's safe-area insets (notch, home bar) as its padding, to be read. */
  readonly safeArea: Ref<HTMLElement | null>;
  /** The strips and rails of the HUD and the buttons, whatever their content. */
  readonly bars: () => readonly (HTMLElement | null | undefined)[];
}

/** What a game is: its mode, the look it wears, whether the assistance is on, the hand. */
export interface SessionGame {
  readonly mode: PlayMode;
  readonly look: Look;
  readonly assisted: Ref<boolean>;
  /** A finger or a mouse, read as each game starts: its seat's pace and stars (v1.8.1). */
  readonly aiming: () => Aiming;
}

/**
 * The game being played on the game screen (v1.7.6): the session, created
 * once the screen is laid out; the board shape chosen for the screen; the
 * pointer, the keyboard, the screen's size and visibility, the sound and the
 * settings that follow the session while it lives; and what the portal hears
 * of it (its pauses, its ads, when the player really plays).
 */
export function useGameSession(game: SessionGame, elements: SessionElements) {
  const { theme, settings, player, platform, gameplay } = useServices();
  const { t } = useI18n();
  const { mode, look, assisted } = game;
  const session = shallowRef<PlaySession | null>(null);
  const hud = computed(() => session.value?.hud ?? null);

  /** A night world's board keeps the cosmos colours in both themes (§ 3.5). */
  const readPalette = () =>
    Palette.fromStyle(
      getComputedStyle(
        look.theme.night && elements.canvas.value
          ? elements.canvas.value
          : document.documentElement,
      ),
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
  feedback.sound.playMusic(mode.music);
  const stopListeningToPortal = platform.onMutedChange((muted) => (portalMuted.value = muted));

  /** An ad covers the game (§ 3.7): time and sound stop until it is over. */
  const adPlaying = ref(false);
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
  // The portal is told when the player really plays: not paused by the player, not
  // over, no ad. A pause of the game's own (hidden tab) is the portal's business.
  watchEffect(() => {
    const state = hud.value;
    const playing = state?.state === 'playing' && (!state.paused || state.pausedBy === 'auto');
    if (playing && !adPlaying.value) gameplay.start();
    else gameplay.stop();
  });

  /** The board shape the screen chose, shown on the game screen for tests (v1.8.1). */
  const board = shallowRef<FrameKind | null>(null);
  /** Where the game in progress is played: its board and the hand that aims (v1.8.1). */
  const seat = shallowRef<Seat | null>(null);
  /** The level for a board shape and a hand, slowed down when the assistance is on. */
  const definitionOn = (shape: Frame, aiming: Aiming): LevelDefinition =>
    mode.definition(shape, {
      assisted: assisted.value,
      difficulty: settings.current.difficulty,
      upgrades: player.upgrades,
      aiming,
    });

  /**
   * Room the HUD and the buttons take along the screen's edges, in CSS pixels:
   * strips along the top and the bottom on an upright screen, rails along the
   * sides on a wide one. Their sizes are fixed, so the board never moves when
   * their content changes (a streak, a weather badge).
   */
  const measureInsets = (): Insets => {
    const box = elements.root.value?.getBoundingClientRect();
    if (!box) return NO_INSETS;
    // The notch and the home bar at least (v1.7.6): on a phone on its side, no rail covers the bottom.
    const safe = elements.safeArea.value ? getComputedStyle(elements.safeArea.value) : null;
    const insets = {
      top: parseFloat(safe?.paddingTop ?? '') || 0,
      right: parseFloat(safe?.paddingRight ?? '') || 0,
      bottom: parseFloat(safe?.paddingBottom ?? '') || 0,
      left: parseFloat(safe?.paddingLeft ?? '') || 0,
    };
    for (const element of elements.bars()) {
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

  /**
   * The board shape that shows this level largest on the screen as it is now:
   * at the start, and again at each restart, the phone may have been turned.
   */
  const chooseShape = (aiming: Aiming): Frame => {
    const box = elements.surface.value?.getBoundingClientRect();
    return chooseFrame(
      (shape) => contentBounds(toLevelSetup(definitionOn(shape, aiming))),
      box?.width ?? window.innerWidth,
      box?.height ?? window.innerHeight,
      measureInsets(),
    );
  };

  const focusBoard = () => elements.canvas.value?.focus();

  /** The level of a new game, at its seat: the board the screen asks for now, the hand it has. */
  const seatedLevel = (): LevelDefinition => {
    const aiming = game.aiming();
    const shape = chooseShape(aiming);
    board.value = shape.kind;
    seat.value = { board: shape.kind, aiming };
    return definitionOn(shape, aiming);
  };

  /** A new game of the level, on the board shape the screen asks for now. */
  const newGame = () => {
    session.value?.restart(seatedLevel());
    focusBoard();
  };

  let cleanups: (() => void)[] = [];

  onMounted(() => {
    const { canvas, surface, root, overlay } = elements;
    if (!canvas.value || !surface.value || !root.value) return;
    const level = seatedLevel();
    const seed = mode.seed;
    const frameRate = frameRateCap();
    const play = new PlaySession({
      canvas: canvas.value,
      distortion: overlay.value ? DistortionLayer.create(overlay.value) : null,
      level,
      palette: readPalette(),
      profile: profile(),
      feedback,
      look,
      ...(seed === null ? {} : { seed: () => seed }),
      ...(mode.root === null ? {} : { root: mode.root }),
      aimAssist: settings.current.aimAssist,
      ...(frameRate === null ? {} : { frameRate }),
      words: { charged: t('training.lessons.charged') },
    });
    session.value = play;

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
      play.resize(
        width,
        height,
        pixelRatioFor(width, height, window.devicePixelRatio),
        measureInsets(),
      );
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
      () => section.removeEventListener('touchmove', holdStill),
      () => play.destroy(),
    ];
    play.start();
    focusBoard();
  });

  watch([() => settings.current.effects, reducedMotion], () =>
    session.value?.setProfile(profile()),
  );
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

  onBeforeUnmount(() => {
    gameplay.stop();
    stopListeningToPortal();
    stopFollowingPause();
    motionQuery.removeEventListener('change', onMotionChange);
    for (const cleanup of cleanups) cleanup();
  });

  return { session, hud, feedback, reducedMotion, silence, newGame, focusBoard, board, seat };
}
