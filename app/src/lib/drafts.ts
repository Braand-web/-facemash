import { useCallback, useEffect, useState } from 'react';

const KEY = 'facemash.drafts';

const read = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** One draft per conversation, kept when you leave the thread and across reloads. */
export function useDraft(threadId: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => read()[threadId] ?? '');

  useEffect(() => {
    setValue(read()[threadId] ?? '');
  }, [threadId]);

  const update = useCallback(
    (next: string) => {
      setValue(next);
      const all = read();
      if (next) all[threadId] = next;
      else delete all[threadId];
      try {
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch {
        /* ignore quota errors — the draft still lives in memory */
      }
    },
    [threadId],
  );

  return [value, update];
}
