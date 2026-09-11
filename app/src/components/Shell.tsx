import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Icon } from './Icon';
import { useApp } from '../store';
import { useLayout } from '../viewport';
import { initials as toInitials } from '../lib/format';
import type { User } from '../types';

export function useTrends() {
  const { data, t } = useApp();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    data.posts.forEach((p) => p.tags.forEach((tag) => (counts[tag] = (counts[tag] ?? 0) + 1)));
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 5)
      .map((tag) => ({ tag, count: `${counts[tag]} ${t.posts.toLowerCase()}` }));
  }, [data.posts, t]);
}

export function useSuggested(limit = 4): User[] {
  const { data, user, meId } = useApp();
  return useMemo(
    () =>
      data.users.filter((u) => u.id !== meId && !user.follows[u.id] && !user.blocked[u.id]).slice(0, limit),
    [data.users, user.follows, user.blocked, meId, limit],
  );
}

function useNavItems() {
  const { t, data, user } = useApp();
  const location = useLocation();
  // Muted conversations still receive messages; they just stop asking for attention.
  const unreadMessages =
    data.conversations.reduce((total, c) => total + (user.muted[c.id] ? 0 : c.unread), 0) +
    data.groups.reduce((total, g) => total + (user.muted[g.id] ? 0 : g.unread), 0);
  const path = location.pathname;
  const items = [
    { key: 'home', icon: 'home', label: t.home, to: '/', active: path === '/' || path === '/following' },
    { key: 'explore', icon: 'search', label: t.explore, to: '/explore', active: path.startsWith('/explore') },
    { key: 'create', icon: 'add', label: t.create, to: null, active: false },
    {
      key: 'messages',
      icon: 'chat_bubble',
      label: t.messages,
      to: '/messages',
      active: path.startsWith('/messages'),
      badge: unreadMessages ? String(unreadMessages) : '',
    },
    { key: 'profile', icon: 'person', label: t.profile, to: '/profile/me', active: path.startsWith('/profile') },
  ];
  return items;
}

function Sidebar() {
  const navigate = useNavigate();
  const { t, theme, toggleTheme, toggleLang, lang, signOut, openComposer } = useApp();
  const { shellHeight } = useLayout();
  const items = useNavItems();

  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        height: shellHeight,
        width: 260,
        flex: '0 0 260px',
        padding: '26px 18px',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, padding: '0 10px 26px' }}>
        <span
          style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontWeight: 800,
            fontSize: 25,
            letterSpacing: '-0.03em',
          }}
        >
          facemash
        </span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          className="hov-surface"
          onClick={() => (item.to ? navigate(item.to) : openComposer())}
          aria-current={item.active ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '11px 12px',
            borderRadius: 12,
            textAlign: 'left',
            transition: 'background .16s ease',
          }}
        >
          <Icon
            name={item.icon}
            size={24}
            fill={item.active ? 1 : 0}
            color={item.active ? 'var(--ink)' : 'var(--ink3)'}
          />
          <span
            style={{
              fontSize: 15.5,
              fontWeight: item.active ? 600 : 450,
              color: item.active ? 'var(--ink)' : 'var(--ink3)',
            }}
          >
            {item.label}
          </span>
          {!!item.badge && (
            <span
              style={{
                marginLeft: 'auto',
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 10,
                background: 'var(--accent)',
                color: 'var(--accentInk)',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {item.badge}
            </span>
          )}
        </button>
      ))}
      <button
        className="hov-lift"
        onClick={openComposer}
        style={{
          marginTop: 14,
          padding: 13,
          borderRadius: 14,
          background: 'var(--accent)',
          color: 'var(--accentInk)',
          fontWeight: 600,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'transform .14s ease',
        }}
      >
        <Icon name="add" size={20} fill={1} />
        {t.create}
      </button>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          className="hov-surface"
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 12,
            color: 'var(--ink2)',
            fontSize: 14,
          }}
        >
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
          {t.theme}
        </button>
        <button
          className="hov-surface"
          onClick={toggleLang}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 12,
            color: 'var(--ink2)',
            fontSize: 14,
          }}
        >
          <Icon name="language" size={20} />
          {lang === 'fr' ? 'Français' : 'English'}
        </button>
        <button
          className="hov-surface"
          onClick={() => {
            signOut();
            navigate('/');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 12,
            color: 'var(--ink3)',
            fontSize: 14,
          }}
        >
          <Icon name="logout" size={20} />
          {t.logout}
        </button>
      </div>
    </aside>
  );
}

