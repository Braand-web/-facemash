import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Sheet, UserAvatar } from './ui';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { addRecent, removeRecent, useRecents } from '../lib/recents';
import { fmt } from '../lib/format';
import { useTrends } from './Shell';

interface Item {
  key: string;
  icon?: string;
  userId?: string;
  title: string;
  sub?: string;
  group: string;
  run: () => void;
}

/** Search and jump anywhere: people, hashtags, posts and app actions in one box. */
export function Palette() {
  const { paletteOpen, closePalette } = useOverlays();
  if (!paletteOpen) return null;
  return <PaletteBody onClose={closePalette} />;
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, t, meId, user, toggleTheme, openComposer } = useApp();
  const recents = useRecents();
  const trends = useTrends();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement | null>(null);
  const q = query.trim().toLowerCase();

  const go = (to: string, remember?: string) => {
    if (remember) addRecent(remember);
    onClose();
    navigate(to);
  };

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (!q) {
      out.push(
        { key: 'a-new', icon: 'add', title: t.create, group: t.quickActions, run: () => { onClose(); openComposer(); } },
        { key: 'a-msg', icon: 'chat_bubble', title: t.messages, group: t.quickActions, run: () => go('/messages') },
        { key: 'a-notif', icon: 'notifications', title: t.notifications, group: t.quickActions, run: () => go('/notifications') },
        { key: 'a-saved', icon: 'bookmark', title: t.saved, group: t.quickActions, run: () => go('/saved') },
        { key: 'a-theme', icon: 'palette', title: t.theme, group: t.quickActions, run: () => { toggleTheme(); onClose(); } },
        { key: 'a-set', icon: 'settings', title: t.settings, group: t.quickActions, run: () => go('/settings') },
      );
      trends.slice(0, 4).forEach((trend) =>
        out.push({ key: `t-${trend.tag}`, icon: 'tag', title: trend.tag, sub: trend.count, group: t.trending, run: () => go(`/tag/${encodeURIComponent(trend.tag.replace('#', ''))}`, trend.tag) }),
      );
      return out;
    }
    const needle = q.replace(/^[@#]/, '');
    data.users
      .filter((u) => u.id !== meId && !user.blocked[u.id] && (u.name.toLowerCase().includes(needle) || u.username.toLowerCase().includes(needle)))
      .slice(0, 5)
      .forEach((u) => out.push({ key: `u-${u.id}`, userId: u.id, title: u.name, sub: `@${u.username} · ${fmt(u.followers)} ${t.followers.toLowerCase()}`, group: t.people, run: () => go(`/profile/${u.id}`, query) }));
    const tags: Record<string, number> = {};
    data.posts.forEach((p) => p.tags.forEach((tag) => tag.toLowerCase().includes(needle) && (tags[tag] = (tags[tag] ?? 0) + 1)));
    Object.keys(tags).slice(0, 4).forEach((tag) => out.push({ key: `h-${tag}`, icon: 'tag', title: tag, sub: `${tags[tag]} ${t.posts.toLowerCase()}`, group: t.hashtagsTitle, run: () => go(`/tag/${encodeURIComponent(tag.replace('#', ''))}`, query) }));
    data.posts
      .filter((p) => p.text.toLowerCase().includes(needle))
      .slice(0, 3)
      .forEach((p) => out.push({ key: `p-${p.id}`, icon: 'notes', title: p.text.length > 70 ? `${p.text.slice(0, 70)}…` : p.text, group: t.posts, run: () => go(`/post/${p.id}`, query) }));
    out.push({ key: 'all', icon: 'search', title: `${t.searchAllFor} “${query.trim()}”`, group: '', run: () => go(`/explore?q=${encodeURIComponent(query.trim())}`, query) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, data.users, data.posts, user.blocked, trends, t]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run(); }
  };

  let lastGroup = '';
  return (
    <Sheet onClose={onClose} label={t.searchPh} height="min(78dvh, 640px)" z={80} bodyStyle={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 12px', borderBottom: '1px solid var(--line)' }}>
        <Icon name="search" size={22} color="var(--ink3)" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={t.paletteHint}
          style={{ flex: 1, minWidth: 0, minHeight: 44, background: 'none', border: 0, outline: 'none', fontSize: 17 }}
        />
        <span className="kbd">esc</span>
      </div>
      <div ref={list} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 8px 14px' }}>
        {!q && recents.length > 0 && (
          <div style={{ padding: '6px 8px 10px' }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>{t.recent}</p>
            <div className="hscroll" style={{ flexWrap: 'wrap' }}>
              {recents.map((r) => (
                <span key={r} className="chip" style={{ paddingRight: 6 }}>
                  <button onClick={() => setQuery(r)}><Icon name="history" size={15} style={{ marginRight: 6, verticalAlign: '-3px' }} />{r}</button>
                  <button onClick={() => removeRecent(r)} aria-label="×" style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%' }}>
                    <Icon name="close" size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        {items.map((item, i) => {
          const heading = item.group !== lastGroup ? item.group : '';
          lastGroup = item.group;
          return (
            <div key={item.key}>
              {heading && <p className="eyebrow" style={{ padding: '10px 10px 6px' }}>{heading}</p>}
              <button
                data-idx={i}
                onClick={item.run}
                onMouseMove={() => setActive(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '9px 10px', borderRadius: 14, textAlign: 'left', background: i === active ? 'var(--accentSoft)' : 'transparent' }}
              >
                {item.userId ? (
                  <UserAvatar userId={item.userId} size={38} />
                ) : (
                  <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--surface2)', color: 'var(--ink2)' }}>
                    <Icon name={item.icon ?? 'search'} size={19} />
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  {item.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)' }}>{item.sub}</span>}
                </span>
                {i === active && <span className="kbd">↵</span>}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
