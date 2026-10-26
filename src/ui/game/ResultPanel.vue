<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { PlayMode, Settlement } from '@/app/modes';
import type { PlayRequest } from '@/app/PlayRequest';
import { DEMO } from '@/levels/edition';
import { nextLauncher } from '@/player/catalog';
import { CONTINUE_PRICE } from '@/player/rewards';
import type { HudState } from '@/play/PlaySession';
import AdIcon from '@/ui/components/AdIcon.vue';
import StarRow from '@/ui/components/StarRow.vue';
import NextLauncher from './NextLauncher.vue';
import { useMessage } from './useMessage';
import { useShardPrice } from './useShardPrice';

/**
 * The result of a game (v1.7.6, from the game screen): the score, the stars,
 * the records, what was earned, and the choices that follow, the offers
 * decided by the end-of-game rules. A win gets the futuristic panel, its
 * score counting up and its stars chiming (§ 3.5).
 */
const props = defineProps<{
  mode: PlayMode;
  hud: HudState | null;
  settlement: Settlement | null;
  /** Puzzle mode: the shots used against par, once the game is saved. */
  puzzleResult: { readonly shots: number; readonly par: number } | null;
  offerContinue: boolean;
  offerAssist: boolean;
  offerDouble: boolean;
  /** What became of the last rewarded ad. */
  adMessage: string;
  reducedMotion: boolean;
}>();
const emit = defineEmits<{
  adContinue: [];
  shardContinue: [];
  double: [];
  next: [request: PlayRequest];
  assist: [];
  replay: [];
  leave: [];
  /** A star of the result lights up: its chime, a step higher than the one before. */
  chime: [index: number];
  /** A launcher was bought and worn from the panel (v1.8.0): its sound. */
  equip: [];
}>();

const { t, locale } = useI18n();
const services = useServices();
const { player, platform, ads, share } = services;
const say = useMessage();
const shardPrice = useShardPrice();
const number = computed(() => new Intl.NumberFormat(locale.value));
const daily = props.mode.daily;
const dayLabel = computed(() =>
  daily ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(daily.date) : '',
);
/** Where "back" leads, as the button says it. */
const HOME_LABELS = {
  campaign: 'game.map',
  home: 'game.homeButton',
  arcade: 'game.arcadeButton',
} as const;

const won = computed(() => props.hud?.over === 'won');
/** What to play after a win: the next level, puzzle, song or rival, when it is open. */
const following = computed(() =>
  props.hud?.over === 'won' && props.settlement ? props.mode.next(services) : null,
);
const goNext = () => {
  if (following.value) emit('next', following.value.request);
};
/** After a win that paid shards: the launcher they bring closer (§ 3.6). */
const launcherShown = computed(
  () => props.hud?.over === 'won' && (props.settlement?.rewards.shards ?? 0) > 0,
);
/** It follows what the player owns: once one is bought, the bar aims at the next. */
const goal = computed(() => (launcherShown.value ? nextLauncher((id) => player.owns(id)) : null));
/** The end bonus (what the time earned, when it did) and the best score, on one line. */
const scoreLine = computed(() => {
  const parts: string[] = [];
  const bonus = props.hud?.bonus ?? 0;
  const time = props.hud?.timeBonus ?? 0;
  if (time > 0) {
    parts.push(
      t('game.timeBonus', {
        points: number.value.format(time),
        seconds: number.value.format(props.hud?.ahead ?? 0),
      }),
    );
  } else if (bonus > 0) parts.push(t('game.bonus', { points: number.value.format(bonus) }));
  const record = props.settlement?.record;
  if (record && !record.newBest && record.unit !== 'wins' && record.value > 0) {
    parts.push(t('game.best', { score: number.value.format(record.value) }));
  }
  return parts.join(' · ');
});
/** The last level of the campaign is won: the game is finished. */
const campaignDone = computed(() => props.hud?.over === 'won' && props.mode.finale);
/** The result that counts for today: the first attempt. */
const dailyRecord = computed(() =>
  daily && props.settlement ? player.daily(daily.day) : undefined,
);
const primaryReplay = computed(
  () => !following.value && !props.offerAssist && !props.offerContinue && !daily,
);
/** A portal with ads, but none can be offered: an ad blocker. Said, never punished. */
const adsBlocked = computed(() => platform.hasAds && !ads.rewardsOffered);

