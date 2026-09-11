import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PostCard } from '../components/PostCard';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { fmt, initials as toInitials } from '../lib/format';

type Tab = 'posts' | 'media' | 'reposts';

function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const { t, me, saveProfile } = useApp();
  const [form, setForm] = useState({ name: me.name, bio: me.bio, location: me.location });
  const field = {
    padding: '14px 15px',
    borderRadius: 13,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    fontSize: 15,
    outline: 'none',
  } as const;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 76,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'oklch(0.1 0 0 / 0.55)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg)',
          borderRadius: '22px 22px 0 0',
          borderTop: '1px solid var(--line)',
          padding: '16px 18px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow)',
          animation: 'fmIn .26s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2
            style={{
              margin: 0,
              flex: 1,
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {t.editProfile}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--ink3)' }}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t.name}
            style={field}
          />
          <textarea
            className="field"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder={t.bio}
            style={{ ...field, minHeight: 86, resize: 'none', borderRadius: 14, lineHeight: 1.5 }}
          />
          <input
            className="field"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder={t.location}
            style={field}
          />
        </div>
        <button
          onClick={() => {
            saveProfile(form);
            onClose();
          }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 15,
            borderRadius: 14,
            background: 'var(--accent)',
            color: 'var(--accentInk)',
            fontWeight: 600,
            fontSize: 15.5,
          }}
        >
          {t.save}
        </button>
      </div>
    </div>
  );
}

