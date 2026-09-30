import { useSyncExternalStore } from 'react';

const KEY = 'facemash.recents';
const MAX = 8;

const read = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
};

let current = read();
const listeners = new Set<() => void>();

const write = (next: string[]) => {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
};

export const addRecent = (query: string) => {
  const value = query.trim();
  if (value.length < 2) return;
  write([value, ...current.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, MAX));
};

export const removeRecent = (query: string) => write(current.filter((item) => item !== query));
export const clearRecents = () => write([]);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRecents = (): string[] => useSyncExternalStore(subscribe, () => current, () => current);