function TabBar() {
  const navigate = useNavigate();
  const { openComposer } = useApp();
  const items = useNavItems();

  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        alignItems: 'center',
        padding: '8px 6px calc(8px + env(safe-area-inset-bottom))',
        background: 'color-mix(in oklab, var(--bg) 86%, transparent)',
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--line)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => (item.to ? navigate(item.to) : openComposer())}
          aria-current={item.active ? 'page' : undefined}
          aria-label={item.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '6px 0',
            position: 'relative',
          }}
        >
          {item.key === 'create' ? (
            <span
              style={{
                width: 44,
                height: 32,
                borderRadius: 11,
                background: 'var(--accent)',
                color: 'var(--accentInk)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="add" size={22} fill={1} />
            </span>
          ) : (
            <>
              <Icon
                name={item.icon}
                size={25}
                fill={item.active ? 1 : 0}
                color={item.active ? 'var(--ink)' : 'var(--ink3)'}
              />
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.01em',
                  color: item.active ? 'var(--ink)' : 'var(--ink3)',
                }}
              >
                {item.label}
              </span>
              {!!item.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 'calc(50% - 20px)',
                    minWidth: 17,
                    height: 17,
                    padding: '0 5px',
                    borderRadius: 9,
                    background: 'var(--accent)',
                    color: 'var(--accentInk)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </button>
      ))}
    </nav>
  );
}

function RightRail() {
  const navigate = useNavigate();
  const { t, user, toggleFollow } = useApp();
  const { shellHeight } = useLayout();
  const trends = useTrends();
  const suggested = useSuggested(3);

  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        height: shellHeight,
        width: 320,
        flex: '0 0 320px',
        padding: '26px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflowY: 'auto',
      }}
    >
      <button
        className="hov-ink"
        onClick={() => navigate('/explore')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 999,
          background: 'var(--surface)',
          color: 'var(--ink3)',
          fontSize: 14,
          width: '100%',
        }}
      >
        <Icon name="search" size={20} />
        {t.searchPh}
      </button>
      <section style={{ background: 'var(--surface)', borderRadius: 18, padding: 18 }}>
        <h3
          style={{
            margin: '0 0 14px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {t.trending}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {trends.map((trend) => (
            <button
              key={trend.tag}
              onClick={() => navigate(`/tag/${encodeURIComponent(trend.tag.replace('#', ''))}`)}
              style={{ display: 'block', textAlign: 'left', width: '100%' }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{trend.tag}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>{trend.count}</div>
            </button>
          ))}
        </div>
      </section>
      <section style={{ background: 'var(--surface)', borderRadius: 18, padding: 18 }}>
        <h3
          style={{
            margin: '0 0 14px',
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {t.suggested}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {suggested.map((u) => {
            const followed = !!user.follows[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <button onClick={() => navigate(`/profile/${u.id}`)} style={{ padding: 0 }}>
                  <Avatar hue={u.hue} initials={toInitials(u.name)} size={40} fontSize={14} />
                </button>
                <button
                  onClick={() => navigate(`/profile/${u.id}`)}
                  style={{ minWidth: 0, flex: 1, textAlign: 'left' }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {u.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>@{u.username}</div>
                </button>
                <button
                  onClick={() => toggleFollow(u.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    background: followed ? 'transparent' : 'var(--accent)',
                    color: followed ? 'var(--ink2)' : 'var(--accentInk)',
                    border: `1px solid ${followed ? 'var(--line)' : 'var(--accent)'}`,
                  }}
                >
                  {followed ? t.unfollow : t.follow}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 12, lineHeight: 1.6 }}>
        Facemash V1 · {t.demoNote}
      </p>
    </aside>
  );
}

export function Shell() {
  const location = useLocation();
  const { wide, width, shellHeight } = useLayout();
  const messengerMode = location.pathname.startsWith('/messages');
  const showRail = width >= 1280 && !messengerMode;

  return (
    <div
      style={{
        minHeight: shellHeight,
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "'Geist',system-ui,sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', minHeight: shellHeight }}>
        {wide && !messengerMode && <Sidebar />}
        <main
          style={{
            flex: '1 1 auto',
            maxWidth: messengerMode ? 'none' : 640,
            minWidth: 0,
            borderRight: `1px solid ${messengerMode ? 'transparent' : 'var(--line)'}`,
            paddingBottom: messengerMode ? 0 : wide ? 40 : 96,
          }}
        >
          {/* Keyed on the route so each screen fades in instead of snapping. */}
          <div key={messengerMode ? 'messages' : location.pathname} className="screen">
            <Outlet />
          </div>
        </main>
        {showRail && <RightRail />}
      </div>
      {!wide && !messengerMode && <TabBar />}
    </div>
  );
}
