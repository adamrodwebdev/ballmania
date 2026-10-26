<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { playable } from '@/levels/campaign';
import {
  cheapestForSale,
  COSMETICS,
  findCosmetic,
  SLOTS,
  type Cosmetic,
  type CosmeticSlot,
} from '@/player/catalog';
import AdIcon from '@/ui/components/AdIcon.vue';
import CosmeticPreview from '@/ui/components/CosmeticPreview.vue';
import FittingRoom from '@/ui/components/FittingRoom.vue';
import { CHECK_PATH, LOCK_PATH, SHARD_PATH, SLOT_ICONS } from '@/ui/components/icons';
import ScreenHeader from '@/ui/components/ScreenHeader.vue';
import TabBar from '@/ui/components/TabBar.vue';
import type { TabItem } from '@/ui/components/tabs';

/**
 * The Workshop (v1.8.0): the cosmetics in four tabs, one per slot. The one
 * touched plays in the fitting room above, on the game's own engine, locked
 * or not; below it, its name, where it stands and the one thing to do with
 * it: buy it, wear it, or what is missing. The whole screen fits without
 * scrolling, the wallet in its corner.
 */
const emit = defineEmits<{ home: [] }>();
const { t, locale } = useI18n();
const { player, ads, platform } = useServices();
const number = computed(() => new Intl.NumberFormat(locale.value));
const message = ref('');

/** Where a cosmetic stands for the player. */
type Standing = 'equipped' | 'owned' | 'forSale' | 'locked';
const standingOf = (item: Cosmetic): Standing => {
  if (player.view.equipped[item.slot] === item.id) return 'equipped';
  if (player.view.owned.includes(item.id)) return 'owned';
  return item.unlockedBy ? 'locked' : 'forSale';
};

/** A tab opens on the cheapest thing to buy there, else on what the player wears. */
const openingOf = (slot: CosmeticSlot): string =>
  cheapestForSale(slot, (id) => player.owns(id))?.id ?? player.equipped(slot);

const slot = ref<CosmeticSlot>('shooter');
const selectedId = ref(openingOf(slot.value));
watch(slot, (open) => {
  if (findCosmetic(selectedId.value)?.slot !== open) selectedId.value = openingOf(open);
});
const selected = computed(() => findCosmetic(selectedId.value) ?? COSMETICS[0]!);

const tabs = computed<readonly TabItem<CosmeticSlot>[]>(() =>
  SLOTS.map((id) => {
    const items = COSMETICS.filter((item) => item.slot === id);
    const owned = items.filter((item) => player.view.owned.includes(item.id)).length;
    return {
      id,
      label: t(`shop.tabs.${id}`),
      icon: SLOT_ICONS[id],
      count: `${number.value.format(owned)}/${number.value.format(items.length)}`,
      countLabel: t('shop.ownedCount', { count: owned, total: items.length }),
    };
  }),
);

const cards = computed(() =>
  COSMETICS.filter((item) => item.slot === slot.value).map((item) => ({
    item,
    standing: standingOf(item),
    affordable: item.price <= player.view.shards,
  })),
);

/** What the detail says of the chosen cosmetic, and what it offers to do. */
const detail = computed(() => {
  const item = selected.value;
  const standing = standingOf(item);
  const missing = Math.max(0, item.price - player.view.shards);
  const lines: Readonly<Record<Standing, () => string>> = {
    equipped: () => t('shop.equipped'),
    owned: () => t('shop.owned'),
    forSale: () => t('shop.notYours'),
    locked: () =>
      item.unlockedBy && playable(item.unlockedBy)
        ? t('shop.unlockHint', { world: t(`worlds.${item.unlockedBy}.name`) })
        : t('demo.fullGame'),
  };
  return {
    item,
    standing,
    missing,
    name: t(`cosmetics.${item.id}`),
    line: `${t(`shop.kinds.${item.slot}`)} · ${lines[standing]()}`,
  };
});

const buy = (item: Cosmetic) => {
  if (player.buy(item.id)) {
    player.equip(item.id);
    message.value = t('shop.bought', { name: t(`cosmetics.${item.id}`) });
  }
};
const equip = (item: Cosmetic) => {
  if (player.equip(item.id))
    message.value = t('shop.equippedNow', { name: t(`cosmetics.${item.id}`) });
};
/** Try a cosmetic on sale for one game, for a rewarded ad (§ 3.7). */
const trying = ref(false);
/** What became of the last ad, shown over the fitting room. */
const adNote = ref('');
const tryOn = async (item: Cosmetic) => {
  trying.value = true;
  const watched = await ads.reward({ start: () => {}, end: () => {} });
  trying.value = false;
  message.value =
    watched && player.tryOn(item.id)
      ? t('ads.trial', { name: t(`cosmetics.${item.id}`) })
      : t('ads.unavailable');
  adNote.value = watched ? '' : message.value;
};
const adsBlocked = computed(() => platform.hasAds && !ads.rewardsOffered);
</script>