export function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, user, t, meId, userById, toggleFollow, openConversationWith } = useApp();
  const { openSheet } = useOverlays();
  const [tab, setTab] = useState<Tab>('posts');
  const [editing, setEditing] = useState(false);

  const profileId = params.id === 'me' || !params.id ? meId : params.id;
  const profile = userById(profileId);
  const isMe = profile.id === meId;
  const followed = !!user.follows[profile.id];
  const requested = !!user.requested[profile.id];
  const locked = !isMe && !!profile.isPrivate && !followed;
  const authored = data.posts.filter((p) => p.authorId === profile.id);

  const listed =
    tab === 'reposts'
      ? data.posts.filter((p) => user.reposts[p.id])
      : tab === 'media'
        ? []
        : authored.slice().sort((a, b) => b.createdAt - a.createdAt);

  const mediaTiles = authored.flatMap((post) =>
    post.media.map((m) => ({ label: m.label, hue: profile.hue, postId: post.id })),
  );

  const tabStyle = (active: boolean) =>
    ({
      flex: 1,
      padding: '14px 0',
      fontSize: 14,
      fontWeight: 600,
      color: active ? 'var(--ink)' : 'var(--ink3)',
      borderBottom: `2px solid ${active ? 'var(--ink)' : 'transparent'}`,
    }) as const;

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          height: 132,
          background: `repeating-linear-gradient(135deg, oklch(0.32 0.04 ${profile.hue}) 0 13px, oklch(0.25 0.03 ${profile.hue}) 13px 26px)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', top: 12, left: 12, right: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'oklch(0.15 0 0 / 0.4)',
            backdropFilter: 'blur(6px)',
            color: 'oklch(0.99 0 0)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon name="arrow_back" size={21} />
        </button>
        <button
          onClick={() => openSheet({ kind: 'user', id: profile.id })}
          style={{
            marginLeft: 'auto',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'oklch(0.15 0 0 / 0.4)',
            backdropFilter: 'blur(6px)',
            color: 'oklch(0.99 0 0)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon name="more_horiz" size={21} />
        </button>
      </div>

      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -38 }}>
          <span
            style={{
              width: 88,
              height: 88,
              flex: '0 0 88px',
              borderRadius: '50%',
              border: '4px solid var(--bg)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontWeight: 700,
              fontSize: 30,
              color: `oklch(0.16 0.03 ${profile.hue})`,
              background: `oklch(0.80 0.10 ${profile.hue})`,
            }}
          >
            {toInitials(profile.name)}
          </span>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 8, paddingBottom: 6 }}>
            {isMe ? (
              <>
                <button
                  className="hov-surface"
                  onClick={() => setEditing(true)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: '1px solid var(--line)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {t.editProfile}
                </button>
                <button
                  className="hov-surface"
                  onClick={() => navigate('/saved')}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: '1px solid var(--line)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink2)',
                  }}
                >
                  <Icon name="bookmark" size={20} />
                </button>
                <button
                  className="hov-surface"
                  onClick={() => navigate('/settings')}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: '1px solid var(--line)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink2)',
                  }}
                >
                  <Icon name="settings" size={20} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="hov-surface"
                  onClick={() => navigate(`/messages/dm/${openConversationWith(profile.id)}`)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: '1px solid var(--line)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink2)',
                  }}
                >
                  <Icon name="mail" size={20} />
                </button>
                <button
                  onClick={() => toggleFollow(profile.id)}
                  style={{
                    padding: '11px 22px',
                    borderRadius: 999,
                    fontSize: 14.5,
                    fontWeight: 600,
                    background: followed || requested ? 'transparent' : 'var(--accent)',
                    color: followed || requested ? 'var(--ink)' : 'var(--accentInk)',
                    border: `1px solid ${followed || requested ? 'var(--line)' : 'var(--accent)'}`,
                  }}
                >
                  {followed
                    ? t.unfollow
                    : requested
                      ? t.requested
                      : profile.isPrivate
                        ? t.requestFollow
                        : t.follow}
                </button>
              </>
            )}
          </div>
        </div>
        <h1
          style={{
            margin: '14px 0 2px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: '-0.025em',
          }}
        >
          {profile.name}
        </h1>
        <p
          style={{
            margin: 0,
            color: 'var(--ink3)',
            fontSize: 14.5,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          @{profile.username}
          {profile.isPrivate && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="lock" size={14} />
              {t.privateAccount}
            </span>
          )}
        </p>
        {!!profile.bio && (
          <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.55, textWrap: 'pretty' }}>{profile.bio}</p>
        )}
        {!!profile.location && (
          <p
            style={{
              margin: '9px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--ink3)',
              fontSize: 13.5,
            }}
          >
            <Icon name="location_on" size={17} />
            {profile.location}
          </p>
        )}
        <div style={{ display: 'flex', gap: 20, marginTop: 15 }}>
          <span style={{ fontSize: 14, color: 'var(--ink3)' }}>
            <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmt(authored.length)}</b> {t.posts}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink3)' }}>
            <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmt(profile.followers + (followed ? 1 : 0))}</b>{' '}
            {t.followers}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink3)' }}>
            <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmt(profile.following)}</b> {t.following}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'color-mix(in oklab, var(--bg) 90%, transparent)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <button onClick={() => setTab('posts')} style={tabStyle(tab === 'posts')}>
          {t.posts}
        </button>
        <button onClick={() => setTab('media')} style={tabStyle(tab === 'media')}>
          {t.media}
        </button>
        <button onClick={() => setTab('reposts')} style={tabStyle(tab === 'reposts')}>
          {t.reposts}
        </button>
      </div>

      {locked ? (
        <div style={{ padding: '70px 30px', textAlign: 'center', color: 'var(--ink3)' }}>
          <Icon name="lock" size={38} />
          <p style={{ margin: '14px 0 4px', fontSize: 15.5, fontWeight: 600, color: 'var(--ink)' }}>
            {t.privateLocked}
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>{t.privateLockedHint}</p>
        </div>
      ) : tab === 'media' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 3, padding: 3 }}>
          {mediaTiles.map((tile, i) => (
            <button
              key={i}
              onClick={() => navigate(`/post/${tile.postId}`)}
              style={{
                aspectRatio: '1/1',
                position: 'relative',
                background: `repeating-linear-gradient(135deg, oklch(0.31 0.03 ${tile.hue}) 0 9px, oklch(0.24 0.02 ${tile.hue}) 9px 18px)`,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 8,
                  fontFamily: 'ui-monospace,monospace',
                  fontSize: 9.5,
                  lineHeight: 1.4,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: `oklch(0.93 0.02 ${tile.hue})`,
                  textAlign: 'center',
                }}
              >
                {tile.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {listed.length === 0 && (
            <div style={{ padding: '70px 30px', textAlign: 'center', color: 'var(--ink3)' }}>
              <Icon name="inbox" size={38} />
              <p style={{ margin: '12px 0 0', fontSize: 14.5 }}>{t.emptyFeed}</p>
            </div>
          )}
          {listed.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </>
      )}

      {editing && <EditProfileSheet onClose={() => setEditing(false)} />}
    </div>
  );
}
