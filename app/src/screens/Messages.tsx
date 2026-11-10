import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, Icon } from '../components/Icon';
import { Sheet, Segmented } from '../components/ui';
import { StoryRail } from '../components/Stories';
import { Thread } from '../components/Thread';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { useLayout } from '../viewport';
import { initials as toInitials, rel } from '../lib/format';
import type { Message, ThreadKind } from '../types';

type Tab = 'chats' | 'groups' | 'channels';

const mediaIcon = (message: Message | undefined): string => {
  if (!message) return '';
  if (message.kind === 'voice') return 'mic';
  if (message.sharedPostId) return 'ios_share';
  if (message.mediaLabel) return 'image';
  return '';
};

function ContactPicker({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, t, user, meId, openConversationWith } = useApp();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const people = data.users.filter((u) => u.id !== meId && !user.blocked[u.id] && (!q || u.name.toLowerCase().includes(q) || u.username.includes(q)));

  return (
    <Sheet onClose={onClose} label={t.newChat} title={t.newChat} height="min(84dvh, 700px)" z={79} bodyStyle={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 46, padding: '0 14px', borderRadius: 999, background: 'var(--surface2)', border: '1px solid var(--line)' }}>
          <Icon name="search" size={19} color="var(--ink3)" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPeople} style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 15 }} />
        </label>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 14 }}>
        {people.length === 0 && <p style={{ margin: 0, padding: '46px 20px', textAlign: 'center', color: 'var(--ink3)', fontSize: 14.5 }}>{t.noResults}</p>}
        {people.map((u) => (
          <button key={u.id} className="row-hover" onClick={() => { const id = openConversationWith(u.id); onClose(); navigate(`/messages/dm/${id}`); }} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '10px 18px', textAlign: 'left' }}>
            <Avatar hue={u.hue} initials={toInitials(u.name)} size={48} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 650 }}>{u.name}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio || `@${u.username}`}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function NewGroupSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, user, meId, t, createGroup } = useApp();
  const [form, setForm] = useState({ name: '', description: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [invitePolicy, setInvitePolicy] = useState<'admins' | 'members'>('admins');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [postingMode, setPostingMode] = useState<'all' | 'admins'>('all');
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!avatar) { setAvatarPreview(undefined); return; }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);
  const candidates = data.users.filter((person) => person.id !== meId && !user.blocked[person.id] &&
    (!memberQuery.trim() || person.name.toLowerCase().includes(memberQuery.trim().toLowerCase()) || person.username.toLowerCase().includes(memberQuery.trim().toLowerCase())));
  return (
    <Sheet onClose={onClose} label={t.newGroup} title={t.newGroup} height="min(88dvh, 760px)" z={76} bodyStyle={{ overflowY: 'auto' }}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar hue={265} initials={toInitials(form.name || 'Groupe')} size={64} radius="18px" src={avatarPreview} />
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>Ajouter une photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
          </label>
        </div>
        <input autoFocus className="field" value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.groupName} style={{ minHeight: 52, padding: '0 16px' }} />
        <textarea className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.desc} style={{ minHeight: 84, padding: 14, resize: 'none', lineHeight: 1.5 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="group" size={19} color="var(--ink3)" />
          <strong style={{ flex: 1, fontSize: 14.5 }}>Ajouter des participants</strong>
          <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{selected.length}/999</span>
        </div>
        <input className="field" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder={t.searchPeople} style={{ minHeight: 44, padding: '0 14px' }} />
        <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 16 }}>
          {candidates.map((person) => {
            const checked = selected.includes(person.id);
            return <label key={person.id} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', cursor: 'pointer' }}>
              <Avatar hue={person.hue} initials={toInitials(person.name)} size={38} src={person.avatarUrl} />
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{person.name}</span><span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>@{person.username}</span></span>
              <input type="checkbox" checked={checked} onChange={() => setSelected((current) => checked ? current.filter((id) => id !== person.id) : current.length < 999 ? [...current, person.id] : current)} aria-label={`Ajouter ${person.name}`} />
            </label>;
          })}
          {candidates.length === 0 && <p style={{ margin: 0, padding: 18, textAlign: 'center', color: 'var(--ink3)', fontSize: 13.5 }}>{t.noResults}</p>}
        </div>
        <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 12.5, lineHeight: 1.45 }}>Seuls les comptes Facemash disponibles dans la recherche peuvent être ajoutés ici. Les invitations par lien seront proposées dans les paramètres du groupe.</p>
        <details className="card" style={{ padding: 12 }}>
          <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 650 }}>Paramètres du groupe</summary>
          <div style={{ display: 'grid', gap: 11, marginTop: 12 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 13 }}>Qui peut inviter ?
              <select className="field" value={invitePolicy} onChange={(event) => setInvitePolicy(event.target.value as 'admins' | 'members')} style={{ minHeight: 42, padding: '0 10px' }}><option value="admins">Admins uniquement</option><option value="members">Tous les membres</option></select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={approvalRequired} onChange={(event) => setApprovalRequired(event.target.checked)} /> Approuver les demandes d’accès</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={notificationsEnabled} onChange={(event) => setNotificationsEnabled(event.target.checked)} /> Notifications du groupe activées</label>
            <label style={{ display: 'grid', gap: 5, fontSize: 13 }}>Qui peut publier ?
              <select className="field" value={postingMode} onChange={(event) => setPostingMode(event.target.value as 'all' | 'admins')} style={{ minHeight: 42, padding: '0 10px' }}><option value="all">Tous les membres</option><option value="admins">Admins uniquement</option></select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 13 }}>Mode lent
              <select className="field" value={slowModeSeconds} onChange={(event) => setSlowModeSeconds(Number(event.target.value))} style={{ minHeight: 42, padding: '0 10px' }}><option value={0}>Désactivé</option><option value={10}>10 secondes</option><option value={30}>30 secondes</option><option value={60}>1 minute</option></select>
            </label>
          </div>
        </details>
        <button className="btn btn-primary btn-lg btn-block" disabled={!form.name.trim() || busy} onClick={async () => {
          if (!form.name.trim() || busy) return;
          setBusy(true);
          const id = await createGroup(form.name, form.description, selected, { avatar, invitePolicy, approvalRequired, notificationsEnabled, postingMode, slowModeSeconds });
          setBusy(false);
          if (id) { onClose(); navigate(`/messages/group/${id}`); }
        }}>
          {busy ? t.loading : t.newGroup}
        </button>
      </div>
    </Sheet>
  );
}

function NewChannelSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { t, createChannel, lang } = useApp();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [createDiscussion, setCreateDiscussion] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!avatar) { setAvatarPreview(undefined); return; }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);
  const makeSlug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return (
    <Sheet onClose={onClose} label={lang === 'fr' ? 'Créer un canal' : 'Create a channel'} title={lang === 'fr' ? 'Nouveau canal' : 'New channel'} z={76}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar hue={182} initials={toInitials(name || 'Canal')} size={64} radius="18px" src={avatarPreview} />
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>{lang === 'fr' ? 'Ajouter une photo' : 'Add a photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
          </label>
        </div>
        <label><span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{lang === 'fr' ? 'Nom du canal' : 'Channel name'}</span><input autoFocus className="field" value={name} maxLength={60} onChange={(event) => { setName(event.target.value); setSlug(makeSlug(event.target.value)); }} style={{ minHeight: 50, padding: '0 14px' }} /></label>
        <label><span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{lang === 'fr' ? 'Identifiant unique' : 'Unique handle'}</span><span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 13px', border: '1px solid var(--line)', borderRadius: 14, background: 'var(--surface2)' }}><span style={{ color: 'var(--ink3)' }}>@</span><input className="field" value={slug} maxLength={30} onChange={(event) => setSlug(makeSlug(event.target.value))} style={{ flex: 1, minHeight: 48, background: 'transparent', border: 0, outline: 0 }} /></span></label>
        <label><span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{lang === 'fr' ? 'Description' : 'Description'}</span><textarea className="field" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} style={{ minHeight: 88, padding: 14, resize: 'vertical', lineHeight: 1.5 }} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, background: 'var(--surface2)', cursor: 'pointer' }}><input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} /><span><strong style={{ display: 'block', fontSize: 14 }}>{lang === 'fr' ? 'Canal privé' : 'Private channel'}</strong><span style={{ display: 'block', marginTop: 3, color: 'var(--ink3)', fontSize: 12.5 }}>{lang === 'fr' ? 'Visible seulement aux abonnés invités.' : 'Visible only to invited subscribers.'}</span></span></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, background: 'var(--surface2)', cursor: 'pointer' }}><input type="checkbox" checked={createDiscussion} onChange={(event) => setCreateDiscussion(event.target.checked)} /><span><strong style={{ display: 'block', fontSize: 14 }}>{lang === 'fr' ? 'Créer un groupe de discussion associé' : 'Create an associated discussion group'}</strong><span style={{ display: 'block', marginTop: 3, color: 'var(--ink3)', fontSize: 12.5 }}>{lang === 'fr' ? 'Les abonnés discuteront dans un groupe séparé.' : 'Subscribers can chat in a separate group.'}</span></span></label>
        <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 12.5, lineHeight: 1.45 }}>{lang === 'fr' ? 'Tu seras propriétaire. Les publications ne seront possibles que pour le propriétaire et les administrateurs.' : 'You will own this channel. Only the owner and admins can publish.'}</p>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || name.trim().length < 2 || slug.length < 3} onClick={async () => { setBusy(true); const id = await createChannel({ name: name.trim(), slug, description: description.trim(), isPrivate, createDiscussion, avatar }); setBusy(false); if (id) { onClose(); navigate(`/messages/channel/${id}`); } }}>{busy ? t.loading : lang === 'fr' ? 'Créer le canal' : 'Create channel'}</button>
      </div>
    </Sheet>
  );
}

