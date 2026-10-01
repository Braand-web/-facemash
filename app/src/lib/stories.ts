import { useSyncExternalStore } from 'react';
import type { StoryItem } from '../types';

export type StoryKind = 'text' | 'photo' | 'video';

/** Backgrounds for text stories, and the fallback fill behind uploaded media. */
export const STORY_BGS = ['#ee4b2b', '#2f56e0', '#2f7d4f', '#8a3b6e', '#b9770e', '#1d1b18'];

interface Payload {
  kind: StoryKind;
  text?: string;
  url?: string;
  bg: number;
}

// The stories table only stores a label. Rich stories travel inside it, behind a
// version prefix, so nothing else about the schema has to change; anything without
// the prefix (older rows, seeded demo content) still reads as a plain caption.
const PREFIX = 'fm1:';

export const encodeStory = (payload: Payload): string => PREFIX + JSON.stringify(payload);

const hash = (value: string): number => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const decodeStory = (label: string): Pick<StoryItem, 'kind' | 'text' | 'url' | 'bg'> => {
  if (label.startsWith(PREFIX)) {
    try {
      const parsed = JSON.parse(label.slice(PREFIX.length)) as Partial<Payload>;
      const kind: StoryKind = parsed.kind === 'photo' || parsed.kind === 'video' ? parsed.kind : 'text';
      return {
        kind,
        text: typeof parsed.text === 'string' ? parsed.text : undefined,
        url: typeof parsed.url === 'string' ? parsed.url : undefined,
        bg: typeof parsed.bg === 'number' ? parsed.bg % STORY_BGS.length : 0,
      };
    } catch {
      /* fall through to a plain caption */
    }
  }
  const lower = label.toLowerCase();
  return {
    kind: lower.startsWith('vid') ? 'video' : lower.startsWith('photo') ? 'photo' : 'text',
    text: label,
    bg: hash(label) % STORY_BGS.length,
  };
};

/** Builds a fully-resolved story item from a stored label. */
export const makeStory = (label: string, createdAt: number, id?: string): StoryItem => ({
  id,
  label,
  createdAt,
  ...decodeStory(label),
});

export const storyKey = (userId: string, item: StoryItem): string => `${userId}:${item.createdAt}`;

/* ------------------------------------------------------------- viewed -- */

const KEY = 'facemash.stories.seen';
const CAP = 400;

const read = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

let seen = new Set(read());
let snapshot = seen;
const listeners = new Set<() => void>();

export const markSeen = (key: string) => {
  if (seen.has(key)) return;
  seen = new Set([...seen, key]);
  snapshot = seen;
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen].slice(-CAP)));
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSeenStories = (): ReadonlySet<string> => useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