<template>
  <section class="workshop" aria-labelledby="shop-title">
    <ScreenHeader
      :title="t('shop.title')"
      title-id="shop-title"
      currency="shards"
      @back="emit('home')"
    >
      <TabBar v-model="slot" :tabs="tabs" :label="t('shop.tabsLabel')" panel-id="shop-panel" />
    </ScreenHeader>

    <div id="shop-panel" class="body" role="tabpanel" :aria-labelledby="`shop-panel-${slot}`">
      <div class="fitting">
        <FittingRoom class="stage" :item="selected">
          <template #corner>
            <p v-if="player.trial === selected.id" class="pill" data-testid="trial">
              {{ t('ads.trying') }}
            </p>
            <button
              v-else-if="ads.rewardsOffered && detail.standing === 'forSale'"
              class="btn try"
              type="button"
              :disabled="trying"
              :data-testid="`try-${selected.id}`"
              @click="tryOn(selected)"
            >
              <span class="ad-label"><AdIcon />{{ t('ads.try') }}</span>
              <small>{{ t('ads.tryDetail') }}</small>
            </button>
          </template>
          <template #note>
            <p v-if="adsBlocked" class="note" data-testid="ads-blocked">{{ t('ads.blocked') }}</p>
            <p v-else-if="adNote" class="note" data-testid="shop-message">{{ adNote }}</p>
          </template>
        </FittingRoom>

        <div class="detail" data-testid="item-detail">
          <div class="what">
            <h2>{{ detail.name }}</h2>
            <p>{{ detail.line }}</p>
          </div>
          <button
            v-if="detail.standing === 'owned'"
            class="btn action"
            type="button"
            data-testid="equip"
            @click="equip(detail.item)"
          >
            {{ t('shop.equip') }}
          </button>
          <button
            v-else-if="detail.standing === 'forSale'"
            class="btn btn-primary action"
            type="button"
            :disabled="detail.missing > 0"
            :aria-label="
              detail.missing > 0
                ? t('shop.missing', { count: number.format(detail.missing) }, detail.missing)
                : t('shop.buyLabel', { price: number.format(detail.item.price) }, detail.item.price)
            "
            data-testid="buy"
            @click="buy(detail.item)"
          >
            <span>{{
              detail.missing > 0
                ? t('wallet.missing', { count: number.format(detail.missing) })
                : t('shop.buy', { price: number.format(detail.item.price) })
            }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="SHARD_PATH" /></svg>
          </button>
        </div>
      </div>

      <ul class="grid" :aria-label="t(`shop.slots.${slot}`)">
        <li v-for="card in cards" :key="card.item.id">
          <button
            class="card"
            type="button"
            :aria-pressed="card.item.id === selected.id"
            :data-testid="`item-${card.item.id}`"
            @click="selectedId = card.item.id"
          >
            <span class="picture"><CosmeticPreview :item="card.item" /></span>
            <span class="name">{{ t(`cosmetics.${card.item.id}`) }}</span>
            <span v-if="card.standing === 'equipped'" class="chip worn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path class="line" :d="CHECK_PATH" />
              </svg>
              {{ t('shop.equipped') }}
            </span>
            <span v-else-if="card.standing === 'owned'" class="chip worn">
              {{ t('shop.owned') }}
            </span>
            <span v-else-if="card.standing === 'locked'" class="chip">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path class="line" :d="LOCK_PATH" /></svg>
              <span class="sr-only">{{ t('shop.locked') }}</span>
            </span>
            <span v-else class="chip price" :class="{ short: !card.affordable }">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="SHARD_PATH" /></svg>
              <span aria-hidden="true">{{ number.format(card.item.price) }}</span>
              <span class="sr-only">
                {{
                  t('player.balance', { count: number.format(card.item.price) }, card.item.price)
                }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
    <p class="sr-only" role="status">{{ message }}</p>
  </section>
</template>

<style scoped>
.workshop {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(100%, 72rem);
  height: 100%;
  margin-inline: auto;
  padding: var(--space-3) var(--space-4) var(--space-4);
}

/*
 * The fitting room takes the room the cards leave it, up to a 16:9 picture
 * (it shrinks first, down to 7rem); on the smallest phones the cards then
 * scroll in their own frame, never the page.
 */
.body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
  container-type: inline-size;
}

/* On a phone, the stage, the detail and the cards share the column as one. */
.fitting {
  display: contents;
}

.stage {
  flex: 1 1000 auto;
  height: calc(100cqi * 9 / 16);
  min-height: 7rem;
  /* With room to spare (tall phones), it grows, up to a square. */
  max-height: 100cqi;
}

.detail {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch);
}

