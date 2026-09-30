import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon } from './Icon';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { useLayout } from '../viewport';
import { useDialog } from '../lib/dialog';
import { useSeenStories, storyKey } from '../lib/stories';
import { usePrefs } from '../lib/prefs';
import { initials as toInitials } from '../lib/format';
import type { MediaItem } from '../types';

/* ------------------------------------------------------------ avatars -- */

/**
 * An account's avatar. When the account has a live story it wears a ring (bright when
 * unseen, muted once watched) and tapping opens the story instead of the fallback.
 */
export function UserAvatar({
  userId,
  size = 44,
  onClick,
  radius,
  label,
}: {
  userId: string;
  size?: number;
  onClick?: () => void;
  radius?: string;
  label?: string;
}) {
  const { data, userById } = useApp();
  const { openStory } = useOverlays();
  const seen = useSeenStories();
  const author = userById(userId);
  const groupIndex = data.stories.findIndex((group) => group.userId === userId);
  const group = groupIndex >= 0 ? data.stories[groupIndex] : null;
  const hasStory = !!group && group.items.length > 0;
  const allSeen = hasStory && group.items.every((item) => seen.has(storyKey(userId, item)));

  const avatar = <Avatar hue={author.hue} initials={toInitials(author.name)} size={hasStory ? size - 8 : size} radius={radius} />;
  const handle = (event: MouseEvent) => {
    event.stopPropagation();
    if (hasStory) openStory(groupIndex);
    else onClick?.();
  };

  const body = hasStory ? (
    <span className={`ring${allSeen ? ' ring--seen' : ''}`} style={{ width: size, height: size, ['--ring-w' as string]: '2px' }}>
      <span className="ring__gap" style={{ padding: 2 }}>
        {avatar}
      </span>
    </span>
  ) : (
    avatar
  );

  if (!hasStory && !onClick) return body;
  return (
    <button onClick={handle} aria-label={label ?? author.name} style={{ display: 'inline-flex', borderRadius: '50%' }}>
      {body}
    </button>
  );
}

/* ------------------------------------------------------------- follow -- */

export function FollowButton({ userId, block, size = 'sm' }: { userId: string; block?: boolean; size?: 'sm' | 'md' }) {
  const { user, data, t, toggleFollow } = useApp();
  const followed = !!user.follows[userId];
  const requested = !!user.requested[userId];
  const isPrivate = !!data.users.find((u) => u.id === userId)?.isPrivate;
  const label = followed ? t.unfollow : requested ? t.requested : isPrivate ? t.requestFollow : t.follow;
  const on = followed || requested;
  return (
    <button
      className={`btn ${on ? 'btn-outline' : 'btn-primary'}${size === 'sm' ? ' btn-sm' : ''}${block ? ' btn-block' : ''}`}
      aria-pressed={on}
      onClick={(event) => {
        event.stopPropagation();
        toggleFollow(userId);
      }}
    >
      {followed && <Icon name="person_check" size={size === 'sm' ? 15 : 17} />}
      {label}
    </button>
  );
}

