import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon } from './Icon';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { initials as toInitials, rel } from '../lib/format';
import type { PostKind, Visibility } from '../types';

const sheetShell = {
  width: '100%',
  maxWidth: 520,
  background: 'var(--bg)',
  borderRadius: '22px 22px 0 0',
  borderTop: '1px solid var(--line)',
  boxShadow: 'var(--shadow)',
} as const;

const backdrop = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  background: 'oklch(0.1 0 0 / 0.5)',
} as const;

function Composer() {
  const { t, composer, setComposer, closeComposer, publish } = useApp();
  const navigate = useNavigate();
  if (!composer.open) return null;

  const field = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 12,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    fontSize: 14.5,
    outline: 'none',
  } as const;

  const kinds: { key: PostKind; icon: string; label: string }[] = [
    { key: 'text', icon: 'notes', label: t.text },
    { key: 'photo', icon: 'image', label: t.photo },
    { key: 'video', icon: 'movie', label: t.video },
  ];

  const visibilities: { key: Visibility; icon: string; label: string }[] = [
    { key: 'public', icon: 'public', label: t.public },
    { key: 'followers', icon: 'group', label: t.followersOnly },
    { key: 'private', icon: 'lock', label: t.private },
  ];

  return (
    <div style={{ ...backdrop, zIndex: 70, background: 'oklch(0.1 0 0 / 0.55)', backdropFilter: 'blur(3px)' }}>
      <div
        style={{
          ...sheetShell,
          maxWidth: 560,
          maxHeight: '92dvh',
          overflowY: 'auto',
          animation: 'fmIn .28s ease both',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
            position: 'sticky',
            top: 0,
            background: 'var(--bg)',
            zIndex: 2,
          }}
        >
          <button
            className="hov-surface"
            onClick={closeComposer}
            style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ink2)' }}
          >
            <Icon name="close" size={22} />
          </button>
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
            {t.create}
          </h2>
          <button
            onClick={() => publish(() => navigate('/following'))}
            style={{
              padding: '9px 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--accentInk)',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {composer.busy && (
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  border: '2px solid color-mix(in oklab, var(--accentInk) 35%, transparent)',
                  borderTopColor: 'var(--accentInk)',
                  animation: 'fmSpin .7s linear infinite',
                  display: 'block',
                }}
              />
            )}
            {composer.editing ? t.save : t.publish}
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            {kinds.map((kind) => {
              const active = composer.kind === kind.key;
              return (
                <button
                  key={kind.key}
                  onClick={() => setComposer({ kind: kind.key, media: kind.key === 'text' ? [] : composer.media })}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: 11,
                    borderRadius: 12,
                    background: active ? 'var(--surface2)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--ink3)',
                    border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
                    fontSize: 13.5,
                    fontWeight: 500,
                  }}
                >
                  <Icon name={kind.icon} size={19} />
                  {kind.label}
                </button>
              );
            })}
          </div>

          <textarea
            className="field"
            value={composer.text}
            onChange={(e) => setComposer({ text: e.target.value, error: '' })}
            placeholder={t.captionPh}
            style={{
              width: '100%',
              minHeight: 118,
              resize: 'none',
              padding: 14,
              borderRadius: 14,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: 16,
              lineHeight: 1.55,
              outline: 'none',
            }}
          />

          {composer.kind !== 'text' && (
            <div style={{ display: 'flex', gap: 9, overflowX: 'auto', marginTop: 12, paddingBottom: 4 }}>
              {composer.media.map((item, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    flex: '0 0 116px',
                    aspectRatio: item.ratio,
                    borderRadius: 13,
                    overflow: 'hidden',
                    background: 'repeating-linear-gradient(135deg, var(--surface2) 0 9px, var(--surface) 9px 18px)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      padding: 9,
                      fontFamily: 'ui-monospace,monospace',
                      fontSize: 9.5,
                      lineHeight: 1.35,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--ink3)',
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </span>
                  <button
                    onClick={() => setComposer({ media: composer.media.filter((_, j) => j !== i) })}
                    style={{
                      position: 'absolute',
                      right: 5,
                      top: 5,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'oklch(0.15 0 0 / 0.6)',
                      color: 'oklch(0.99 0 0)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setComposer({
                    media: [
                      ...composer.media,
                      composer.kind === 'video'
                        ? { label: 'vidéo 9:16 · nouvelle capture', ratio: '9/16' }
                        : { label: `photo · nouvel envoi ${composer.media.length + 1}`, ratio: '4/5' },
                    ],
                  })
                }
                style={{
                  flex: '0 0 116px',
                  aspectRatio: '4/5',
                  borderRadius: 13,
                  border: '1px dashed var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--ink3)',
                }}
              >
                <Icon name="add_photo_alternate" size={24} />
                <span style={{ fontSize: 11.5 }}>{t.addMedia}</span>
              </button>
            </div>
          )}

          <input
            className="field"
            value={composer.tags}
            onChange={(e) => setComposer({ tags: e.target.value })}
            placeholder={t.hashtags}
            style={{ ...field, marginTop: 12 }}
          />
          <input
            className="field"
            value={composer.location}
            onChange={(e) => setComposer({ location: e.target.value })}
            placeholder={t.locPh}
            style={{ ...field, marginTop: 9 }}
          />

          <p
            style={{
              margin: '18px 0 9px',
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: 'var(--ink3)',
            }}
          >
            {t.visibility}
          </p>
          <div style={{ display: 'flex', gap: 7 }}>
            {visibilities.map((option) => {
              const active = composer.visibility === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => setComposer({ visibility: option.key })}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: 11,
                    borderRadius: 999,
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--accentInk)' : 'var(--ink3)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Icon name={option.icon} size={17} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {!!composer.error && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'color-mix(in oklab, var(--like) 14%, transparent)',
                color: 'var(--like)',
                fontSize: 13.5,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              <Icon name="error" size={19} />
              {composer.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoryViewer() {
  const { data, t, lang, userById } = useApp();
  const { story, setStory, closeStory } = useOverlays();

  useEffect(() => {
    if (!story) return;
    const timer = window.setInterval(() => {
      setStory((() => {
        const group = data.stories[story.groupIndex];
        if (!group) return null;
        const progress = story.progress + 0.02;
        if (progress < 1) return { ...story, progress };
        if (story.itemIndex + 1 < group.items.length)
          return { groupIndex: story.groupIndex, itemIndex: story.itemIndex + 1, progress: 0 };
        if (story.groupIndex + 1 < data.stories.length)
          return { groupIndex: story.groupIndex + 1, itemIndex: 0, progress: 0 };
        return null;
      })());
    }, 100);
    return () => window.clearInterval(timer);
  }, [story, data.stories, setStory]);

  if (!story) return null;
  const group = data.stories[story.groupIndex];
  if (!group) return null;
  const author = userById(group.userId);
  const item = group.items[story.itemIndex] ?? group.items[0];

  const next = () => {
    if (story.itemIndex + 1 < group.items.length)
      setStory({ groupIndex: story.groupIndex, itemIndex: story.itemIndex + 1, progress: 0 });
    else if (story.groupIndex + 1 < data.stories.length)
      setStory({ groupIndex: story.groupIndex + 1, itemIndex: 0, progress: 0 });
    else closeStory();
  };

  const previous = () => {
    if (story.itemIndex > 0)
      setStory({ groupIndex: story.groupIndex, itemIndex: story.itemIndex - 1, progress: 0 });
    else if (story.groupIndex > 0) setStory({ groupIndex: story.groupIndex - 1, itemIndex: 0, progress: 0 });
    else setStory({ ...story, progress: 0 });
  };

  const hoursLeft = Math.max(1, 24 - Math.floor((Date.now() - item.createdAt) / 3600000));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'oklch(0.1 0 0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: 480,
          background: `repeating-linear-gradient(135deg, oklch(0.30 0.035 ${author.hue}) 0 14px, oklch(0.23 0.025 ${author.hue}) 14px 28px)`,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: 10, right: 10, top: 10, display: 'flex', gap: 4, zIndex: 3 }}>
          {group.items.map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 2.5,
                borderRadius: 2,
                background: 'oklch(0.99 0 0 / 0.28)',
                overflow: 'hidden',
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width:
                    i < story.itemIndex
                      ? '100%'
                      : i === story.itemIndex
                        ? `${Math.round(story.progress * 100)}%`
                        : '0%',
                  background: 'oklch(0.99 0 0 / 0.95)',
                }}
              />
            </span>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            top: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            zIndex: 3,
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 600,
              fontSize: 13,
              color: `oklch(0.16 0.03 ${author.hue})`,
              background: `oklch(0.82 0.10 ${author.hue})`,
              border: '1.5px solid oklch(0.99 0 0 / 0.7)',
            }}
          >
            {toInitials(author.name)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.99 0 0)' }}>{author.name}</div>
            <div style={{ fontSize: 11.5, color: 'oklch(0.99 0 0 / 0.6)' }}>
              {rel(item.createdAt, lang)} · {t.storyLeft} {hoursLeft} h
            </div>
          </div>
          <button
            onClick={closeStory}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'oklch(0.15 0 0 / 0.35)',
              color: 'oklch(0.99 0 0)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <button onClick={previous} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '32%', zIndex: 2 }} />
        <button onClick={next} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '68%', zIndex: 2 }} />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: '0 40px',
            textAlign: 'center',
            fontFamily: 'ui-monospace,monospace',
            fontSize: 11.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: `oklch(0.94 0.02 ${author.hue})`,
          }}
        >
          {item.label}
        </span>
      </div>
    </div>
  );
}

