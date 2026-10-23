<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { HINT_PRICE } from '@/player/rewards';
import AdIcon from '@/ui/components/AdIcon.vue';
import { useShardPrice } from './useShardPrice';

/**
 * The pause menu (v1.7.6, from the game screen): resume, a puzzle hint (for a
 * rewarded ad or for shards, never on the board while playing), restart, the
 * settings, quit.
 */
defineProps<{ offerHint: boolean }>();
const emit = defineEmits<{
  resume: [];
  restart: [];
  settings: [];
  quit: [];
  adHint: [];
  shardHint: [];
}>();

const { t } = useI18n();
const { ads, player } = useServices();
const shardPrice = useShardPrice();
const dialog = ref<HTMLDialogElement | null>(null);
defineExpose({
  show: () => dialog.value?.showModal(),
  hide: () => dialog.value?.close(),
  isOpen: () => dialog.value?.open === true,
});
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="pause-title" @cancel.prevent>
    <h2 id="pause-title">{{ t('game.paused') }}</h2>
    <div class="actions">
      <button class="btn btn-primary" type="button" autofocus @click="emit('resume')">
        {{ t('game.resume') }}
      </button>
      <template v-if="offerHint">
        <button
          v-if="ads.rewardsOffered"
          class="btn"
          type="button"
          data-testid="ad-hint"
          @click="emit('adHint')"
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
          @click="emit('shardHint')"
        >
          <span>{{ t('ads.hint') }}</span>
          <small>{{ shardPrice(HINT_PRICE) }}</small>
        </button>
      </template>
      <button class="btn" type="button" data-testid="restart" @click="emit('restart')">
        {{ t('game.restart') }}
      </button>
      <button class="btn" type="button" data-testid="open-settings" @click="emit('settings')">
        {{ t('game.settings') }}
      </button>
      <button class="btn" type="button" @click="emit('quit')">{{ t('game.quit') }}</button>
    </div>
  </dialog>
</template>

<style scoped src="./game-dialog.css"></style>
