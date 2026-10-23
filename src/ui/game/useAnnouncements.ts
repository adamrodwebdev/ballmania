import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { HudState } from '@/play/PlaySession';

/** A word popping over the board; `serial` restarts its animation for each new one. */
export interface Cheer {
  readonly word: string;
  readonly serial: number;
}

/** How long a word of praise stays over the board, in milliseconds (its animation). */
const CHEER_TIME = 1400;

/**
 * What the game says as it goes (§ 3.5, accessibility): the screen reader's
 * announcements of its events (a switch flipped, a chain reaction, the
 * danger, the weather…), and a word of praise popping over the board for a
 * big chain reaction, a bomb or a power set off.
 */
export function useAnnouncements(hud: Ref<HudState | null>) {
  const { t } = useI18n();
  const announcement = ref('');
  const cheer = ref<Cheer | null>(null);
  let cheerTimer: ReturnType<typeof setTimeout> | undefined;

  const pop = (word: string, serial: number) => {
    cheer.value = { word, serial };
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(() => (cheer.value = null), CHEER_TIME);
  };
  /** Runs `react` each time this part of the HUD takes a value. */
  const on = <T>(read: (state: HudState) => T, react: (value: NonNullable<T>) => void) =>
    watch(
      () => (hud.value ? read(hud.value) : undefined),
      (value) => {
        if (value) react(value);
      },
    );

  on(
    (state) => state.switched,
    ({ branch }) => {
      announcement.value = t('switch.flipped', { branch: t(`switch.${branch}`) });
    },
  );
  on(
    (state) => state.reaction,
    ({ depth, serial }) => {
      announcement.value = t('game.reaction', { depth });
      if (depth >= 3) pop(t(`game.cheer.${Math.min(depth, 6)}`), serial);
    },
  );
  on(
    (state) => state.bombs,
    (bombs) => pop(t('game.cheer.nova'), -bombs),
  );
  on(
    (state) => state.power,
    ({ kind, serial }) => {
      announcement.value = t(`power.${kind}.announce`);
      pop(t(`power.${kind}.cheer`), 100_000 + serial);
    },
  );
  on(
    (state) => state.danger,
    () => (announcement.value = t('game.danger')),
  );
  on(
    (state) => state.secondChance,
    () => (announcement.value = t('upgrades.secondChance.used')),
  );
  on(
    (state) => state.weather,
    (weather) => (announcement.value = t(`weather.${weather}.announce`)),
  );
  on(
    (state) => state.stage,
    (stage) => (announcement.value = t('arcade.endless.stage', { stage: stage + 1 })),
  );

  onBeforeUnmount(() => clearTimeout(cheerTimer));
  return { announcement, cheer };
}
