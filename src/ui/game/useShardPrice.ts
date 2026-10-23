import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';

/** The price of a choice paid in shards, with the balance when it can't be paid yet. */
export function useShardPrice(): (price: number) => string {
  const { t, locale } = useI18n();
  const { player } = useServices();
  const number = computed(() => new Intl.NumberFormat(locale.value));
  return (price) => {
    const shown = number.value.format(price);
    return player.view.shards < price
      ? t(
          'ads.forShardsShort',
          { price: shown, balance: number.value.format(player.view.shards) },
          price,
        )
      : t('ads.forShards', { price: shown }, price);
  };
}
