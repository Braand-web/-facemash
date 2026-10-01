import { useSyncExternalStore } from 'react';

export type Accent = 'cobalt' | 'tomato' | 'forest' | 'plum' | 'ochre';

export const ACCENTS: { key: Accent; from: string; to: string }[] = [
  { key: 'cobalt', from: '#2563eb', to: '#2563eb' },
  { key: 'tomato', from: '#e5432a', to: '#e5432a' },
  { key: 'forest', from: '#2f7d4f', to: '#2f7d4f' },
  { key: 'plum', from: '#8a3b6e', to: '#8a3b6e' },
  { key: 'ochre', from: '#b9770e', to: '#b9770e' },
];

/** Device-level preferences. Theme and language sync with the account; these stay local. */
export interface Prefs {
  accent: Accent;
  haptics: boolean;
  autoplay: boolean;
}

const KEY = 'facemash.prefs';
const defaults: Prefs = { accent: 'cobalt', haptics: true, autoplay: true };

const read = (): Prefs => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
    return {
      accent: ACCENTS.some((a) => a.key === saved.accent) ? (saved.accent as Accent) : defaults.accent,
      haptics: saved.haptics ?? defaults.haptics,
      autoplay: saved.autoplay ?? defaults.autoplay,
    };
  } catch {
    return defaults;
  }
};

let current: Prefs = read();
const listeners = new Set<() => void>();

const apply = () => {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-accent', current.accent);
};

/** Called before first render so the accent never flashes the default. */
export const initPrefs = () => apply();

export const getPrefs = (): Prefs => current;

export const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: preference lasts for the session */
  }
  apply();
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, getPrefs, getPrefs);
