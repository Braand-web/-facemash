import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useApp } from '../store';
import { supabase } from '../lib/supabase';
import { useLayout } from '../viewport';

type Mode = 'login' | 'signup' | 'forgot';

const fieldStyle = {
  padding: '14px 15px',
  borderRadius: 13,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  fontSize: 15,
  outline: 'none',
} as const;

export function Auth() {
  const { t, lang, signIn, data } = useApp();
  const { shellHeight } = useLayout();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const title = done ? t.linkSent : mode === 'signup' ? t.authS : mode === 'forgot' ? t.authF : t.authL;
  const subtitle = done ? '' : mode === 'signup' ? t.authSs : mode === 'forgot' ? t.authFs : t.authLs;
  const cta = mode === 'signup' ? t.signup : mode === 'forgot' ? t.sendLink : t.login;
  const swap = mode === 'signup' ? t.haveAccount : mode === 'forgot' ? t.backLogin : t.noAccount;

  const submit = async () => {
    if (mode === 'forgot') {
      if (!form.email) {
        setError(t.email);
        return;
      }
      if (supabase) await supabase.auth.resetPasswordForEmail(form.email);
      setDone(true);
      setError('');
      return;
    }
    if (mode === 'signup') {
      if (!form.name || !form.username || !form.email || !form.password) {
        setError(lang === 'fr' ? 'Tous les champs sont requis.' : 'All fields are required.');
        return;
      }
      if (data.users.some((u) => u.username === form.username)) {
        setError(lang === 'fr' ? 'Cet identifiant est déjà pris.' : 'That username is taken.');
        return;
      }
    } else if (!form.email || !form.password) {
      setError(lang === 'fr' ? 'E-mail et mot de passe requis.' : 'Email and password required.');
      return;
    }
    setBusy(true);
    setError('');
    if (supabase) {
      const result =
        mode === 'signup'
          ? await supabase.auth.signUp({
              email: form.email,
              password: form.password,
              options: { data: { name: form.name, username: form.username } },
            })
          : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      setBusy(false);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      signIn({ onboarded: mode !== 'signup', authId: result.data.user?.id });
      return;
    }
    window.setTimeout(() => {
      setBusy(false);
      signIn({ onboarded: mode !== 'signup', demo: true });
    }, 600);
  };

  return (
    <div style={{ minHeight: shellHeight, display: 'grid', placeItems: 'center', padding: '28px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fmIn .5s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 34 }}>
          <span
            style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontWeight: 800,
              fontSize: 34,
              letterSpacing: '-0.035em',
            }}
          >
            facemash
          </span>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />
        </div>
        <h1
          style={{
            margin: '0 0 8px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p style={{ margin: '0 0 28px', color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.55 }}>{subtitle}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {mode === 'signup' && (
            <>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t.name}
                style={fieldStyle}
              />
              <input
                className="field"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value.replace(/\s/g, '').toLowerCase() })
                }
                placeholder={t.username}
                style={fieldStyle}
              />
            </>
          )}
          {!done && (
            <input
              className="field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t.email}
              style={fieldStyle}
            />
          )}
          {mode !== 'forgot' && !done && (
            <input
              className="field"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t.password}
              style={fieldStyle}
            />
          )}
        </div>
        {!!error && <p style={{ margin: '12px 0 0', color: 'var(--like)', fontSize: 13.5 }}>{error}</p>}
        <button
          onClick={submit}
          style={{
            marginTop: 20,
            width: '100%',
            padding: 15,
            borderRadius: 14,
            background: 'var(--accent)',
            color: 'var(--accentInk)',
            fontWeight: 600,
            fontSize: 15.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
          }}
        >
          {busy && (
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: '50%',
                border: '2px solid color-mix(in oklab, var(--accentInk) 35%, transparent)',
                borderTopColor: 'var(--accentInk)',
                animation: 'fmSpin .7s linear infinite',
                display: 'block',
              }}
            />
          )}
          {cta}
        </button>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <button
            className="hov-ink"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError('');
              setDone(false);
            }}
            style={{ fontSize: 14, color: 'var(--ink2)' }}
          >
            {swap}
          </button>
          {mode === 'login' && (
            <button
              className="hov-ink"
              onClick={() => {
                setMode('forgot');
                setError('');
                setDone(false);
              }}
              style={{ fontSize: 14, color: 'var(--ink3)' }}
            >
              {t.forgot}
            </button>
          )}
          <button
            onClick={() => signIn({ onboarded: true, demo: true })}
            style={{ fontSize: 13.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="bolt" size={17} />
            {t.demoEnter}
          </button>
        </div>
      </div>
    </div>
  );
}