export function Messages() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, user, t, lang, userById, meId, markThreadRead } = useApp();
  const { openSheet } = useOverlays();
  const { wide, shellHeight } = useLayout();

  const threadKind = params.kind as ThreadKind | undefined;
  const threadId = params.id;
  const [tab, setTab] = useState<Tab>(
    threadKind === 'group' ? 'groups' : threadKind === 'channel' ? 'channels' : 'chats',
  );
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [picker, setPicker] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const [newChannel, setNewChannel] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') !== 'channel') return;
    setNewChannel(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const q = query.trim().toLowerCase();
  const archivedCount = Object.keys(user.archived).filter((k) => user.archived[k]).length;

  const chats = useMemo(
    () =>
      data.conversations
        .filter((c) => {
          if (user.blocked[c.userId]) return false;
          if (!!user.archived[c.id] !== showArchived) return false;
          if (!q) return true;
          const other = userById(c.userId);
          return (
            other.name.toLowerCase().includes(q) ||
            other.username.includes(q) ||
            c.messages.some((m) => (m.text ?? '').toLowerCase().includes(q))
          );
        })
        .sort((a, b) => (user.pins[b.id] ? 1 : 0) - (user.pins[a.id] ? 1 : 0)),
    [data.conversations, user.blocked, user.archived, user.pins, q, showArchived, userById],
  );

  const groups = useMemo(
    () =>
      data.groups
        .filter((g) => {
          if (!!user.archived[g.id] !== showArchived) return false;
          if (!q) return true;
          return g.name.toLowerCase().includes(q) || g.messages.some((m) => (m.text ?? '').toLowerCase().includes(q));
        })
        .sort((a, b) => (user.pins[b.id] ? 1 : 0) - (user.pins[a.id] ? 1 : 0)),
    [data.groups, user.archived, user.pins, q, showArchived],
  );

  const openThread = (kind: ThreadKind, id: string) => {
    markThreadRead(kind, id);
    navigate(`/messages/${kind}/${id}`);
  };

  const listVisible = !threadId || wide;
  const threadVisible = !!threadId || wide;

  const rowMenu = (id: string) =>
    openSheet({ kind: 'convo', id, pinned: !!user.pins[id], archived: !!user.archived[id] });

  return (
    <div className="message-mode" style={{ display: 'flex', alignItems: 'stretch', minWidth: 0, height: shellHeight, overflow: 'hidden' }}>
      <section
        className="chat-list"
        style={{
          position: 'relative',
          flex: wide ? '0 0 372px' : '1 1 auto',
          display: listVisible ? 'flex' : 'none',
          flexDirection: 'column',
          minWidth: 0,
          height: shellHeight,
          borderRight: '1px solid var(--line)',
        }}
      >
        <button
          className="chat-fab hov-lift2"
          onClick={() => {
            if (tab === 'groups') setNewGroup(true);
            else if (tab === 'channels') setNewChannel(true);
            else setPicker(true);
          }}
          style={{
            position: 'absolute',
            right: 18,
            bottom: 'calc(22px + env(safe-area-inset-bottom))',
            zIndex: 25,
            width: 58,
            height: 58,
            borderRadius: 19,
            background: 'var(--accent)',
            color: 'var(--accentInk)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 12px 28px -8px oklch(0.15 0.02 265 / 0.55)',
            transition: 'transform .15s ease',
          }}
        >
          <Icon name={tab === 'groups' ? 'group_add' : tab === 'channels' ? 'campaign' : 'edit_square'} size={25} />
        </button>

        <header
          className="chat-header"
          style={{
            flex: '0 0 auto',
            padding: '10px 10px 0',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 2px 8px' }}>
            <button
              className="hov-surface"
              onClick={() => navigate('/')}
              style={{
                width: 42,
                height: 42,
                flex: '0 0 42px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink2)',
              }}
            >
              <Icon name="arrow_back" size={22} />
            </button>
            <h1
              style={{
                margin: 0,
                flex: 1,
                minWidth: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: '-0.025em',
              }}
            >
              {t.messages}
            </h1>
            <button
              className="hov-surface"
              onClick={() => tab === 'groups' ? setNewGroup(true) : tab === 'channels' ? setNewChannel(true) : setPicker(true)}
              style={{
                width: 42,
                height: 42,
                flex: '0 0 42px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink2)',
              }}
            >
              <Icon name={tab === 'groups' ? 'group_add' : tab === 'channels' ? 'campaign' : 'edit_square'} size={22} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px 9px' }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 13px',
                borderRadius: 999,
                background: 'var(--surface2)',
                border: '1px solid var(--line)',
              }}
            >
              <Icon name="search" size={19} color="var(--ink3)" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchConv}
                style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 14.5 }}
              />
              {!!q && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--ink3)' }}>
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: '0 4px 12px' }}>
            <Segmented<Tab> value={tab} onChange={setTab} options={[{ key: 'chats', label: t.chats }, { key: 'groups', label: t.groups }, { key: 'channels', label: t.channels }]} />
          </div>
        </header>

        <div style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 88 }}>
          {archivedCount > 0 && (
            <button
              className="hov-surface"
              onClick={() => setShowArchived((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '13px 16px',
                textAlign: 'left',
                borderBottom: '1px solid var(--line)',
                color: 'var(--ink2)',
              }}
            >
              <Icon name="archive" size={21} color="var(--ink3)" />
              <span style={{ flex: 1, fontSize: 14.5 }}>
                {t.archived} · {archivedCount}
              </span>
              <Icon name="chevron_right" size={19} color="var(--ink3)" />
            </button>
          )}

          {tab === 'chats' && (
            <>
              <div className="chat-statuses" style={{ borderBottom: '1px solid var(--line)' }}>
                <StoryRail compact />
              </div>

              {chats.map((convo) => {
                const other = userById(convo.userId);
                const last = convo.messages[convo.messages.length - 1];
                const icon = mediaIcon(last);
                return (
                  <div
                    key={convo.id}
                    className="chat-row hov-surface"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      rowMenu(convo.id);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px 11px 16px', width: '100%' }}
                  >
                    <button
                      onClick={() => openThread('dm', convo.id)}
                      style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left' }}
                    >
                      <Avatar hue={other.hue} initials={toInitials(other.name)} size={52} fontSize={16} src={other.avatarUrl} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                          <span
                            style={{
                              fontSize: 15.5,
                              fontWeight: 600,
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {other.name}
                          </span>
                          {user.muted[convo.id] && (
                            <Icon name="notifications_off" size={15} color="var(--ink3)" />
                          )}
                          {user.pins[convo.id] && <Icon name="keep" size={15} fill={1} color="var(--ink3)" />}
                          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
                            {last ? rel(last.createdAt, lang) : ''}
                          </span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          {last?.from === meId && (
                            <Icon
                              name={last.status === 'sent' ? 'check' : 'done_all'}
                              size={15}
                              color={last.status === 'read' ? 'var(--accent)' : 'var(--ink3)'}
                            />
                          )}
                          {!!icon && <Icon name={icon} size={15} color="var(--ink3)" />}
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 13.5,
                              color: 'var(--ink3)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {last?.text || (last?.sharedPostId ? t.share : last?.mediaLabel || '')}
                          </span>
                        </span>
                      </span>
                    </button>
                    {convo.unread > 0 && (
                      <span className="badge">
                        {convo.unread}
                      </span>
                    )}
                    <button
                      className="hov-surface2-ink"
                      onClick={() => rowMenu(convo.id)}
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
                      <Icon name="more_vert" size={19} />
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'groups' &&
            groups.map((group) => {
              const last = group.messages[group.messages.length - 1];
              const icon = mediaIcon(last);
              return (
                <div
                  key={group.id}
                  className="chat-row hov-surface"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    rowMenu(group.id);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px 11px 16px', width: '100%' }}
                >
                  <button
                    onClick={() => openThread('group', group.id)}
                    style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left' }}
                  >
                    <Avatar hue={group.hue} initials={toInitials(group.name)} size={52} radius="16px" fontSize={15} src={group.avatarUrl} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                        <span
                          style={{
                            fontSize: 15.5,
                            fontWeight: 600,
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {group.name}
                        </span>
                        {user.muted[group.id] && (
                          <Icon name="notifications_off" size={15} color="var(--ink3)" />
                        )}
                        {user.pins[group.id] && <Icon name="keep" size={15} fill={1} color="var(--ink3)" />}
                        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
                          {last ? rel(last.createdAt, lang) : ''}
                        </span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        {last?.from === meId && (
                          <Icon
                            name={last.status === 'sent' ? 'check' : 'done_all'}
                            size={15}
                            color={last.status === 'read' ? 'var(--accent)' : 'var(--ink3)'}
                          />
                        )}
                        {!!icon && <Icon name={icon} size={15} color="var(--ink3)" />}
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13.5,
                            color: 'var(--ink3)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {last ? `${userById(last.from).name.split(' ')[0]} : ${last.text ?? last.mediaLabel ?? ''}` : ''}
                        </span>
                      </span>
                    </span>
                  </button>
                  {group.unread > 0 && (
                    <span className="badge">
                      {group.unread}
                    </span>
                  )}
                  <button
                    className="hov-surface2-ink"
                    onClick={() => rowMenu(group.id)}
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
                    <Icon name="more_vert" size={19} />
                  </button>
                </div>
              );
            })}

          {tab === 'channels' &&
            data.channels.map((channel) => {
              const last = channel.posts[0];
              return (
                <button
                  key={channel.id}
                  className="chat-row hov-surface"
                  onClick={() => navigate(`/messages/channel/${channel.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '13px 16px',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <Avatar hue={channel.hue} initials={toInitials(channel.name)} size={52} radius="16px" fontSize={15} src={channel.avatarUrl} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 15.5,
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {channel.name}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
                        {last ? rel(last.createdAt, lang) : ''}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        fontSize: 13.5,
                        color: 'var(--ink3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(last?.text ?? '').slice(0, 70)}
                    </span>
                  </span>
                  <Icon name="chevron_right" size={20} color="var(--ink3)" />
                </button>
              );
            })}
        </div>
      </section>

      <section
        className="thread-pane"
        style={{
          flex: '1 1 auto',
          display: threadVisible ? 'flex' : 'none',
          flexDirection: 'column',
          minWidth: 0,
          height: shellHeight,
        }}
      >
        {threadKind && threadId ? (
          <Thread kind={threadKind} id={threadId} />
        ) : (
          <div
            className="thread-empty"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              background: 'transparent',
              padding: 40,
            }}
          >
            <span className="empty__art"><Icon name="forum" size={38} /></span>
            <p
              style={{
                margin: 0,
                maxWidth: '34ch',
                textAlign: 'center',
                color: 'var(--ink3)',
                fontSize: 14.5,
                lineHeight: 1.6,
              }}
            >
              {t.pickConv}
            </p>
          </div>
        )}
      </section>

      {picker && <ContactPicker onClose={() => setPicker(false)} />}
      {newGroup && <NewGroupSheet onClose={() => setNewGroup(false)} />}
      {newChannel && <NewChannelSheet onClose={() => setNewChannel(false)} />}
    </div>
  );
}
