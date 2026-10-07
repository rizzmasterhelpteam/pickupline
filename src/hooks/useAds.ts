import { useEffect, useSyncExternalStore } from 'react';
import { ads } from '../services/ads';

export function useAds(blocked: boolean, enabled = true) {
  const state = useSyncExternalStore(ads.subscribe, ads.getSnapshot);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => { void ads.start(); }, 900);
    return () => clearTimeout(timer);
  }, [enabled]);
  useEffect(() => { ads.setBlocked(blocked); }, [blocked]);
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resizeTimer = null; ads.refreshViewport(); }, 150);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [blocked]);
  return state;
}
