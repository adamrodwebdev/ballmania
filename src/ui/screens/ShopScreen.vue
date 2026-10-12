<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { COSMETICS, SLOTS, type Cosmetic } from '@/player/catalog';
import CosmeticPreview from '@/ui/components/CosmeticPreview.vue';
import ScreenHeader from '@/ui/components/ScreenHeader.vue';

const emit = defineEmits<{ home: [] }>();
const { t, locale } = useI18n();
const { player } = useServices();
const number = computed(() => new Intl.NumberFormat(locale.value));
const message = ref('');

const sections = SLOTS.map((slot) => ({
  slot,
  items: COSMETICS.filter((item) => item.slot === slot),
}));

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
</script>

<template>
  <section class="screen" aria-labelledby="shop-title">
    <ScreenHeader :title="t('shop.title')" title-id="shop-title" @back="emit('home')">
      <p class="wallet" data-testid="wallet">
        {{ t('player.balance', { count: number.format(player.view.shards) }) }}
      </p>
    </ScreenHeader>
    <p class="intro">{{ t('shop.intro') }}</p>
    <p class="sr-only" role="status">{{ message }}</p>

    <section
      v-for="section in sections"
      :key="section.slot"
      :aria-labelledby="`slot-${section.slot}`"
    >
      <h2 :id="`slot-${section.slot}`">{{ t(`shop.slots.${section.slot}`) }}</h2>
      <ul class="items">
        <li
          v-for="item in section.items"
          :key="item.id"
          class="item"
          :data-testid="`item-${item.id}`"
        >
          <CosmeticPreview :item="item" />
          <h3>{{ t(`cosmetics.${item.id}`) }}</h3>
          <p v-if="player.view.equipped[item.slot] === item.id" class="state equipped">
            {{ t('shop.equipped') }}
          </p>
          <button v-else-if="player.owns(item.id)" class="btn" type="button" @click="equip(item)">
            {{ t('shop.equip') }}
          </button>
          <p v-else-if="item.unlockedBy" class="state">
            {{ t('shop.unlockHint', { world: t(`worlds.${item.unlockedBy}.name`) }) }}
          </p>
          <button
            v-else
            class="btn btn-primary"
            type="button"
            :disabled="player.view.shards < item.price"
            @click="buy(item)"
          >
            {{ t('shop.buy', { price: number.format(item.price) }) }}
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.screen {
  display: grid;
  gap: var(--space-6);
  width: min(100%, 60rem);
  margin-inline: auto;
  padding: var(--space-4) var(--space-4) var(--space-12);
}

.wallet {
  margin-left: auto;
  padding: var(--space-1) var(--space-4);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-weight: 800;
}

.intro {
  color: var(--text-muted);
}

h2 {
  margin-bottom: var(--space-3);
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 1.1rem + 0.8vw, 1.6rem);
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.5rem), 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: center;
}

h3 {
  font-size: 1rem;
}

.state {
  display: grid;
  place-items: center;
  min-height: var(--touch);
  color: var(--text-muted);
  font-size: 0.875rem;
}

.equipped {
  color: var(--accent);
  font-weight: 800;
}

.btn {
  width: 100%;
}
</style>
