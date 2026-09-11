import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { ViewportProvider } from '../viewport';

/** The whole app running at true scale inside an iPhone, 402 × 874. */
export function MobileFrame() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'oklch(0.955 0.004 265)',
        padding: '40px 20px 56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <header style={{ textAlign: 'center', maxWidth: '50ch' }}>
        <h1
          style={{
            margin: '0 0 8px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'oklch(0.22 0.012 265)',
          }}
        >
          Facemash sur mobile
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14.5,
            lineHeight: 1.6,
            color: 'oklch(0.42 0.012 265)',
            textWrap: 'pretty',
          }}
        >
          L'application entière dans un iPhone à l'échelle réelle, 402 × 874. Tout est cliquable : le flux
          vertical, la messagerie plein écran, les appels, l'enregistrement vocal.
        </p>
      </header>

      <div
        style={{
          position: 'relative',
          width: 424,
          height: 896,
          flex: '0 0 auto',
          borderRadius: 54,
          padding: 11,
          background: 'linear-gradient(160deg, oklch(0.42 0.008 265), oklch(0.28 0.006 265))',
          boxShadow:
            '0 44px 90px -30px oklch(0.25 0.02 265 / 0.45), 0 0 0 1px oklch(0.20 0.01 265 / 0.35)',
        }}
      >
        <div
          style={{
            position: 'relative',
            transform: 'translate(0)',
            width: '100%',
            height: '100%',
            borderRadius: 42,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 118,
              height: 33,
              borderRadius: 20,
              background: '#000',
              zIndex: 60,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 52,
              zIndex: 55,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 30px 0',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>9:41</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="18" height="11" viewBox="0 0 18 11">
                <rect x="0" y="7" width="3" height="4" rx="0.7" fill="#fff" />
                <rect x="4.6" y="4.8" width="3" height="6.2" rx="0.7" fill="#fff" />
                <rect x="9.2" y="2.4" width="3" height="8.6" rx="0.7" fill="#fff" />
                <rect x="13.8" y="0" width="3" height="11" rx="0.7" fill="#fff" />
              </svg>
              <svg width="24" height="12" viewBox="0 0 24 12">
                <rect x="0.5" y="0.5" width="21" height="11" rx="3.2" stroke="#fff" strokeOpacity="0.4" fill="none" />
                <rect x="2" y="2" width="18" height="8" rx="2" fill="#fff" />
                <path d="M23 4v4c0.7-0.3 1.2-1.1 1.2-2S23.7 4.3 23 4Z" fill="#fff" fillOpacity="0.45" />
              </svg>
            </span>
          </div>

          <div style={{ height: '100%', padding: '52px 0 20px', overflow: 'hidden' }}>
            <div style={{ width: 402, height: 802, overflow: 'hidden', background: 'var(--bg)' }}>
              <ViewportProvider width={402} height={802}>
                <MemoryRouter>
                  <AppRoutes />
                </MemoryRouter>
              </ViewportProvider>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 132,
              height: 5,
              borderRadius: 3,
              background: 'oklch(0.99 0 0 / 0.75)',
              zIndex: 70,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
