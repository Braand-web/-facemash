import { useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Icon } from './Icon';
import { Brand, FollowButton, PersonRow } from './ui';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { demoMode } from '../lib/supabase';
import { useLayout } from '../viewport';
import { haptic } from '../lib/haptics';
import { initials as toInitials } from '../lib/format';
import type { User } from '../types';

export function useTrends() {
  const { data, t } = useApp();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    data.posts.forEach((p) => p.tags.forEach((tag) => (counts[tag] = (counts[tag] ?? 0) + 1)));
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 6)
      .map((tag) => ({ tag, n: counts[tag], count: `${counts[tag]} ${t.posts.toLowerCase()}` }));
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

/** Tells whatever is scrolling on this screen to return to the top. */
export const SCROLL_TOP_EVENT = 'fm:scrolltop';

interface NavItem {
  key: string;
  icon: string;
  label: string;
  to: string | null;
  active: boolean;
  badge?: string;
}

function useNavItems(): NavItem[] {
  const { t, data, user } = useApp();
  const location = useLocation();
  // Muted conversations still receive messages; they just stop asking for attention.
  const unreadMessages =
    data.conversations.reduce((total, c) => total + (user.muted[c.id] ? 0 : c.unread), 0) +
    data.groups.reduce((total, g) => total + (user.muted[g.id] ? 0 : g.unread), 0);
  const unreadAlerts = data.notifications.filter((n) => !n.read).length;
  const path = location.pathname;
  return [
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
    {
      key: 'profile',
      icon: 'person',
      label: t.profile,
      to: '/profile/me',
      active: path.startsWith('/profile/me') || path === '/settings' || path === '/saved',
    },
    {
      key: 'notifications',
      icon: 'notifications',
      label: t.notifications,
      to: '/notifications',
      active: path.startsWith('/notifications'),
      badge: unreadAlerts ? String(unreadAlerts) : '',
    },
  ];
}

function useGo() {
  const navigate = useNavigate();
  const { openComposer } = useApp();
  return (item: NavItem) => {
    haptic('tick');
    if (!item.to) {
      openComposer();
      return;
    }
    if (item.active) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new Event(SCROLL_TOP_EVENT));
      return;
    }
    navigate(item.to);
  };
}

