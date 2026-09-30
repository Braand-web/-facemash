import { Avatar, Icon } from '../components/Icon';
import { FollowButton, PersonRow } from '../components/ui';
import { useApp } from '../store';
import { INTERESTS } from '../data/seed';
import { initials as toInitials } from '../lib/format';
import { useLayout } from '../viewport';

export function Onboarding() {
  const { t, me, data, user, onboardingStep, onboarding, setOnboarding, advanceOnboarding, toggleInterest, meId } = useApp();
  const { shellHeight } = useLayout();
  const step = onboardingStep;
  const title = step === 1 ? t.onb1t : step === 2 ? t.onb2t : t.onb3t;
  const subtitle = step === 1 ? t.onb1s : step === 2 ? t.onb2s : t.onb3s;
  const suggested = data.users.filter((u) => u.id !== meId && !user.blocked[u.id]).slice(0, 5);
  const last = step === 3;

  return (
    <div className="auth-screen" style={{ minHeight: shellHeight, display: 'flex', flexDirection: 'column', padding: 'calc(26px + var(--safe-top)) 22px calc(28px + var(--safe-bottom))', maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 34 }}>
        {[1, 2, 3].map((i) => (
          <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= step ? 'var(--grad)' : 'var(--line-strong)', transition: 'background 300ms' }} />
        ))}
      </div>
      <h1 className="display" key={step} style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, animation: 'fmIn 400ms var(--ease-out) both' }}>{title}</h1>
      <p style={{ margin: '0 0 26px', color: 'var(--ink3)', fontSize: 15, lineHeight: 1.55 }}>{subtitle}</p>

      <div key={`b${step}`} style={{ animation: 'fmIn 400ms var(--ease-out) 60ms both' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '6px 0 26px' }}>
            <span className="ring" style={{ width: 132, height: 132 }}>
              <span className="ring__gap" style={{ padding: 4 }}>
                <Avatar hue={me.hue} initials={toInitials(me.name)} size={116} />
              </span>
            </span>
            <p style={{ margin: 0, fontWeight: 650, fontSize: 18 }}>{me.name}</p>
            <textarea className="field" value={onboarding.bio} maxLength={160} onChange={(e) => setOnboarding({ bio: e.target.value })} placeholder={t.bioPh} style={{ minHeight: 96, padding: 14, resize: 'none', lineHeight: 1.5 }} />
            <input className="field" value={onboarding.location} onChange={(e) => setOnboarding({ location: e.target.value })} placeholder={t.locPh} style={{ minHeight: 52, padding: '0 16px' }} />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingBottom: 26 }}>
            {INTERESTS.map((name) => {
              const on = user.interests.includes(name);
              return (
                <button key={name} className="chip" aria-pressed={on} onClick={() => toggleInterest(name)} style={{ minHeight: 46, padding: '0 20px', fontSize: 15 }}>
                  {on && <Icon name="check" size={16} />}
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div style={{ paddingBottom: 26, marginInline: -16 }}>
            {suggested.map((u) => <PersonRow key={u.id} userId={u.id} sub={u.bio} action={<FollowButton userId={u.id} />} />)}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary btn-lg" onClick={() => advanceOnboarding(last)} style={{ flex: 1 }}>
          {last ? t.finish : t.next}
          <Icon name="arrow_forward" size={19} />
        </button>
        <button className="btn btn-ghost btn-lg" onClick={() => advanceOnboarding(last)}>{t.skip}</button>
      </div>
    </div>
  );
}
