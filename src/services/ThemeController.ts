import { ref, watch, type Ref } from 'vue';
import type { SettingsService } from './SettingsService';

export type Theme = 'light' | 'dark';

/**
 * Turns the theme preference (system, light, dark) into the theme actually
 * shown, keeps it in sync with the operating system, and applies it to <html>.
 */
export class ThemeController {
  readonly resolved: Ref<Theme>;
  private readonly systemDark: MediaQueryList;

  constructor(
    private readonly settings: SettingsService,
    private readonly root: HTMLElement,
    matchMedia: (query: string) => MediaQueryList,
  ) {
    this.systemDark = matchMedia('(prefers-color-scheme: dark)');
    this.resolved = ref(this.resolve());
    this.systemDark.addEventListener('change', () => this.apply());
    watch(
      () => this.settings.current.theme,
      () => this.apply(),
    );
    this.apply();
  }

  /** Switches to the other theme (the choice is then explicit, no longer "system"). */
  toggle(): void {
    this.settings.update({ theme: this.resolved.value === 'dark' ? 'light' : 'dark' });
  }

  private resolve(): Theme {
    const preference = this.settings.current.theme;
    if (preference !== 'system') return preference;
    return this.systemDark.matches ? 'dark' : 'light';
  }

  private apply(): void {
    this.resolved.value = this.resolve();
    this.root.dataset.theme = this.resolved.value;
  }
}