/** Avatar + name + one line of context + a trailing action. */
export function PersonRow({
  userId,
  sub,
  action,
  size = 46,
}: {
  userId: string;
  sub?: ReactNode;
  action?: ReactNode;
  size?: number;
}) {
  const navigate = useNavigate();
  const { userById } = useApp();
  const person = userById(userId);
  const open = () => navigate(`/profile/${userId}`);
  return (
    <div className="person-row">
      <UserAvatar userId={userId} size={size} onClick={open} />
      <button onClick={open} style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em' }}>{person.name}</span>
        <span
          style={{
            display: 'block',
            fontSize: 13,
            color: 'var(--ink3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub ?? `@${person.username}`}
        </span>
      </button>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- text -- */

const TOKEN = /(#[\p{L}\p{N}_]+|@[A-Za-z0-9_]+)/gu;

/** Post and comment text where #hashtags and @mentions are real links. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const navigate = useNavigate();
  const { data } = useApp();
  const parts = text.split(TOKEN);
  return (
    <span className={`rich${className ? ` ${className}` : ''}`}>
      {parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          return (
            <button
              key={i}
              className="link"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/tag/${encodeURIComponent(part.slice(1))}`);
              }}
            >
              {part}
            </button>
          );
        }
        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1).toLowerCase();
          const target = data.users.find((u) => u.username.toLowerCase() === handle);
          if (target) {
            return (
              <button
                key={i}
                className="link"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/profile/${target.id}`);
                }}
              >
                {part}
              </button>
            );
          }
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}

/** Long text folds to a few lines with an inline "more". */
export function ClampText({ text, lines = 4, onOpen }: { text: string; lines?: number; onOpen?: () => void }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const long = text.length > lines * 62 || text.split('\n').length > lines;
  return (
    <div style={{ marginBottom: 12 }}>
      <p
        className="post__text"
        onClick={onOpen}
        style={{
          margin: 0,
          cursor: onOpen ? 'pointer' : undefined,
          ...(!open && long
            ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
            : {}),
        }}
      >
        <RichText text={text} />
      </p>
      {long && (
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ marginTop: 4, color: 'var(--ink3)', fontSize: 13.5, fontWeight: 600 }}
        >
          {open ? t.less : t.more}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- media -- */

/** Uploaded media when there is some, otherwise generative art tinted by the author's hue. */
export function MediaFill({
  item,
  hue,
  showLabel = true,
  autoplay = false,
  muted = true,
}: {
  item?: MediaItem;
  hue: number;
  showLabel?: boolean;
  autoplay?: boolean;
  muted?: boolean;
}) {
  if (item?.url) {
    if (item.video) return <AutoVideo src={item.url} autoplay={autoplay} muted={muted} />;
    return <img src={item.url} alt={item.label} loading="lazy" draggable={false} />;
  }
  return (
    <span className="media-art" style={{ position: 'absolute', inset: 0, ['--h' as string]: hue } as CSSProperties}>
      {showLabel && item && <span className="media-art__label">{item.label}</span>}
    </span>
  );
}

/** A muted, looping video that plays only while it is mostly on screen. */
export function AutoVideo({
  src,
  autoplay = true,
  muted = true,
  onRef,
}: {
  src: string;
  autoplay?: boolean;
  muted?: boolean;
  onRef?: (el: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const { autoplay: allowed } = usePrefs();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!autoplay || !allowed) {
      el.pause();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay, allowed]);

  return (
    <video
      ref={(el) => {
        ref.current = el;
        onRef?.(el);
      }}
      src={src}
      muted={muted}
      loop
      playsInline
      preload="metadata"
    />
  );
}

/* --------------------------------------------------------- navigation -- */

export interface TabOption<K extends string> {
  key: K;
  label: string;
  icon?: string;
}

/** Pill segmented control; the thumb glides between options. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  glass,
  label,
  style,
}: {
  options: TabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  glass?: boolean;
  label?: string;
  style?: CSSProperties;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  return (
    <div
      className={`seg${glass ? ' seg-glass' : ''}`}
      role="tablist"
      aria-label={label}
      style={{ ['--n' as string]: options.length, ['--i' as string]: index, ...style }}
    >
      <span className="seg__thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.key}
          role="tab"
          aria-selected={option.key === value}
          className="seg__item"
          onClick={() => onChange(option.key)}
        >
          {option.icon && <Icon name={option.icon} size={16} />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function UnderlineTabs<K extends string>({
  options,
  value,
  onChange,
  sticky,
}: {
  options: TabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  sticky?: number;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  return (
    <div
      className="utabs"
      role="tablist"
      style={{
        ['--n' as string]: options.length,
        ['--i' as string]: index,
        ...(sticky !== undefined
          ? {
              position: 'sticky',
              top: sticky,
              zIndex: 20,
              background: 'color-mix(in srgb, var(--bg) 78%, transparent)',
              backdropFilter: 'blur(20px) saturate(1.5)',
            }
          : {}),
      }}
    >
      {options.map((option) => (
        <button
          key={option.key}
          role="tab"
          aria-selected={option.key === value}
          className="utabs__item"
          onClick={() => onChange(option.key)}
        >
          {option.icon && <Icon name={option.icon} size={18} />}
          {option.label}
        </button>
      ))}
      <span className="utabs__bar" aria-hidden="true" />
    </div>
  );
}

/* ----------------------------------------------------------- sheets -- */

/**
 * Bottom sheet on phones, centred modal on wide screens. Drag the grip down to
 * dismiss; Escape and the backdrop close it as well.
 */
export function Sheet({
  onClose,
  title,
  label,
  children,
  right,
  height,
  z,
  bodyStyle,
}: {
  onClose: () => void;
  title?: ReactNode;
  label: string;
  children: ReactNode;
  right?: ReactNode;
  height?: string;
  z?: number;
  bodyStyle?: CSSProperties;
}) {
  const { mid } = useLayout();
  const panel = useDialog<HTMLDivElement>(onClose);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  const onDown = (event: React.PointerEvent) => {
    start.current = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const onMove = (event: React.PointerEvent) => {
    if (start.current === null) return;
    setDrag(Math.max(0, event.clientY - start.current));
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > 96) onClose();
    else setDrag(0);
  };

  return (
    <div
      className="sheet-backdrop"
      data-mode={mid ? 'modal' : 'sheet'}
      style={z ? { zIndex: z } : undefined}
      onClick={onClose}
    >
      <div
        ref={panel}
        className="sheet"
        data-mode={mid ? 'modal' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          height,
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: start.current === null ? 'transform 280ms var(--ease-out)' : 'none',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <div className="sheet__grip" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
        {(title || right) && (
          <div className="sheet__head">
            <h2 className="sheet__title">{title}</h2>
            {right}
            <button className="icon-btn" onClick={onClose} aria-label="Fermer">
              <Icon name="close" size={22} />
            </button>
          </div>
        )}
        <div className="sheet__body" style={bodyStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- misc -- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__art">
        <Icon name={icon} size={38} />
      </span>
      <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 650, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
        {title}
      </p>
      {body && <p style={{ margin: 0, maxWidth: '32ch', fontSize: 14.5, lineHeight: 1.55 }}>{body}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Brand({ size = 24 }: { size?: number }) {
  return (
    <span className="brand" style={{ fontSize: size }}>
      facemash
      <span className="brand__dot" />
    </span>
  );
}