const shareOutcome = ref<'shared' | 'copied' | 'cancelled' | 'unavailable' | null>(null);
const shareResult = async () => {
  const record = dailyRecord.value;
  if (!daily || !record) return;
  const stars = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
  // On a portal, the link is the portal's own (or none where links are not allowed).
  const url = await platform.shareLink({ day: daily.day });
  const params = { date: dayLabel.value, score: number.value.format(record.score), stars };
  const text = url
    ? t('daily.shareText', { ...params, url }, record.score)
    : t('daily.shareTextNoLink', params, record.score);
  shareOutcome.value = await share.share(text);
};

/** The score shown: it counts up on a win (§ 3.5). */
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
  const target = props.hud?.score ?? 0;
  const stars = props.settlement?.stars ?? 0;
  starTimers = STAR_TIMES.slice(0, stars).map((at, index) =>
    setTimeout(() => emit('chime', index), (at + 0.15) * 1000),
  );
  if (props.reducedMotion || target <= 0) {
    shownScore.value = target;
    return;
  }
  shownScore.value = 0;
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / (COUNT_TIME * 1000));
    shownScore.value = Math.round(target * (1 - (1 - progress) ** 3));
    if (progress < 1) counting = requestAnimationFrame(step);
  };
  counting = requestAnimationFrame(step);
};

const dialog = ref<HTMLDialogElement | null>(null);
const nextButton = ref<HTMLButtonElement | null>(null);
/** A launcher bought and worn on the panel (v1.8.0): it rings, and the focus goes on to what is next. */
const equipped = () => {
  emit('equip');
  (nextButton.value ?? dialog.value?.querySelector<HTMLButtonElement>('.btn-primary'))?.focus();
};
watch(
  () => props.hud?.over,
  (over) => {
    if (over) {
      if (over === 'won') celebrate();
      else shownScore.value = props.hud?.score ?? 0;
      dialog.value?.showModal();
    } else {
      // Another game: what became of the last share is no news any more.
      shareOutcome.value = null;
      if (dialog.value?.open) dialog.value.close();
    }
  },
  // Once the result is drawn: its first choice ("Next", the help) is there to take the focus.
  { flush: 'post' },
);
onBeforeUnmount(stopCelebrating);
defineExpose({
  show: () => dialog.value?.showModal(),
  hide: () => dialog.value?.close(),
});
</script>

<template>
  <dialog
    ref="dialog"
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
        t('game.starsGained', { count: settlement?.starsGained ?? 0 }, settlement?.starsGained ?? 0)
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
      {{
        t(
          'arcade.puzzle.result',
          { shots: puzzleResult.shots, par: puzzleResult.par },
          puzzleResult.shots,
        )
      }}
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
      {{ t('daily.counted', { score: number.format(dailyRecord.score) }, dailyRecord.score) }}
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
        {{
          t(
            'player.earned',
            { count: number.format(settlement.rewards.shards) },
            settlement.rewards.shards,
          )
        }}
      </li>
      <NextLauncher
        v-if="launcherShown"
        :goal="goal"
        :reduced-motion="reducedMotion"
        @equipped="equipped"
      />
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
          @click="emit('adContinue')"
        >
          <span class="ad-label"><AdIcon />{{ t('ads.continue') }}</span>
          <small>{{ t('ads.continueDetail') }}</small>
        </button>
        <button
          class="btn"
          type="button"
          :disabled="player.view.shards < CONTINUE_PRICE"
          data-testid="shard-continue"
          @click="emit('shardContinue')"
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
        @click="emit('double')"
      >
        <span class="ad-label"><AdIcon />{{ t('ads.double') }}</span>
        <small>{{ t('ads.doubleDetail') }}</small>
      </button>
      <button
        v-if="following"
        ref="nextButton"
        class="btn btn-primary"
        type="button"
        autofocus
        data-testid="next"
        @click="goNext"
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
        @click="emit('assist')"
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
          @click="emit('replay')"
        >
          {{ t('game.playAgain') }}
        </button>
        <button class="btn" type="button" data-testid="map" @click="emit('leave')">
          {{ t(HOME_LABELS[mode.home]) }}
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped src="./game-dialog.css"></style>

<style scoped>
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

.next-detail {
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.85;
}

.earned {
  justify-content: center;
  margin-bottom: var(--space-2);
}

.record {
  color: var(--accent);
  font-weight: 800;
}

.result {
  font-size: 1.25rem;
  font-weight: 700;
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
@container game (height <= 47.5rem) {
  .gains {
    margin-top: var(--space-3);
  }
}

/* Phones of 640 px: the fullest result (two goals, an ad, a launcher, a novelty) still fits. */
@container game (height <= 42.5rem) {
  .gains {
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-3);
  }
}
</style>

<style scoped src="./victory-panel.css"></style>
