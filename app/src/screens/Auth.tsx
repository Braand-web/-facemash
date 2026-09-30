import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/ui';
import { useApp } from '../store';
import { demoMode, supabase } from '../lib/supabase';
import { useLayout } from '../viewport';

type Mode = 'login' | 'signup' | 'forgot';

function Hero({ compact }: { compact: boolean }) {
  const { t } = useApp();
  const cards = [
    { h: 265, r: -6, x: '8%', y: '12%', w: 150, label: '♥ 12,4k' },
    { h: 330, r: 5, x: '52%', y: '4%', w: 130, label: '▶ 98k' },
    { h: 40, r: -3, x: '30%', y: '46%', w: 160, label: '♥ 3,8k' },
    { h: 200, r: 7, x: '62%', y: '56%', w: 120, label: '▶ 240k' },
  ];
  return (
    <div className="media-art" style={{ ['--h' as string]: 275, position: 'relative', flex: compact ? 'none' : 1, minHeight: compact ? 230 : '100dvh', display: 'flex', flexDirection: 'column', justifyContent: compact ? 'flex-end' : 'space-between', padding: compact ? '0 26px 54px' : '48px 56px', color: '#fff', overflow: 'hidden' }}>
      {!compact && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
          {cards.map((c, i) => (
            <div key={i} className="media-art" style={{ ['--h' as string]: c.h, ['--r' as string]: `${c.r}deg`, position: 'absolute', left: c.x, top: c.y, width: c.w, aspectRatio: '3 / 4', borderRadius: 24, border: '1px solid rgb(255 255 255 / 28%)', boxShadow: '0 30px 60px -20px rgb(0 0 0 / 55%)', animation: `fmFloat ${6 + i}s ease-in-out ${i * 0.6}s infinite`, display: 'flex', alignItems: 'flex-end', padding: 12, fontSize: 13, fontWeight: 700 }}>
              <span style={{ position: 'relative' }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'relative', filter: 'drop-shadow(0 4px 20px rgb(0 0 0 / 25%))' }}>
        <span className="brand" style={{ fontSize: compact ? 34 : 44, color: '#fff' }}>facemash<span className="brand__dot" style={{ background: '#fff' }} /></span>
      </div>
      <p className="display" style={{ position: 'relative', margin: compact ? '8px 0 0' : 0, maxWidth: '14ch', fontSize: compact ? 25 : 46, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.045em', textShadow: '0 2px 24px rgb(0 0 0 / 30%)' }}>
        {t.heroLine}
      </p>
    </div>
  );
}

export function Auth() {
  const { t, lang, signIn, data } = useApp();
  const { shellHeight, wide } = useLayout();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (oauthError) throw oauthError;
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : t.googleSignInError);
      setBusy(false);
    }
  };

  const title = done ? t.linkSent : mode === 'signup' ? t.authS : mode === 'forgot' ? t.authF : t.authL;
  const subtitle = done ? '' : mode === 'signup' ? t.authSs : mode === 'forgot' ? t.authFs : t.authLs;
  const cta = mode === 'signup' ? t.signup : mode === 'forgot' ? t.sendLink : t.login;

  const submit = async () => {
    if (mode === 'forgot') {
      if (!form.email) { setError(t.email); return; }
      if (supabase) await supabase.auth.resetPasswordForEmail(form.email);
      setDone(true);
      setError('');
      return;
    }
    if (mode === 'signup') {
      if (!form.name || !form.username || !form.email || !form.password) { setError(lang === 'fr' ? 'Tous les champs sont requis.' : 'All fields are required.'); return; }
      if (data.users.some((u) => u.username === form.username)) { setError(lang === 'fr' ? 'Cet identifiant est déjà pris.' : 'That username is taken.'); return; }
    } else if (!form.email || !form.password) {
      setError(lang === 'fr' ? 'E-mail et mot de passe requis.' : 'Email and password required.');
      return;
    }
    setBusy(true);
    setError('');
    if (supabase) {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { name: form.name, username: form.username } } })
        : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      setBusy(false);
      if (result.error) { setError(result.error.message); return; }
      // With email confirmation on, sign-up returns no session until the link is clicked.
      if (!result.data.session) { setDone(true); return; }
      if (!result.data.user?.id) { setError(t.authUserMissing); setBusy(false); return; }
      signIn({ onboarded: mode !== 'signup', authId: result.data.user?.id });
      return;
    }
    window.setTimeout(() => { setBusy(false); signIn({ onboarded: mode !== 'signup', demo: true }); }, 600);
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); setDone(false); };

  const formBody = (
    <div className="auth-card" style={{ width: '100%', maxWidth: 420, minWidth: 0, justifySelf: 'center', animation: 'fmIn .5s var(--ease-out) both', marginTop: wide ? 0 : -34, position: 'relative' }}>
      {mode !== 'forgot' && !done && (
        <div style={{ marginBottom: 22 }}>
          <Segmented<'login' | 'signup'> value={mode === 'signup' ? 'signup' : 'login'} onChange={switchMode} options={[{ key: 'login', label: t.login }, { key: 'signup', label: t.signup }]} />
        </div>
      )}
      <h1 className="display" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{title}</h1>
      {subtitle && <p style={{ margin: '0 0 22px', color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.55 }}>{subtitle}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {mode === 'signup' && (
          <>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.name} autoComplete="name" style={{ minHeight: 52, padding: '0 16px' }} />
            <input className="field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, '').toLowerCase() })} placeholder={t.username} autoComplete="username" autoCapitalize="none" style={{ minHeight: 52, padding: '0 16px' }} />
          </>
        )}
        {!done && <input className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t.email} style={{ minHeight: 52, padding: '0 16px' }} />}
        {mode !== 'forgot' && !done && (
          <div style={{ position: 'relative' }}>
            <input className="field" type={show ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t.password} style={{ minHeight: 52, padding: '0 50px 0 16px' }} />
            <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? t.hidePassword : t.showPassword} style={{ position: 'absolute', right: 4, top: 5 }}>
              <Icon name={show ? 'visibility_off' : 'visibility'} size={20} />
            </button>
          </div>
        )}
        {!!error && <p role="alert" style={{ margin: '2px 0 0', color: 'var(--danger)', fontSize: 13.5 }}>{error}</p>}
        {!done && (
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy} style={{ marginTop: 8 }}>
            {busy && <span className="spinner" />}
            {cta}
          </button>
        )}
      </form>
      {supabase && mode !== 'forgot' && !done && (
        <>
          <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: 'var(--ink3)', fontSize: 12 }}>
            <span style={{ height: 1, flex: 1, background: 'var(--line)' }} />
            <span>{t.orContinueWith}</span>
            <span style={{ height: 1, flex: 1, background: 'var(--line)' }} />
          </div>
          <button type="button" className="btn btn-outline btn-lg btn-block" onClick={() => void signInWithGoogle()} disabled={busy}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z" />
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.7-5c-1.9 1.3-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
              <path fill="#FBBC05" d="M12.8 28.1a12 12 0 0 1 0-8.2v-5.2H5.9a20 20 0 0 0 0 18.6l6.9-5.2Z" />
              <path fill="#EA4335" d="M24 11.7c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.7 29.5 4 24 4A20 20 0 0 0 5.9 14.7l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
            </svg>
            {t.googleContinue}
          </button>
        </>
      )}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        {mode === 'login' && <button className="hov-ink" onClick={() => switchMode('forgot')} style={{ fontSize: 14, color: 'var(--ink3)' }}>{t.forgot}</button>}
        {mode === 'forgot' && <button className="hov-ink" onClick={() => switchMode('login')} style={{ fontSize: 14, color: 'var(--ink2)' }}>{t.backLogin}</button>}
        {demoMode && (
          <button className="btn btn-soft btn-sm" onClick={() => signIn({ onboarded: true, demo: true })}>
            <Icon name="bolt" size={16} />
            {t.demoEnter}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth-screen" style={{ minHeight: shellHeight, display: 'flex', flexDirection: wide ? 'row' : 'column' }}>
      <Hero compact={!wide} />
      <div style={{ flex: wide ? '0 0 min(560px, 44vw)' : 'none', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', placeItems: wide ? 'center' : 'start center', padding: wide ? 40 : '0 18px 40px' }}>
        {formBody}
      </div>
    </div>
  );
}
