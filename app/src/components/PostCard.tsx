import { useNavigate } from 'react-router-dom';
import { Avatar, Icon, stripes } from './Icon';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { fmt, initials as toInitials, rel } from '../lib/format';
import { commentCount, likeCount } from '../lib/ranking';
import type { Post } from '../types';

export function usePostMeta(post: Post) {
  const { data, user, lang, t, userById, meId } = useApp();
  const author = userById(post.authorId);
  const liked = !!user.likes[post.id];
  const saved = !!user.saves[post.id];
  const reposted = !!user.reposts[post.id];
  return {
    author,
    liked,
    saved,
    reposted,
    mine: post.authorId === meId,
    initials: toInitials(author.name),
    time: rel(post.createdAt, lang),
    likes: fmt(likeCount(post)),
    comments: fmt(commentCount(data.comments, post.id)),
    reposts: fmt(post.reposts),
    shares: fmt(post.shares),
    views: fmt(post.views),
    viewsLabel: `${fmt(post.views)} ${t.views}`,
    visibilityLabel:
      post.visibility === 'public' ? t.public : post.visibility === 'followers' ? t.followersOnly : t.private,
    showFollow: post.authorId !== meId && !user.follows[post.authorId],
  };
}

export function PostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  const { t, toggleLike, toggleSave, toggleRepost, toggleFollow, meId } = useApp();
  const { openShare, openSheet } = useOverlays();
  const meta = usePostMeta(post);
  const { author } = meta;
  const openPost = () => navigate(`/post/${post.id}`);
  const openAuthor = () => navigate(`/profile/${post.authorId}`);
  const single = post.media.length === 1;
  const carousel = post.media.length > 1;

  return (
    <article
      style={{
        padding: '17px 16px 8px',
        borderBottom: '1px solid var(--line)',
        animation: 'fmIn .32s ease both',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 10 }}>
        <button onClick={openAuthor} style={{ padding: 0 }}>
          <Avatar hue={author.hue} initials={meta.initials} size={42} fontSize={14.5} />
        </button>
        <button onClick={openAuthor} style={{ flex: 1, minWidth: 0, textAlign: 'left', paddingTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{author.name}</span>
            <span style={{ fontSize: 13.5, color: 'var(--ink3)' }}>@{author.username}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>
            {meta.time} · {meta.visibilityLabel}
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {meta.showFollow && (
            <button
              className="hov-accent-fill"
              onClick={() => toggleFollow(post.authorId)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}
            >
              {t.follow}
            </button>
          )}
          <button
            className="hov-surface-ink"
            onClick={() =>
              openSheet({ kind: 'post', id: post.id, mine: post.authorId === meId, author: post.authorId })
            }
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink3)',
            }}
          >
            <Icon name="more_horiz" size={20} />
          </button>
        </div>
      </header>

      {!!post.text && (
        <p
          onClick={openPost}
          style={{
            margin: '0 0 11px',
            fontSize: 15.5,
            lineHeight: 1.55,
            textWrap: 'pretty',
            cursor: 'pointer',
          }}
        >
          {post.text}
        </p>
      )}

      {post.tags.length > 0 && (
        <p style={{ margin: '0 0 11px', fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>
          {post.tags.join(' ')}
        </p>
      )}

      {single && (
        <button
          onClick={openPost}
          style={{
            display: 'block',
            width: '100%',
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            aspectRatio: post.media[0].ratio,
            maxHeight: 520,
            background: stripes(author.hue),
            border: '1px solid var(--line)',
          }}
        >
          {post.media[0].url ? (
            post.media[0].video ? (
              <video
                src={post.media[0].url}
                controls
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img
                src={post.media[0].url}
                alt={post.media[0].label}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )
          ) : (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                padding: 20,
                textAlign: 'center',
                fontFamily: 'ui-monospace,monospace',
                fontSize: 11.5,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: `oklch(0.92 0.02 ${author.hue})`,
              }}
            >
              {post.media[0].label}
            </span>
          )}
          {post.kind === 'video' && (
            <span
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 11px',
                borderRadius: 999,
                background: 'oklch(0.15 0 0 / 0.55)',
                backdropFilter: 'blur(6px)',
                color: 'oklch(0.98 0 0)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Icon name="play_arrow" size={16} fill={1} />
              {meta.viewsLabel}
            </span>
          )}
        </button>
      )}

      {carousel && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: 4,
          }}
        >
          {post.media.map((m, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                flex: '0 0 76%',
                scrollSnapAlign: 'center',
                borderRadius: 16,
                overflow: 'hidden',
                aspectRatio: '4/5',
                maxHeight: 460,
                background: stripes(author.hue),
                border: '1px solid var(--line)',
              }}
            >
              {m.url ? (
                <img
                  src={m.url}
                  alt={m.label}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    padding: 18,
                    textAlign: 'center',
                    fontFamily: 'ui-monospace,monospace',
                    fontSize: 11.5,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: `oklch(0.92 0.02 ${author.hue})`,
                  }}
                >
                  {m.label}
                </span>
              )}
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: 'oklch(0.15 0 0 / 0.55)',
                  color: 'oklch(0.98 0 0)',
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                {i + 1}/{post.media.length}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
        <button
          className="hov-surface"
          onClick={() => toggleLike(post.id)}
          aria-pressed={meta.liked}
          aria-label={t.like}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 10px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            color: meta.liked ? 'var(--like)' : 'var(--ink3)',
          }}
        >
          <Icon name="favorite" size={21} fill={meta.liked ? 1 : 0} />
          {meta.likes}
        </button>
        <button
          className="hov-surface-ink"
          onClick={openPost}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 10px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--ink3)',
          }}
        >
          <Icon name="mode_comment" size={21} />
          {meta.comments}
        </button>
        <button
          className="hov-surface"
          onClick={() => toggleRepost(post.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 10px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            color: meta.reposted ? 'var(--accent)' : 'var(--ink3)',
          }}
        >
          <Icon name="repeat" size={21} />
          {meta.reposts}
        </button>
        <button
          className="hov-surface-ink"
          onClick={() => openShare(post.id)}
          aria-label={t.share}
          style={{
            marginLeft: 'auto',
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink3)',
          }}
        >
          <Icon name="ios_share" size={20} />
        </button>
        <button
          className="hov-surface"
          onClick={() => toggleSave(post.id)}
          aria-pressed={meta.saved}
          aria-label={t.saved}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            color: meta.saved ? 'var(--accent)' : 'var(--ink3)',
          }}
        >
          <Icon name="bookmark" size={21} fill={meta.saved ? 1 : 0} />
        </button>
      </div>
    </article>
  );
}
