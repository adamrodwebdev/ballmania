export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable';

interface ShareCapableNavigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText(text: string): Promise<void> };
}

/** Shares a result with the phone's share sheet, or copies it as a fallback. */
export class ShareService {
  constructor(private readonly navigator: ShareCapableNavigator) {}

  async share(text: string): Promise<ShareOutcome> {
    if (this.navigator.share) {
      try {
        await this.navigator.share({ text });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        // Some browsers expose `share` but refuse it: fall back to the clipboard.
      }
    }
    if (this.navigator.clipboard) {
      try {
        await this.navigator.clipboard.writeText(text);
        return 'copied';
      } catch {
        return 'unavailable';
      }
    }
    return 'unavailable';
  }
}
