import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { useApp } from '../store';

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '15px 14px',
  borderRadius: 14,
  textAlign: 'left',
} as const;

export function Settings() {
  const navigate = useNavigate();
  const { t, lang, theme, user, toggleTheme, toggleLang, signOut } = useApp();

  return (
    <>
      <ScreenHeader title={t.settings} />
      <div style={{ padding: '14px 16px 30px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="hov-surface" onClick={toggleTheme} style={row}>
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={22} color="var(--ink2)" />
          <span style={{ flex: 1, fontSize: 15 }}>{t.theme}</span>
          <span style={{ fontSize: 14, color: 'var(--ink3)' }}>
            {theme === 'dark' ? (lang === 'fr' ? 'Sombre' : 'Dark') : lang === 'fr' ? 'Clair' : 'Light'}
          </span>
        </button>
        <button className="hov-surface" onClick={toggleLang} style={row}>
          <Icon name="language" size={22} color="var(--ink2)" />
          <span style={{ flex: 1, fontSize: 15 }}>{t.language}</span>
          <span style={{ fontSize: 14, color: 'var(--ink3)' }}>{lang === 'fr' ? 'Français' : 'English'}</span>
        </button>
        <button className="hov-surface" onClick={() => navigate('/saved')} style={row}>
          <Icon name="bookmark" size={22} color="var(--ink2)" />
          <span style={{ flex: 1, fontSize: 15 }}>{t.saved}</span>
          <Icon name="chevron_right" size={19} color="var(--ink3)" />
        </button>
        <div style={{ ...row, borderRadius: 0 }}>
          <Icon name="block" size={22} color="var(--ink2)" />
          <span style={{ flex: 1, fontSize: 15 }}>{t.blocked}</span>
          <span style={{ fontSize: 14, color: 'var(--ink3)' }}>{Object.keys(user.blocked).length}</span>
        </div>
        <button
          className="hov-surface"
          onClick={() => {
            signOut();
            navigate('/');
          }}
          style={{ ...row, color: 'var(--like)' }}
        >
          <Icon name="logout" size={22} />
          <span style={{ flex: 1, fontSize: 15 }}>{t.logout}</span>
        </button>
      </div>
    </>
  );
}
