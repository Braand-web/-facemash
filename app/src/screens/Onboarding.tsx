import { Avatar, Icon } from '../components/Icon';
import { useApp } from '../store';
import { INTERESTS } from '../data/seed';
import { initials as toInitials } from '../lib/format';
import { useLayout } from '../viewport';

export function Onboarding() {
  const {
    t,
    lang,
    me,
    data,
    user,
    onboardingStep,
    onboarding,
    setOnboarding,
    advanceOnboarding,
    toggleInterest,
    toggleFollow,
    showToast,
    meId,
  } = useApp();
  const { shellHeight } = useLayout();

  const title = onboardingStep === 1 ? t.onb1t : onboardingStep === 2 ? t.onb2t : t.onb3t;
  const subtitle = onboardingStep === 1 ? t.onb1s : onboardingStep === 2 ? t.onb2s : t.onb3s;
  const suggested = data.users
    .filter((u) => u.id !== meId && !user.follows[u.id] && !user.blocked[u.id])
    .slice(0, 4);

  return (
    <div
      style={{
        minHeight: shellHeight,
        display: 'flex',
        flexDirection: 'column',
        padding: '26px 20px 30px',
        maxWidth: 560,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 30 }}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= onboardingStep ? 'var(--accent)' : 'var(--line)',
              display: 'block',
            }}
          />
        ))}
      </div>
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: "'Bricolage Grotesque',sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.025em',
        }}
      >
        {title}
      </h1>
      <p style={{ margin: '0 0 26px', color: 'var(--ink3)', fontSize: 14.5, lineHeight: 1.55 }}>{subtitle}</p>

      {onboardingStep === 1 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            padding: '18px 0 26px',
          }}
        >
          <button
            onClick={() =>
              showToast(
                lang === 'fr'
                  ? 'Sélecteur de photo — à brancher au stockage'
                  : 'Photo picker — to wire to storage',
              )
            }
            style={{
              width: 118,
              height: 118,
              borderRadius: '50%',
              background: 'oklch(0.78 0.10 265)',
              color: 'oklch(0.16 0.03 265)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 38,
              fontWeight: 700,
              position: 'relative',
            }}
          >
            {toInitials(me.name)}
            <span
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--accentInk)',
                display: 'grid',
                placeItems: 'center',
                border: '3px solid var(--bg)',
              }}
            >
              <Icon name="photo_camera" size={20} />
            </span>
          </button>
          <textarea
            className="field"
            value={onboarding.bio}
            onChange={(e) => setOnboarding({ bio: e.target.value })}
            placeholder={t.bioPh}
            style={{
              width: '100%',
              minHeight: 86,
              resize: 'none',
              padding: '14px 15px',
              borderRadius: 14,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: 15,
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
          <input
            className="field"
            value={onboarding.location}
            onChange={(e) => setOnboarding({ location: e.target.value })}
            placeholder={t.locPh}
            style={{
              width: '100%',
              padding: '14px 15px',
              borderRadius: 13,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>
      )}

      {onboardingStep === 2 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, paddingBottom: 26 }}>
          {INTERESTS.map((name) => {
            const on = user.interests.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleInterest(name)}
                style={{
                  padding: '11px 16px',
                  borderRadius: 999,
                  fontSize: 14.5,
                  fontWeight: 500,
                  background: on ? 'var(--accent)' : 'var(--surface)',
                  color: on ? 'var(--accentInk)' : 'var(--ink2)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                  transition: 'all .15s ease',
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {onboardingStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 26 }}>
          {suggested.map((u) => {
            const followed = !!user.follows[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0' }}>
                <Avatar hue={u.hue} initials={toInitials(u.name)} size={46} fontSize={15} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--ink3)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {u.bio}
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(u.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    fontSize: 13.5,
                    fontWeight: 600,
                    background: followed ? 'transparent' : 'var(--accent)',
                    color: followed ? 'var(--ink2)' : 'var(--accentInk)',
                    border: `1px solid ${followed ? 'var(--line)' : 'var(--accent)'}`,
                  }}
                >
                  {followed ? t.unfollow : t.follow}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => advanceOnboarding(onboardingStep === 3)}
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 14,
            background: 'var(--accent)',
            color: 'var(--accentInk)',
            fontWeight: 600,
            fontSize: 15.5,
          }}
        >
          {onboardingStep === 3 ? t.finish : t.next}
        </button>
        <button
          onClick={() => advanceOnboarding(onboardingStep === 3)}
          style={{ padding: '15px 8px', color: 'var(--ink3)', fontSize: 14.5 }}
        >
          {t.skip}
        </button>
      </div>
    </div>
  );
}
