import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PostCard } from '../components/PostCard';
import { PostTile } from '../components/Tile';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState, FollowButton, Segmented, UserAvatar } from '../components/ui';
import { MediaFill } from '../components/ui';
import { useApp } from '../store';
import { notificationLabel } from '../lib/i18n';
import { rel } from '../lib/format';
import type { AppNotification } from '../types';

const notificationIcons: Record<string, { icon: string; color: string }> = {
  follow_request: { icon: 'person_alert', color: 'var(--accent)' },
  follow: { icon: 'person_add', color: 'var(--accent)' },
  like: { icon: 'favorite', color: 'var(--like)' },
  comment: { icon: 'mode_comment', color: 'var(--accent)' },
  reply: { icon: 'reply', color: 'var(--accent)' },
  repost: { icon: 'repeat', color: 'var(--success)' },
  mention: { icon: 'alternate_email', color: 'var(--warning)' },
  message: { icon: 'chat_bubble', color: 'var(--accent)' },
  invite: { icon: 'group_add', color: 'var(--accent)' },
};

type Filter = 'all' | 'mentions' | 'requests';

const bucket = (createdAt: number): 'today' | 'week' | 'earlier' => {
  const age = Date.now() - createdAt;
  return age < 86400000 ? 'today' : age < 7 * 86400000 ? 'week' : 'earlier';
};

export function Notifications() {
  const navigate = useNavigate();
  const { data, t, lang, user, userById, markAllNotificationsRead, markNotificationRead, respondToFollowRequest } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () =>
      data.notifications
        .filter((n) => !user.blocked[n.userId])
        .filter((n) => (filter === 'all' ? true : filter === 'mentions' ? n.kind === 'mention' || n.kind === 'comment' || n.kind === 'reply' : n.kind === 'follow_request' || n.kind === 'follow'))
        .sort((a, b) => b.createdAt - a.createdAt),
    [data.notifications, filter, user.blocked],
  );
  const unread = data.notifications.filter((n) => !n.read).length;
  const groups: { key: 'today' | 'week' | 'earlier'; label: string; items: AppNotification[] }[] = [
    { key: 'today', label: t.today, items: [] },
    { key: 'week', label: t.thisWeek, items: [] },
    { key: 'earlier', label: t.earlier, items: [] },
  ];
  visible.forEach((n) => groups.find((g) => g.key === bucket(n.createdAt))!.items.push(n));

  const open = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.postId) navigate(`/post/${n.postId}`);
    else if (n.kind === 'message') navigate('/messages');
    else navigate(`/profile/${n.userId}`);
  };

  return (
    <>
      <ScreenHeader
        title={t.notifications}
        right={unread > 0 ? <button className="icon-btn" onClick={markAllNotificationsRead} aria-label={t.markAllRead} title={t.markAllRead} style={{ color: "var(--accent-fg)" }}><Icon name="done_all" size={22} /></button> : undefined}
      />
      <div style={{ padding: '12px 16px 4px' }}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: t.all },
            { key: 'mentions', label: t.mentions },
            { key: 'requests', label: t.followersOnly },
          ]}
        />
      </div>
      {visible.length === 0 && <EmptyState icon="notifications_off" title={t.emptyNotif} body={t.emptyNotifHint} />}
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.key}>
            <h3 className="eyebrow" style={{ margin: '18px 16px 4px' }}>{group.label}</h3>
            {group.items.map((n) => {
              const author = userById(n.userId);
              const post = n.postId ? data.posts.find((p) => p.id === n.postId) : undefined;
              const meta = notificationIcons[n.kind] ?? notificationIcons.follow;
              return (
                <div key={n.id} className={`notif row-hover${n.read ? '' : ' unread'}`} role="button" tabIndex={0} onClick={() => open(n)} onKeyDown={(e) => e.key === 'Enter' && open(n)} style={{ cursor: 'pointer' }}>
                  <span style={{ position: 'relative', flex: 'none' }}>
                    <UserAvatar userId={n.userId} size={48} onClick={() => navigate(`/profile/${n.userId}`)} />
                    <span style={{ position: 'absolute', right: -4, bottom: -4, display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--bg)', color: meta.color }}>
                      <Icon name={meta.icon} size={12} fill={1} />
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                      <b style={{ fontWeight: 650 }}>{author.name}</b>{' '}
                      <span style={{ color: 'var(--ink2)' }}>{notificationLabel(lang, n.kind, n.groupName ?? '')}</span>
                      <span style={{ color: 'var(--ink3)' }}> · {rel(n.createdAt, lang)}</span>
                    </span>
                    {!!n.text && <span style={{ display: 'block', marginTop: 3, fontSize: 13.5, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.text}</span>}
                    {n.kind === 'follow_request' && (
                      <span style={{ display: 'flex', gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                        {n.requestState && n.requestState !== 'pending' ? (
                          <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{n.requestState === 'accepted' ? t.requestAccepted : t.requestDeclined}</span>
                        ) : (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => respondToFollowRequest(n.id, true)}>{t.accept}</button>
                            <button className="btn btn-outline btn-sm" onClick={() => respondToFollowRequest(n.id, false)}>{t.decline}</button>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  {post ? (
                    <span className="tile" style={{ flex: '0 0 46px', height: 58, borderRadius: 12 }}>
                      {post.media[0] ? <MediaFill item={post.media[0]} hue={userById(post.authorId).hue} showLabel={false} /> : <span className="media-art" style={{ position: 'absolute', inset: 0, ['--h' as string]: userById(post.authorId).hue }} />}
                    </span>
                  ) : n.kind === 'follow' ? (
                    <span onClick={(e) => e.stopPropagation()}><FollowButton userId={n.userId} /></span>
                  ) : null}
                </div>
              );
            })}
          </section>
        ),
      )}
    </>
  );
}

export function Saved() {
  const { data, user, t } = useApp();
  const saved = data.posts.filter((p) => user.saves[p.id]);
  return (
    <>
      <ScreenHeader title={t.saved} right={<span title={t.savedPrivate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink3)', fontSize: 12.5, paddingRight: 8 }}><Icon name="lock" size={16} />{t.savedPrivate}</span>} />
      {saved.length === 0 ? (
        <EmptyState icon="bookmark_border" title={t.emptySaved} body={t.emptySavedHint} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: 12 }}>
          {saved.map((post) => <PostTile key={post.id} post={post} ratio="3 / 4" />)}
        </div>
      )}
    </>
  );
}

export function TagFeed() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, user, t } = useApp();
  const tag = '#' + (params.tag ?? '');
  const posts = data.posts.filter((p) => p.tags.some((x) => x.toLowerCase() === tag.toLowerCase()) && !user.blocked[p.authorId]);
  const hue = (tag.length * 47) % 360;
  return (
    <>
      <ScreenHeader title={tag} onBack={() => navigate('/explore')} />
      <div className="media-art" style={{ ['--h' as string]: hue, margin: '14px 16px', borderRadius: 26, padding: '28px 22px', color: '#fff' }}>
        <div className="display" style={{ position: 'relative', fontSize: 34, fontWeight: 800, letterSpacing: '-0.045em' }}>{tag}</div>
        <div style={{ position: 'relative', marginTop: 4, fontSize: 14, opacity: 0.9 }}>{posts.length} {t.posts.toLowerCase()}</div>
      </div>
      {posts.length === 0 ? (
        <EmptyState icon="tag" title={t.emptyFeed} />
      ) : (
        <div style={{ paddingTop: 4 }}>{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
      )}
    </>
  );
}
