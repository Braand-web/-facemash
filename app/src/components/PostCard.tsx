import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { ClampText, FollowButton, MediaFill, RichText, UserAvatar } from './ui';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { useDoubleTap } from '../lib/gestures';
import { haptic } from '../lib/haptics';
import { fmt, initials as toInitials, rel } from '../lib/format';
import { commentCount, likeCount } from '../lib/ranking';
import type { Post } from '../types';

export function usePostMeta(post: Post) {
  const { data, user, lang, t, userById, meId } = useApp();
  const author = userById(post.authorId);
  const liked = !!user.likes[post.id];
  const saved = !!user.saves[post.id];
  const reposted = !!user.reposts[post.id];
  const total = commentCount(data.comments, post.id);
  return {
    author,
    liked,
    saved,
    reposted,
    mine: post.authorId === meId,
    initials: toInitials(author.name),
    time: rel(post.createdAt, lang),
    likes: fmt(likeCount(post)),
    comments: fmt(total),
    commentTotal: total,
    reposts: fmt(post.reposts),
    shares: fmt(post.shares),
    views: fmt(post.views),
    viewsLabel: `${fmt(post.views)} ${t.views}`,
    visibilityLabel:
      post.visibility === 'public' ? t.public : post.visibility === 'followers' ? t.followersOnly : t.private,
    visibilityIcon: post.visibility === 'public' ? 'public' : post.visibility === 'followers' ? 'group' : 'lock',
    showFollow: post.authorId !== meId && !user.follows[post.authorId],
  };
}

/** Feed media keeps to a friendly range: nothing taller than 4:5, nothing wider than ~1.9:1. */
const feedRatio = (ratio: string): string => {
  const [a, b] = ratio.split('/').map((n) => Number(n.trim()));
  if (!a || !b) return '4 / 5';
  const value = a / b;
  if (value < 0.8) return '4 / 5';
  if (value > 1.91) return '1.91 / 1';
  return `${a} / ${b}`;
};