function Sidebar() {
  const navigate = useNavigate();
  const { t, theme, toggleTheme, toggleLang, lang, signOut, openComposer, me } = useApp();
  const { openPalette } = useOverlays();
  const items = useNavItems();
  const go = useGo();
  // The sidebar has room for notifications and settings; the dock does not.
  const path = useLocation().pathname;
  const order = ['home', 'explore', 'notifications', 'messages', 'profile'];
  const list = order.map((key) => items.find((item) => item.key === key)!);

  return (
    <aside className="app-sidebar" aria-label={t.mainNav}>
      <div style={{ padding: '2px 12px 20px' }}>
        <Brand size={28} />
      </div>
      <button className="nav-item" onClick={openPalette}>
        <span className="nav-item__icon">
          <Icon name="search" size={24} />
        </span>
        <span style={{ flex: 1 }}>{t.searchShort}</span>
        <span className="kbd">/</span>
      </button>
      {list.map((item) => (
        <button key={item.key} className="nav-item" onClick={() => go(item)} aria-current={item.active ? 'page' : undefined}>
          <span className="nav-item__icon">
            {item.key === 'profile' ? (
              <Avatar hue={me.hue} initials={toInitials(me.name)} size={26} />
            ) : (
              <Icon name={item.icon} size={24} fill={item.active ? 1 : 0} />
            )}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {!!item.badge && <span className="badge">{item.badge}</span>}
        </button>
      ))}
      <button
        className="nav-item"
        aria-current={path === '/settings' ? 'page' : undefined}
        onClick={() => navigate('/settings')}
      >
        <span className="nav-item__icon">
          <Icon name="settings" size={24} fill={path === '/settings' ? 1 : 0} />
        </span>
        <span style={{ flex: 1 }}>{t.settings}</span>
      </button>

      <button className="btn btn-primary btn-lg btn-block" onClick={openComposer} style={{ marginTop: 14 }}>
        <Icon name="add" size={20} />
        {t.create}
      </button>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => navigate('/profile/me')}
          className="nav-item"
          style={{ minHeight: 60, background: 'var(--surface2)', border: '1px solid var(--line)' }}
        >
          <Avatar hue={me.hue} initials={toInitials(me.name)} size={38} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 650, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {me.name}
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)', fontWeight: 450 }}>@{me.username}</span>
          </span>
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
          <button className="icon-btn" onClick={toggleTheme} aria-label={t.theme} title={t.theme}>
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={21} />
          </button>
          <button className="icon-btn" onClick={toggleLang} aria-label={t.language} title={lang === 'fr' ? 'English' : 'Français'}>
            <Icon name="language" size={21} />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              signOut();
              navigate('/');
            }}
            aria-label={t.logout}
            title={t.logout}
          >
            <Icon name="logout" size={21} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TabBar({ onMedia }: { onMedia: boolean }) {
  const { me } = useApp();
  const items = useNavItems().filter((item) => item.key !== 'notifications');
  const go = useGo();
  const index = items.findIndex((item) => item.active);

  return (
    <nav className={`tab-bar${onMedia ? ' on-media' : ''}`} aria-label="Navigation principale">
      <span className="tab-bar__spot" aria-hidden="true" style={{ ['--i' as string]: Math.max(index, 0), opacity: index < 0 ? 0 : 1 }} />
      {items.map((item) => (
        <button
          key={item.key}
          className="tab-bar__item"
          onClick={() => go(item)}
          aria-current={item.active ? 'page' : undefined}
          aria-label={item.label}
        >
          {item.key === 'create' ? (
            <span className="tab-bar__create">
              <Icon name="add" size={24} />
            </span>
          ) : item.key === 'profile' ? (
            <span
              style={{
                display: 'grid',
                borderRadius: '50%',
                padding: 2,
                boxShadow: item.active ? '0 0 0 2px var(--accent-fg)' : '0 0 0 1.5px var(--line-strong)',
                transition: 'box-shadow 200ms',
              }}
            >
              <Avatar hue={me.hue} initials={toInitials(me.name)} size={26} />
            </span>
          ) : (
            <Icon name={item.icon} size={26} fill={item.active ? 1 : 0} />
          )}
          {!!item.badge && <span className="tab-bar__badge">{item.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

function RightRail() {
  const navigate = useNavigate();
  const { t } = useApp();
  const { openPalette } = useOverlays();
  const trends = useTrends();
  const suggested = useSuggested(4);

  return (
    <aside className="app-rail">
      <button
        className="search-trigger"
        onClick={openPalette}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 50,
          padding: '0 16px',
          borderRadius: 999,
          background: 'var(--surface)',
          color: 'var(--ink3)',
          fontSize: 14.5,
          width: '100%',
        }}
      >
        <Icon name="search" size={20} />
        <span style={{ flex: 1, textAlign: 'left' }}>{t.searchPh}</span>
        <span className="kbd">/</span>
      </button>

      <section className="card" style={{ padding: '18px 8px 10px' }}>
        <h3 className="section-title" style={{ padding: '0 12px 8px', fontSize: 17 }}>
          {t.trending}
        </h3>
        {trends.map((trend, i) => (
          <button
            key={trend.tag}
            className="row-hover"
            onClick={() => navigate(`/tag/${encodeURIComponent(trend.tag.replace('#', ''))}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', borderRadius: 14, textAlign: 'left' }}
          >
            <span className="grad-text display" style={{ width: 22, fontSize: 18, fontWeight: 800 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 650 }}>{trend.tag}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)' }}>{trend.count}</span>
            </span>
            <Icon name="arrow_outward" size={16} color="var(--ink3)" />
          </button>
        ))}
      </section>

      {suggested.length > 0 && (
        <section className="card" style={{ padding: '18px 0 10px' }}>
          <h3 className="section-title" style={{ padding: '0 20px 6px', fontSize: 17 }}>
            {t.suggested}
          </h3>
          {suggested.map((u) => (
            <PersonRow key={u.id} userId={u.id} size={42} action={<FollowButton userId={u.id} />} />
          ))}
        </section>
      )}

      <p style={{ margin: 0, padding: '0 8px', color: 'var(--ink3)', fontSize: 12, lineHeight: 1.7 }}>
        Facemash · {demoMode ? t.demoNote : t.tagline}
      </p>
    </aside>
  );
}

const isTyping = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
};

/** Desktop shortcuts: "/" or ⌘K search, "c" compose, "g" then h / e / m / n / p to jump. */
function useShortcuts() {
  const navigate = useNavigate();
  const { openComposer } = useApp();
  const { openPalette, paletteOpen } = useOverlays();
  const chord = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPalette();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || paletteOpen) return;
      const key = event.key.toLowerCase();
      if (key === '/') {
        event.preventDefault();
        openPalette();
      } else if (key === 'c') {
        openComposer();
      } else if (key === 'g') {
        chord.current = Date.now();
      } else if (Date.now() - chord.current < 900) {
        const routes: Record<string, string> = { h: '/', e: '/explore', m: '/messages', n: '/notifications', p: '/profile/me' };
        if (routes[key]) {
          chord.current = 0;
          navigate(routes[key]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, openComposer, openPalette, paletteOpen]);
}

export function Shell() {
  const location = useLocation();
  const { wide, width, shellHeight, boxed } = useLayout();
  const messengerMode = location.pathname.startsWith('/messages');
  const reels = location.pathname === '/';
  const showRail = width >= 1280 && !messengerMode;
  useShortcuts();

  return (
    <div className="app-shell" style={{ minHeight: shellHeight, ['--shell-h' as string]: shellHeight }}>
      <div className="shell-layout" style={{ minHeight: shellHeight }}>
        {wide && !messengerMode && <Sidebar />}
        <main
          className="app-main"
          style={{
            maxWidth: messengerMode ? 'none' : 640,
            paddingBottom: messengerMode || reels ? 0 : wide ? 48 : boxed ? 100 : 'calc(100px + var(--safe-bottom))',
          }}
        >
          {/* Keyed on the route so each screen fades in instead of snapping. */}
          <div key={messengerMode ? 'messages' : location.pathname} className="screen">
            <Outlet />
          </div>
        </main>
        {showRail && <RightRail />}
      </div>
      {!wide && !messengerMode && <TabBar onMedia={reels} />}
    </div>
  );
}
