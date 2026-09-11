import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Sheet } from './store';

export interface StoryState {
  groupIndex: number;
  itemIndex: number;
  progress: number;
}

interface Overlays {
  sharePostId: string | null;
  openShare: (postId: string) => void;
  closeShare: () => void;
  sheet: Sheet | null;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  story: StoryState | null;
  openStory: (groupIndex: number) => void;
  setStory: (story: StoryState | null) => void;
  closeStory: () => void;
}

const OverlayContext = createContext<Overlays | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [story, setStory] = useState<StoryState | null>(null);

  const openShare = useCallback((postId: string) => setSharePostId(postId), []);
  const closeShare = useCallback(() => setSharePostId(null), []);
  const openSheet = useCallback((next: Sheet) => setSheet(next), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const openStory = useCallback(
    (groupIndex: number) => setStory({ groupIndex, itemIndex: 0, progress: 0 }),
    [],
  );
  const closeStory = useCallback(() => setStory(null), []);

  const value = useMemo<Overlays>(
    () => ({
      sharePostId,
      openShare,
      closeShare,
      sheet,
      openSheet,
      closeSheet,
      story,
      openStory,
      setStory,
      closeStory,
    }),
    [sharePostId, openShare, closeShare, sheet, openSheet, closeSheet, story, openStory, closeStory],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOverlays(): Overlays {
  const value = useContext(OverlayContext);
  if (!value) throw new Error('useOverlays must be used inside <OverlayProvider>');
  return value;
}
