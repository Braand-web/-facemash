import { useCallback, useEffect, useRef, type MouseEvent } from 'react';

/**
 * One click handler that tells a single tap from a double tap. The single-tap action
 * waits a beat so a double tap never triggers it. Coordinates are relative to the
 * element, so a heart can burst exactly where the finger landed.
 */
export function useDoubleTap(
  onSingle: () => void,
  onDouble: (x: number, y: number) => void,
  delay = 260,
) {
  const timer = useRef<number | undefined>(undefined);
  const last = useRef(0);
  const single = useRef(onSingle);
  const double = useRef(onDouble);
  single.current = onSingle;
  double.current = onDouble;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const now = Date.now();
      window.clearTimeout(timer.current);
      if (now - last.current < delay) {
        last.current = 0;
        double.current(x, y);
        return;
      }
      last.current = now;
      timer.current = window.setTimeout(() => single.current(), delay);
    },
    [delay],
  );
}
