import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface Viewport {
  /** Width the app lays itself out against — the phone box when framed. */
  width: number;
  /** Height of the box, 0 when the app owns the whole window. */
  height: number;
  /** True when the app runs inside the iPhone frame instead of the window. */
  boxed: boolean;
}

const ViewportContext = createContext<Viewport | null>(null);

export function ViewportProvider({
  children,
  width,
  height,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  const boxed = width != null;
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    if (boxed) return;
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [boxed]);

  const value = useMemo<Viewport>(
    () => ({ width: width ?? windowWidth, height: height ?? 0, boxed }),
    [width, height, boxed, windowWidth],
  );

  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>;
}

export interface Layout extends Viewport {
  /** Sidebar + right rail layout. */
  wide: boolean;
  mid: boolean;
  /** Full height of the shell, honouring the phone box. */
  shellHeight: string;
  reelHeight: (messengerMode: boolean) => string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout(): Layout {
  const viewport = useContext(ViewportContext);
  if (!viewport) throw new Error('useLayout must be used inside <ViewportProvider>');
  const { width, height, boxed } = viewport;
  const wide = width >= 1000;
  const shellHeight = boxed ? `${height}px` : '100dvh';
  return {
    ...viewport,
    wide,
    mid: width >= 700,
    shellHeight,
    reelHeight: () =>
      wide
        ? 'calc(100dvh - 52px)'
        : boxed
          ? `${height - 52 - 68}px`
          : 'calc(100dvh - 52px - 68px - env(safe-area-inset-bottom))',
  };
}
