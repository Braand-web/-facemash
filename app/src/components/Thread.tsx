import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useApp } from '../store';
import { useLayout } from '../viewport';
import { useDraft } from '../lib/drafts';
import { dayLabel, fmt, initials as toInitials, mmss, recordingBars, rel, voiceBars } from '../lib/format';
import type { Message, ThreadKind } from '../types';

const CHAT_BG = 'color-mix(in oklab, var(--bg) 93%, oklch(0.72 0.07 62))';
const QUICK_REACTIONS = ['\u{1F44D}', '❤️', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];
const EMOJIS = [
  '\u{1F44D}', '❤️', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}', '\u{1F525}', '\u{1F389}',
  '\u{1F60D}', '\u{1F44F}', '\u{1F91D}', '✅', '\u{1F60E}', '\u{1F914}', '\u{1F4AA}', '⚡',
];
const STICKERS = [
  'sticker · chat qui dort',
  'sticker · pouce levé',
  'sticker · café renversé',
  'sticker · cœur pixel',
  'sticker · fusée',
  'sticker · pluie',
];
const GIFS = [
  'gif · applaudissements',
  'gif · chute comique',
  'gif · danse',
  'gif · pluie de confettis',
  'gif · haussement d’épaules',
  'gif · minuteur',
];

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const daysAgo = (ms: number) => Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);

interface Row {
  type: 'date' | 'unread' | 'message';
  key: string;
  label?: string;
  message?: Message;
  first?: boolean;
  last?: boolean;
}

function buildRows(
  messages: Message[],
  unreadSince: number,
  meId: string,
  lang: 'fr' | 'en',
): Row[] {
  const rows: Row[] = [];
  const incomingUnread = unreadSince
    ? messages.filter((m) => m.createdAt >= unreadSince && m.from !== meId)
    : [];
  const dividerIndex = incomingUnread.length ? messages.indexOf(incomingUnread[0]) : -1;
  let previousDay: number | null = null;
  let previousFrom: string | null = null;

  messages.forEach((message, i) => {
    const day = daysAgo(message.createdAt);
    if (day !== previousDay) {
      rows.push({ type: 'date', key: `d${i}`, label: dayLabel(day, lang) });
      previousDay = day;
      previousFrom = null;
    }
    if (i === dividerIndex) {
      rows.push({
        type: 'unread',
        key: `u${i}`,
        label: `${incomingUnread.length} ${lang === 'fr' ? 'nouveaux messages' : 'new messages'}`,
      });
      previousFrom = null;
    }
    const next = messages[i + 1];
    const first = previousFrom !== message.from;
    const last = !next || next.from !== message.from || daysAgo(next.createdAt) !== day;
    previousFrom = message.from;
    rows.push({ type: 'message', key: message.id, message, first, last });
  });

  return rows;
}

