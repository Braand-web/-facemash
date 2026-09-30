import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon } from './Icon';
import { Segmented } from './ui';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { storyKey, markSeen, useSeenStories, STORY_BGS } from '../lib/stories';
import { compressImage, toDataUrl } from '../lib/image';
import { uploadFile } from '../lib/upload';
import { haptic } from '../lib/haptics';
import { initials as toInitials, rel } from '../lib/format';
import type { StoryItem } from '../types';

/* ---------------------------------------------------------------- rail -- */

export function StoryRail({ compact }: { compact?: boolean }) {
  const { data, t, me, meId, userById } = useApp();
  const { openStory, openStoryComposer } = useOverlays();
  const seen = useSeenStories();
  const size = compact ? 50 : 64;
  const mineIndex = data.stories.findIndex((g) => g.userId === meId);
  const mine = mineIndex >= 0 ? data.stories[mineIndex] : null;

  const ring = (seenAll: boolean, child: React.ReactNode) => (
    <span className={`ring${seenAll ? ' ring--seen' : ''}`} style={{ width: size, height: size }}>
      <span className="ring__gap">{child}</span>
    </span>
  );

  return (
    <div className="story-rail" style={compact ? { padding: '10px 14px' } : undefined}>
      <div className="story-rail__item" style={compact ? { width: 62 } : undefined}>
        <span style={{ position: 'relative' }}>
          <button onClick={() => (mine ? openStory(mineIndex) : openStoryComposer())} aria-label={t.yourStory}>
            {mine ? (
              ring(mine.items.every((i) => seen.has(storyKey(meId, i))), <Avatar hue={me.hue} initials={toInitials(me.name)} size={size - 10} />)
            ) : (
              <span className="ring ring--add" style={{ width: size, height: size }}>
                <span className="ring__gap" style={{ background: 'transparent' }}>
                  <Icon name="add" size={24} color="var(--ink3)" />
                </span>
              </span>
            )}
          </button>
          {mine && (
            <button
              className="btn-primary"
              onClick={openStoryComposer}
              aria-label={t.addStory}
              style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '2.5px solid var(--bg)', color: '#fff', background: 'var(--grad)' }}
            >
              <Icon name="add" size={14} />
            </button>
          )}
        </span>
        <span className="story-rail__name">{t.yourStory}</span>
      </div>
      {data.stories.map((group, i) => {
        if (group.userId === meId) return null;
        const author = userById(group.userId);
        const allSeen = group.items.every((item) => seen.has(storyKey(group.userId, item)));
        return (
          <div key={group.userId} className="story-rail__item" style={compact ? { width: 62 } : undefined}>
            <button onClick={() => openStory(i)} aria-label={author.name}>
              {ring(allSeen, <Avatar hue={author.hue} initials={toInitials(author.name)} size={size - 10} />)}
            </button>
            <span className="story-rail__name">{author.name.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- viewer -- */

const REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

function Player({ groupIndex, itemIndex }: { groupIndex: number; itemIndex: number }) {
  const navigate = useNavigate();
  const { data, t, lang, userById, meId, deleteStory, openConversationWith, sendMessage, showToast } = useApp();
  const { setStory, closeStory } = useOverlays();
  const group = data.stories[groupIndex];
  const item: StoryItem | undefined = group?.items[itemIndex];
  const author = userById(group?.userId ?? meId);
  const mine = group?.userId === meId;

  const [holding, setHolding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reply, setReply] = useState('');
  const [floating, setFloating] = useState<{ id: number; e: string; dx: number }[]>([]);
  const [videoMs, setVideoMs] = useState<number | null>(null);
  const bar = useRef<HTMLElement | null>(null);
  const elapsed = useRef(0);
  const video = useRef<HTMLVideoElement | null>(null);
  const paused = holding || typing || menu;

  const isVideo = item?.kind === 'video' && !!item.url;
  const duration = isVideo ? videoMs : Math.min(10000, 5000 + (item?.text?.length ?? 0) * 40);

  const go = (dir: 1 | -1) => {
    if (!group) return;
    const i = itemIndex + dir;
    if (i >= 0 && i < group.items.length) setStory({ groupIndex, itemIndex: i });
    else if (dir === 1 && groupIndex + 1 < data.stories.length) setStory({ groupIndex: groupIndex + 1, itemIndex: 0 });
    else if (dir === -1 && groupIndex > 0) setStory({ groupIndex: groupIndex - 1, itemIndex: 0 });
    else if (dir === 1) closeStory();
  };
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    if (item) markSeen(storyKey(group.userId, item));
  }, [item, group?.userId]);

  useEffect(() => {
    if (!duration || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const p = Math.min(1, elapsed.current / duration);
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (p >= 1) goRef.current(1);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, paused]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (paused) el.pause();
    else void el.play().catch(() => {});
  }, [paused, item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing) return;
      if (e.key === 'ArrowRight') goRef.current(1);
      else if (e.key === 'ArrowLeft') goRef.current(-1);
      else if (e.key === 'Escape') closeStory();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [typing, closeStory]);

  if (!group || !item) return null;

  const send = async (text: string, emoji?: string) => {
    const id = openConversationWith(author.id);
    const body = emoji ? `${emoji}  ${t.storyReact}` : `${t.storyReplyPrefix} ${text}`;
    const ok = await sendMessage('dm', id, body);
    if (ok) showToast(t.sentOk);
  };

  const react = (e: string) => {
    haptic('light');
    setFloating((list) => [...list, { id: Date.now() + Math.random(), e, dx: Math.round((Math.random() - 0.5) * 120) }]);
    void send('', e);
  };

  const hoursLeft = Math.max(1, 24 - Math.floor((Date.now() - item.createdAt) / 3600000));
  const hasMedia = !!item.url && item.kind !== 'text';
  const bg = STORY_BGS[item.bg % STORY_BGS.length];

  return (
    <div className="story-view" role="dialog" aria-modal="true" aria-label={author.name} onClick={closeStory}>
      <div
        className="story-frame"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
      >
        <div className="story-bg" style={{ ['--story-bg' as string]: bg }} />
        {hasMedia &&
          (item.kind === 'video' ? (
            <video
              ref={video}
              src={item.url}
              autoPlay
              playsInline
              onLoadedMetadata={(e) => setVideoMs(Math.min(30000, Math.round(e.currentTarget.duration * 1000)))}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img src={item.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ))}
        {!hasMedia && item.kind !== 'text' && <span className="media-art" style={{ position: 'absolute', inset: 0, ['--h' as string]: author.hue }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgb(0 0 0 / 45%), transparent 24%, transparent 60%, rgb(0 0 0 / 60%))' }} />

        {(item.kind === 'text' || !hasMedia) && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '90px 30px 120px' }}>
            <p
              className="display"
              style={{
                margin: 0,
                textAlign: 'center',
                fontWeight: 800,
                lineHeight: 1.15,
                fontSize: (item.text?.length ?? 0) > 90 ? 24 : (item.text?.length ?? 0) > 40 ? 32 : 42,
                textShadow: '0 2px 18px rgb(0 0 0 / 30%)',
                overflowWrap: 'anywhere',
              }}
            >
              {item.text}
            </p>
          </div>
        )}
        {hasMedia && !!item.text && (
          <p style={{ position: 'absolute', left: 20, right: 20, bottom: 110, margin: 0, textAlign: 'center', fontSize: 18, fontWeight: 600, textShadow: '0 2px 12px rgb(0 0 0 / 60%)' }}>{item.text}</p>
        )}

        <button aria-label="Précédent" onClick={() => go(-1)} style={{ position: 'absolute', left: 0, top: 90, bottom: 110, width: '32%', zIndex: 3 }} />
        <button aria-label="Suivant" onClick={() => go(1)} style={{ position: 'absolute', right: 0, top: 90, bottom: 110, width: '68%', zIndex: 3 }} />

        <div className="story-bars">
          {group.items.map((_, i) => (
            <i key={i}>
              <b ref={i === itemIndex ? (el) => { bar.current = el; } : undefined} style={{ transformOrigin: 'left', transform: `scaleX(${i < itemIndex ? 1 : 0})` }} />
            </i>
          ))}
        </div>

        <div style={{ position: 'absolute', zIndex: 6, top: 'calc(24px + var(--safe-top))', left: 14, right: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { closeStory(); navigate(`/profile/${author.id}`); }} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, textAlign: 'left' }}>
            <Avatar hue={author.hue} initials={toInitials(author.name)} size={38} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 650, textShadow: '0 1px 6px rgb(0 0 0 / 50%)' }}>{author.name}</span>
              <span style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>
                {rel(item.createdAt, lang)} · {t.storyLeft} {hoursLeft} h
              </span>
            </span>
          </button>
          {mine && (
            <button className="icon-btn icon-btn--glass" onClick={() => setMenu(true)} aria-label={t.more} style={{ width: 38, height: 38 }}>
              <Icon name="more_horiz" size={20} />
            </button>
          )}
          <button className="icon-btn icon-btn--glass" onClick={closeStory} aria-label="Fermer" style={{ width: 38, height: 38 }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {floating.map((f) => (
          <span key={f.id} className="story-emoji" style={{ left: '50%', ['--dx' as string]: `${f.dx}px` }} onAnimationEnd={() => setFloating((l) => l.filter((x) => x.id !== f.id))}>
            {f.e}
          </span>
        ))}

        <div style={{ position: 'absolute', zIndex: 6, left: 0, right: 0, bottom: 0, padding: '12px 14px calc(14px + var(--safe-bottom))' }} onPointerDown={(e) => e.stopPropagation()}>
          {mine ? (
            <p style={{ margin: 0, textAlign: 'center', fontSize: 13, opacity: 0.85 }}>{t.yourStoryHint}</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10, opacity: typing ? 1 : 0.95 }}>
                {REACTIONS.map((e) => (
                  <button key={e} onClick={() => react(e)} style={{ fontSize: 26, padding: '2px 7px' }} aria-label={e}>
                    {e}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  void send(reply.trim());
                  setReply('');
                  setTyping(false);
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  placeholder={t.storyReplyPh.replace('{name}', author.name.split(' ')[0])}
                  style={{ flex: 1, minWidth: 0, minHeight: 46, padding: '0 18px', borderRadius: 999, border: '1.5px solid rgb(255 255 255 / 50%)', background: 'rgb(0 0 0 / 28%)', color: '#fff', outline: 'none', backdropFilter: 'blur(10px)' }}
                />
                {reply.trim() && (
                  <button type="submit" className="btn btn-primary" aria-label={t.send} style={{ width: 46, padding: 0, borderRadius: '50%' }}>
                    <Icon name="arrow_upward" size={20} />
                  </button>
                )}
              </form>
            </>
          )}
        </div>

        {menu && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'flex', alignItems: 'flex-end', background: 'rgb(0 0 0 / 55%)' }} onClick={() => setMenu(false)}>
            <div style={{ width: '100%', background: 'var(--bg-elev)', color: 'var(--ink)', borderRadius: '26px 26px 0 0', padding: '8px 0 calc(12px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
              <button
                className="menu-item menu-item--danger"
                onClick={() => {
                  setMenu(false);
                  deleteStory(item);
                  if (group.items.length <= 1) closeStory();
                  else if (itemIndex >= group.items.length - 1) setStory({ groupIndex, itemIndex: itemIndex - 1 });
                }}
              >
                <Icon name="delete" size={21} />
                {t.del}
              </button>
              <button className="menu-item" onClick={() => setMenu(false)}>
                <Icon name="close" size={21} />
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StoryViewer() {
  const { story } = useOverlays();
  if (!story) return null;
  return <Player key={`${story.groupIndex}-${story.itemIndex}`} groupIndex={story.groupIndex} itemIndex={story.itemIndex} />;
}

/* ------------------------------------------------------------ composer -- */

type Mode = 'text' | 'media';

export function StoryComposer() {
  const { storyComposer, closeStoryComposer } = useOverlays();
  const { t, meId, syncing, createStory, showToast } = useApp();
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [bg, setBg] = useState(0);
  const [media, setMedia] = useState<{ url: string; video: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const picker = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setText('');
    setMedia(null);
    setMode('text');
  };
  const close = () => {
    reset();
    closeStoryComposer();
  };

  useEffect(() => {
    if (!storyComposer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyComposer]);

  const options = useMemo(
    () => [
      { key: 'text' as const, label: t.text, icon: 'text_format' },
      { key: 'media' as const, label: t.photoVideo, icon: 'image' },
    ],
    [t],
  );

  if (!storyComposer) return null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const video = file.type.startsWith('video/');
      if (syncing) {
        const uploaded = await uploadFile(file, meId, true);
        if (uploaded.local) showToast(t.uploadErr);
        else setMedia({ url: uploaded.url, video });
      } else if (video) {
        setMedia({ url: URL.createObjectURL(file), video });
      } else {
        setMedia({ url: await toDataUrl(await compressImage(file, 900, 0.78)), video });
      }
    } finally {
      setBusy(false);
    }
  };

  const ready = mode === 'text' ? !!text.trim() : !!media;
  const publish = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const ok = await createStory(
      mode === 'text'
        ? { kind: 'text', text: text.trim(), bg }
        : { kind: media!.video ? 'video' : 'photo', text: text.trim() || undefined, url: media!.url, bg },
    );
    setBusy(false);
    if (ok) {
      haptic('success');
      close();
    }
  };

  return (
    <div className="story-view" role="dialog" aria-modal="true" aria-label={t.newStory} style={{ zIndex: 86 }} onClick={close}>
      <div className="story-frame" onClick={(e) => e.stopPropagation()}>
        <div className="story-bg" style={{ ['--story-bg' as string]: STORY_BGS[bg] }} />
        {mode === 'media' && media && (media.video ? (
          <video src={media.url} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <img src={media.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ))}

        <div style={{ position: 'absolute', zIndex: 5, top: 'calc(12px + var(--safe-top))', left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="icon-btn icon-btn--glass" onClick={close} aria-label="Fermer">
            <Icon name="close" size={22} />
          </button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Segmented glass options={options} value={mode} onChange={setMode} style={{ width: 230 }} />
          </div>
          <span style={{ width: 42 }} />
        </div>

        {mode === 'text' ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '100px 28px 150px' }}>
            <textarea
              autoFocus
              value={text}
              maxLength={160}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.storyPh}
              className="display"
              style={{ width: '100%', background: 'none', border: 0, outline: 'none', resize: 'none', textAlign: 'center', color: '#fff', fontSize: text.length > 70 ? 26 : 38, fontWeight: 800, lineHeight: 1.15, minHeight: 200 }}
            />
          </div>
        ) : !media ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 30 }}>
            <button className="btn btn-lg" onClick={() => picker.current?.click()} disabled={busy} style={{ background: 'rgb(255 255 255 / 18%)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgb(255 255 255 / 30%)' }}>
              <Icon name={busy ? 'progress_activity' : 'add_photo_alternate'} size={22} />
              {busy ? t.uploading : t.pickMedia}
            </button>
          </div>
        ) : null}
        <input ref={picker} type="file" accept="image/*,video/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />

        <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, bottom: 0, padding: '12px 16px calc(16px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'media' && media && (
            <input
              value={text}
              maxLength={120}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.captionShort}
              style={{ minHeight: 46, padding: '0 18px', borderRadius: 999, border: '1.5px solid rgb(255 255 255 / 45%)', background: 'rgb(0 0 0 / 30%)', color: '#fff', outline: 'none' }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {mode === 'text' ? (
              <div className="hscroll" style={{ flex: 1, gap: 8 }}>
                {STORY_BGS.map((g, i) => (
                  <button key={i} onClick={() => setBg(i)} aria-label={`${t.background} ${i + 1}`} style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: g, border: i === bg ? '3px solid #fff' : '2px solid rgb(255 255 255 / 40%)' }} />
                ))}
              </div>
            ) : media ? (
              <button className="btn btn-ghost" onClick={() => setMedia(null)} style={{ color: '#fff' }}>
                <Icon name="delete" size={18} /> {t.change}
              </button>
            ) : (
              <span style={{ flex: 1 }} />
            )}
            <button className="btn btn-primary btn-lg" onClick={() => void publish()} disabled={!ready || busy}>
              {busy ? <span className="spinner" /> : <Icon name="send" size={18} />}
              {t.shareStory}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
