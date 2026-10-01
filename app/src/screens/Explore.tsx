import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Icon } from '../components/Icon';
import { EmptyState, FollowButton, PersonRow, Segmented, UserAvatar } from '../components/ui';
import { PostCard } from '../components/PostCard';
import { PostTile } from '../components/Tile';
import { useTrends } from '../components/Shell';
import { useApp } from '../store';
import { INTERESTS } from '../data/seed';
import { addRecent, clearRecents, removeRecent, useRecents } from '../lib/recents';
import { rankedPosts } from '../lib/ranking';
import { fmt, initials as toInitials } from '../lib/format';

type Scope = 'all' | 'people' | 'tags' | 'posts';

export function Explore() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, user, t, meId } = useApp();
  const trends = useTrends();
  const recents = useRecents();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [focused, setFocused] = useState(false);
  const [scope, setScope] = useState<Scope>('all');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const q = params.get('q');
    if (q !== null && q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const q = query.trim().toLowerCase();
  const needle = q.replace(/^[@#]/, '');

  const people = useMemo(
    () => (q ? data.users.filter((u) => u.id !== meId && !user.blocked[u.id] && (u.name.toLowerCase().includes(needle) || u.username.toLowerCase().includes(needle))) : []),
    [data.users, q, needle, meId, user.blocked],
  );
  const posts = useMemo(
    () => (q ? data.posts.filter((p) => !user.blocked[p.authorId] && (p.text.toLowerCase().includes(needle) || p.tags.join(' ').toLowerCase().includes(needle))).slice(0, 12) : []),
    [data.posts, q, needle, user.blocked],
  );
  const tags = useMemo(() => {
    if (!q) return [];
    const counts: Record<string, number> = {};
    data.posts.forEach((p) => p.tags.forEach((tag) => tag.toLowerCase().includes(needle) && (counts[tag] = (counts[tag] ?? 0) + 1)));
    return Object.keys(counts).map((tag) => ({ tag, count: counts[tag] }));
  }, [data.posts, q, needle]);

  const popular = useMemo(() => {
    const ranked = rankedPosts(data, user, meId);
    return (category ? ranked.filter((p) => p.category === category) : ranked).slice(0, 18);
  }, [data, user, meId, category]);
  const creators = useMemo(
    () => data.users.filter((u) => u.id !== meId && !user.blocked[u.id] && !user.follows[u.id]).sort((a, b) => b.followers - a.followers).slice(0, 8),
    [data.users, user.blocked, user.follows, meId],
  );

  const submit = (value: string) => {
    setQuery(value);
    addRecent(value);
    setParams(value ? { q: value } : {}, { replace: true });
  };
  const goTag = (tag: string) => { addRecent(tag); navigate(`/tag/${encodeURIComponent(tag.replace('#', ''))}`); };
  const searching = !!q;
  const showRecents = focused && !q && recents.length > 0;

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '0 16px', borderRadius: 999, background: 'var(--surface2)', border: `1px solid ${focused ? 'var(--accent)' : 'var(--line)'}`, boxShadow: focused ? '0 0 0 4px var(--accentSoft)' : 'none', transition: 'all 180ms' }}>
            <Icon name="search" size={20} color="var(--ink3)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              onKeyDown={(e) => e.key === 'Enter' && submit(query.trim())}
              placeholder={t.searchPh}
              enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 15.5 }}
            />
            {!!query && (
              <button onClick={() => submit('')} aria-label="Effacer" style={{ color: 'var(--ink3)', display: 'grid' }}>
                <Icon name="close" size={19} />
              </button>
            )}
          </label>
        </div>
        {searching && (
          <Segmented<Scope>
            value={scope}
            onChange={setScope}
            options={[
              { key: 'all', label: t.all },
              { key: 'people', label: t.people },
              { key: 'tags', label: t.hashtagsTitle },
              { key: 'posts', label: t.posts },
            ]}
          />
        )}
      </header>

      {showRecents && (
        <div style={{ padding: '16px 16px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <p className="eyebrow" style={{ flex: 1 }}>{t.recent}</p>
            <button onClick={clearRecents} style={{ fontSize: 13, color: 'var(--accent-fg)', fontWeight: 600 }}>{t.clearAll}</button>
          </div>
          {recents.map((r) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <Icon name="history" size={20} color="var(--ink3)" />
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => submit(r)} style={{ flex: 1, textAlign: 'left', fontSize: 15 }}>{r}</button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => removeRecent(r)} aria-label="Retirer" style={{ color: 'var(--ink3)', display: 'grid' }}><Icon name="close" size={17} /></button>
            </div>
          ))}
        </div>
      )}

      {searching ? (
        <div style={{ padding: '4px 0 20px' }} className="stagger">
          {(scope === 'all' || scope === 'people') && people.length > 0 && (
            <section>
              <h3 className="eyebrow" style={{ margin: '18px 16px 4px' }}>{t.people}</h3>
              {people.slice(0, scope === 'all' ? 4 : 30).map((u) => (
                <PersonRow key={u.id} userId={u.id} sub={`@${u.username} · ${fmt(u.followers)} ${t.followers.toLowerCase()}`} action={<FollowButton userId={u.id} />} />
              ))}
            </section>
          )}
          {(scope === 'all' || scope === 'tags') && tags.length > 0 && (
            <section>
              <h3 className="eyebrow" style={{ margin: '18px 16px 6px' }}>{t.hashtagsTitle}</h3>
              {tags.map((tag) => (
                <button key={tag.tag} className="row-hover" onClick={() => goTag(tag.tag)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 16px', width: '100%', textAlign: 'left' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 16, background: 'var(--grad-soft)', color: 'var(--accent-fg)' }}><Icon name="tag" size={22} /></span>
                  <span>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 650 }}>{tag.tag}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink3)' }}>{tag.count} {t.posts.toLowerCase()}</span>
                  </span>
                </button>
              ))}
            </section>
          )}
          {(scope === 'all' || scope === 'posts') && posts.length > 0 && (
            <section>
              <h3 className="eyebrow" style={{ margin: '18px 16px 10px' }}>{t.posts}</h3>
              {scope === 'posts' ? posts.map((p) => <PostCard key={p.id} post={p} />) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 12px' }}>
                  {posts.slice(0, 6).map((p) => <PostTile key={p.id} post={p} />)}
                </div>
              )}
            </section>
          )}
          {!people.length && !posts.length && !tags.length && <EmptyState icon="search_off" title={t.noResults} body={t.noResultsHint} />}
        </div>
      ) : (
        <div style={{ padding: '4px 0 30px' }}>
          <div className="hscroll" style={{ padding: '14px 16px 4px' }}>
            <button className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}><Icon name="sparkle" size={15} />{t.forYou}</button>
            {INTERESTS.map((c) => (
              <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>{c}</button>
            ))}
          </div>

          {trends.length > 0 && !category && (
            <>
              <h3 className="section-title" style={{ margin: '22px 16px 12px' }}>{t.trending}</h3>
              <div className="hscroll" style={{ padding: '0 16px' }}>
                {trends.slice(0, 5).map((trend, i) => (
                  <button key={trend.tag} onClick={() => goTag(trend.tag)} className="media-art" style={{ ['--h' as string]: (i * 23 + 210) % 360, flex: '0 0 148px', height: 104, borderRadius: 22, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'left', color: '#fff' }}>
                    <span className="display" style={{ position: 'relative', fontSize: 18, fontWeight: 800 }}>{trend.tag}</span>
                    <span style={{ position: 'relative', fontSize: 12, opacity: 0.85 }}>{trend.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <h3 className="section-title" style={{ margin: '26px 16px 12px' }}>{category ?? t.discover}</h3>
          {popular.length === 0 ? (
            <EmptyState icon="explore" title={t.emptyFeed} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '0 12px' }}>
              {popular.map((p, i) => (
                <PostTile key={p.id} post={p} ratio={i % 5 === 0 ? '4 / 5' : i % 3 === 0 ? '1 / 1' : '3 / 4'} />
              ))}
            </div>
          )}

          {creators.length > 0 && !category && (
            <>
              <h3 className="section-title" style={{ margin: '28px 16px 12px' }}>{t.creators}</h3>
              <div className="hscroll" style={{ padding: '0 16px' }}>
                {creators.map((u) => (
                  <div key={u.id} className="card" style={{ flex: '0 0 168px', padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <UserAvatar userId={u.id} size={68} onClick={() => navigate(`/profile/${u.id}`)} />
                    <span style={{ marginTop: 10, fontSize: 14.5, fontWeight: 650, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 10 }}>{fmt(u.followers)} {t.followers.toLowerCase()}</span>
                    <FollowButton userId={u.id} block />
                  </div>
                ))}
              </div>
            </>
          )}

          {!category && (data.groups.length > 0 || data.channels.length > 0) && (
            <>
              <h3 className="section-title" style={{ margin: '28px 16px 6px' }}>{t.communities}</h3>
              {data.groups.map((g) => (
                <button key={g.id} className="row-hover" onClick={() => navigate(`/messages/group/${g.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 16px', width: '100%', textAlign: 'left' }}>
                  <Avatar hue={g.hue} initials={toInitials(g.name)} size={48} radius="16px" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 650 }}>{g.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.members.length} {t.members} · {g.description}</span>
                  </span>
                  <Icon name="chevron_right" size={19} color="var(--ink3)" />
                </button>
              ))}
              {data.channels.map((c) => (
                <button key={c.id} className="row-hover" onClick={() => navigate(`/messages/channel/${c.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 16px', width: '100%', textAlign: 'left' }}>
                  <Avatar hue={c.hue} initials={toInitials(c.name)} size={48} radius="16px" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 650 }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink3)' }}>@{c.slug} · {fmt(c.subscribers)} {t.subscribers}</span>
                  </span>
                  <Icon name="chevron_right" size={19} color="var(--ink3)" />
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
