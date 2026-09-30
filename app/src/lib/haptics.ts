import { getPrefs } from './prefs';

type Kind = 'tick' | 'light' | 'success';

const patterns: Record<Kind, number | number[]> = {
  tick: 6,
  light: 12,
  success: [10, 40, 16],
};

/** A short vibration where the platform allows it; silently nothing elsewhere. */
export const haptic = (kind: Kind = 'light') => {
  if (!getPrefs().haptics) return;
  try {
    navigator.vibrate?.(patterns[kind]);
  } catch {
    /* some browsers throw when vibration is not permitted */
  }
};
