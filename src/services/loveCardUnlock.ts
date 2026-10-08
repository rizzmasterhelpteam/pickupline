export const LOVE_CARD_UNLOCK_MS = 30 * 60 * 1000;
const KEY = 'rizzline_love_card_unlock_until_v1';

export function getLoveCardUnlockUntil(): number {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isFinite(value) && value > Date.now() && value <= Date.now() + LOVE_CARD_UNLOCK_MS ? value : 0;
  } catch { return 0; }
}

export function grantLoveCardUnlock(): number {
  const until = Date.now() + LOVE_CARD_UNLOCK_MS;
  try { localStorage.setItem(KEY, String(until)); } catch { /* Current session still receives the reward. */ }
  return until;
}
