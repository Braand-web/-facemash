import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon } from './Icon';
import { Sheet, Segmented } from './ui';
import { CommentsSheet } from './Comments';
import { Palette } from './Palette';
import { StoryComposer, StoryViewer } from './Stories';
import { InstallPrompt } from './InstallPrompt';
import { useTrends } from './Shell';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { uploadFile } from '../lib/upload';
import { copyText, postUrl, profileUrl, shareLink } from '../lib/share';
import { haptic } from '../lib/haptics';
import { initials as toInitials } from '../lib/format';
import type { PostKind, Visibility } from '../types';

const DRAFT_KEY = 'facemash.composer.draft';
const LIMIT = 500;

const kindOf = (media: { video?: boolean }[]): PostKind =>
  media.some((m) => m.video) ? 'video' : media.length > 1 ? 'carousel' : media.length === 1 ? 'photo' : 'text';

function CountRing({ value }: { value: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, value / LIMIT);
  const near = value > LIMIT * 0.9;
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-label={`${value}/${LIMIT}`} role="img">
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="3" />
      <circle cx="15" cy="15" r={r} fill="none" stroke={near ? 'var(--warning)' : 'var(--accent)'} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 15 15)" style={{ transition: 'stroke-dashoffset 200ms' }} />
    </svg>
  );
}

