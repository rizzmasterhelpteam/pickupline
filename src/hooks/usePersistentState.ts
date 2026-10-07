import { useEffect, useState } from 'react';

export function readStored<T>(key: string, validate: (value: unknown) => T, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? validate(JSON.parse(value)) : fallback;
  } catch { return fallback; }
}

export function usePersistentState<T>(key: string, validate: (value: unknown) => T, fallback: T) {
  const [state, setState] = useState<T>(() => readStored(key, validate, fallback));
  useEffect(() => {
    let written = false;
    const flush = () => {
      if (written) return;
      try { localStorage.setItem(key, JSON.stringify(state)); written = true; } catch {}
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    const timer = window.setTimeout(flush, 250);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [key, state]);
  return [state, setState] as const;
}
