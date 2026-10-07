import { Capacitor } from '@capacitor/core';

let lastFeedbackAt = 0;
export function tapFeedback(): void {
  const now = performance.now();
  if (now - lastFeedbackAt < 80) return;
  lastFeedbackAt = now;
  if (Capacitor.isNativePlatform()) {
    void import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Light })
    ).catch(() => {});
  } else {
    try { navigator.vibrate?.(10); } catch { /* Optional device feedback. */ }
  }
}
