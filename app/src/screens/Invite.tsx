import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand } from '../components/ui';
import { Avatar, Icon } from '../components/Icon';
import { useApp } from '../store';
import { remote } from '../data/remote';
import { normalizeInviteCode } from '../lib/invites.mjs';
import { initials } from '../lib/format';

type Inviter = { name: string | null; username: string | null; isPublic: boolean };

export function InviteLanding() {
  const { code: rawCode = '' } = useParams();
  const code = normalizeInviteCode(rawCode);
  const { t, session, me } = useApp();
  const navigate = useNavigate();
  const [lookup, setLookup] = useState<{ code: string; inviter: Inviter | null } | null>(null);
  const status = !code ? 'invalid' : lookup?.code !== code ? 'loading' : lookup.inviter ? 'valid' : 'invalid';
  const inviter = lookup?.code === code ? lookup.inviter : null;

  useEffect(() => {
    let active = true;
    if (!code) return () => { active = false; };
    void remote.resolveInviteCode(code).then((result) => {
      if (!active) return;
      setLookup({ code, inviter: result });
    });
    return () => { active = false; };
  }, [code]);

  const proceed = () => {
    const query = new URLSearchParams({ mode: 'signup' });
    if (status === 'valid' && code) query.set('invite', code);
    navigate(`/login?${query.toString()}`);
  };

  return (
    <main className="auth-screen" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'calc(24px + var(--safe-top)) 18px calc(24px + var(--safe-bottom))' }}>
      <section className="auth-card" style={{ width: '100%', maxWidth: 440, padding: 'clamp(24px, 7vw, 38px)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}><Brand size={31} /></div>
        {status === 'loading' ? (
          <div role="status" aria-live="polite">
            <span className="spinner" style={{ width: 26, height: 26, color: 'var(--accent)', margin: '0 auto 20px' }} />
            <p style={{ margin: 0, color: 'var(--ink3)' }}>{t.loading}</p>
          </div>
        ) : status === 'valid' ? (
          <>
            {inviter?.isPublic && inviter.name && (
              <div style={{ display: 'grid', justifyItems: 'center', gap: 10, marginBottom: 18 }}>
                <Avatar hue={210} initials={initials(inviter.name)} size={66} />
                <p style={{ margin: 0, fontWeight: 700 }}>{inviter.name}{inviter.username ? <span style={{ display: 'block', marginTop: 3, color: 'var(--ink3)', fontSize: 13, fontWeight: 450 }}>@{inviter.username}</span> : null}</p>
              </div>
            )}
            {!inviter?.isPublic && <p style={{ margin: '0 0 18px', color: 'var(--ink3)', fontSize: 14 }}>{t.invitePrivate}</p>}
            <h1 className="display" style={{ margin: '0 0 10px', fontSize: 27, fontWeight: 800, letterSpacing: '-0.04em' }}>{t.inviteWelcome}</h1>
            <p style={{ margin: '0 0 24px', color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.6 }}>{t.inviteWelcomeBody}</p>
            <button className="btn btn-primary btn-lg btn-block" onClick={proceed}>
              {t.signup}<Icon name="arrow_forward" size={18} />
            </button>
            <button className="hov-ink" onClick={() => navigate('/login')} style={{ marginTop: 18, fontSize: 14, color: 'var(--ink3)' }}>{t.login}</button>
          </>
        ) : (
          <>
            <h1 className="display" style={{ margin: '0 0 10px', fontSize: 25, fontWeight: 800, letterSpacing: '-0.04em' }}>{t.inviteInvalid}</h1>
            <button className="btn btn-primary btn-lg btn-block" onClick={proceed} style={{ marginTop: 20 }}>{t.inviteContinue}</button>
          </>
        )}
        {session?.authId && status !== 'loading' && (
          <button className="btn btn-outline btn-lg btn-block" onClick={() => navigate('/')} style={{ marginTop: 12 }}>
            {t.inviteContinue}{me ? ` · ${me.name}` : ''}
          </button>
        )}
      </section>
    </main>
  );
}
