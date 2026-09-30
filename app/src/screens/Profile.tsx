import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { EmptyState, FollowButton, Sheet, UnderlineTabs, UserAvatar } from '../components/ui';
import { PostCard } from '../components/PostCard';
import { PostTile } from '../components/Tile';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { profileUrl, shareLink } from '../lib/share';
import { fmt } from '../lib/format';

type Tab = 'posts' | 'media' | 'reposts' | 'likes';

function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const { t, me, saveProfile } = useApp();
  const [form, setForm] = useState({ name: me.name, bio: me.bio, location: me.location });
  return (
    <Sheet onClose={onClose} label={t.editProfile} title={t.editProfile} z={76}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t.name}</span>
          <input className="field" value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ minHeight: 50, padding: '0 16px' }} />
        </label>
        <label>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t.bio}</span>
          <textarea className="field" value={form.bio} maxLength={160} onChange={(e) => setForm({ ...form, bio: e.target.value })} style={{ minHeight: 96, padding: 14, resize: 'none', lineHeight: 1.5 }} />
          <span style={{ display: 'block', textAlign: 'right', fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>{form.bio.length}/160</span>
        </label>
        <label>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t.location}</span>
          <input className="field" value={form.location} maxLength={60} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ minHeight: 50, padding: '0 16px' }} />
        </label>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => { saveProfile(form); onClose(); }} style={{ marginTop: 6 }}>
          {t.save}
        </button>
      </div>
    </Sheet>
  );
}

export function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, user, t, meId, userById, openConversationWith, showToast } = useApp();
  const { openSheet } = useOverlays();
  const [tab, setTab] = useState<Tab>('posts');
  const [editing, setEditing] = useState(false);

  const profileId = params.id === 'me' || !params.id ? meId : params.id;
  const profile = userById(profileId);
  const isMe = profile.id === meId;
  const followed = !!user.follows[profile.id];
  const locked = !isMe && !!profile.isPrivate && !followed;
  const blocked = !isMe && !!user.blocked[profile.id];
  const authored = data.posts.filter((p) => p.authorId === profile.id && (isMe || p.visibility !== 'private'));
  const sorted = authored.slice().sort((a, b) => b.createdAt - a.createdAt);
  const mediaPosts = sorted.filter((p) => p.media.length > 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: t.posts },
    { key: 'media', label: t.media },
    { key: 'reposts', label: t.reposts },
    ...(isMe ? [{ key: 'likes' as const, label: t.likes }] : []),
  ];
  const current: Tab = tabs.some((x) => x.key === tab) ? tab : 'posts';
  const list =
    current === 'reposts' ? data.posts.filter((p) => user.reposts[p.id] && isMe)
      : current === 'likes' ? data.posts.filter((p) => user.likes[p.id])
        : sorted;

  const share = async () => {
    const result = await shareLink({ title: profile.name, text: `${profile.name} (@${profile.username}) · Facemash`, url: profileUrl(profile.id) });
    if (result === 'copied') showToast(t.copied);
  };

  const round = { width: 44, minHeight: 44, padding: 0 } as const;

  if (blocked) {
    return (
      <>
        <div className="topbar"><button className="icon-btn" onClick={() => navigate(-1)} aria-label="Retour"><Icon name="arrow_back" size={22} /></button></div>
        <EmptyState icon="block" title={t.blocked} body={profile.name} action={<button className="btn btn-outline" onClick={() => openSheet({ kind: 'user', id: profile.id })}>{t.more}</button>} />
      </>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="media-art" style={{ height: 168, ['--h' as string]: profile.hue }} />
      <div style={{ position: 'absolute', top: 'calc(10px + var(--safe-top))', left: 12, right: 12, display: 'flex', gap: 8 }}>
        <button className="icon-btn icon-btn--glass" onClick={() => navigate(-1)} aria-label="Retour"><Icon name="arrow_back" size={21} /></button>
        <span style={{ flex: 1 }} />
        <button className="icon-btn icon-btn--glass" onClick={() => void share()} aria-label={t.share}><Icon name="share_network" size={20} /></button>
        {!isMe && <button className="icon-btn icon-btn--glass" onClick={() => openSheet({ kind: 'user', id: profile.id })} aria-label={t.more}><Icon name="more_horiz" size={21} /></button>}
        {isMe && <button className="icon-btn icon-btn--glass" onClick={() => navigate('/settings')} aria-label={t.settings}><Icon name="settings" size={20} /></button>}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -44 }}>
          <span style={{ display: 'grid', padding: 4, borderRadius: '50%', background: 'var(--bg)' }}>
            <UserAvatar userId={profile.id} size={92} />
          </span>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 8, paddingBottom: 4 }}>
            {isMe ? (
              <>
                <button className="btn btn-outline" onClick={() => setEditing(true)}>{t.editProfile}</button>
                <button className="btn btn-outline" onClick={() => navigate('/saved')} aria-label={t.saved} style={round}><Icon name="bookmark" size={20} /></button>
              </>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => navigate(`/messages/dm/${openConversationWith(profile.id)}`)} aria-label={t.message} style={round}><Icon name="chat_bubble" size={20} /></button>
                <FollowButton userId={profile.id} size="md" />
              </>
            )}
          </div>
        </div>

        <h1 className="display" style={{ margin: '14px 0 2px', fontSize: 27, fontWeight: 800, letterSpacing: '-0.04em' }}>{profile.name}</h1>
        <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          @{profile.username}
          {profile.isPrivate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="lock" size={14} />{t.privateAccount}</span>}
        </p>
        {!!profile.bio && <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.55 }}>{profile.bio}</p>}
        {!!profile.location && (
          <p style={{ margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink3)', fontSize: 13.5 }}>
            <Icon name="location_on" size={16} />
            {profile.location}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 18 }}>
          {[
            { v: authored.length, l: t.posts },
            { v: profile.followers + (followed && !isMe ? 1 : 0), l: t.followers },
            { v: profile.following, l: t.following },
          ].map((s) => (
            <div key={s.l} className="card" style={{ padding: '12px 8px', textAlign: 'center', borderRadius: 20 }}>
              <div className="display" style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.04em' }}>{fmt(s.v)}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 550 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <UnderlineTabs options={tabs} value={current} onChange={setTab} sticky={0} />

      {locked ? (
        <EmptyState icon="lock" title={t.privateLocked} body={t.privateLockedHint} />
      ) : current === 'media' ? (
        mediaPosts.length === 0 ? <EmptyState icon="image" title={t.emptyFeed} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4 }}>
            {mediaPosts.map((p) => <PostTile key={p.id} post={p} ratio="1 / 1" />)}
          </div>
        )
      ) : list.length === 0 ? (
        <EmptyState icon={current === 'likes' ? 'favorite' : 'inbox'} title={t.emptyFeed} body={isMe && current === 'posts' ? t.firstPostHint : undefined} />
      ) : (
        <div style={{ paddingTop: 14 }}>{list.map((post) => <PostCard key={post.id} post={post} />)}</div>
      )}

      {editing && <EditProfileSheet onClose={() => setEditing(false)} />}
    </div>
  );
}
