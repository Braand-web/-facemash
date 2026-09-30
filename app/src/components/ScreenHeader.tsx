import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

export function ScreenHeader({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack ?? (() => navigate(-1))} aria-label="Retour">
        <Icon name="arrow_back" size={22} />
      </button>
      <h1 className="topbar__title">{title}</h1>
      {right}
    </header>
  );
}
