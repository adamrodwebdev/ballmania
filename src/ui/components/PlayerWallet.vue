<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { Currency } from './Currency';
import { FRAGMENT_PATH, SHARD_PATH } from './icons';

/**
 * The player's balance, always in sight (v1.8.0): shards and star fragments,
 * each with its sign; the one this screen spends (`main`) is set larger, with
 * its name. A figure counts to its new value when it changes and the
 * difference rises from it ("−150", "+215"); with reduced motion, it changes
 * at once. Screen readers hear each balance as a sentence. A reward that flies
 * to a coin finds it with `coinOf`, and makes it pop as it lands (`pulse`).
 */
const props = defineProps<{ main?: Currency | undefined }>();

const { t, locale } = useI18n();
const { player } = useServices();
const number = computed(() => new Intl.NumberFormat(locale.value, { signDisplay: 'never' }));
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Seconds a figure takes to count to its new value, and its difference to rise and fade. */
const COUNT_TIME = 0.45;
const DELTA_TIME = 1.2;
/** Seconds a coin pops when a reward lands on it. */
const PULSE_TIME = 0.45;

/** How each currency is read, named, signed and found by the tests. */
const COINS: Readonly<
  Record<
    Currency,
    {
      readonly balance: () => number;
      readonly sentence: string;
      readonly unit: string;
      readonly icon: string;
      readonly testid: string;
    }
  >
> = {
  shards: {
    balance: () => player.view.shards,
    sentence: 'player.balance',
    unit: 'wallet.shards',
    icon: SHARD_PATH,
    testid: 'wallet',
  },
  fragments: {
    balance: () => player.view.fragments,
    sentence: 'observatory.balance',
    unit: 'wallet.fragments',
    icon: FRAGMENT_PATH,
    testid: 'fragments',
  },
};
const CURRENCIES: readonly Currency[] = ['shards', 'fragments'];
const balance = (currency: Currency) => COINS[currency].balance();

/** A figure as drawn: it counts up or down to the balance, and shows what changed. */
function useFigure(currency: Currency) {
  const shown = ref(balance(currency));
  const delta = ref<{ readonly id: number; readonly amount: number } | null>(null);
  let frame = 0;
  let fade: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => balance(currency),
    (now, before) => {
      cancelAnimationFrame(frame);
      clearTimeout(fade);
      delta.value = { id: (delta.value?.id ?? 0) + 1, amount: now - before };
      fade = setTimeout(() => (delta.value = null), DELTA_TIME * 1000);
      if (still) {
        shown.value = now;
        return;
      }
      const from = shown.value;
      let start: number | null = null;
      const step = (time: number) => {
        start ??= time;
        const progress = Math.min(1, (time - start) / (COUNT_TIME * 1000));
        shown.value = Math.round(from + (now - from) * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
  );
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    clearTimeout(fade);
  });
  return { shown, delta };
}

const figures = { shards: useFigure('shards'), fragments: useFigure('fragments') };

const coins = computed(() =>
  CURRENCIES.map((currency) => {
    const coin = COINS[currency];
    const value = coin.balance();
    return {
      currency,
      icon: coin.icon,
      testid: coin.testid,
      main: currency === props.main,
      shown: number.value.format(figures[currency].shown.value),
      delta: figures[currency].delta.value,
      // What a screen reader hears, and the name written beside the screen's own currency.
      sentence: t(coin.sentence, { count: number.value.format(value) }, value),
      unit: t(coin.unit, value),
    };
  }),
);
const signed = (amount: number) => `${amount > 0 ? '+' : '−'}${number.value.format(amount)}`;

const root = ref<HTMLElement | null>(null);
/** The sign of `currency`'s coin: where a reward's sparks land. */
const coinOf = (currency: Currency): HTMLElement | null =>
  root.value?.querySelector<HTMLElement>(`.coin.${currency} svg`) ?? null;
/** The coin that pops, for as long as it does. */
const pulsing = ref<Currency | null>(null);
let pulseEnd: ReturnType<typeof setTimeout> | undefined;
/** A reward lands on `currency`'s coin: it pops (not with reduced motion). */
const pulse = (currency: Currency) => {
  if (still) return;
  clearTimeout(pulseEnd);
  pulsing.value = null;
  requestAnimationFrame(() => {
    pulsing.value = currency;
    pulseEnd = setTimeout(() => (pulsing.value = null), PULSE_TIME * 1000);
  });
};
onBeforeUnmount(() => clearTimeout(pulseEnd));
defineExpose({ coinOf, pulse });
</script>

<template>
  <div ref="root" class="wallet" role="group" :aria-label="t('wallet.label')">
    <p
      v-for="coin in coins"
      :key="coin.currency"
      class="coin"
      :class="[coin.currency, { main: coin.main, pulsing: pulsing === coin.currency }]"
      :data-testid="coin.testid"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path :d="coin.icon" />
      </svg>
      <span class="amount" aria-hidden="true">
        <span class="figure">{{ coin.shown }}</span>
        <span v-if="coin.main" class="unit">{{ coin.unit }}</span>
      </span>
      <span class="sr-only">{{ coin.sentence }}</span>
      <span
        v-if="coin.delta"
        :key="coin.delta.id"
        class="delta"
        :class="{ gain: coin.delta.amount > 0 }"
        aria-hidden="true"
        >{{ signed(coin.delta.amount) }}</span
      >
    </p>
  </div>
</template>

<style scoped>
.wallet {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.4rem;
}

.coin {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  margin: 0;
  padding: 0 0.75rem 0 0.6rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.coin svg {
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
}

/* A gold gem, edged like the gold buttons so it reads on a white card too. */
.shards path {
  fill: var(--primary-mid);
  stroke: var(--primary-edge);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.shards svg {
  filter: drop-shadow(0 0 4px var(--primary-glow));
}

.fragments path {
  fill: var(--orb-cyan);
}

.fragments svg {
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--orb-cyan) 60%, transparent));
}

/* The currency this screen spends: larger, ringed with its colour, its name beside the figure. */
.coin.main {
  min-height: var(--touch);
  padding: 0 0.85rem 0 0.65rem;
  border-width: 2px;
  font-size: 1.2rem;
}

/* The figure, with the currency's name under it on the screen's own coin. */
.amount {
  display: grid;
  justify-items: start;
}

.coin.main svg {
  width: 1.4rem;
  height: 1.4rem;
}

.shards.main {
  border-color: var(--primary-mid);
  box-shadow: 0 0 1.1rem var(--primary-glow);
}

.fragments.main {
  border-color: var(--orb-cyan);
  box-shadow: 0 0 1.1rem color-mix(in srgb, var(--orb-cyan) 45%, transparent);
}

.unit {
  margin-top: 0.1rem;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* What changed rises from the pill's edge and fades. */
.delta {
  position: absolute;
  top: -0.2rem;
  inset-inline-end: 0.6rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 800;
  pointer-events: none;
  animation: rise 1.2s ease-out forwards;
}

.delta.gain {
  color: var(--accent);
}

@keyframes rise {
  0% {
    opacity: 0;
    transform: translateY(0.6rem);
  }

  15% {
    opacity: 1;
  }

  60% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-1rem);
  }
}

/* A reward lands: the coin's sign swells in a flash of its colour. */
.coin.pulsing svg {
  animation: land 0.45s ease-out;
}

@keyframes land {
  35% {
    transform: scale(1.45);
    filter: drop-shadow(0 0 0.6rem var(--primary-top)) brightness(1.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .delta {
    animation-name: fade;
  }
}

@keyframes fade {
  0%,
  60% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}
</style>