function ShareSheet() {
  const { data, t, userById, sharePost, showToast } = useApp();
  const { sharePostId, closeShare } = useOverlays();
  if (!sharePostId) return null;

  const targets = [
    ...data.conversations.map((c) => {
      const other = userById(c.userId);
      return { id: c.id, kind: 'dm' as const, name: other.name, hue: other.hue, initials: toInitials(other.name) };
    }),
    ...data.groups.map((g) => ({
      id: g.id,
      kind: 'group' as const,
      name: g.name,
      hue: g.hue,
      initials: toInitials(g.name),
    })),
  ];

  return (
    <div onClick={closeShare} style={{ ...backdrop, zIndex: 75 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...sheetShell, padding: '18px 0 22px', animation: 'fmIn .26s ease both' }}
      >
        <h2
          style={{
            margin: '0 0 6px',
            padding: '0 18px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {t.sendTo}
        </h2>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '14px 18px 18px' }}>
          {targets.map((target) => (
            <button
              key={target.id}
              onClick={() => {
                sharePost(sharePostId, { kind: target.kind, id: target.id });
                closeShare();
              }}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                width: 72,
              }}
            >
              <Avatar hue={target.hue} initials={target.initials} size={56} fontSize={16} />
              <span
                style={{
                  fontSize: 11.5,
                  color: 'var(--ink2)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 72,
                }}
              >
                {target.name}
              </span>
            </button>
          ))}
        </div>
        <button
          className="hov-surface"
          onClick={() => {
            closeShare();
            showToast(t.copied);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            width: '100%',
            padding: '15px 18px',
            textAlign: 'left',
            borderTop: '1px solid var(--line)',
          }}
        >
          <Icon name="link" size={21} color="var(--ink2)" />
          <span style={{ fontSize: 15 }}>{t.copyLink}</span>
        </button>
      </div>
    </div>
  );
}