.what {
  display: grid;
  flex: 1;
  gap: 0.1rem;
  min-width: 0;
}

.what h2 {
  font-size: 1.35rem;
  line-height: 1.1;
}

.what p {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.action {
  flex-direction: row;
  gap: var(--space-2);
  min-width: 9rem;
  padding-inline: var(--space-4);
  white-space: nowrap;
}

.action svg {
  width: 1rem;
  height: 1rem;
}

.action path,
.chip path {
  fill: currentColor;
}

.chip path.line {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/*
 * Positioned, so the hidden labels of the cards stay in its frame rather than
 * stretch the page; padded, so the glow of the card chosen is not cut off.
 */
.grid {
  position: relative;
  display: grid;
  flex: 0 1 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-content: start;
  gap: var(--space-2);
  min-height: 0;
  margin: calc(var(--space-2) * -1);
  padding: var(--space-2);
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.grid > li {
  display: grid;
}

.card {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.2rem;
  width: 100%;
  min-height: var(--touch);
  padding: var(--space-2) 0.35rem;
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  background: var(--surface);
  text-align: center;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.card[aria-pressed='true'] {
  border-color: var(--primary-mid);
  box-shadow:
    inset 0 0 0 1px var(--primary-mid),
    0 0 1rem var(--primary-glow);
}

.picture {
  width: 3rem;
}

.name {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.15;
  overflow-wrap: anywhere;
  hyphens: auto;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chip svg {
  width: 0.75rem;
  height: 0.75rem;
  flex: none;
}

.chip.worn {
  color: var(--accent);
}

/* The shard's gold gem, edged, as in the wallet. */
.chip.price path {
  fill: var(--primary-mid);
  stroke: var(--primary-edge);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.chip.short {
  color: var(--text-muted);
}

/* Over the fitting room: the try for an ad, the note when ads cannot play. */
.try {
  gap: 0;
  min-height: var(--touch);
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  font-size: 0.85rem;
}

.try small {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.85;
}

.ad-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.pill,
.note {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: rgb(8 3 26 / 0.78);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}

.note {
  border-radius: var(--radius-sm);
}

/* Wide enough: the fitting room and its detail on the left, the cards on the right. */
@media (width >= 48rem), (width >= 40rem) and (aspect-ratio > 4/3) {
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    column-gap: var(--space-4);
  }

  .fitting {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 0;
    container-type: inline-size;
  }

  /* Beside the cards, it grows with the window up to a 4:3 picture. */
  .stage {
    max-height: calc(100cqi * 3 / 4);
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    align-self: start;
    max-height: 100%;
  }

  .picture {
    width: 4rem;
  }

  .name {
    font-size: 0.9rem;
  }
}

/* Short landscape frames (portals, phones on their side): a smaller picture on each card. */
@media (width >= 40rem) and (height < 34rem) {
  .workshop {
    gap: var(--space-2);
    padding-block: var(--space-2) var(--space-3);
  }

  .body {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  }

  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .picture {
    width: 2.75rem;
  }
}

/* A short phone (Safari's bars showing): the parts closer together. */
@media (width < 40rem) and (height < 44rem) {
  .workshop,
  .body {
    gap: var(--space-2);
  }
}

/* The shortest frames (phones on their side, 400 px tall and less): names on one line. */
@media (width >= 40rem) and (height < 26rem) {
  .card {
    gap: 0.15rem;
    padding-block: 0.3rem;
  }

  .picture {
    width: 2.25rem;
  }

  .name {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
}

/* The smallest frames (400 % zoom): the page scrolls in its frame, every part at its full size. */
@media (height < 30rem) and (width < 40rem) {
  .workshop {
    height: auto;
    min-height: 100%;
  }

  .grid {
    overflow: visible;
  }
}
</style>
