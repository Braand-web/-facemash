import { useState } from 'react';
import { Icon } from './Icon';
import { useApp } from '../store';
import { useInstall } from '../lib/install';
import { useLayout } from '../viewport';

const DISMISSED_KEY = 'facemash.install.dismissed';
const SNOOZE_DAYS = 7;

const snoozed = (): boolean => {
  try {
    const until = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    return Date.now() < until;
  } catch {
    return false;
  }
};

/**
 * Invitation to install, shown once the browser says it is possible — and on iOS,
 * where there is no event, as the share-sheet instruction instead.
 */
export function InstallPrompt() {
  const { t, session } = useApp();
  const { boxed } = useLayout();
  const { canInstall, ios, installed, promptInstall } = useInstall();
  const [hidden, setHidden] = useState(snoozed);

  // Never on the phone-frame preview, and not before the viewer is in the app.
  if (boxed || !session?.onboarded || installed || hidden) return null;
  if (!canInstall && !ios) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    } catch {
      /* private mode: the banner simply comes back next session */
    }
  };

  return (
    <div
      role="region"
      aria-label={t.install}
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
        zIndex: 60,
        maxWidth: 460,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 18,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow)',
        animation: 'fmIn .28s ease both',
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          flex: '0 0 40px',
          borderRadius: 12,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={ios && !canInstall ? 'ios_share' : 'install_mobile'} size={21} color="var(--accent)" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14.5,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t.install}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.4 }}>
          {canInstall ? t.installPitch : t.installIos}
        </span>
      </span>
      {canInstall && (
        <button
          onClick={() => {
            void promptInstall().then((outcome) => outcome === 'dismissed' && dismiss());
          }}
          aria-label={t.install}
          style={{
            flex: '0 0 auto',
            padding: '9px 15px',
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--accentInk)',
            fontSize: 13.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {t.installShort}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label={t.later}
        style={{
          flex: '0 0 auto',
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink3)',
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