function MessageBubble({
  row,
  isGroup,
  onMenu,
  onReply,
  voiceProgress,
  onToggleVoice,
}: {
  row: Row;
  isGroup: boolean;
  onMenu: (message: Message) => void;
  onReply: (message: Message) => void;
  voiceProgress: number;
  onToggleVoice: (id: string) => void;
}) {
  const { meId, userById, lang } = useApp();
  const message = row.message!;
  const mine = message.from === meId;
  const author = userById(message.from);
  const [swipe, setSwipe] = useState(0);
  const pointer = useRef<{ x: number; dx: number } | null>(null);
  const longPress = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(longPress.current), []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointer.current = { x: e.clientX, dx: 0 };
    window.clearTimeout(longPress.current);
    longPress.current = window.setTimeout(() => {
      pointer.current = null;
      onMenu(message);
    }, 450);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    const dx = e.clientX - pointer.current.x;
    if (Math.abs(dx) > 8) {
      window.clearTimeout(longPress.current);
      pointer.current.dx = dx;
      setSwipe(Math.max(-80, Math.min(80, dx)));
    }
  };

  const onPointerUp = () => {
    window.clearTimeout(longPress.current);
    const dx = pointer.current?.dx ?? 0;
    pointer.current = null;
    if (Math.abs(dx) > 50) onReply(message);
    setSwipe(0);
  };

  const authorColor = `oklch(0.70 0.13 ${author.hue})`;
  const radius = mine
    ? row.first
      ? '18px 6px 18px 18px'
      : '18px'
    : row.first
      ? '6px 18px 18px 18px'
      : '18px';
  const bars = voiceBars(message.id);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 7,
        width: '100%',
        minWidth: 0,
        justifyContent: mine ? 'flex-end' : 'flex-start',
        marginBottom: row.last ? 11 : 3,
        animation: 'fmIn .2s ease both',
        transform: `translateX(${swipe}px)`,
      }}
    >
      {isGroup && !mine && (
        <span
          style={{
            width: 28,
            height: 28,
            flex: '0 0 28px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 600,
            fontSize: 11,
            opacity: row.last ? 1 : 0,
            color: `oklch(0.16 0.03 ${author.hue})`,
            background: `oklch(0.78 0.10 ${author.hue})`,
          }}
        >
          {toInitials(author.name)}
        </span>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(message);
        }}
        style={{
          position: 'relative',
          maxWidth: 'min(80%,520px)',
          padding: '8px 12px 6px',
          borderRadius: radius,
          background: mine ? 'var(--accent)' : 'var(--surface)',
          color: mine ? 'var(--accentInk)' : 'var(--ink)',
          boxShadow: '0 1px 1.5px oklch(0 0 0 / 0.09)',
          touchAction: 'pan-y',
          userSelect: 'none',
          overflowWrap: 'anywhere',
        }}
      >
        {isGroup && !mine && row.first && (
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3, color: authorColor }}>
            {author.name.split(' ')[0]}
          </div>
        )}

        {message.replyTo && (
          <div
            style={{
              margin: '1px 0 6px',
              padding: '6px 9px',
              borderRadius: 8,
              borderLeft: `2.5px solid ${authorColor}`,
              background: 'oklch(0.5 0 0 / 0.13)',
              fontSize: 12.5,
              opacity: 0.88,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {message.replyTo.text}
          </div>
        )}

        {message.sharedPostId && (
          <div
            style={{
              margin: '1px 0 6px',
              padding: '11px 12px',
              borderRadius: 12,
              background: 'oklch(0.5 0 0 / 0.13)',
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {message.sharedText}
          </div>
        )}

        {message.kind === 'photo' && !!message.mediaLabel && (
          <div
            style={{
              margin: '1px 0 6px',
              padding: '16px 14px',
              borderRadius: 12,
              background: `repeating-linear-gradient(135deg, oklch(0.45 0.02 ${author.hue} / .5) 0 9px, oklch(0.38 0.02 ${author.hue} / .5) 9px 18px)`,
              fontFamily: 'ui-monospace,monospace',
              fontSize: 10.5,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {message.mediaLabel}
          </div>
        )}

        {message.kind === 'voice' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
              width: 'min(60vw,240px)',
              padding: '2px 0 3px',
            }}
          >
            <button
              onClick={() => onToggleVoice(message.id)}
              style={{
                width: 32,
                height: 32,
                flex: '0 0 32px',
                borderRadius: '50%',
                background: 'oklch(0.5 0 0 / 0.16)',
                display: 'grid',
                placeItems: 'center',
                color: 'inherit',
              }}
            >
              <Icon name={voiceProgress > 0 ? 'pause' : 'play_arrow'} size={19} fill={1} />
            </button>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 26 }}>
              {bars.map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 2.5,
                    borderRadius: 2,
                    height: h,
                    display: 'block',
                    background:
                      i / (bars.length - 1) <= voiceProgress
                        ? mine
                          ? 'var(--accentInk)'
                          : 'var(--accent)'
                        : mine
                          ? 'color-mix(in oklab, var(--accentInk) 32%, transparent)'
                          : 'var(--line)',
                  }}
                />
              ))}
            </span>
            <span style={{ fontSize: 11, opacity: 0.75 }}>
              {(message.mediaLabel ?? '').split('·').pop()?.trim() || '0:12'}
            </span>
          </div>
        )}

        {message.kind === 'doc' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              minWidth: 0,
              width: 'min(66vw,270px)',
              margin: '1px 0 5px',
              padding: '10px 12px',
              borderRadius: 12,
              background: 'oklch(0.5 0 0 / 0.14)',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                flex: '0 0 34px',
                borderRadius: 9,
                background: 'oklch(0.5 0 0 / 0.18)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="description" size={19} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 13.5,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {message.docName}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72, marginTop: 1 }}>
                {message.docSize}
              </span>
            </span>
            <Icon name="download" size={19} style={{ opacity: 0.8 }} />
          </div>
        )}

        {!!message.text && (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, textWrap: 'pretty' }}>
            {message.text
              .split(/(@[A-Za-z0-9_]+)/)
              .filter(Boolean)
              .map((part, i) => (
                <span
                  key={i}
                  style={{
                    color:
                      part.charAt(0) === '@' ? (mine ? 'var(--accentInk)' : 'var(--accent)') : 'inherit',
                    fontWeight: part.charAt(0) === '@' ? 600 : 400,
                  }}
                >
                  {part}
                </span>
              ))}
          </p>
        )}

        {row.last && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
              marginTop: 3,
              fontSize: 10.5,
              opacity: 0.7,
            }}
          >
            {rel(message.createdAt, lang)}
            {mine && (
              <Icon
                name={message.status === 'sent' ? 'check' : 'done_all'}
                size={14}
                color={
                  message.status === 'read'
                    ? 'oklch(0.32 0.10 250)'
                    : 'color-mix(in oklab, var(--accentInk) 52%, transparent)'
                }
                style={{ opacity: 1 }}
              />
            )}
          </div>
        )}

        {!!message.reactions?.length && (
          <span
            style={{
              position: 'absolute',
              bottom: -11,
              right: 9,
              display: 'flex',
              gap: 2,
              padding: '3px 7px',
              borderRadius: 999,
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
            }}
          >
            {message.reactions.map((icon) =>
              icon.length <= 3 ? (
                <span key={icon} style={{ fontSize: 12.5, lineHeight: 1.1 }}>
                  {icon}
                </span>
              ) : (
                <Icon key={icon} name={icon} size={13} fill={1} color="var(--like)" />
              ),
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function MessageMenu({
  message,
  onClose,
  onReact,
  onReply,
  onDelete,
}: {
  message: Message;
  onClose: () => void;
  onReact: (icon: string) => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  const { t, meId, showToast } = useApp();
  const mine = message.from === meId;
  const items = [
    { icon: 'reply', label: t.reply, color: 'var(--ink)', run: onReply },
    {
      icon: 'content_copy',
      label: t.copy,
      color: 'var(--ink)',
      run: () => {
        onClose();
        showToast(t.copiedMsg);
      },
    },
    {
      icon: 'forward',
      label: t.forward,
      color: 'var(--ink)',
      run: () => {
        onClose();
        showToast(t.forwarded);
      },
    },
    ...(mine ? [{ icon: 'delete', label: t.del, color: 'var(--like)', run: onDelete }] : []),
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 78,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'oklch(0.1 0 0 / 0.5)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg)',
          borderRadius: '22px 22px 0 0',
          borderTop: '1px solid var(--line)',
          padding: '14px 0 calc(14px + env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow)',
          animation: 'fmIn .22s ease both',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            padding: '2px 18px 14px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {QUICK_REACTIONS.map((icon) => (
            <button
              key={icon}
              className="hov-pop"
              onClick={() => onReact(icon)}
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--surface)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                lineHeight: 1,
              }}
            >
              {icon}
            </button>
          ))}
        </div>
        {items.map((item) => (
          <button
            key={item.label}
            className="hov-surface"
            onClick={item.run}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              width: '100%',
              padding: '14px 20px',
              textAlign: 'left',
              color: item.color,
            }}
          >
            <Icon name={item.icon} size={20} />
            <span style={{ fontSize: 15.5 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachSheet({ onClose, onPick }: { onClose: () => void; onPick: (item: Partial<Message> & { kind: Message['kind'] }) => void }) {
  const { t } = useApp();
  const items = [
    { icon: 'image', label: t.photoLib, value: { kind: 'photo' as const, mediaLabel: 'photo · envoi depuis la galerie' } },
    { icon: 'movie', label: t.videoFile, value: { kind: 'photo' as const, mediaLabel: 'vidéo · 0:18 · envoi' } },
    { icon: 'photo_camera', label: t.camera, value: { kind: 'photo' as const, mediaLabel: 'photo · prise à l’instant' } },
    { icon: 'description', label: t.document, value: { kind: 'doc' as const, docName: 'brief-septembre.pdf', docSize: '1,4 Mo' } },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 79,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'oklch(0.1 0 0 / 0.5)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg)',
          borderRadius: '22px 22px 0 0',
          borderTop: '1px solid var(--line)',
          padding: '16px 18px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow)',
          animation: 'fmIn .22s ease both',
        }}
      >
        <h2
          style={{
            margin: '0 0 14px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {t.attach}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 9 }}>
          {items.map((item) => (
            <button
              key={item.label}
              className="hov-surface2"
              onClick={() => {
                onPick(item.value);
                onClose();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '15px 6px',
                borderRadius: 16,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
              }}
            >
              <Icon name={item.icon} size={23} color="var(--accent)" />
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CallOverlay({
  kind,
  userId,
  seconds,
  live,
  muted,
  cameraOn,
  onToggleMute,
  onToggleCamera,
  onEnd,
}: {
  kind: 'audio' | 'video';
  userId: string;
  seconds: number;
  live: boolean;
  muted: boolean;
  cameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
}) {
  const { t, userById } = useApp();
  const other = userById(userId);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 88,
        background: 'oklch(0.145 0.008 265)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '46px 22px 42px',
        overflow: 'hidden',
      }}
    >
      {kind === 'video' && (
        <>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(135deg, oklch(0.27 0.03 ${other.hue}) 0 16px, oklch(0.21 0.02 ${other.hue}) 16px 32px)`,
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'ui-monospace,monospace',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: `oklch(0.90 0.02 ${other.hue})`,
            }}
          >
            flux vidéo · correspondant
          </span>
          <span
            style={{
              position: 'absolute',
              right: 16,
              top: 74,
              width: 100,
              height: 142,
              borderRadius: 14,
              border: '1px solid oklch(0.99 0 0 / 0.25)',
              background:
                'repeating-linear-gradient(135deg, oklch(0.30 0.02 265) 0 10px, oklch(0.24 0.02 265) 10px 20px)',
              display: 'grid',
              placeItems: 'center',
              padding: 8,
              textAlign: 'center',
              fontFamily: 'ui-monospace,monospace',
              fontSize: 9,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'oklch(0.92 0 0)',
            }}
          >
            votre caméra
          </span>
        </>
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
          marginTop: '6vh',
        }}
      >
        {kind !== 'video' && (
          <span
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontWeight: 700,
              fontSize: 36,
              color: `oklch(0.16 0.03 ${other.hue})`,
              background: `oklch(0.80 0.10 ${other.hue})`,
            }}
          >
            {toInitials(other.name)}
          </span>
        )}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'oklch(0.99 0 0)',
            }}
          >
            {other.name}
          </div>
          <div style={{ marginTop: 5, fontSize: 14, color: 'oklch(0.99 0 0 / 0.7)' }}>
            {kind === 'video' ? t.videoCall : t.audioCall} · {live ? mmss(seconds) : t.calling}
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11.5,
            color: 'oklch(0.99 0 0 / 0.42)',
            textAlign: 'center',
            maxWidth: '30ch',
            lineHeight: 1.5,
          }}
        >
          {t.missedHint}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onToggleMute}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: muted ? 'oklch(0.99 0 0)' : 'oklch(0.99 0 0 / 0.16)',
              color: muted ? 'oklch(0.2 0 0)' : 'oklch(0.99 0 0)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name={muted ? 'mic_off' : 'mic'} size={24} />
          </button>
          <button
            onClick={onToggleCamera}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'oklch(0.99 0 0 / 0.16)',
              color: 'oklch(0.99 0 0)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name={cameraOn ? 'videocam' : 'videocam_off'} size={24} />
          </button>
          <button
            onClick={onEnd}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--like)',
              color: 'oklch(0.99 0.01 20)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="call_end" size={27} fill={1} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelView({ channelId }: { channelId: string }) {
  const { data, t, lang, reactToChannelPost, showToast } = useApp();
  const channel = data.channels.find((c) => c.id === channelId);
  if (!channel) return null;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '16px 12px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 13.5, lineHeight: 1.55 }}>{channel.description}</p>
      {channel.posts.map((post) => (
        <article
          key={post.id}
          style={{
            padding: 16,
            borderRadius: 18,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            animation: 'fmIn .3s ease both',
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 15.5, lineHeight: 1.55, textWrap: 'pretty' }}>{post.text}</p>
          {post.media.length > 0 && (
            <div
              style={{
                marginBottom: 12,
                borderRadius: 14,
                overflow: 'hidden',
                aspectRatio: post.media[0].ratio,
                background: `repeating-linear-gradient(135deg, oklch(0.32 0.03 ${channel.hue}) 0 11px, oklch(0.26 0.02 ${channel.hue}) 11px 22px)`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace,monospace',
                  fontSize: 11,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: `oklch(0.93 0.02 ${channel.hue})`,
                }}
              >
                {post.media[0].label}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {Object.keys(post.reactions).map((icon) => (
              <button
                key={icon}
                className="hov-ink"
                onClick={() => reactToChannelPost(channel.id, post.id, icon)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 11px',
                  borderRadius: 999,
                  background: 'var(--surface2)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--ink2)',
                }}
              >
                <Icon name={icon} size={15} fill={1} />
                {fmt(post.reactions[icon])}
              </button>
            ))}
            <span
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12.5,
                color: 'var(--ink3)',
              }}
            >
              <Icon name="visibility" size={16} />
              {fmt(post.views)} {t.views} · {rel(post.createdAt, lang)}
            </span>
            <button className="hov-ink" onClick={() => showToast(t.copied)} style={{ color: 'var(--ink3)' }}>
              <Icon name="ios_share" size={18} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Thread({ kind, id }: { kind: ThreadKind; id: string }) {
  const navigate = useNavigate();
  const {
    data,
    user,
    t,
    lang,
    meId,
    userById,
    typingThreadId,
    sendMessage,
    pushMessage,
    reactToMessage,
    deleteMessage,
    subscribeChannel,
    markThreadRead,
    leaveGroup,
    setMemberRole,
    removeMember,
    showToast,
  } = useApp();
  const { wide } = useLayout();
  const [draft, setDraft] = useDraft(id);
  const [replyTo, setReplyTo] = useState<{ id: string; text: string } | null>(null);
  const [menuMessage, setMenuMessage] = useState<Message | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'stickers' | 'gifs'>('emoji');
  const [voice, setVoice] = useState<{ id: string; progress: number } | null>(null);
  const [call, setCall] = useState<{ kind: 'audio' | 'video'; seconds: number; live: boolean } | null>(null);
  const [callMuted, setCallMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [recording, setRecording] = useState<{ seconds: number; cancel: boolean; startX: number } | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const recordingRef = useRef<{ seconds: number; cancel: boolean; startX: number } | null>(null);
  const stopRecordingRef = useRef<(force: boolean) => void>(() => {});

  const conversation = kind === 'dm' ? data.conversations.find((c) => c.id === id) : undefined;
  const group = kind === 'group' ? data.groups.find((g) => g.id === id) : undefined;
  const channel = kind === 'channel' ? data.channels.find((c) => c.id === id) : undefined;
  const messages = conversation?.messages ?? group?.messages ?? [];
  const isChat = kind === 'dm' || kind === 'group';
  const typing = kind === 'dm' && typingThreadId === id;

  const rows = useMemo(
    () => buildRows(messages, user.unreadAt[id] ?? 0, meId, lang),
    [messages, user.unreadAt, id, meId, lang],
  );

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length, typing]);

  // Opening a thread by URL clears its badge and records where the unread line goes.
  useEffect(() => {
    if (kind !== 'channel') markThreadRead(kind, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  useEffect(() => {
    if (!voice) return;
    const timer = window.setInterval(() => {
      setVoice((prev) => (prev ? (prev.progress + 0.022 >= 1 ? null : { ...prev, progress: prev.progress + 0.022 }) : null));
    }, 100);
    return () => window.clearInterval(timer);
  }, [voice]);

  useEffect(() => {
    if (!call?.live) return;
    const timer = window.setInterval(() => setCall((prev) => (prev ? { ...prev, seconds: prev.seconds + 0.1 } : prev)), 100);
    return () => window.clearInterval(timer);
  }, [call?.live]);

  const isRecording = recording !== null;
  recordingRef.current = recording;

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(
      () => setRecording((prev) => (prev ? { ...prev, seconds: prev.seconds + 0.1 } : prev)),
      100,
    );
    return () => window.clearInterval(timer);
  }, [isRecording]);

  // The mic button unmounts the moment the recording bar takes its place, so the
  // hold gesture has to be followed on the window instead.
  useEffect(() => {
    if (!isRecording) return;
    const onMove = (event: PointerEvent) => {
      setRecording((prev) => {
        if (!prev) return prev;
        const cancel = event.clientX - prev.startX < -60;
        return cancel === prev.cancel ? prev : { ...prev, cancel };
      });
    };
    const onUp = () => stopRecordingRef.current(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isRecording]);

  const startCall = (callKind: 'audio' | 'video') => {
    setCall({ kind: callKind, seconds: 0, live: false });
    setCallMuted(false);
    setCameraOn(true);
    window.setTimeout(() => setCall((prev) => (prev ? { ...prev, live: true, seconds: 0 } : prev)), 2400);
  };

  const endCall = () => {
    if (call?.live) showToast(`${t.callEnded} · ${mmss(call.seconds)}`);
    setCall(null);
  };

  const stopRecording = (force: boolean) => {
    const current = recordingRef.current;
    setRecording(null);
    if (!current) return;
    if (current.cancel) {
      showToast(t.recCanceled);
      return;
    }
    if (current.seconds < 0.6 && !force) {
      showToast(t.holdMic);
      return;
    }
    pushMessage(kind, id, {
      kind: 'voice',
      mediaLabel: `note vocale · ${mmss(Math.max(1, current.seconds))}`,
    });
  };
  stopRecordingRef.current = stopRecording;

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(kind, id, draft, replyTo ?? undefined);
    setDraft('');
    setReplyTo(null);
  };

  const header = (() => {
    if (conversation) {
      const other = userById(conversation.userId);
      const online = ['u1', 'u3', 'u5'].includes(other.id);
      return {
        name: other.name,
        initials: toInitials(other.name),
        hue: other.hue,
        sub: typing ? t.typing : online ? t.online : `${t.lastSeen} ${rel(Date.now() - (40 + (other.hue % 120)) * 60000, lang)}`,
        subColor: typing || online ? 'var(--accent)' : 'var(--ink3)',
      };
    }
    if (group) {
      return {
        name: group.name,
        initials: toInitials(group.name),
        hue: group.hue,
        sub: `${group.members.length} ${t.members}`,
        subColor: 'var(--ink3)',
      };
    }
    if (channel) {
      return {
        name: channel.name,
        initials: toInitials(channel.name),
        hue: channel.hue,
        sub: `${fmt(channel.subscribers)} ${t.subscribers}`,
        subColor: 'var(--ink3)',
      };
    }
    return { name: '', initials: '', hue: 265, sub: '', subColor: 'var(--ink3)' };
  })();

  if (!conversation && !group && !channel) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: CHAT_BG, color: 'var(--ink3)' }}>
        {t.emptyThread}
      </div>
    );
  }

  const myRole = group?.members.find((m) => m.userId === meId)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const draftRows = Math.min(5, Math.max(1, draft.split('\n').length + Math.floor(draft.length / 46)));

  return (
    <>
      <header
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 10px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          className="hov-surface"
          onClick={() => navigate('/messages')}
          style={{
            width: 40,
            height: 40,
            flex: '0 0 40px',
            borderRadius: '50%',
            display: wide ? 'none' : 'grid',
            placeItems: 'center',
            color: 'var(--ink2)',
          }}
        >
          <Icon name="arrow_back" size={22} />
        </button>
        <span
          style={{
            width: 40,
            height: 40,
            flex: '0 0 40px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 600,
            fontSize: 14,
            color: `oklch(0.16 0.03 ${header.hue})`,
            background: `oklch(0.78 0.10 ${header.hue})`,
          }}
        >
          {header.initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15.5,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {header.name}
          </div>
          <div style={{ fontSize: 12.5, color: header.subColor }}>{header.sub}</div>
        </div>
        {kind === 'dm' && (
          <>
            <button
              className="hov-surface-ink"
              onClick={() => startCall('audio')}
              style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ink2)' }}
            >
              <Icon name="call" size={21} />
            </button>
            <button
              className="hov-surface-ink"
              onClick={() => startCall('video')}
              style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ink2)' }}
            >
              <Icon name="videocam" size={21} />
            </button>
          </>
        )}
        {channel && (
          <button
            onClick={() => subscribeChannel(channel.id)}
            style={{
              padding: '8px 15px',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 600,
              background: channel.subscribed ? 'transparent' : 'var(--accent)',
              color: channel.subscribed ? 'var(--ink2)' : 'var(--accentInk)',
              border: `1px solid ${channel.subscribed ? 'var(--line)' : 'var(--accent)'}`,
            }}
          >
            {channel.subscribed ? t.unsubscribe : t.subscribe}
          </button>
        )}
      </header>

      {group && (
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '11px 12px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {group.members.map((member) => {
            const memberUser = userById(member.userId);
            return (
              <div
                key={member.userId}
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px 6px 6px',
                  borderRadius: 999,
                  background:
                    member.role === 'member'
                      ? 'var(--surface2)'
                      : 'color-mix(in oklab, var(--accent) 18%, var(--surface))',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 11.5,
                    color: `oklch(0.16 0.03 ${memberUser.hue})`,
                    background: `oklch(0.78 0.10 ${memberUser.hue})`,
                  }}
                >
                  {toInitials(memberUser.name)}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{memberUser.name}</span>
                <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{t[member.role]}</span>
                {canManage && member.userId !== meId && member.role !== 'owner' && (
                  <>
                    <button
                      className="hov-accent-shield"
                      onClick={() => setMemberRole(group.id, member.userId, 'admin')}
                      style={{ color: 'var(--ink3)' }}
                    >
                      <Icon name="shield_person" size={16} />
                    </button>
                    <button
                      className="hov-like"
                      onClick={() => removeMember(group.id, member.userId)}
                      style={{ color: 'var(--ink3)' }}
                    >
                      <Icon name="person_remove" size={16} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
          <button
            className="hov-like-line"
            onClick={() => {
              leaveGroup(group.id);
              navigate('/messages');
            }}
            style={{
              flex: '0 0 auto',
              padding: '6px 13px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              fontSize: 12.5,
              color: 'var(--ink3)',
            }}
          >
            {t.leave}
          </button>
        </div>
      )}

      {channel && <ChannelView channelId={channel.id} />}

      {isChat && (
        <>
          <div
            ref={scroller}
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px 10px 18px',
              display: 'flex',
              flexDirection: 'column',
              background: CHAT_BG,
            }}
          >
            {messages.length === 0 && (
              <div style={{ padding: '70px 20px', textAlign: 'center', color: 'var(--ink3)' }}>
                <Icon name="forum" size={38} />
                <p style={{ margin: '12px 0 0', fontSize: 14.5 }}>{t.emptyThread}</p>
              </div>
            )}
            {rows.map((row) => {
              if (row.type === 'date') {
                return (
                  <div
                    key={row.key}
                    style={{
                      alignSelf: 'center',
                      margin: '14px 0 12px',
                      padding: '5px 14px',
                      borderRadius: 999,
                      background: 'var(--surface2)',
                      color: 'var(--ink3)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {row.label}
                  </div>
                );
              }
              if (row.type === 'unread') {
                return (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '12px 2px 14px' }}>
                    <span style={{ flex: 1, height: 1, background: 'var(--accent)', opacity: 0.45, display: 'block' }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.02em' }}>
                      {row.label}
                    </span>
                    <span style={{ flex: 1, height: 1, background: 'var(--accent)', opacity: 0.45, display: 'block' }} />
                  </div>
                );
              }
              return (
                <MessageBubble
                  key={row.key}
                  row={row}
                  isGroup={kind === 'group'}
                  onMenu={setMenuMessage}
                  onReply={(message) =>
                    setReplyTo({ id: message.id, text: message.text ?? message.mediaLabel ?? '' })
                  }
                  voiceProgress={voice?.id === row.message!.id ? voice.progress : 0}
                  onToggleVoice={(messageId) =>
                    setVoice((prev) => (prev?.id === messageId ? null : { id: messageId, progress: 0 }))
                  }
                />
              );
            })}
            {typing && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '13px 16px',
                  borderRadius: 18,
                  background: 'var(--surface)',
                  boxShadow: '0 1px 1.5px oklch(0 0 0 / 0.09)',
                }}
              >
                {[0, 0.18, 0.36].map((delay) => (
                  <span
                    key={delay}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--ink3)',
                      display: 'block',
                      animation: `fmDot 1.1s infinite ${delay}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              flex: '0 0 auto',
              padding: '9px 10px calc(9px + env(safe-area-inset-bottom))',
              background: 'var(--bg)',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              {replyTo && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    marginBottom: 8,
                    padding: '8px 12px',
                    borderRadius: 11,
                    background: 'var(--surface)',
                    borderLeft: '2.5px solid var(--accent)',
                  }}
                >
                  <Icon name="reply" size={17} color="var(--accent)" />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      color: 'var(--ink2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {replyTo.text}
                  </span>
                  <button onClick={() => setReplyTo(null)} style={{ color: 'var(--ink3)' }}>
                    <Icon name="close" size={17} />
                  </button>
                </div>
              )}

              {emojiOpen && (
                <div
                  style={{
                    marginBottom: 9,
                    borderRadius: 16,
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'min(42dvh,300px)',
                  }}
                >
                  <div
                    style={{
                      flex: '0 0 auto',
                      display: 'flex',
                      gap: 4,
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    {(['emoji', 'stickers', 'gifs'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setEmojiTab(tab)}
                        style={{
                          padding: '6px 13px',
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 600,
                          background: emojiTab === tab ? 'var(--surface2)' : 'transparent',
                          color: emojiTab === tab ? 'var(--ink)' : 'var(--ink3)',
                        }}
                      >
                        {tab === 'emoji' ? t.emoji : tab === 'stickers' ? t.stickers : t.gifs}
                      </button>
                    ))}
                  </div>
                  {emojiTab === 'emoji' && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8,minmax(0,1fr))',
                        gap: 2,
                        padding: 9,
                      }}
                    >
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="hov-surface2"
                          onClick={() => setDraft(draft + emoji)}
                          style={{ aspectRatio: '1/1', borderRadius: 10, fontSize: 20, display: 'grid', placeItems: 'center' }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  {emojiTab !== 'emoji' && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${emojiTab === 'stickers' ? 4 : 3},minmax(0,1fr))`,
                        gap: 8,
                        padding: 10,
                      }}
                    >
                      {(emojiTab === 'stickers' ? STICKERS : GIFS).map((label) => (
                        <button
                          key={label}
                          onClick={() => {
                            pushMessage(kind, id, { kind: 'photo', mediaLabel: label });
                            setEmojiOpen(false);
                          }}
                          style={{
                            height: emojiTab === 'stickers' ? 92 : 86,
                            borderRadius: 13,
                            background:
                              'repeating-linear-gradient(135deg, var(--surface2) 0 9px, var(--surface) 9px 18px)',
                            border: '1px solid var(--line)',
                            padding: 9,
                            fontFamily: 'ui-monospace,monospace',
                            fontSize: 9.5,
                            lineHeight: 1.35,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: 'var(--ink3)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!recording ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <button
                    className="hov-surface-ink"
                    onClick={() => {
                      setAttachOpen(true);
                      setEmojiOpen(false);
                    }}
                    style={{
                      width: 42,
                      height: 42,
                      flex: '0 0 42px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--ink3)',
                    }}
                  >
                    <Icon name="add_circle" size={22} />
                  </button>
                  <button
                    className="hov-surface-ink"
                    onClick={() => {
                      setEmojiOpen((v) => !v);
                      setAttachOpen(false);
                    }}
                    style={{
                      width: 42,
                      height: 42,
                      flex: '0 0 42px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--ink3)',
                    }}
                  >
                    <Icon name="mood" size={22} />
                  </button>
                  <textarea
                    className="field"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={draftRows}
                    placeholder={t.typeMessage}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      resize: 'none',
                      overflowY: 'auto',
                      padding: '11px 15px',
                      borderRadius: 20,
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      fontSize: 15,
                      lineHeight: 1.45,
                      outline: 'none',
                      fontFamily: "'Geist',system-ui,sans-serif",
                    }}
                  />
                  {draft.trim() ? (
                    <button
                      onClick={send}
                      style={{
                        width: 44,
                        height: 44,
                        flex: '0 0 44px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: 'var(--accentInk)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Icon name="send" size={21} fill={1} />
                    </button>
                  ) : (
                    <button
                      className="hov-ink"
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        setRecording({ seconds: 0, cancel: false, startX: e.clientX });
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        flex: '0 0 44px',
                        borderRadius: '50%',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--ink2)',
                        touchAction: 'none',
                      }}
                    >
                      <Icon name="mic" size={21} />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '7px 8px 7px 14px',
                    borderRadius: 24,
                    background: 'var(--surface)',
                    border: `1px solid ${recording.cancel ? 'var(--like)' : 'var(--accent)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      flex: '0 0 9px',
                      borderRadius: '50%',
                      background: 'var(--like)',
                      display: 'block',
                      animation: 'fmDot .9s infinite',
                    }}
                  />
                  <span style={{ flex: '0 0 auto', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {mmss(recording.seconds)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 26,
                      overflow: 'hidden',
                    }}
                  >
                    {recordingBars(recording.seconds).map((height, i) => (
                      <span
                        key={i}
                        style={{
                          width: 2.5,
                          flex: '0 0 2.5px',
                          borderRadius: 2,
                          height,
                          background: 'var(--accent)',
                          display: 'block',
                        }}
                      />
                    ))}
                  </span>
                  <span
                    style={{
                      flex: '0 0 auto',
                      fontSize: 12,
                      color: recording.cancel ? 'var(--like)' : 'var(--ink3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {recording.cancel ? t.recCanceled : t.slideCancel}
                  </span>
                  <button
                    className="hov-like"
                    onClick={() => {
                      setRecording(null);
                      showToast(t.recCanceled);
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      flex: '0 0 40px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--ink3)',
                    }}
                  >
                    <Icon name="delete" size={20} />
                  </button>
                  <button
                    onClick={() => stopRecording(true)}
                    style={{
                      width: 42,
                      height: 42,
                      flex: '0 0 42px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'var(--accentInk)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon name="send" size={20} fill={1} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {menuMessage && (
        <MessageMenu
          message={menuMessage}
          onClose={() => setMenuMessage(null)}
          onReact={(icon) => {
            reactToMessage(kind, id, menuMessage.id, icon);
            setMenuMessage(null);
          }}
          onReply={() => {
            setReplyTo({ id: menuMessage.id, text: menuMessage.text ?? menuMessage.mediaLabel ?? '' });
            setMenuMessage(null);
          }}
          onDelete={() => {
            deleteMessage(kind, id, menuMessage.id);
            setMenuMessage(null);
          }}
        />
      )}

      {attachOpen && (
        <AttachSheet
          onClose={() => setAttachOpen(false)}
          onPick={(item) => pushMessage(kind, id, item as Partial<Message> & { kind: Message['kind'] })}
        />
      )}

      {call && conversation && (
        <CallOverlay
          kind={call.kind}
          userId={conversation.userId}
          seconds={call.seconds}
          live={call.live}
          muted={callMuted}
          cameraOn={cameraOn}
          onToggleMute={() => setCallMuted((v) => !v)}
          onToggleCamera={() => setCameraOn((v) => !v)}
          onEnd={endCall}
        />
      )}
    </>
  );
}
