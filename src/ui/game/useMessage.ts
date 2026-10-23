import { useI18n } from 'vue-i18n';
import type { Message } from '@/app/modes';

/** Says a mode's message in the player's language; a message among its values is said first. */
export function useMessage(): (message: Message) => string {
  const { t } = useI18n();
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
  return say;
}
