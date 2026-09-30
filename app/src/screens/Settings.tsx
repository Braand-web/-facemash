import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { PersonRow, Segmented } from '../components/ui';
import { useApp } from '../store';
import { useInstall } from '../lib/install';
import { ACCENTS, setPref, usePrefs } from '../lib/prefs';
import { haptic } from '../lib/haptics';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ margin: '0 16px 22px' }}>
      <h2 className="eyebrow" style={{ margin: '0 4px 8px' }}>{title}</h2>
      <div className="card" style={{ overflow: 'hidden', borderRadius: 24 }}>{children}</div>
    </section>
  );
}

function Row({ icon, title, hint, right, onClick, danger, role, checked, last }: { icon: string; title: string; hint?: string; right?: ReactNode; onClick?: () => void; danger?: boolean; role?: string; checked?: boolean; last?: boolean }) {
  const inner = (
    <>
      <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: danger ? 'color-mix(in srgb, var(--danger) 14%, transparent)' : 'var(--accentSofter)', color: danger ? 'var(--danger)' : 'var(--accent-fg)', flex: 'none' }}>
        <Icon name={icon} size={20} />
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 550, color: danger ? 'var(--danger)' : undefined }}>{title}</span>
        {hint && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)', marginTop: 1 }}>{hint}</span>}
      </span>
      {right}
    </>
  );
  const style = { display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 16px', borderBottom: last ? 0 : '1px solid var(--line)' } as const;
  return onClick ? (
    <button className="row-hover" onClick={onClick} role={role} aria-checked={checked} style={style}>{inner}</button>
  ) : (
    <div style={style}>{inner}</div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 999, padding: 3, background: on ? 'var(--grad)' : 'var(--surface3)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background 200ms', flex: 'none' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgb(0 0 0 / 35%)', transition: 'all 300ms var(--ease-spring)' }} />
    </span>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { t, lang, theme, user, me, data, toggleTheme, toggleLang, signOut, togglePrivateAccount, unblockUser } = useApp();
  const { canInstall, ios, installed, promptInstall } = useInstall();
  const prefs = usePrefs();
  const [notifications, setNotifications] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const blocked = data.users.filter((u) => user.blocked[u.id]);

  const askForNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    setNotifications(await Notification.requestPermission());
  };

  return (
    <>
      <ScreenHeader title={t.settings} />
      <div style={{ padding: '18px 0 30px' }} className="stagger">
        <div className="card" style={{ margin: '0 16px 24px', padding: '6px 4px 6px 0' }}>
          <PersonRow userId={me.id} sub={`@${me.username}`} size={56} action={<button className="btn btn-outline btn-sm" onClick={() => navigate('/profile/me')}>{t.viewProfile}</button>} />
        </div>

        <Group title={t.appearance}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 550 }}>{t.theme}</p>
            <Segmented
              value={theme}
              onChange={(next) => next !== theme && toggleTheme()}
              options={[
                { key: 'dark', label: lang === 'fr' ? 'Sombre' : 'Dark', icon: 'dark_mode' },
                { key: 'light', label: lang === 'fr' ? 'Clair' : 'Light', icon: 'light_mode' },
              ]}
            />
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 550 }}>{t.accentColor}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {ACCENTS.map((a) => (
                <button key={a.key} onClick={() => { setPref('accent', a.key); haptic('light'); }} aria-label={a.key} aria-pressed={prefs.accent === a.key} style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${a.from}, ${a.to})`, boxShadow: prefs.accent === a.key ? '0 0 0 3px var(--bg-elev), 0 0 0 5px var(--ink)' : 'none', display: 'grid', placeItems: 'center', color: '#fff' }}>
                  {prefs.accent === a.key && <Icon name="check" size={20} />}
                </button>
              ))}
            </div>
          </div>
          <Row icon="language" title={t.language} onClick={toggleLang} right={<span style={{ color: 'var(--ink3)', fontSize: 14 }}>{lang === 'fr' ? 'Français' : 'English'}</span>} />
          <Row icon="play_circle" title={t.autoplay} hint={t.autoplayHint} role="switch" checked={prefs.autoplay} onClick={() => setPref('autoplay', !prefs.autoplay)} right={<Switch on={prefs.autoplay} />} />
          <Row icon="vibrate" title={t.haptics} hint={t.hapticsHint} role="switch" checked={prefs.haptics} onClick={() => { setPref('haptics', !prefs.haptics); haptic('light'); }} right={<Switch on={prefs.haptics} />} last />
        </Group>

        <Group title={t.privacy}>
          <Row icon={me.isPrivate ? 'lock' : 'lock_open'} title={t.privateAccount} hint={t.privateAccountHint} role="switch" checked={!!me.isPrivate} onClick={togglePrivateAccount} right={<Switch on={!!me.isPrivate} />} />
          <Row icon="bookmark" title={t.saved} onClick={() => navigate('/saved')} right={<Icon name="chevron_right" size={19} color="var(--ink3)" />} last />
        </Group>

        <Group title={t.notifications}>
          <Row icon={notifications === 'granted' ? 'notifications_active' : 'notifications'} title={t.enableNotifications} onClick={notifications === 'default' ? () => void askForNotifications() : undefined} right={<span style={{ fontSize: 14, color: 'var(--ink3)' }}>{notifications === 'granted' ? t.notificationsOn : t.notificationsOff}</span>} last />
        </Group>

        {(canInstall || ios || installed) && (
          <Group title={t.app}>
            <Row icon="install_mobile" title={t.install} hint={ios && !installed ? t.installIos : undefined} onClick={canInstall ? () => void promptInstall() : undefined} right={installed ? <span style={{ fontSize: 14, color: 'var(--ink3)' }}>{t.installed}</span> : undefined} last />
          </Group>
        )}

        <Group title={`${t.blocked} · ${blocked.length}`}>
          {blocked.length === 0 && <p style={{ margin: 0, padding: '16px', fontSize: 14, color: 'var(--ink3)' }}>{t.noBlocked}</p>}
          {blocked.map((u) => (
            <PersonRow key={u.id} userId={u.id} size={42} action={<button className="btn btn-outline btn-sm" onClick={() => unblockUser(u.id)}>{t.unblock}</button>} />
          ))}
        </Group>

        <Group title={t.account}>
          <Row icon="logout" title={t.logout} danger onClick={() => { signOut(); navigate('/'); }} last />
        </Group>

        <p style={{ textAlign: 'center', color: 'var(--ink3)', fontSize: 12, margin: '8px 0 0' }}>
          <span className="brand" style={{ fontSize: 15 }}>facemash<span className="brand__dot" /></span>
        </p>
      </div>
    </>
  );
}
