import { Capacitor } from '@capacitor/core';

export async function copyText(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Clipboard API is unavailable on HTTP mobile previews and old WebViews.
  }
  const previousFocus = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;font-size:16px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Could not copy text');
  } finally {
    textarea.remove();
    previousFocus?.focus({ preventScroll: true });
    if (range && selection) { selection.removeAllRanges(); selection.addRange(range); }
  }
}

export function isShareCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { name?: string; message?: string };
  return value.name === 'AbortError' || /cancelled|canceled|dismissed/i.test(value.message || '');
}