function Composer() {
  const { t, composer, setComposer, closeComposer, publish, meId, me, syncing, offline, showToast } = useApp();
  const navigate = useNavigate();
  const trends = useTrends();
  const filePicker = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const mediaRef = useRef(composer.media);
  mediaRef.current = composer.media;

  // Drafts: text, tags, place and audience survive an accidental close or reload.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (composer.open && !wasOpen.current && !composer.editing && !composer.text && !composer.media.length) {
      try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Partial<typeof composer> | null;
        if (saved && (saved.text || saved.tags)) {
          setComposer({ text: saved.text ?? '', tags: saved.tags ?? '', location: saved.location ?? '', visibility: saved.visibility ?? 'public' });
          showToast(t.draftRestored);
        }
      } catch {
        /* unreadable draft: start fresh */
      }
    }
    wasOpen.current = composer.open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer.open]);

  useEffect(() => {
    if (!composer.open || composer.editing) return;
    try {
      if (composer.text || composer.tags) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: composer.text, tags: composer.tags, location: composer.location, visibility: composer.visibility }));
      } else localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [composer.open, composer.editing, composer.text, composer.tags, composer.location, composer.visibility]);

  const addFiles = async (files: FileList | File[] | null, only?: 'video' | 'image') => {
    const list = Array.from(files ?? []).filter((f) => (only === 'video' ? f.type.startsWith('video/') : only === 'image' ? f.type.startsWith('image/') : /^(image|video)\//.test(f.type)));
    if (!list.length) return;
    if (syncing && offline) {
      showToast(t.networkRequired);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(list.map((file) => uploadFile(file, meId, syncing)));
      if (syncing && uploaded.some((item) => item.local)) {
        uploaded.filter((item) => item.local).forEach((item) => URL.revokeObjectURL(item.url));
        showToast(offline ? t.networkRequired : t.uploadErr);
        return;
      }
      const media = [...mediaRef.current, ...uploaded.map((u) => ({ label: u.label, ratio: u.ratio, url: u.url, video: u.video }))];
      setComposer({ media, kind: kindOf(media), error: '' });
    } finally {
      setUploading(false);
    }
  };

  if (!composer.open) return null;

  const removeAt = (i: number) => {
    const media = composer.media.filter((_, j) => j !== i);
    setComposer({ media, kind: kindOf(media) });
  };
  const usedTags = composer.tags.toLowerCase().split(/[,\s]+/).filter(Boolean).map((x) => (x[0] === '#' ? x : `#${x}`));
  const suggestions = trends.map((x) => x.tag).filter((tag) => !usedTags.includes(tag.toLowerCase())).slice(0, 5);
  const visibilities: { key: Visibility; icon: string; label: string }[] = [
    { key: 'public', icon: 'public', label: t.public },
    { key: 'followers', icon: 'group', label: t.followersOnly },
    { key: 'private', icon: 'lock', label: t.private },
  ];
  const empty = !composer.text.trim() && !composer.media.length;

  return (
    <Sheet
      onClose={closeComposer}
      label={t.create}
      title={composer.editing ? t.editPost : t.newPost}
      height="min(94dvh, 860px)"
      z={70}
      right={
          <button className="btn btn-primary btn-sm" onClick={() => void publish(() => navigate('/following'))} disabled={composer.busy || empty}>
          {composer.busy && <span className="spinner" />}
          {composer.editing ? t.save : t.publish}
        </button>
      }
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
        style={{ padding: 16, outline: dragging ? '2px dashed var(--accent)' : 'none', outlineOffset: -8, borderRadius: 24 }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar hue={me.hue} initials={toInitials(me.name)} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <textarea
              autoFocus
              value={composer.text}
              maxLength={LIMIT}
              onChange={(e) => { setComposer({ text: e.target.value, error: '' }); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
              placeholder={t.captionPh}
              rows={3}
              style={{ width: '100%', minHeight: 96, padding: '8px 0', background: 'none', border: 0, outline: 'none', resize: 'none', fontSize: 18, lineHeight: 1.5 }}
            />
          </div>
        </div>

        {(composer.media.length > 0 || uploading) && (
          <div className="hscroll" style={{ margin: '8px 0 4px 56px' }}>
            {composer.media.map((item, i) => (
              <div key={i} style={{ position: 'relative', flex: '0 0 124px', aspectRatio: '4 / 5', borderRadius: 18, overflow: 'hidden', background: 'var(--surface2)', border: '1px solid var(--line)' }}>
                {item.url ? (item.video ? <video src={item.url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={item.url} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : <span className="media-art" style={{ position: 'absolute', inset: 0 }} />}
                {item.video && <span className="tile__kind" style={{ left: 8, right: 'auto' }}><Icon name="play_arrow" size={14} fill={1} /></span>}
                <button onClick={() => removeAt(i)} aria-label={t.del} className="icon-btn icon-btn--glass" style={{ position: 'absolute', right: 6, top: 6, width: 28, height: 28 }}>
                  <Icon name="close" size={15} />
                </button>
              </div>
            ))}
            {uploading && <div className="skeleton" style={{ flex: '0 0 124px', aspectRatio: '4 / 5', borderRadius: 18 }} />}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="hscroll" style={{ margin: '10px 0 0 56px' }}>
            {suggestions.map((tag) => (
              <button key={tag} className="chip" onClick={() => setComposer({ tags: `${composer.tags.trim()} ${tag}`.trim() })}>
                {tag}
              </button>
            ))}
          </div>
        )}

        <input className="field" value={composer.tags} onChange={(e) => setComposer({ tags: e.target.value })} placeholder={t.hashtags} style={{ marginTop: 14, minHeight: 48, padding: '0 16px' }} />
        {(showLocation || composer.location) && (
          <input className="field" value={composer.location} onChange={(e) => setComposer({ location: e.target.value })} placeholder={t.locPh} style={{ marginTop: 10, minHeight: 48, padding: '0 16px' }} />
        )}

        <p className="eyebrow" style={{ margin: '20px 0 8px' }}>{t.visibility}</p>
        <Segmented options={visibilities} value={composer.visibility} onChange={(visibility) => setComposer({ visibility })} label={t.visibility} />

        {!!composer.error && (
          <div role="alert" style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)', fontSize: 13.5, display: 'flex', gap: 9, alignItems: 'center' }}>
            <Icon name="error" size={19} />
            {composer.error}
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '10px 12px', borderTop: '1px solid var(--line)', background: 'color-mix(in srgb, var(--bg-elev) 92%, transparent)', backdropFilter: 'blur(16px)' }}>
        <button className="icon-btn" onClick={() => filePicker.current?.click()} disabled={uploading} aria-label={t.addMedia} style={{ color: 'var(--accent-fg)' }}>
          <Icon name={uploading ? 'progress_activity' : 'add_photo_alternate'} size={24} />
        </button>
        <button className="icon-btn" onClick={() => setShowLocation((v) => !v)} aria-label={t.locPh} style={{ color: showLocation || composer.location ? 'var(--accent-fg)' : undefined }}>
          <Icon name="location_on" size={24} />
        </button>
        <button className="icon-btn" onClick={() => setComposer({ text: `${composer.text}${composer.text && !composer.text.endsWith(' ') ? ' ' : ''}#` })} aria-label="#">
          <Icon name="tag" size={24} />
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink3)', fontWeight: 600 }}>{composer.text.length > LIMIT * 0.8 ? LIMIT - composer.text.length : ''}</span>
        <CountRing value={composer.text.length} />
        <input ref={filePicker} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
      </div>
    </Sheet>
  );
}

function ShareSheet() {
  const { data, t, userById, sharePost, showToast, user } = useApp();
  const { sharePostId, closeShare } = useOverlays();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  if (!sharePostId) return null;
  const url = postUrl(sharePostId);
  const post = data.posts.find((p) => p.id === sharePostId);

  const targets = [
    ...data.conversations.filter((c) => !user.blocked[c.userId]).map((c) => {
      const other = userById(c.userId);
      return { id: c.id, kind: 'dm' as const, name: other.name, hue: other.hue, radius: '50%' };
    }),
    ...data.groups.map((g) => ({ id: g.id, kind: 'group' as const, name: g.name, hue: g.hue, radius: '18px' })),
  ];

  const copy = async () => {
    showToast((await copyText(url)) ? t.copied : t.copyFailed);
    closeShare();
  };
  const native = async () => {
    const result = await shareLink({ title: 'Facemash', text: post?.text.slice(0, 120), url });
    if (result === 'copied') showToast(t.copied);
    if (result !== 'cancelled') closeShare();
  };

  return (
    <Sheet onClose={closeShare} label={t.sendTo} title={t.sendTo} z={75}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 6px', padding: '18px 14px 10px' }}>
        {targets.length === 0 && <p style={{ gridColumn: '1 / -1', margin: 0, color: 'var(--ink3)', textAlign: 'center', fontSize: 14 }}>{t.noChatsYet}</p>}
        {targets.map((target) => (
          <button key={target.id} onClick={() => { haptic('light'); sharePost(sharePostId, { kind: target.kind, id: target.id }); setSent((s) => ({ ...s, [target.id]: true })); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{ position: 'relative' }}>
              <Avatar hue={target.hue} initials={toInitials(target.name)} size={58} radius={target.radius} />
              {sent[target.id] && (
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', borderRadius: target.radius, background: 'rgb(0 0 0 / 50%)', color: '#fff' }}>
                  <Icon name="check" size={26} />
                </span>
              )}
            </span>
            <span style={{ maxWidth: '100%', fontSize: 12, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px 18px' }}>
        <button className="btn btn-soft" style={{ flex: 1 }} onClick={() => void copy()}>
          <Icon name="link" size={18} />
          {t.copyLink}
        </button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => void native()}>
          <Icon name="share_network" size={18} />
          {t.shareVia}
        </button>
      </div>
    </Sheet>
  );
}

function ActionSheet() {
  const navigate = useNavigate();
  const { t, deletePost, blockUser, editPost, showToast, togglePin, toggleArchive, markUnread, toggleMute, user, reportPost, reportUser } = useApp();
  const { sheet, closeSheet, openShare } = useOverlays();
  if (!sheet) return null;

  const items: { icon: string; label: string; danger?: boolean; run: () => void }[] = [];
  const copy = (url: string) => async () => {
    closeSheet();
    showToast((await copyText(url)) ? t.copied : t.copyFailed);
  };

  if (sheet.kind === 'post') {
    items.push({ icon: 'send', label: t.share, run: () => { closeSheet(); openShare(sheet.id); } });
    items.push({ icon: 'link', label: t.copyLink, run: copy(postUrl(sheet.id)) });
    if (sheet.mine) {
      items.push({ icon: 'edit', label: t.edit, run: () => { editPost(sheet.id); closeSheet(); } });
      items.push({ icon: 'delete', label: t.del, danger: true, run: () => { deletePost(sheet.id); closeSheet(); if (location.pathname.startsWith('/post/')) navigate('/'); } });
    } else {
      items.push({ icon: 'flag', label: t.report, run: () => { reportPost(sheet.id); closeSheet(); } });
      items.push({ icon: 'block', label: t.block, danger: true, run: () => { blockUser(sheet.author); closeSheet(); } });
    }
  } else if (sheet.kind === 'user') {
    items.push({ icon: 'link', label: t.copyProfileLink, run: copy(profileUrl(sheet.id)) });
    items.push({ icon: 'flag', label: t.report, run: () => { reportUser(sheet.id); closeSheet(); } });
    items.push({ icon: 'block', label: t.block, danger: true, run: () => { blockUser(sheet.id); closeSheet(); navigate('/'); } });
  } else {
    items.push({ icon: sheet.pinned ? 'keep_off' : 'keep', label: sheet.pinned ? t.unpin : t.pin, run: () => { togglePin(sheet.id); closeSheet(); } });
    items.push({ icon: sheet.archived ? 'unarchive' : 'archive', label: sheet.archived ? t.unarchive : t.archive, run: () => { toggleArchive(sheet.id); closeSheet(); } });
    items.push({ icon: 'mark_chat_unread', label: t.markUnread, run: () => { markUnread(sheet.id); closeSheet(); } });
    const muted = !!user.muted[sheet.id];
    items.push({ icon: muted ? 'notifications_active' : 'notifications_off', label: muted ? t.unmute : t.mute, run: () => { toggleMute(sheet.id); closeSheet(); } });
  }

  return (
    <Sheet onClose={closeSheet} label={t.settings} z={75}>
      <div style={{ padding: '6px 0 10px' }}>
        {items.map((item) => (
          <button key={item.label} className={`menu-item${item.danger ? ' menu-item--danger' : ''}`} onClick={item.run}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </button>
        ))}
        <button className="menu-item" onClick={closeSheet} style={{ color: 'var(--ink3)', justifyContent: 'center', borderTop: '1px solid var(--line)', marginTop: 6 }}>
          {t.cancel}
        </button>
      </div>
    </Sheet>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toast}>
      <span className="toast__icon">
        <Icon name="check" size={15} />
      </span>
      {toast}
    </div>
  );
}

function OfflineBar() {
  const { offline, t } = useApp();
  if (!offline) return null;
  return (
    <div role="alert" style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 95, padding: 'calc(9px + var(--safe-top)) 16px 9px', background: 'var(--danger)', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
      {t.offline}
    </div>
  );
}

export function Overlays() {
  return (
    <>
      <InstallPrompt />
      <Composer />
      <CommentsSheet />
      <StoryViewer />
      <StoryComposer />
      <ShareSheet />
      <ActionSheet />
      <Palette />
      <Toast />
      <OfflineBar />
    </>
  );
}
