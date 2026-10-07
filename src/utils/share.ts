import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { copyText, isShareCancelled } from './clipboard';

export interface TextShareOptions {
  title: string;
  text: string;
  dialogTitle?: string;
}

type WebShareNavigator = Navigator & {
  share?: (data: { title?: string; text?: string }) => Promise<void>;
};

/** Shares through native Capacitor, browser Web Share, or clipboard fallback. */
export async function shareText({ title, text, dialogTitle }: TextShareOptions): Promise<'shared' | 'copied' | 'cancelled'> {
  if (Capacitor.isNativePlatform()) {
    try {
      if ((await Share.canShare()).value) {
        await Share.share({ title, text, dialogTitle: dialogTitle || title });
        return 'shared';
      }
    } catch (error) {
      if (isShareCancelled(error)) return 'cancelled';
    }
  }

  const webNavigator = navigator as WebShareNavigator;
  if (typeof webNavigator.share === 'function') {
    try {
      await webNavigator.share({ title, text });
      return 'shared';
    } catch (error) {
      if (isShareCancelled(error)) return 'cancelled';
      // Continue to clipboard if the browser share sheet rejects the request.
    }
  }

  await copyText(text);
  return 'copied';
}
