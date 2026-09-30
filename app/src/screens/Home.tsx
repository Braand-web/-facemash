import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { FollowButton, MediaFill, RichText, Segmented, UserAvatar, EmptyState, Brand } from '../components/ui';
import { PostCard, usePostMeta } from '../components/PostCard';
import { PullToRefresh } from '../components/PullToRefresh';
import { FeedSkeleton } from '../components/Skeletons';
import { StoryRail } from '../components/Stories';
import { SCROLL_TOP_EVENT, useSuggested } from '../components/Shell';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { useLayout } from '../viewport';
import { useDoubleTap } from '../lib/gestures';
import { haptic } from '../lib/haptics';
import { usePrefs } from '../lib/prefs';
import { rankedPosts } from '../lib/ranking';
import { fmt } from '../lib/format';
import type { Post } from '../types';

/** Thin progress line: follows a real video's clock, or simulates one for still media. */
function ReelProgress({ active, paused, video }: { active: boolean; paused: boolean; video: HTMLVideoElement | null }) {
  const bar = useRef<HTMLElement | null>(null);
  const clock = useRef(0);

  useEffect(() => {
    clock.current = 0;
    if (bar.current) bar.current.style.transform = 'scaleX(0)';
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let p: number;
      if (video && video.duration) p = video.currentTime / video.duration;
      else {
        if (!paused) clock.current += dt / 12000;
        if (clock.current > 1) clock.current = 0;
        p = clock.current;
      }
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, video]);

  return (
    <div className="reel__progress" aria-hidden="true">
      <i ref={(el) => { bar.current = el; }} style={{ transformOrigin: 'left', transform: 'scaleX(0)' }} />
    </div>
  );
}

