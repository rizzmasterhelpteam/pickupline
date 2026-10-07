import { useCallback, useEffect, useRef, useState } from 'react';

export function useTransientMessage<T>(empty: T, duration = 2000) {
  const [value, setValue] = useState(empty);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValue(empty);
  }, [empty]);
  const show = useCallback((next: T) => {
    if (timer.current) clearTimeout(timer.current);
    setValue(next);
    timer.current = setTimeout(reset, duration);
  }, [duration, reset]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [value, show, reset] as const;
}
