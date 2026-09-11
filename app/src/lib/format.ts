import type { Lang } from '../types';

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const fmt = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
};

export const minutesAgo = (createdAt: number): number =>
  Math.max(0, Math.floor((Date.now() - createdAt) / 60000));

export const relMinutes = (min: number, lang: Lang): string => {
  if (min < 1) return lang === 'fr' ? 'à l’instant' : 'now';
  if (min < 60) return min + ' min';
  if (min < 1440) return Math.floor(min / 60) + ' h';
  const d = Math.floor(min / 1440);
  return d + (lang === 'fr' ? ' j' : 'd');
};

export const rel = (createdAt: number, lang: Lang): string =>
  relMinutes(minutesAgo(createdAt), lang);

export const mmss = (sec: number): string => {
  const s = Math.floor(sec);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

export const dayLabel = (daysAgo: number, lang: Lang): string => {
  if (daysAgo <= 0) return lang === 'fr' ? "Aujourd'hui" : 'Today';
  if (daysAgo === 1) return lang === 'fr' ? 'Hier' : 'Yesterday';
  return lang === 'fr' ? 'Il y a ' + daysAgo + ' jours' : daysAgo + ' days ago';
};

/** Deterministic waveform heights for a voice note, keyed off the message id. */
export const voiceBars = (id: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 20; i++) {
    out.push(5 + ((id.charCodeAt(i % id.length) * (i + 3)) % 13));
  }
  return out;
};

/** Live waveform for an in-progress recording. */
export const recordingBars = (sec: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < 22; i++) {
    const k = Math.sin((i + sec * 9) * 1.7) * Math.sin((i + 1) * 0.6);
    out.push((5 + Math.abs(k) * 17).toFixed(1) + 'px');
  }
  return out;
};

export const minutesToTimestamp = (min: number): number => Date.now() - min * 60000;
