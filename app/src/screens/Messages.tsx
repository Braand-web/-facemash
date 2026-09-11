import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Icon } from '../components/Icon';
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
  const people = data.users.filter(
    (u) => u.id !== meId && !user.blocked[u.id] && (!q || u.name.toLowerCase().includes(q) || u.username.includes(q)),
  );

  return (
    <div
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
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '84dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          borderRadius: '22px 22px 0 0',
          borderTop: '1px solid var(--line)',
          boxShadow: 'var(--shadow)',
          animation: 'fmIn .24s ease both',
        }}
      >
        <div style={{ flex: '0 0 auto', padding: '16px 18px 12px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
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
              {t.newChat}
            </h2>
            <button
              className="hov-surface"
              onClick={onClose}
              style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ink3)' }}
            >
              <Icon name="close" size={21} />
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 13px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          >
            <Icon name="search" size={19} color="var(--ink3)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPeople}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 14.5 }}
            />
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '6px 0 calc(14px + env(safe-area-inset-bottom))',
          }}
        >
          {people.length === 0 && (
            <p style={{ margin: 0, padding: '46px 20px', textAlign: 'center', color: 'var(--ink3)', fontSize: 14.5 }}>
              {t.noResults}
            </p>
          )}
          {people.map((u) => (
            <button
              key={u.id}
              className="hov-surface"
              onClick={() => {
                const id = openConversationWith(u.id);
                onClose();
                navigate(`/messages/dm/${id}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                width: '100%',
                padding: '11px 18px',
                textAlign: 'left',
              }}
            >
              <Avatar hue={u.hue} initials={toInitials(u.name)} size={48} fontSize={15} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{u.name}</span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 2,
                    fontSize: 13,
                    color: 'var(--ink3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.bio}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewGroupSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { t, createGroup } = useApp();
  const [form, setForm] = useState({ name: '', description: '' });
  const field = {
    padding: '14px 15px',
    borderRadius: 13,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    fontSize: 15,
    outline: 'none',
  } as const;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 76,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'oklch(0.1 0 0 / 0.55)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg)',
          borderRadius: '22px 22px 0 0',
          borderTop: '1px solid var(--line)',
          padding: '16px 18px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow)',
          animation: 'fmIn .26s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
            {t.newGroup}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--ink3)' }}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t.groupName}
            style={field}
          />
          <textarea
            className="field"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t.desc}
            style={{ ...field, minHeight: 74, resize: 'none', borderRadius: 14, lineHeight: 1.5 }}
          />
        </div>
        <button
          onClick={() => {
            if (!form.name.trim()) return;
            const id = createGroup(form.name, form.description);
            onClose();
            navigate(`/messages/group/${id}`);
          }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 15,
            borderRadius: 14,
            background: 'var(--accent)',
            color: 'var(--accentInk)',
            fontWeight: 600,
            fontSize: 15.5,
          }}
        >
          {t.newGroup}
        </button>
      </div>
    </div>
  );
}

export function Messages() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, user, t, lang, userById, meId, markThreadRead } = useApp();
  const { openStory, openSheet } = useOverlays();
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

  const chipStyle = (active: boolean) =>
    ({
      flex: '0 0 auto',
      padding: '9px 15px',
      borderRadius: 999,
      fontSize: 13.5,
      fontWeight: 600,
      background: active ? 'var(--surface2)' : 'transparent',
      color: active ? 'var(--ink)' : 'var(--ink3)',
    }) as const;

  const listVisible = !threadId || wide;
  const threadVisible = !!threadId || wide;

  const rowMenu = (id: string) =>
    openSheet({ kind: 'convo', id, pinned: !!user.pins[id], archived: !!user.archived[id] });

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 0, height: shellHeight, overflow: 'hidden' }}>
      <section
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
          className="hov-lift2"
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
                fontFamily: "'Bricolage Grotesque',sans-serif",
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
                background: 'var(--surface)',
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
          <div style={{ display: 'flex', gap: 6, padding: '0 2px 10px', overflowX: 'auto' }}>
            <button onClick={() => setTab('chats')} style={chipStyle(tab === 'chats')}>
              {t.chats}
            </button>
            <button onClick={() => setTab('groups')} style={chipStyle(tab === 'groups')}>
              {t.groups}
            </button>
            <button onClick={() => setTab('channels')} style={chipStyle(tab === 'channels')}>
              {t.channels}
            </button>
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  overflowX: 'auto',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--ink3)',
                  }}
                >
                  {t.statuses}
                </span>
                {data.stories.map((group, i) => {
                  const author = userById(group.userId);
                  return (
                    <button
                      key={group.userId}
                      onClick={() => openStory(i)}
                      style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: '50%',
                          padding: 2,
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
                            fontSize: 12.5,
                            color: `oklch(0.16 0.03 ${author.hue})`,
                            background: `oklch(0.80 0.10 ${author.hue})`,
                          }}
                        >
                          {toInitials(author.name)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {chats.map((convo) => {
                const other = userById(convo.userId);
                const last = convo.messages[convo.messages.length - 1];
                const icon = mediaIcon(last);
                return (
                  <div
                    key={convo.id}
                    className="hov-surface"
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
                      <span
                        style={{
                          minWidth: 21,
                          height: 21,
                          padding: '0 6px',
                          borderRadius: 11,
                          background: 'var(--accent)',
                          color: 'var(--accentInk)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
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
                  className="hov-surface"
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
                    <span
                      style={{
                        minWidth: 21,
                        height: 21,
                        padding: '0 6px',
                        borderRadius: 11,
                        background: 'var(--accent)',
                        color: 'var(--accentInk)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
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
                  className="hov-surface"
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
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              background: 'color-mix(in oklab, var(--bg) 93%, oklch(0.72 0.07 62))',
              padding: 40,
            }}
          >
            <Icon name="forum" size={46} color="var(--ink3)" />
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
