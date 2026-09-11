import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PostCard } from '../components/PostCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useApp } from '../store';
import { notificationLabel } from '../lib/i18n';
import { initials as toInitials, rel } from '../lib/format';

const notificationIcons: Record<string, string> = {
  follow: 'person_add',
  like: 'favorite',
  comment: 'mode_comment',
  reply: 'reply',
  repost: 'repeat',
  mention: 'alternate_email',
  message: 'chat_bubble',
  invite: 'group_add',
};

export function Notifications() {
  const navigate = useNavigate();
  const { data, t, lang, userById, markAllNotificationsRead, markNotificationRead } = useApp();

  return (
    <>
      <ScreenHeader
        title={t.notifications}
        right={
          <button
            onClick={markAllNotificationsRead}
            style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}
          >
            {t.markAllRead}
          </button>
        }
      />
      {data.notifications.length === 0 && (
        <div style={{ padding: '80px 30px', textAlign: 'center', color: 'var(--ink3)' }}>
          <Icon name="notifications_off" size={40} />
          <p style={{ margin: '14px 0 0', fontSize: 15 }}>{t.emptyNotif}</p>
        </div>
      )}
      {data.notifications.map((n) => {
        const author = userById(n.userId);
        return (
          <button
            key={n.id}
            className="hov-surface"
            onClick={() => {
              markNotificationRead(n.id);
              if (n.postId) navigate(`/post/${n.postId}`);
              else if (n.kind === 'message') navigate('/messages');
              else navigate(`/profile/${n.userId}`);
            }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              width: '100%',
              textAlign: 'left',
              background: n.read ? 'transparent' : 'color-mix(in oklab, var(--accent) 8%, transparent)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span
              style={{
                position: 'relative',
                width: 44,
                height: 44,
                flex: '0 0 44px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
                fontSize: 14.5,
                color: `oklch(0.16 0.03 ${author.hue})`,
                background: `oklch(0.78 0.10 ${author.hue})`,
              }}
            >
              {toInitials(author.name)}
              <span
                style={{
                  position: 'absolute',
                  right: -3,
                  bottom: -3,
                  width: 21,
                  height: 21,
                  borderRadius: '50%',
                  background: 'var(--surface2)',
                  border: '2px solid var(--bg)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name={notificationIcons[n.kind]} size={12} fill={1} color="var(--accent)" />
              </span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>
                <b style={{ fontWeight: 600 }}>{author.name}</b>{' '}
                <span style={{ color: 'var(--ink2)' }}>
                  {notificationLabel(lang, n.kind, n.groupName ?? '')}
                </span>
              </span>
              {!!n.text && (
                <span style={{ display: 'block', marginTop: 3, fontSize: 13.5, color: 'var(--ink3)' }}>
                  {n.text}
                </span>
              )}
              <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--ink3)' }}>
                {rel(n.createdAt, lang)}
              </span>
            </span>
            {!n.read && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  marginTop: 8,
                  display: 'block',
                }}
              />
            )}
          </button>
        );
      })}
    </>
  );
}

export function Saved() {
  const { data, user, t } = useApp();
  const saved = data.posts.filter((p) => user.saves[p.id]);

  return (
    <>
      <ScreenHeader title={t.saved} right={<Icon name="lock" size={20} color="var(--ink3)" />} />
      {saved.length === 0 && (
        <div style={{ padding: '80px 30px', textAlign: 'center', color: 'var(--ink3)' }}>
          <Icon name="bookmark_border" size={40} />
          <p style={{ margin: '14px 0 0', fontSize: 15 }}>{t.emptySaved}</p>
        </div>
      )}
      {saved.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}

export function TagFeed() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, t } = useApp();
  const tag = '#' + (params.tag ?? '');
  const posts = data.posts.filter((p) => p.tags.includes(tag));

  return (
    <>
      <ScreenHeader title={tag} onBack={() => navigate('/explore')} />
      {posts.length === 0 && (
        <div style={{ padding: '80px 30px', textAlign: 'center', color: 'var(--ink3)' }}>
          <Icon name="tag" size={40} />
          <p style={{ margin: '14px 0 0', fontSize: 15 }}>{t.emptyFeed}</p>
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}
