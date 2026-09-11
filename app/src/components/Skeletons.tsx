const shimmer = {
  background: 'linear-gradient(90deg,var(--surface) 25%,var(--surface2) 37%,var(--surface) 63%)',
  backgroundSize: '200% 100%',
  animation: 'fmShim 1.3s linear infinite',
  display: 'block',
} as const;

/** Placeholder cards shown while a feed loads or refreshes. */
export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ padding: '17px 16px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
            <span style={{ ...shimmer, width: 42, height: 42, borderRadius: '50%', flex: '0 0 42px' }} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ ...shimmer, width: '45%', height: 12, borderRadius: 6 }} />
              <span style={{ ...shimmer, width: '28%', height: 10, borderRadius: 5 }} />
            </span>
          </div>
          <span style={{ ...shimmer, width: '92%', height: 12, borderRadius: 6, marginBottom: 8 }} />
          <span style={{ ...shimmer, width: '70%', height: 12, borderRadius: 6, marginBottom: 12 }} />
          <span style={{ ...shimmer, width: '100%', aspectRatio: '4/5', maxHeight: 260, borderRadius: 16 }} />
        </div>
      ))}
    </div>
  );
}

/** Placeholder rows for the conversation list. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ ...shimmer, width: 52, height: 52, borderRadius: '50%', flex: '0 0 52px' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ ...shimmer, width: '40%', height: 12, borderRadius: 6 }} />
            <span style={{ ...shimmer, width: '75%', height: 10, borderRadius: 5 }} />
          </span>
        </div>
      ))}
    </div>
  );
}
