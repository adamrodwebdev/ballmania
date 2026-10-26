<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import {
  openingUpgrade,
  rangeOf,
  rangeOpening,
  RANGES,
  UPGRADE_RANGES,
  type UpgradeRange,
  type UpgradeStanding,
} from '@/engine/upgrades/ranges';
import { MAX_RANK, type UpgradeId } from '@/engine/upgrades/Upgrades';
import { CHECK_PATH, FRAGMENT_PATH, RANGE_ICONS } from '@/ui/components/icons';
import ScreenHeader from '@/ui/components/ScreenHeader.vue';
import TabBar from '@/ui/components/TabBar.vue';
import type { TabItem } from '@/ui/components/tabs';

/**
 * The Observatory (v1.8.0): the upgrades in three tabs by what they act on,
 * the shot, the chain and the weather, each tile with its ranks and the price
 * of the next; the chosen one in detail, its three ranks and one gold button.
 * The whole screen fits without scrolling, the wallet in its corner.
 */
const emit = defineEmits<{ back: [] }>();
const { t, locale } = useI18n();
const { player } = useServices();

const number = computed(() => new Intl.NumberFormat(locale.value));
const announcement = ref('');
// The player found the Observatory: the map's bubble pointing at it is no longer needed.
player.markTipSeen('observatory');

const standing: UpgradeStanding = {
  affordable: (id) => {
    const cost = player.upgradeCost(id);
    return cost !== null && cost <= player.view.fragments;
  },
  maxed: (id) => player.upgradeCost(id) === null,
};
/** The upgrade shown in detail, and its tab: the first the player can buy, at first. */
const selected = ref<UpgradeId>(openingUpgrade(standing));
const range = ref<UpgradeRange>(rangeOf(selected.value));
watch(range, (open) => {
  if (rangeOf(selected.value) !== open) selected.value = rangeOpening(open, standing);
});

/** Where an upgrade stands, read from the reactive state so the screen follows every purchase. */
const upgradeOf = (id: UpgradeId) => {
  const rank = player.view.upgrades[id] ?? 0;
  const cost = player.upgradeCost(id);
  return {
    id,
    rank,
    cost,
    affordable: cost !== null && cost <= player.view.fragments,
    name: t(`upgrades.${id}.name`),
    rankLabel: t('observatory.rank', { rank, max: MAX_RANK }),
  };
};

const tabs = computed<readonly TabItem<UpgradeRange>[]>(() =>
  RANGES.map((id) => {
    const ids = UPGRADE_RANGES[id];
    const bought = ids.reduce((sum, upgrade) => sum + (player.view.upgrades[upgrade] ?? 0), 0);
    const total = ids.length * MAX_RANK;
    return {
      id,
      label: t(`observatory.ranges.${id}`),
      icon: RANGE_ICONS[id],
      count: `${number.value.format(bought)}/${number.value.format(total)}`,
      countLabel: t('observatory.rangeRanks', { count: bought, total }),
      ready: ids.some((upgrade) => standing.affordable(upgrade)),
      readyLabel: t('observatory.rangeReady'),
    };
  }),
);
const tiles = computed(() => UPGRADE_RANGES[range.value].map(upgradeOf));
const detail = computed(() => upgradeOf(selected.value));
/** Fragments the chosen upgrade's next rank still needs. */
const missing = computed(() =>
  detail.value.cost === null ? 0 : Math.max(0, detail.value.cost - player.view.fragments),
);

const buy = (id: UpgradeId) => {
  if (!player.buyUpgrade(id)) return;
  announcement.value = t('observatory.bought', {
    name: t(`upgrades.${id}.name`),
    rank: player.upgradeRank(id),
  });
};
</script>