function ReelItem({ post, active, muted }: { post: Post; active: boolean; muted: boolean }) {
  const navigate = useNavigate();
  const { t, toggleLike, toggleSave, toggleRepost, meId, user } = useApp();
  const { openShare, openComments, openSheet } = useOverlays();
  const { autoplay } = usePrefs();
  const meta = usePostMeta(post);
  const { author } = meta;
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<number>(0);
  const [burst, setBurst] = useState<{ key: number; x: number; y: number } | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [open, setOpen] = useState(false);
  const textOnly = post.media.length === 0;
  const media = post.media[0];

  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);

  useEffect(() => {
    if (!video) return;
    if (active && !paused && autoplay) void video.play().catch(() => {});
    else video.pause();
  }, [video, active, paused, autoplay]);

  const onTap = useDoubleTap(
    () => {
      setPaused((p) => !p);
      setFlash(Date.now());
    },
    (x, y) => {
      if (!user.likes[post.id]) toggleLike(post.id);
      haptic('success');
      setBurst({ key: Date.now(), x, y });
    },
  );

  const like = () => {
    haptic(meta.liked ? 'tick' : 'light');
    toggleLike(post.id);
  };

  return (
    <section className="reel" aria-label={`${author.name} — ${post.text.slice(0, 60)}`}>
      <div className="media-art" style={{ position: 'absolute', inset: 0, ['--h' as string]: author.hue }} />
      {!textOnly && media?.url && !media.video && <img src={media.url} alt={media.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />}
      {!textOnly && media?.url && media.video && (
        <video ref={setVideo} src={media.url} muted={muted} loop playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {!textOnly && !media?.url && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <MediaFill item={media} hue={author.hue} showLabel={false} />
        </div>
      )}
      {textOnly && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '14% 10%', pointerEvents: 'none' }}>
          <p className="display" style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(26px, 6vw, 40px)', fontWeight: 800, lineHeight: 1.12, textShadow: '0 2px 24px rgb(0 0 0 / 35%)' }}>
            {post.text}
          </p>
        </div>
      )}
      <div className="reel__scrim" />

      <button aria-label={t.playPause} onClick={onTap} style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'pointer' }} />
      {active && paused && flash > 0 && (
        <span key={flash} className="reel__flash">
          <Icon name="play_arrow" size={40} fill={1} />
        </span>
      )}
      {burst && (
        <span key={burst.key} className="burst" style={{ left: burst.x, top: burst.y }}>
          <Icon name="favorite" size={110} fill={1} color="#fff" />
        </span>
      )}

      <div className="reel__caption">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(`/profile/${post.authorId}`)} style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em' }}>
            @{author.username}
          </button>
          <span style={{ fontSize: 12.5, opacity: 0.75 }}>{meta.time}</span>
        </div>
        {!textOnly && !!post.text && (
          <p onClick={() => setOpen((v) => !v)} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.45, cursor: 'pointer', ...(open ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
            <RichText text={post.text} />
          </p>
        )}
        {(post.tags.length > 0 || post.location) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {post.tags.slice(0, 3).map((tag) => (
              <button key={tag} className="tag-chip" onClick={() => navigate(`/tag/${encodeURIComponent(tag.replace('#', ''))}`)}>
                {tag}
              </button>
            ))}
            {post.location && (
              <span className="tag-chip" style={{ gap: 4 }}>
                <Icon name="location_on" size={14} />
                {post.location}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="reel__rail">
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <span style={{ display: 'grid', padding: 2, borderRadius: '50%', background: '#fff' }}>
            <UserAvatar userId={post.authorId} size={50} onClick={() => navigate(`/profile/${post.authorId}`)} />
          </span>
          {meta.showFollow && (
            <span style={{ position: 'absolute', left: '50%', bottom: -10, transform: 'translateX(-50%)' }}>
              <FollowIcon userId={post.authorId} />
            </span>
          )}
        </div>
        <button className={`reel__action like${meta.liked ? ' on' : ''}`} onClick={like} aria-pressed={meta.liked} aria-label={t.like}>
          <span className="disc"><Icon name="favorite" size={26} fill={meta.liked ? 1 : 0} /></span>
          {meta.likes}
        </button>
        <button className="reel__action" onClick={() => openComments(post.id)} aria-label={t.comments}>
          <span className="disc"><Icon name="mode_comment" size={25} fill={1} /></span>
          {meta.comments}
        </button>
        <button className={`reel__action${meta.reposted ? ' on' : ''}`} onClick={() => { haptic('light'); toggleRepost(post.id); }} aria-label={t.repost}>
          <span className="disc" style={meta.reposted ? { background: 'color-mix(in srgb, var(--success) 75%, transparent)' } : undefined}><Icon name="repeat" size={25} /></span>
          {meta.reposts}
        </button>
        <button className={`reel__action save${meta.saved ? ' on' : ''}`} onClick={() => { haptic('light'); toggleSave(post.id); }} aria-pressed={meta.saved} aria-label={t.saved}>
          <span className="disc"><Icon name="bookmark" size={25} fill={meta.saved ? 1 : 0} /></span>
        </button>
        <button className="reel__action" onClick={() => openShare(post.id)} aria-label={t.share}>
          <span className="disc"><Icon name="send" size={23} /></span>
          {meta.shares}
        </button>
        <button className="reel__action" onClick={() => openSheet({ kind: 'post', id: post.id, mine: post.authorId === meId, author: post.authorId })} aria-label={t.more}>
          <span className="disc" style={{ width: 38, height: 38 }}><Icon name="more_horiz" size={22} /></span>
        </button>
      </div>
      <ReelProgress active={active} paused={paused} video={video} />
    </section>
  );
}

/** The little "+" that sits under a reel author's avatar. */
function FollowIcon({ userId }: { userId: string }) {
  const { toggleFollow, t } = useApp();
  return (
    <button
      onClick={() => { haptic('light'); toggleFollow(userId); }}
      aria-label={t.follow}
      style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', background: 'var(--grad)', color: '#fff', border: '2px solid #fff' }}
    >
      <Icon name="add" size={13} />
    </button>
  );
}

const REEL_PAGE = 5;

function ForYou() {
  const { data, user, t, meId } = useApp();
  const posts = useMemo(() => rankedPosts(data, user, meId), [data, user, meId]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(REEL_PAGE);
  const [muted, setMuted] = useState(true);
  const { wide } = useLayout();
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const top = () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener(SCROLL_TOP_EVENT, top);
    return () => window.removeEventListener(SCROLL_TOP_EVENT, top);
  }, []);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const next = Math.round(el.scrollTop / el.clientHeight);
    if (next !== index) {
      setIndex(next);
      haptic('tick');
      if (next >= visible - 3) setVisible((count) => Math.min(posts.length, count + REEL_PAGE));
    }
  };

  const step = (direction: 1 | -1) => scroller.current?.scrollBy({ top: direction * scroller.current.clientHeight, behavior: 'smooth' });

  if (posts.length === 0) {
    return (
      <div style={{ minHeight: 'var(--shell-h)', display: 'grid', placeItems: 'center', paddingTop: 70 }}>
        <EmptyState icon="movie" title={t.emptyFeed} body={t.emptyReels} />
      </div>
    );
  }

  return (
    <div
      className="reel-stage"
      style={{
        height: wide ? 'calc(var(--shell-h) - 32px)' : 'var(--shell-h)',
        margin: wide ? '16px auto' : 0,
        maxWidth: wide ? 470 : undefined,
        borderRadius: wide ? 32 : 0,
        boxShadow: wide ? 'var(--shadow)' : undefined,
        ['--reel-bottom' as string]: wide ? '34px' : 'calc(96px + var(--safe-bottom))',
      }}
    >
      <div
        ref={scroller}
        className="reel-scroller"
        onScroll={onScroll}
        tabIndex={0}
        role="feed"
        aria-label={t.forYou}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(1); }
          if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
          if (e.key.toLowerCase() === 'm') setMuted((m) => !m);
        }}
      >
        {posts.slice(0, visible).map((post, i) => (
          <ReelItem key={post.id} post={post} active={i === index} muted={muted} />
        ))}
      </div>
      <button className="icon-btn icon-btn--glass" onClick={() => setMuted((m) => !m)} aria-label={muted ? t.unmute : t.mute} style={{ position: 'absolute', right: 12, top: 'calc(70px + var(--safe-top))', zIndex: 8, width: 38, height: 38 }}>
        <Icon name={muted ? 'volume_off' : 'volume_up'} size={19} />
      </button>
    </div>
  );
}