function ActionSheet() {
  const navigate = useNavigate();
  const { t, deletePost, blockUser, editPost, showToast, togglePin, toggleArchive, markUnread } = useApp();
  const { sheet, closeSheet } = useOverlays();
  if (!sheet) return null;

  const items: { icon: string; label: string; danger?: boolean; run: () => void }[] = [];

  if (sheet.kind === 'post') {
    items.push({
      icon: 'link',
      label: t.copyLink,
      run: () => {
        closeSheet();
        showToast(t.copied);
      },
    });
    if (sheet.mine) {
      items.push({
        icon: 'edit',
        label: t.edit,
        run: () => {
          editPost(sheet.id);
          closeSheet();
        },
      });
      items.push({
        icon: 'delete',
        label: t.del,
        danger: true,
        run: () => {
          deletePost(sheet.id);
          closeSheet();
        },
      });
    } else {
      items.push({
        icon: 'flag',
        label: t.report,
        run: () => {
          closeSheet();
          showToast(t.reported);
        },
      });
      items.push({
        icon: 'block',
        label: t.block,
        danger: true,
        run: () => {
          blockUser(sheet.author);
          closeSheet();
        },
      });
    }
  } else if (sheet.kind === 'user') {
    items.push({
      icon: 'flag',
      label: t.report,
      run: () => {
        closeSheet();
        showToast(t.reported);
      },
    });
    items.push({
      icon: 'block',
      label: t.block,
      danger: true,
      run: () => {
        blockUser(sheet.id);
        closeSheet();
        navigate('/');
      },
    });
  } else {
    items.push({
      icon: sheet.pinned ? 'keep_off' : 'keep',
      label: sheet.pinned ? t.unpin : t.pin,
      run: () => {
        togglePin(sheet.id);
        closeSheet();
      },
    });
    items.push({
      icon: sheet.archived ? 'unarchive' : 'archive',
      label: sheet.archived ? t.unarchive : t.archive,
      run: () => {
        toggleArchive(sheet.id);
        closeSheet();
      },
    });
    items.push({
      icon: 'mark_chat_unread',
      label: t.markUnread,
      run: () => {
        markUnread(sheet.id);
        closeSheet();
      },
    });
  }

  return (
    <div onClick={closeSheet} style={{ ...backdrop, zIndex: 75 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...sheetShell,
          padding: '10px 0 calc(14px + env(safe-area-inset-bottom))',
          animation: 'fmIn .24s ease both',
        }}
      >
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
              padding: '15px 20px',
              textAlign: 'left',
              color: item.danger ? 'var(--like)' : 'var(--ink)',
            }}
          >
            <Icon name={item.icon} size={21} />
            <span style={{ fontSize: 15.5 }}>{item.label}</span>
          </button>
        ))}
        <button
          onClick={closeSheet}
          style={{
            display: 'block',
            width: '100%',
            padding: '15px 20px',
            textAlign: 'center',
            color: 'var(--ink3)',
            fontSize: 15,
            borderTop: '1px solid var(--line)',
            marginTop: 6,
          }}
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 96,
        zIndex: 90,
        padding: '12px 18px',
        borderRadius: 999,
        background: 'var(--surface2)',
        color: 'var(--ink)',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: 'var(--shadow)',
        animation: 'fmToast .25s ease both',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        maxWidth: '88vw',
      }}
    >
      <Icon name="check_circle" size={19} color="var(--accent)" />
      {toast}
    </div>
  );
}

function OfflineBar() {
  const { offline, t } = useApp();
  if (!offline) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 95,
        padding: '9px 16px',
        background: 'var(--like)',
        color: 'oklch(0.99 0.01 20)',
        fontSize: 13,
        fontWeight: 500,
        textAlign: 'center',
      }}
    >
      {t.offline}
    </div>
  );
}

export function Overlays() {
  return (
    <>
      <Composer />
      <StoryViewer />
      <ShareSheet />
      <ActionSheet />
      <Toast />
      <OfflineBar />
    </>
  );
}