<template>
  <section class="observatory" aria-labelledby="observatory-title">
    <ScreenHeader
      :title="t('observatory.title')"
      title-id="observatory-title"
      currency="fragments"
      :back-label="t('observatory.back')"
      back-id="back"
      @back="emit('back')"
    >
      <TabBar
        v-model="range"
        :tabs="tabs"
        :label="t('observatory.rangesLabel')"
        panel-id="observatory-panel"
      />
    </ScreenHeader>
    <p class="intro">{{ t('observatory.intro') }}</p>

    <div
      id="observatory-panel"
      class="body"
      role="tabpanel"
      :aria-labelledby="`observatory-panel-${range}`"
    >
      <ul class="tiles">
        <li v-for="tile in tiles" :key="tile.id">
          <button
            class="tile"
            :class="{ ready: tile.affordable }"
            type="button"
            :aria-pressed="tile.id === selected"
            :data-testid="`upgrade-${tile.id}`"
            @click="selected = tile.id"
          >
            <span class="name">{{ tile.name }}</span>
            <span class="foot">
              <span class="pips" role="img" :aria-label="tile.rankLabel">
                <span
                  v-for="pip in MAX_RANK"
                  :key="pip"
                  class="pip"
                  :class="{ on: pip <= tile.rank }"
                ></span>
              </span>
              <span v-if="tile.cost === null" class="chip done">{{
                t('observatory.maxShort')
              }}</span>
              <span v-else class="chip cost" :class="{ short: !tile.affordable }">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="FRAGMENT_PATH" /></svg>
                <span aria-hidden="true">{{ number.format(tile.cost) }}</span>
                <span class="sr-only">
                  {{ t('observatory.balance', { count: number.format(tile.cost) }, tile.cost) }}
                </span>
              </span>
            </span>
          </button>
        </li>
      </ul>

      <section class="detail" aria-labelledby="upgrade-title" data-testid="upgrade-detail">
        <header>
          <h2 id="upgrade-title">{{ detail.name }}</h2>
          <span class="pips" role="img" :aria-label="detail.rankLabel">
            <span
              v-for="pip in MAX_RANK"
              :key="pip"
              class="pip"
              :class="{ on: pip <= detail.rank }"
            ></span>
          </span>
        </header>
        <ol class="ranks">
          <li
            v-for="step in MAX_RANK"
            :key="step"
            class="rank"
            :class="{ owned: step <= detail.rank, next: step === detail.rank + 1 }"
          >
            <span class="step" aria-hidden="true">
              <svg v-if="step <= detail.rank" viewBox="0 0 24 24"><path :d="CHECK_PATH" /></svg>
              <template v-else>{{ number.format(step) }}</template>
            </span>
            <span>
              {{ t(`upgrades.${detail.id}.r${step}`) }}
              <span v-if="step <= detail.rank" class="sr-only">{{ t('observatory.owned') }}</span>
            </span>
          </li>
        </ol>
        <p v-if="detail.cost === null" class="done-line">{{ t('observatory.max') }}</p>
        <template v-else>
          <button
            class="btn btn-primary buy"
            type="button"
            :disabled="!detail.affordable"
            :aria-label="
              detail.affordable
                ? t('observatory.buy', { cost: number.format(detail.cost) }, detail.cost)
                : t('observatory.missing', { count: number.format(missing) }, missing)
            "
            :data-testid="`buy-${detail.id}`"
            @click="buy(detail.id)"
          >
            <span>{{
              detail.affordable
                ? t('observatory.upgrade', { cost: number.format(detail.cost) })
                : t('wallet.missing', { count: number.format(missing) })
            }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="FRAGMENT_PATH" /></svg>
          </button>
          <p v-if="!detail.affordable" class="how">{{ t('observatory.earn') }}</p>
        </template>
      </section>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.observatory {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(100%, 72rem);
  height: 100%;
  margin-inline: auto;
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.intro {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

/*
 * The tiles and the detail share what the bar leaves; on the smallest phones
 * the tiles scroll in their own frame, never the page.
 */
.body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
}

/*
 * Positioned, so the hidden labels of the tiles stay in its frame rather than
 * stretch the page; padded, so the glow of the tile chosen is not cut off.
 */
.tiles {
  position: relative;
  display: grid;
  flex: 0 1 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: var(--space-2);
  min-height: 0;
  margin: calc(var(--space-2) * -1);
  padding: var(--space-2);
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.tiles > li {
  display: grid;
}

.tile {
  display: grid;
  align-content: start;
  gap: 0.4rem;
  width: 100%;
  min-height: var(--touch);
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  background: var(--surface);
  text-align: start;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.tile > * {
  min-width: 0;
}

.tile[aria-pressed='true'] {
  border-color: var(--orb-cyan);
  box-shadow:
    inset 0 0 0 1px var(--orb-cyan),
    0 0 1rem color-mix(in srgb, var(--orb-cyan) 40%, transparent);
}

.name {
  font-family: var(--font-display);
  font-size: 1.05rem;
  line-height: 1.1;
  overflow-wrap: anywhere;
  hyphens: auto;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1) var(--space-2);
}

.pips {
  display: flex;
  gap: var(--space-1);
}

.pip {
  width: 1.3rem;
  height: 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 28%, transparent);
}

.pip.on {
  background: var(--orb-cyan);
  box-shadow: 0 0 0.4rem var(--orb-cyan);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 0.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chip svg {
  width: 0.8rem;
  height: 0.8rem;
}

.chip path,
.buy path {
  fill: currentColor;
}

.chip.cost svg {
  color: var(--orb-cyan);
}

.chip.short {
  color: var(--text-muted);
}

.chip.done {
  color: var(--accent);
}

.detail {
  display: grid;
  flex: none;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-4);
  border: 1px solid var(--border);
  border-radius: 1.1rem;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.detail header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.detail h2 {
  font-size: 1.35rem;
  line-height: 1.1;
}

.ranks {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rank {
  display: grid;
  grid-template-columns: 1.6rem minmax(0, 1fr);
  align-items: start;
  gap: var(--space-2);
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.3;
}

.step {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--border);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 800;
}

.step svg {
  width: 0.9rem;
  height: 0.9rem;
}

.step path {
  fill: none;
  stroke: var(--orb-cyan);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rank.owned {
  color: var(--text);
  font-weight: 700;
}

.rank.owned .step {
  border-color: var(--orb-cyan);
  background: color-mix(in srgb, var(--orb-cyan) 22%, transparent);
}

.rank.next {
  color: var(--text);
  font-weight: 800;
}

.rank.next .step {
  border: 2px solid var(--orb-cyan);
}

.buy {
  flex-direction: row;
  gap: var(--space-2);
}

.buy svg {
  width: 1rem;
  height: 1rem;
}

.how {
  margin-top: calc(var(--space-1) * -1);
  color: var(--text-muted);
  font-size: 0.8rem;
  text-align: center;
}

.done-line {
  display: grid;
  place-items: center;
  min-height: var(--touch);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  font-weight: 800;
}

/* A short phone (Safari's bars showing): the bar and the tabs say it already. */
@media (width < 40rem) and (height < 44rem) {
  .intro {
    display: none;
  }
}

/* Wide enough: the tiles in a column on the left, the detail beside them. */
@media (width >= 48rem), (width >= 40rem) and (aspect-ratio > 4/3) {
  .body {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    grid-template-rows: minmax(0, 1fr);
    column-gap: var(--space-4);
  }

  .tiles {
    grid-template-columns: minmax(0, 1fr);
    align-self: start;
    max-height: 100%;
  }

  .tile {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding: 0.75rem 0.9rem;
  }

  .foot {
    gap: var(--space-3);
  }

  .detail {
    align-self: start;
    max-height: 100%;
    overflow-y: auto;
  }
}

/* Short frames (portals, phones on their side): tighter, so it all fits. */
@media (height < 34rem) {
  .observatory {
    gap: var(--space-2);
    padding-block: var(--space-2) var(--space-3);
  }

  .intro {
    font-size: 0.85rem;
  }

  .tile {
    padding-block: 0.45rem;
  }

  .detail {
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4) var(--space-3);
  }

  .ranks {
    gap: var(--space-1);
  }
}

/*
 * The shortest landscape frames (phones on their side, 400 px tall and less):
 * the bar and the tabs say it already, the tiles and the detail tighten.
 */
@media (width >= 40rem) and (height < 26rem) {
  .intro,
  .how {
    display: none;
  }

  /* Wider tiles, so each keeps its name, ranks and price on one line. */
  .body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tile {
    padding-block: 0.3rem;
  }

  .pip {
    width: 1rem;
  }

  .detail {
    padding-block: var(--space-2);
  }

  .tiles {
    gap: var(--space-1);
  }

  .rank {
    grid-template-columns: 1.4rem minmax(0, 1fr);
    font-size: 0.85rem;
    line-height: 1.25;
  }

  .step {
    width: 1.4rem;
    height: 1.4rem;
  }
}

/* The smallest frames (400 % zoom): the screen scrolls in its frame, every part at its full size. */
@media (height < 30rem) and (width < 40rem) {
  .observatory {
    height: auto;
    min-height: 100%;
  }

  .tiles {
    overflow: visible;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .pip.on {
    animation: light 0.5s ease-out both;
  }
}

@keyframes light {
  from {
    transform: scaleX(0.4);
    opacity: 0.3;
  }
}
</style>