const FEED_PAGE = 6;

function Suggestions() {
  const { t } = useApp();
  const list = useSuggested(6);
  if (list.length === 0) return null;
  return (
    <section style={{ margin: '4px 0 14px' }}>
      <h3 className="section-title" style={{ padding: '0 16px 10px', fontSize: 17 }}>{t.suggested}</h3>
      <div className="hscroll" style={{ padding: '0 16px 4px' }}>
        {list.map((u) => (
          <div key={u.id} className="card" style={{ flex: '0 0 158px', padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
            <UserAvatar userId={u.id} size={64} />
            <span style={{ fontSize: 14.5, fontWeight: 650, marginTop: 6, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 8 }}>{fmt(u.followers)} {t.followers.toLowerCase()}</span>
            <FollowButton userId={u.id} block />
          </div>
        ))}
      </div>
    </section>
  );
}

function Following() {
  const navigate = useNavigate();
  const { data, user, t, meId, loading, refresh } = useApp();
  const [page, setPage] = useState(1);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const posts = useMemo(
    () =>
      data.posts
        .filter((p) => (user.follows[p.authorId] || p.authorId === meId) && !user.blocked[p.authorId])
        .sort((a, b) => b.createdAt - a.createdAt),
    [data.posts, user.follows, user.blocked, meId],
  );
  const followingSomeone = Object.keys(user.follows).length > 0;
  const shown = posts.slice(0, page * FEED_PAGE);
  const hasMore = shown.length < posts.length;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && setPage((p) => p + 1), { rootMargin: '500px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <PullToRefresh onRefresh={refresh}>
      <StoryRail />
      {!followingSomeone && (
        <EmptyState
          icon="group_add"
          title={t.followingEmptyTitle}
          body={t.tapFollow}
          action={<button className="btn btn-primary" onClick={() => navigate('/explore')}>{t.goExplore}</button>}
        />
      )}
      {loading && <FeedSkeleton count={2} />}
      <div style={{ padding: '0 0' }}>
        {shown.map((post, i) => (
          <div key={post.id}>
            <PostCard post={post} />
            {i === 1 && <Suggestions />}
          </div>
        ))}
      </div>
      {posts.length > 0 && !hasMore && (
        <p style={{ textAlign: 'center', color: 'var(--ink3)', fontSize: 13.5, padding: '18px 0 6px' }}>{t.caughtUp}</p>
      )}
      {hasMore && (
        <div ref={sentinel}>
          <FeedSkeleton count={1} />
        </div>
      )}
    </PullToRefresh>
  );
}

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, data } = useApp();
  const { wide } = useLayout();
  const isForYou = location.pathname === '/';
  const unread = data.notifications.filter((n) => !n.read).length;

  const bell = (
    <button className={`icon-btn${isForYou ? ' icon-btn--glass' : ''}`} onClick={() => navigate('/notifications')} aria-label={t.notifications}>
      <Icon name="notifications" size={22} />
      {unread > 0 && (
        <span className="badge" style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, fontSize: 10.5, border: '2px solid var(--bg)' }}>
          {unread}
        </span>
      )}
    </button>
  );
  const search = (
    <button className={`icon-btn${isForYou ? ' icon-btn--glass' : ''}`} onClick={() => navigate('/explore')} aria-label={t.explore}>
      <Icon name="search" size={22} />
    </button>
  );

  const switcher = (
    <Segmented
      glass={isForYou}
      label="Flux"
      value={isForYou ? 'for' : 'following'}
      onChange={(k) => navigate(k === 'for' ? '/' : '/following')}
      options={[
        { key: 'following', label: t.subs },
        { key: 'for', label: t.forYou },
      ]}
      style={{ width: wide ? 280 : isForYou ? 232 : 176 }}
    />
  );

  if (isForYou) {
    return (
      <div style={{ position: 'relative' }}>
        <header style={{ position: 'absolute', zIndex: 20, top: wide ? 32 : 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(10px + var(--safe-top)) 12px 0', pointerEvents: 'none', maxWidth: wide ? 470 : undefined, margin: '0 auto' }}>
          <span style={{ pointerEvents: 'auto', color: '#fff', visibility: wide ? 'hidden' : 'visible' }}>{search}</span>
          <span style={{ pointerEvents: 'auto' }}>{switcher}</span>
          <span style={{ pointerEvents: 'auto', color: '#fff' }}>{bell}</span>
        </header>
        <ForYou />
      </div>
    );
  }

  return (
    <>
      <header className="topbar" style={{ justifyContent: 'space-between' }}>
        {wide ? <span style={{ width: 42 }} /> : <Brand size={22} />}
        {switcher}
        <span style={{ display: 'flex', gap: 2 }}>
          {bell}
        </span>
      </header>
      <Following />
    </>
  );
}
