// One ad in memory; keep a margin below Google's one-hour expiration.
export const INTERSTITIAL_TTL_MS = 55 * 60 * 1000;
// Moderate frequency cap for explicit Generate/Shuffle actions.
export const INTERSTITIAL_COOLDOWN_MS = 90 * 1000;
// Start the next load near the next eligible break, rather than spending
// most of its cached lifetime behind the cooldown or after the user exits.
export const INTERSTITIAL_PRELOAD_LEAD_MS = 15 * 1000;
export const INTERSTITIAL_MIN_ACTIONS = 8;
export const INTERSTITIAL_SWIPE_INTERVAL = 6;

export interface InterstitialPolicyState {
  loadedAt: number | null;
  startedAt: number;
  lastShownAt: number | null;
  actions: number;
  active: boolean;
  online: boolean;
  blocked: boolean;
  showing: boolean;
}

export function canShowInterstitial(state: InterstitialPolicyState, now: number, minimumActions = INTERSTITIAL_MIN_ACTIONS): boolean {
  return state.active && state.online && !state.blocked && !state.showing &&
    state.loadedAt !== null && now - state.loadedAt < INTERSTITIAL_TTL_MS &&
    state.actions >= minimumActions &&
    (state.lastShownAt === null || now - state.lastShownAt >= INTERSTITIAL_COOLDOWN_MS);
}

export function retryDelay(attempt: number, random = Math.random()): number {
  return Math.min(120_000, 15_000 * 2 ** Math.min(attempt, 3)) + Math.round(random * 3000);
}
