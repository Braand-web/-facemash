import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useApp } from '../store';
import { inviteUrl } from '../lib/invites.mjs';
import { copyText, shareLink } from '../lib/share';
import { remote } from '../data/remote';

export function InviteTools({ counts = false }: { counts?: boolean }) {
  const { t, showToast } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<{ registered: number; onboarded: number } | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([remote.myInviteCode(), counts ? remote.myReferralCounts() : Promise.resolve(null)])
      .then(([code, totals]) => {
        if (!active) return;
        setUrl(code ? inviteUrl(code, window.location.origin) : null);
        if (totals) setReferrals(totals);
      });
    return () => { active = false; };
  }, [counts]);

  const copy = async () => {
    if (!url) return;
    showToast(await copyText(url) ? t.copied : t.copyFailed);
  };

  const share = async () => {
    if (!url) return;
    const result = await shareLink({ title: 'Facemash', text: t.inviteShareText, url });
    if (result === 'shared') showToast(t.inviteShared);
    else if (result === 'copied') showToast(t.copied);
    else if (result === 'failed') showToast(t.copyFailed);
  };

  return (
    <div className="card" style={{ margin: '0 16px 22px', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, flex: 'none', borderRadius: 14, color: 'var(--accent-fg)', background: 'var(--accentSofter)' }}>
          <Icon name="ios_share" size={21} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: '1px 0 5px', fontSize: 16, fontWeight: 700 }}>{t.inviteTitle}</h2>
          <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 13, lineHeight: 1.5 }}>{t.inviteHint}</p>
        </div>
      </div>
      {counts && referrals && (
        <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 14, background: 'var(--surface2)' }}>
            <strong style={{ display: 'block', fontSize: 19 }}>{referrals.registered}</strong>
            <span style={{ color: 'var(--ink3)', fontSize: 11.5 }}>{t.inviteRegistered}</span>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 14, background: 'var(--surface2)' }}>
            <strong style={{ display: 'block', fontSize: 19 }}>{referrals.onboarded}</strong>
            <span style={{ color: 'var(--ink3)', fontSize: 11.5 }}>{t.inviteOnboarded}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
        <button className="btn btn-primary btn-sm" onClick={() => void share()} disabled={!url}>
          <Icon name="ios_share" size={16} /> {t.inviteShare}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => void copy()} disabled={!url}>
          <Icon name="content_copy" size={16} /> {t.inviteCopy}
        </button>
      </div>
    </div>
  );
}
