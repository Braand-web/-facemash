import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Sheet } from './store';

export interface StoryState {
  groupIndex: number;
  itemIndex: number;
}

interface Overlays {
  sharePostId: string | null;
  openShare: (postId: string) => void;
  closeShare: () => void;
  sheet: Sheet | null;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  story: StoryState | null;
  openStory: (groupIndex: number, itemIndex?: number) => void;
  setStory: (story: StoryState | null) => void;
  closeStory: () => void;
  commentsPostId: string | null;
  openComments: (postId: string) => void;
  closeComments: () => void;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  storyComposer: boolean;
  openStoryComposer: () => void;
  closeStoryComposer: () => void;
}

const OverlayContext = createContext<Overlays | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [story, setStory] = useState<StoryState | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [storyComposer, setStoryComposer] = useState(false);

  const openShare = useCallback((postId: string) => setSharePostId(postId), []);
  const closeShare = useCallback(() => setSharePostId(null), []);
  const openSheet = useCallback((next: Sheet) => setSheet(next), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const openStory = useCallback(
    (groupIndex: number, itemIndex = 0) => setStory({ groupIndex, itemIndex }),
    [],
  );
  const closeStory = useCallback(() => setStory(null), []);
  const openComments = useCallback((postId: string) => setCommentsPostId(postId), []);
  const closeComments = useCallback(() => setCommentsPostId(null), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openStoryComposer = useCallback(() => setStoryComposer(true), []);
  const closeStoryComposer = useCallback(() => setStoryComposer(false), []);

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
      commentsPostId,
      openComments,
      closeComments,
      paletteOpen,
      openPalette,
      closePalette,
      storyComposer,
      openStoryComposer,
      closeStoryComposer,
    }),
    [
      sharePostId,
      openShare,
      closeShare,
      sheet,
      openSheet,
      closeSheet,
      story,
      openStory,
      closeStory,
      commentsPostId,
      openComments,
      closeComments,
      paletteOpen,
      openPalette,
      closePalette,
      storyComposer,
      openStoryComposer,
      closeStoryComposer,
    ],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOverlays(): Overlays {
  const value = useContext(OverlayContext);
  if (!value) throw new Error('useOverlays must be used inside <OverlayProvider>');
  return value;
}
