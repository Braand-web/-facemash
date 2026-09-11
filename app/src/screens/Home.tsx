import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PostCard, usePostMeta } from '../components/PostCard';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { useLayout } from '../viewport';
import { rankedPosts } from '../lib/ranking';
import { initials as toInitials } from '../lib/format';
import type { Post } from '../types';

function ReelItem({
  post,
  active,
  progress,
  paused,
  burstKey,
  muted,
  onTap,
  onToggleMute,
}: {
  post: Post;
  active: boolean;
  progress: number;
  paused: boolean;
  burstKey: number;
  muted: boolean;
  onTap: () => void;
  onToggleMute: () => void;
}) {
  const navigate = useNavigate();
  const { t, toggleLike, toggleSave, toggleFollow } = useApp();
  const { openShare } = useOverlays();
  const meta = usePostMeta(post);
  const { author } = meta;
  const hue = author.hue;
  const textOnly = post.media.length === 0;

  return (
    <section
      style={{
        position: 'relative',
        height: '100%',
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <button
        onClick={onTap}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          background: `repeating-linear-gradient(135deg, oklch(0.28 0.035 ${hue}) 0 14px, oklch(0.21 0.025 ${hue}) 14px 28px)`,
        }}
      />
      {textOnly ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: '12% 9%',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 'clamp(24px,5.2vw,38px)',
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: `oklch(0.98 0.01 ${hue})`,
              textWrap: 'pretty',
              textAlign: 'center',
            }}
          >
            {post.text}
          </p>
        </div>
      ) : (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            fontFamily: 'ui-monospace,monospace',
            fontSize: 11.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: `oklch(0.93 0.02 ${hue})`,
            textAlign: 'center',
            padding: '0 40px',
          }}
        >
          {post.media[0].label}
        </span>
      )}

      {active && paused && (
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 74,
            height: 74,
            borderRadius: '50%',
            background: 'oklch(0.15 0 0 / 0.4)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            color: 'oklch(0.99 0 0)',
            pointerEvents: 'none',
          }}
        >
          <Icon name="play_arrow" size={40} fill={1} />
        </span>
      )}

      {active && burstKey > 0 && (
        <span
          key={burstKey}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            color: 'var(--like)',
            animation: 'fmPop .8s ease-out both',
            pointerEvents: 'none',
          }}
        >
          <Icon name="favorite" size={96} fill={1} color="var(--like)" />
        </span>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 2.5,
          background: 'oklch(0.99 0 0 / 0.18)',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${active ? Math.round(progress * 100) : 0}%`,
            background: 'oklch(0.99 0 0 / 0.85)',
          }}
        />
      </div>
      <button
        onClick={onToggleMute}
        style={{
          position: 'absolute',
          right: 14,
          top: 16,
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'oklch(0.15 0 0 / 0.42)',
          backdropFilter: 'blur(6px)',
          color: 'oklch(0.99 0 0)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={muted ? 'volume_off' : 'volume_up'} size={20} />
      </button>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          padding: '18px 14px 22px',
          background:
            'linear-gradient(to top, oklch(0.1 0 0 / 0.78), oklch(0.1 0 0 / 0.35) 55%, transparent)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate(`/profile/${post.authorId}`)}
              style={{
                width: 38,
                height: 38,
                flex: '0 0 38px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
                fontSize: 13.5,
                color: `oklch(0.16 0.03 ${hue})`,
                background: `oklch(0.82 0.10 ${hue})`,
                border: '1.5px solid oklch(0.99 0 0 / 0.7)',
              }}
            >
              {meta.initials}
            </button>
            <button
              onClick={() => navigate(`/profile/${post.authorId}`)}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: 'oklch(0.99 0 0)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {author.name}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: 'oklch(0.99 0 0 / 0.66)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                @{author.username} · {meta.time}
              </span>
            </button>
            {meta.showFollow && (
              <button
                onClick={() => toggleFollow(post.authorId)}
                style={{
                  flex: '0 0 auto',
                  padding: '6px 13px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'oklch(0.99 0 0)',
                  border: '1px solid oklch(0.99 0 0 / 0.6)',
                }}
              >
                {t.follow}
              </button>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.5,
              color: 'oklch(0.99 0 0 / 0.94)',
              maxWidth: '44ch',
              textWrap: 'pretty',
            }}
          >
            {post.text}
          </p>
          {post.tags.length > 0 && (
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'oklch(0.9 0.09 182)' }}>
              {post.tags.join(' ')}
            </p>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            alignItems: 'center',
            paddingBottom: 2,
          }}
        >
          <button
            onClick={() => toggleLike(post.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <Icon
              name="favorite"
              size={29}
              fill={meta.liked ? 1 : 0}
              color="oklch(0.99 0 0)"
              style={{ textShadow: '0 1px 8px oklch(0 0 0 / .4)' }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'oklch(0.99 0 0)' }}>{meta.likes}</span>
          </button>
          <button
            onClick={() => navigate(`/post/${post.id}`)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <Icon
              name="mode_comment"
              size={28}
              color="oklch(0.99 0 0)"
              style={{ textShadow: '0 1px 8px oklch(0 0 0 / .4)' }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'oklch(0.99 0 0)' }}>{meta.comments}</span>
          </button>
          <button
            onClick={() => openShare(post.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <Icon
              name="ios_share"
              size={27}
              color="oklch(0.99 0 0)"
              style={{ textShadow: '0 1px 8px oklch(0 0 0 / .4)' }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'oklch(0.99 0 0)' }}>{meta.shares}</span>
          </button>
          <button onClick={() => toggleSave(post.id)} style={{ display: 'grid', placeItems: 'center' }}>
            <Icon
              name="bookmark"
              size={27}
              fill={meta.saved ? 1 : 0}
              color="oklch(0.99 0 0)"
              style={{ textShadow: '0 1px 8px oklch(0 0 0 / .4)' }}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

function ForYou() {
  const { data, user, toggleLike } = useApp();
  const { reelHeight } = useLayout();
  const posts = useMemo(() => rankedPosts(data, user), [data, user]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setProgress((p) => (p + 0.012 > 1 ? 0 : p + 0.012)), 100);
    return () => window.clearInterval(id);
  }, [paused, index]);

  useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const next = Math.round(el.scrollTop / el.clientHeight);
    if (next !== index) {
      setIndex(next);
      setProgress(0);
      setPaused(false);
    }
  };

  const onTap = (postId: string) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      window.clearTimeout(tapTimer.current);
      if (!user.likes[postId]) toggleLike(postId);
      setBurst((b) => b + 1);
      return;
    }
    lastTap.current = now;
    tapTimer.current = window.setTimeout(() => {
      if (lastTap.current === now) {
        lastTap.current = 0;
        setPaused((p) => !p);
      }
    }, 320);
  };

  return (
    <div
      onScroll={onScroll}
      style={{
        height: reelHeight(false),
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollSnapType: 'y mandatory',
        background: 'oklch(0.115 0.004 265)',
      }}
    >
      {posts.map((post, i) => (
        <ReelItem
          key={post.id}
          post={post}
          active={i === index}
          progress={progress}
          paused={paused}
          burstKey={burst}
          muted={muted}
          onTap={() => onTap(post.id)}
          onToggleMute={() => setMuted((m) => !m)}
        />
      ))}
    </div>
  );
}

function Following() {
  const navigate = useNavigate();
  const { data, user, t, meId, openComposer, userById } = useApp();
  const { openStory } = useOverlays();
  const posts = data.posts
    .filter((p) => (user.follows[p.authorId] || p.authorId === meId) && !user.blocked[p.authorId])
    .sort((a, b) => b.createdAt - a.createdAt);
  const empty = !data.posts.some((p) => user.follows[p.authorId] || p.authorId === meId);

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          padding: '16px 14px 15px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          onClick={openComposer}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: '0 0 auto' }}
        >
          <span
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '1px dashed var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink3)',
            }}
          >
            <Icon name="add" size={24} />
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{t.story}</span>
        </button>
        {data.stories.map((group, i) => {
          const author = userById(group.userId);
          return (
            <button
              key={group.userId}
              onClick={() => openStory(i)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: '0 0 auto' }}
            >
              <span
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  padding: 2.5,
                  background: `linear-gradient(140deg, var(--accent), oklch(0.72 0.14 ${author.hue}))`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <span
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '2px solid var(--bg)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 15,
                    color: `oklch(0.16 0.03 ${author.hue})`,
                    background: `oklch(0.80 0.10 ${author.hue})`,
                  }}
                >
                  {toInitials(author.name)}
                </span>
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: 'var(--ink2)',
                  maxWidth: 64,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {author.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
      {empty && (
        <div style={{ padding: '70px 30px', textAlign: 'center' }}>
          <Icon name="group_add" size={40} color="var(--ink3)" />
          <p style={{ margin: '14px 0 18px', color: 'var(--ink2)', fontSize: 15, lineHeight: 1.55 }}>
            {t.tapFollow}
          </p>
          <button
            onClick={() => navigate('/explore')}
            style={{
              padding: '12px 20px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--accentInk)',
              fontWeight: 600,
              fontSize: 14.5,
            }}
          >
            {t.goExplore}
          </button>
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, data } = useApp();
  const { wide } = useLayout();
  const isForYou = location.pathname === '/';
  const unreadNotifications = data.notifications.filter((n) => !n.read).length;

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 52,
          padding: '0 12px',
          background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {!wide && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, paddingRight: 6 }}>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: '-0.03em',
              }}
            >
              facemash
            </span>
            <span
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'block' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 12px',
              fontSize: 14.5,
              fontWeight: 600,
              color: isForYou ? 'var(--ink)' : 'var(--ink3)',
              borderBottom: `2px solid ${isForYou ? 'var(--accent)' : 'transparent'}`,
            }}
          >
            {t.forYou}
          </button>
          <button
            onClick={() => navigate('/following')}
            style={{
              padding: '14px 12px',
              fontSize: 14.5,
              fontWeight: 600,
              color: !isForYou ? 'var(--ink)' : 'var(--ink3)',
              borderBottom: `2px solid ${!isForYou ? 'var(--accent)' : 'transparent'}`,
            }}
          >
            {t.subs}
          </button>
        </div>
        <button
          className="hov-surface"
          onClick={() => navigate('/notifications')}
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink2)',
          }}
        >
          <Icon name="notifications" size={22} />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 3,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: 'var(--accentInk)',
                fontFamily: "'Geist',sans-serif",
                fontSize: 10,
                fontWeight: 600,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {unreadNotifications}
            </span>
          )}
        </button>
      </header>
      {isForYou ? <ForYou /> : <Following />}
    </>
  );
}
