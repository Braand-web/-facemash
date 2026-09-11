import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 56,
        padding: '0 12px',
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <button
        className="hov-surface"
        onClick={onBack ?? (() => navigate(-1))}
        aria-label="Retour"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink2)',
        }}
      >
        <Icon name="arrow_back" size={22} />
      </button>
      <h1
        style={{
          margin: 0,
          flex: 1,
          fontFamily: "'Bricolage Grotesque',sans-serif",
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>
      {right}
    </header>
  );
}
