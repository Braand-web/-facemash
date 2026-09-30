/** Placeholder cards shown while a feed loads or refreshes. */
export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="post" style={{ animation: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span className="skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flex: '0 0 46px' }} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span className="skeleton" style={{ width: '42%', height: 12 }} />
              <span className="skeleton" style={{ width: '26%', height: 10 }} />
            </span>
          </div>
          <span className="skeleton" style={{ width: '92%', height: 12, marginBottom: 8 }} />
          <span className="skeleton" style={{ width: '64%', height: 12, marginBottom: 14 }} />
          <span className="skeleton" style={{ width: '100%', aspectRatio: '4/3', borderRadius: 22 }} />
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
          <span className="skeleton" style={{ width: 52, height: 52, borderRadius: '50%', flex: '0 0 52px' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="skeleton" style={{ width: '40%', height: 12 }} />
            <span className="skeleton" style={{ width: '75%', height: 10 }} />
          </span>
        </div>
      ))}
    </div>
  );
}
