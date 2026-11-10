import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand } from '../components/ui';
import { Avatar, Icon } from '../components/Icon';
import { useApp } from '../store';
import { remote } from '../data/remote';
import { normalizeInviteCode } from '../lib/invites.mjs';
import { initials } from '../lib/format';
import { clearPendingChannelInviteToken, clearPendingGroupInviteToken, normalizeChannelInviteToken, normalizeGroupInviteToken, rememberChannelInviteToken, rememberGroupInviteToken } from '../lib/invites.mjs';

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

export function GroupInviteLanding() {
  const { token: rawToken = '' } = useParams();
  const token = normalizeGroupInviteToken(rawToken);
  const { t, lang, session, joinGroupInvite } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const join = async () => {
    if (!token) { setMessage(lang === 'fr' ? 'Ce lien est invalide.' : 'This invite link is invalid.'); return; }
    if (!session?.authId) {
      rememberGroupInviteToken(token);
      navigate(`/login?mode=signup&groupInvite=${encodeURIComponent(token)}`);
      return;
    }
    setBusy(true);
    const result = await joinGroupInvite(token);
    setBusy(false);
    if (!result) { setMessage(lang === 'fr' ? 'Connexion nécessaire pour vérifier cette invitation.' : 'Sign in to verify this invitation.'); return; }
    if (result.status === 'joined' || result.status === 'member') {
      clearPendingGroupInviteToken();
      navigate(result.threadId ? `/messages/group/${result.threadId}` : '/messages');
      return;
    }
    if (result.status === 'pending') {
      clearPendingGroupInviteToken();
      setMessage(lang === 'fr' ? 'Demande envoyée. Un administrateur doit l’approuver avant ton entrée.' : 'Request sent. A group admin must approve it before you can join.');
      return;
    }
    if (result.status === 'full') {
      clearPendingGroupInviteToken();
      setMessage(lang === 'fr' ? 'Ce groupe a atteint sa limite de 1 000 membres.' : 'This group has reached its 1,000-member limit.');
      return;
    }
    clearPendingGroupInviteToken();
    setMessage(lang === 'fr' ? 'Cette invitation a expiré, a été révoquée ou a atteint sa limite.' : 'This invite has expired, been revoked, or reached its limit.');
  };
  const continueToSignup = () => {
    if (!token) return;
    rememberGroupInviteToken(token);
    navigate(`/login?mode=login&groupInvite=${encodeURIComponent(token)}`);
  };

  return (
    <main className="auth-screen" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'calc(24px + var(--safe-top)) 18px calc(24px + var(--safe-bottom))' }}>
      <section className="auth-card" style={{ width: '100%', maxWidth: 440, padding: 'clamp(24px, 7vw, 38px)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}><Brand size={31} /></div>
        <div style={{ width: 62, height: 62, display: 'grid', placeItems: 'center', margin: '0 auto 18px', borderRadius: 20, background: 'var(--accentSoft)', color: 'var(--accent-fg)' }}><Icon name="group" size={28} /></div>
        <h1 className="display" style={{ margin: '0 0 10px', fontSize: 25, fontWeight: 800, letterSpacing: '-0.04em' }}>{lang === 'fr' ? 'Invitation à un groupe' : 'Group invitation'}</h1>
        <p style={{ margin: '0 0 22px', color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.6 }}>{lang === 'fr' ? 'Rejoins cette conversation de groupe avec ton compte Facemash. Les liens invalides ou expirés ne donneront pas accès au groupe.' : 'Join this group conversation with your Facemash account. Invalid or expired links will not grant access.'}</p>
        {message && <p role="status" style={{ margin: '0 0 16px', color: 'var(--ink2)', fontSize: 13.5, lineHeight: 1.5 }}>{message}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !token} onClick={() => void join()}>{busy ? t.loading : session?.authId ? lang === 'fr' ? 'Rejoindre le groupe' : 'Join group' : t.signup}</button>
        {!session?.authId && <button className="hov-ink" onClick={continueToSignup} disabled={!token} style={{ marginTop: 16, fontSize: 14, color: 'var(--ink3)' }}>{t.login}</button>}
      </section>
    </main>
  );
}

export function ChannelInviteLanding() {
  const { token: rawToken = '' } = useParams();
  const token = normalizeChannelInviteToken(rawToken);
  const { t, lang, session, joinChannelInvite } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const join = async () => {
    if (!token) { setMessage(lang === 'fr' ? 'Ce lien est invalide.' : 'This invite link is invalid.'); return; }
    if (!session?.authId) {
      rememberChannelInviteToken(token);
      navigate(`/login?mode=signup&channelInvite=${encodeURIComponent(token)}`);
      return;
    }
    setBusy(true);
    const result = await joinChannelInvite(token);
    setBusy(false);
    if (!result) { setMessage(lang === 'fr' ? 'Connexion nécessaire pour vérifier cette invitation.' : 'Sign in to verify this invitation.'); return; }
    if (result.status === 'joined') {
      clearPendingChannelInviteToken();
      navigate(result.channelId ? `/messages/channel/${result.channelId}` : '/messages');
      return;
    }
    if (result.status === 'pending') {
      clearPendingChannelInviteToken();
      setMessage(lang === 'fr' ? 'Demande envoyée. Un admin du canal doit l’approuver.' : 'Request sent. A channel admin must approve it.');
      return;
    }
    clearPendingChannelInviteToken();
    setMessage(lang === 'fr' ? 'Cette invitation a expiré, a été révoquée ou a atteint sa limite.' : 'This invite has expired, been revoked, or reached its limit.');
  };

  return (
    <main className="auth-screen" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'calc(24px + var(--safe-top)) 18px calc(24px + var(--safe-bottom))' }}>
      <section className="auth-card" style={{ width: '100%', maxWidth: 440, padding: 'clamp(24px, 7vw, 38px)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}><Brand size={31} /></div>
        <div style={{ width: 62, height: 62, display: 'grid', placeItems: 'center', margin: '0 auto 18px', borderRadius: 20, background: 'var(--accentSoft)', color: 'var(--accent-fg)' }}><Icon name="campaign" size={28} /></div>
        <h1 className="display" style={{ margin: '0 0 10px', fontSize: 25, fontWeight: 800, letterSpacing: '-0.04em' }}>{lang === 'fr' ? 'Invitation à un canal' : 'Channel invitation'}</h1>
        <p style={{ margin: '0 0 22px', color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.6 }}>{lang === 'fr' ? 'Abonne-toi à ce canal Facemash. Les liens expirés ou révoqués ne donnent aucun accès.' : 'Subscribe to this Facemash channel. Expired or revoked links do not grant access.'}</p>
        {message && <p role="status" style={{ margin: '0 0 16px', color: 'var(--ink2)', fontSize: 13.5, lineHeight: 1.5 }}>{message}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !token} onClick={() => void join()}>{busy ? t.loading : session?.authId ? (lang === 'fr' ? 'Rejoindre le canal' : 'Join channel') : t.signup}</button>
        {!session?.authId && <button className="hov-ink" onClick={() => {
          if (!token) return;
          rememberChannelInviteToken(token);
          navigate(`/login?mode=login&channelInvite=${encodeURIComponent(token)}`);
        }} disabled={!token} style={{ marginTop: 16, fontSize: 14, color: 'var(--ink3)' }}>{t.login}</button>}
      </section>
    </main>
  );
}
