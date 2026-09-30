import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const { t, createGroup } = useApp();
  const [form, setForm] = useState({ name: '', description: '' });
  return (
    <Sheet onClose={onClose} label={t.newGroup} title={t.newGroup} z={76}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input autoFocus className="field" value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.groupName} style={{ minHeight: 52, padding: '0 16px' }} />
        <textarea className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.desc} style={{ minHeight: 84, padding: 14, resize: 'none', lineHeight: 1.5 }} />
        <button className="btn btn-primary btn-lg btn-block" disabled={!form.name.trim()} onClick={() => { if (!form.name.trim()) return; const id = createGroup(form.name, form.description); onClose(); navigate(`/messages/group/${id}`); }}>
          {t.newGroup}
        </button>
      </div>
    </Sheet>
  );
}

export function Messages() {
  const params = useParams();
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
            else if (tab === 'channels') navigate('/explore');
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
              onClick={() => setNewGroup(true)}
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
              <Icon name="group_add" size={22} />
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
                      <Avatar hue={other.hue} initials={toInitials(other.name)} size={52} fontSize={16} />
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
                    <Avatar hue={group.hue} initials={toInitials(group.name)} size={52} radius="16px" fontSize={15} />
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
                  <Avatar hue={channel.hue} initials={toInitials(channel.name)} size={52} radius="16px" fontSize={15} />
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
    </div>
  );
}
