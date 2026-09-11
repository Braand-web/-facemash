import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const THRESHOLD = 64;

/**
 * Pull down past the threshold to refresh. Only engages when the scroller is already
 * at the top, so it never fights a normal scroll.
 */
export function PullToRefresh({
  onRefresh,
  children,
  scroller,
}: {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  /** Element that scrolls; omit when the page itself scrolls. */
  scroller?: React.RefObject<HTMLElement | null>;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const start = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const atTop = () => (scroller?.current ? scroller.current.scrollTop <= 0 : window.scrollY <= 0);

    const onStart = (e: TouchEvent) => {
      start.current = atTop() ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null || busy) return;
      const delta = e.touches[0].clientY - start.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // Resistance, so the sheet follows the finger without tracking it 1:1.
      setPull(Math.min(96, delta * 0.5));
    };
    const onEnd = async () => {
      if (start.current === null) return;
      const reached = pull >= THRESHOLD;
      start.current = null;
      if (!reached) {
        setPull(0);
        return;
      }
      setBusy(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setBusy(false);
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [onRefresh, pull, busy, scroller]);

  const active = pull > 0 || busy;

  return (
    <div ref={host} style={{ position: 'relative' }}>
      <div
        aria-hidden={!active}
        style={{
          height: active ? pull : 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink3)',
          transition: busy ? 'none' : 'height .18s ease',
        }}
      >
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            transform: `rotate(${Math.min(180, (pull / THRESHOLD) * 180)}deg)`,
            animation: busy ? 'fmSpin .8s linear infinite' : undefined,
          }}
        >
          <Icon name={busy ? 'progress_activity' : 'arrow_downward'} size={18} />
        </span>
      </div>
      {children}
    </div>
  );
}
