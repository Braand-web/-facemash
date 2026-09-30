import { useSyncExternalStore } from 'react';

export type Accent = 'violet' | 'azure' | 'rose' | 'ember' | 'jade';

export const ACCENTS: { key: Accent; from: string; to: string }[] = [
  { key: 'violet', from: '#7c5cff', to: '#ff4d9d' },
  { key: 'azure', from: '#2570ee', to: '#12b8e6' },
  { key: 'rose', from: '#e8306f', to: '#ff7a45' },
  { key: 'ember', from: '#dc4f0a', to: '#f5a623' },
  { key: 'jade', from: '#0d8a6c', to: '#12b5c8' },
];

/** Device-level preferences. Theme and language sync with the account; these stay local. */
export interface Prefs {
  accent: Accent;
  haptics: boolean;
  autoplay: boolean;
}

const KEY = 'facemash.prefs';
const defaults: Prefs = { accent: 'violet', haptics: true, autoplay: true };

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