export function PostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  const { t, data, toggleLike, toggleSave, toggleRepost, meId, user } = useApp();
  const { openShare, openSheet, openComments } = useOverlays();
  const meta = usePostMeta(post);
  const { author } = meta;
  const [burst, setBurst] = useState<{ key: number; x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(true);
  const [slide, setSlide] = useState(0);
  const strip = useRef<HTMLDivElement | null>(null);
  const openPost = () => navigate(`/post/${post.id}`);
  const openAuthor = () => navigate(`/profile/${post.authorId}`);
  const carousel = post.media.length > 1;
  const first = data.comments[post.id]?.[0];

  const onMediaClick = useDoubleTap(openPost, (x, y) => {
    if (!user.likes[post.id]) toggleLike(post.id);
    haptic('success');
    setBurst({ key: Date.now(), x, y });
  });

  const like = () => {
    haptic(meta.liked ? 'tick' : 'light');
    toggleLike(post.id);
  };

  const renderMedia = (index: number, ratio: string) => {
    const item = post.media[index];
    const isVideo = post.kind === 'video' || !!item.video;
    return (
      <div
        key={index}
        className="post__media"
        role="button"
        tabIndex={0}
        aria-label={item.label}
        onClick={onMediaClick}
        onKeyDown={(e) => e.key === 'Enter' && openPost()}
        style={{ aspectRatio: feedRatio(ratio), maxHeight: 580, cursor: 'pointer' }}
      >
        <MediaFill item={item} hue={author.hue} autoplay muted={muted} />
        {isVideo && !item.url && (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              display: 'grid',
              placeItems: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgb(10 10 18 / 42%)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              transform: 'translate(-50%,-50%)',
            }}
          >
            <Icon name="play_arrow" size={30} fill={1} />
          </span>
        )}
        {isVideo && (
          <span className="pill" style={{ position: 'absolute', left: 12, bottom: 12 }}>
            <Icon name="play_arrow" size={14} fill={1} />
            {meta.viewsLabel}
          </span>
        )}
        {isVideo && item.url && (
          <button
            className="icon-btn icon-btn--glass"
            aria-label={muted ? t.unmute : t.mute}
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            style={{ position: 'absolute', right: 10, bottom: 10, width: 36, height: 36 }}
          >
            <Icon name={muted ? 'volume_off' : 'volume_up'} size={18} />
          </button>
        )}
        {carousel && (
          <span className="pill" style={{ position: 'absolute', right: 12, top: 12 }}>
            {index + 1}/{post.media.length}
          </span>
        )}
        {burst && index === (carousel ? slide : 0) && (
          <span key={burst.key} className="burst" style={{ left: burst.x, top: burst.y }}>
            <Icon name="favorite" size={104} fill={1} color="#fff" />
          </span>
        )}
      </div>
    );
  };

  return (
    <article className="post">
      <header className="post__head">
        <UserAvatar userId={post.authorId} size={46} onClick={openAuthor} />
        <button className="post__author" onClick={openAuthor}>
          <span className="post__name">{author.name}</span>
          <span className="post__meta">
            @{author.username} · {meta.time}{' '}
            <Icon name={meta.visibilityIcon} size={12} style={{ display: 'inline', verticalAlign: '-1px' }} />
          </span>
        </button>
        {meta.showFollow && <FollowButton userId={post.authorId} />}
        <button
          className="icon-btn"
          aria-label={t.more}
          onClick={() => openSheet({ kind: 'post', id: post.id, mine: post.authorId === meId, author: post.authorId })}
          style={{ width: 36, height: 36 }}
        >
          <Icon name="more_horiz" size={22} />
        </button>
      </header>

      {!!post.text && <ClampText text={post.text} onOpen={openPost} />}

      {(post.tags.length > 0 || post.location) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', margin: '-4px 0 12px', fontSize: 14, fontWeight: 550 }}>
          {post.tags.map((tag) => (
            <button key={tag} className="rich" onClick={() => navigate(`/tag/${encodeURIComponent(tag.replace('#', ''))}`)}>
              <span className="link">{tag}</span>
            </button>
          ))}
          {post.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ink3)' }}>
              <Icon name="location_on" size={15} />
              {post.location}
            </span>
          )}
        </div>
      )}

      {post.media.length === 1 && renderMedia(0, post.media[0].ratio)}

      {carousel && (
        <>
          <div
            ref={strip}
            className="carousel"
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
            }}
          >
            {post.media.map((m, i) => renderMedia(i, m.ratio))}
          </div>
          <div className="dots" aria-hidden="true">
            {post.media.map((_, i) => (
              <i key={i} className={i === slide ? 'on' : ''} />
            ))}
          </div>
        </>
      )}

      <div className="actions">
        <button className={`act act--like${meta.liked ? ' on' : ''}`} onClick={like} aria-pressed={meta.liked} aria-label={t.like}>
          <Icon name="favorite" size={23} fill={meta.liked ? 1 : 0} />
          {meta.likes}
        </button>
        <button className="act" onClick={() => openComments(post.id)} aria-label={t.comments}>
          <Icon name="mode_comment" size={22} />
          {meta.comments}
        </button>
        <button
          className={`act act--repost${meta.reposted ? ' on' : ''}`}
          onClick={() => {
            haptic('light');
            toggleRepost(post.id);
          }}
          aria-pressed={meta.reposted}
          aria-label={t.repost}
        >
          <Icon name="repeat" size={22} />
          {meta.reposts}
        </button>
        <button className="act" onClick={() => openShare(post.id)} aria-label={t.share}>
          <Icon name="send" size={21} />
        </button>
        <button
          className={`act act--save${meta.saved ? ' on' : ''}`}
          onClick={() => {
            haptic('light');
            toggleSave(post.id);
          }}
          aria-pressed={meta.saved}
          aria-label={t.saved}
          style={{ marginLeft: 'auto' }}
        >
          <Icon name="bookmark" size={22} fill={meta.saved ? 1 : 0} />
        </button>
      </div>

      {first && (
        <button
          onClick={() => openComments(post.id)}
          style={{ display: 'block', width: '100%', padding: '2px 4px 8px', textAlign: 'left', fontSize: 14, lineHeight: 1.5 }}
        >
          <b style={{ fontWeight: 650 }}>{data.users.find((u) => u.id === first.userId)?.username ?? ''}</b>{' '}
          <span style={{ color: 'var(--ink2)' }}>
            <RichText text={first.text.length > 90 ? `${first.text.slice(0, 90)}…` : first.text} />
          </span>
          {meta.commentTotal > 1 && (
            <span style={{ display: 'block', marginTop: 2, color: 'var(--ink3)', fontSize: 13 }}>
              {t.viewAllComments.replace('{n}', String(meta.commentTotal))}
            </span>
          )}
        </button>
      )}
    </article>
  );
}
