import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon } from '../components/Icon';
import { PostCard } from '../components/PostCard';
import { useApp } from '../store';
import { useTrends } from '../components/Shell';
import { rankedPosts } from '../lib/ranking';
import { fmt, initials as toInitials } from '../lib/format';

const sectionTitle = {
  margin: '22px 16px 10px',
  fontFamily: "'Bricolage Grotesque',sans-serif",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: 'var(--ink3)',
} as const;

const browseTitle = {
  margin: '26px 16px 10px',
  fontFamily: "'Bricolage Grotesque',sans-serif",
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: '-0.015em',
} as const;

export function Explore() {
  const navigate = useNavigate();
  const { data, user, t, meId, toggleFollow } = useApp();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const trends = useTrends();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onQuery = (value: string) => {
    setQuery(value);
    setSearching(!!value.trim());
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSearching(false), 320);
  };

  const q = query.trim().toLowerCase();
  const people = useMemo(
    () =>
      q
        ? data.users.filter(
            (u) =>
              u.id !== meId &&
              (u.name.toLowerCase().includes(q) || u.username.includes(q.replace('@', ''))),
          )
        : [],
    [data.users, q, meId],
  );
  const posts = useMemo(
    () =>
      q
        ? data.posts
            .filter(
              (p) => p.text.toLowerCase().includes(q) || p.tags.join(' ').includes(q.replace('#', '')),
            )
            .slice(0, 8)
        : [],
    [data.posts, q],
  );
  const tags = useMemo(() => {
    if (!q) return [];
    const needle = q.replace('#', '');
    const counts: Record<string, number> = {};
    data.posts.forEach((p) =>
      p.tags.forEach((tag) => {
        if (tag.includes(needle)) counts[tag] = (counts[tag] ?? 0) + 1;
      }),
    );
    return Object.keys(counts).map((tag) => ({ tag, count: counts[tag] }));
  }, [data.posts, q]);

  const popular = useMemo(() => rankedPosts(data, user, meId).slice(0, 9), [data, user, meId]);
  const suggested = data.users.filter((u) => u.id !== meId && !user.blocked[u.id]).slice(0, 4);
  const goTag = (tag: string) => navigate(`/tag/${encodeURIComponent(tag.replace('#', ''))}`);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 12px',
          background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 14px',
            borderRadius: 999,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
          }}
        >
          <Icon name="search" size={20} color="var(--ink3)" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t.searchPh}
            style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 15 }}
          />
          {!!q && (
            <button onClick={() => onQuery('')} style={{ color: 'var(--ink3)' }}>
              <Icon name="close" size={19} />
            </button>
          )}
        </div>
      </header>

      {searching && (
        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3, 4].map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(90deg,var(--surface) 25%,var(--surface2) 37%,var(--surface) 63%)',
                  backgroundSize: '200% 100%',
                  animation: 'fmShim 1.3s linear infinite',
                  display: 'block',
                }}
              />
              <span
                style={{
                  flex: 1,
                  height: 13,
                  borderRadius: 7,
                  background:
                    'linear-gradient(90deg,var(--surface) 25%,var(--surface2) 37%,var(--surface) 63%)',
                  backgroundSize: '200% 100%',
                  animation: 'fmShim 1.3s linear infinite',
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {!!q && !searching && (
        <div style={{ padding: '6px 0 20px' }}>
          {people.length > 0 && (
            <>
              <h3 style={{ ...sectionTitle, margin: '18px 16px 10px' }}>{t.people}</h3>
              {people.map((u) => {
                const followed = !!user.follows[u.id];
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                    <button onClick={() => navigate(`/profile/${u.id}`)} style={{ padding: 0 }}>
                      <Avatar hue={u.hue} initials={toInitials(u.name)} size={46} fontSize={15} />
                    </button>
                    <button
                      onClick={() => navigate(`/profile/${u.id}`)}
                      style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        @{u.username} · {fmt(u.followers)} {t.followers}
                      </div>
                    </button>
                    <button
                      onClick={() => toggleFollow(u.id)}
                      style={{
                        padding: '8px 15px',
                        borderRadius: 999,
                        fontSize: 13.5,
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
            </>
          )}

          {tags.length > 0 && (
            <>
              <h3 style={sectionTitle}>{t.hashtagsTitle}</h3>
              {tags.map((tag) => (
                <button
                  key={tag.tag}
                  className="hov-surface"
                  onClick={() => goTag(tag.tag)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '11px 16px',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--surface2)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--ink2)',
                    }}
                  >
                    <Icon name="tag" size={21} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{tag.tag}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink3)' }}>
                      {tag.count} {t.posts.toLowerCase()}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}

          {posts.length > 0 && (
            <>
              <h3 style={sectionTitle}>{t.posts}</h3>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </>
          )}

          {!people.length && !posts.length && !tags.length && (
            <div style={{ padding: '80px 30px', textAlign: 'center' }}>
              <Icon name="search_off" size={40} color="var(--ink3)" />
              <p style={{ margin: '14px 0 0', color: 'var(--ink2)', fontSize: 15 }}>{t.noResults}</p>
            </div>
          )}
        </div>
      )}

      {!q && (
        <div style={{ padding: '4px 0 26px' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 16px 6px' }}>
            {trends.map((trend) => (
              <button
                key={trend.tag}
                className="hov-accent-line"
                onClick={() => goTag(trend.tag)}
                style={{
                  flex: '0 0 auto',
                  padding: '9px 15px',
                  borderRadius: 999,
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'var(--ink2)',
                }}
              >
                {trend.tag}
              </button>
            ))}
          </div>

          <h3 style={{ ...browseTitle, margin: '20px 16px 12px' }}>{t.trending}</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
              gap: 3,
              padding: '0 3px',
            }}
          >
            {popular.map((post) => {
              const hue = data.users.find((u) => u.id === post.authorId)?.hue ?? 265;
              const thumb = post.media[0]?.label ?? post.text.slice(0, 60);
              return (
                <button
                  key={post.id}
                  onClick={() => navigate(`/post/${post.id}`)}
                  style={{
                    position: 'relative',
                    aspectRatio: '9/14',
                    overflow: 'hidden',
                    background: `repeating-linear-gradient(135deg, oklch(0.30 0.035 ${hue}) 0 9px, oklch(0.23 0.025 ${hue}) 9px 18px)`,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      padding: 10,
                      fontFamily: 'ui-monospace,monospace',
                      fontSize: 9.5,
                      lineHeight: 1.4,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: `oklch(0.93 0.02 ${hue})`,
                      textAlign: 'center',
                    }}
                  >
                    {thumb}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      left: 7,
                      bottom: 7,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      color: 'oklch(0.99 0 0)',
                      fontSize: 11,
                      fontWeight: 600,
                      textShadow: '0 1px 6px oklch(0 0 0 / .5)',
                    }}
                  >
                    <Icon name="favorite" size={14} fill={1} />
                    {fmt(post.likes)}
                  </span>
                </button>
              );
            })}
          </div>

          <h3 style={browseTitle}>{t.suggested}</h3>
          {suggested.map((u) => {
            const followed = !!user.follows[u.id];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px' }}>
                <button onClick={() => navigate(`/profile/${u.id}`)} style={{ padding: 0 }}>
                  <Avatar hue={u.hue} initials={toInitials(u.name)} size={46} fontSize={15} />
                </button>
                <button
                  onClick={() => navigate(`/profile/${u.id}`)}
                  style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--ink3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.bio}
                  </div>
                </button>
                <button
                  onClick={() => toggleFollow(u.id)}
                  style={{
                    padding: '8px 15px',
                    borderRadius: 999,
                    fontSize: 13.5,
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

          <h3 style={browseTitle}>{t.groups}</h3>
          {data.groups.map((group) => (
            <button
              key={group.id}
              className="hov-surface"
              onClick={() => navigate(`/messages/group/${group.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 16px',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <Avatar hue={group.hue} initials={toInitials(group.name)} size={46} radius="14px" fontSize={14} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{group.name}</span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: 'var(--ink3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.members.length} {t.members} · {group.description}
                </span>
              </span>
            </button>
          ))}

          <h3 style={browseTitle}>{t.channels}</h3>
          {data.channels.map((channel) => (
            <button
              key={channel.id}
              className="hov-surface"
              onClick={() => navigate(`/messages/channel/${channel.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 16px',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <Avatar
                hue={channel.hue}
                initials={toInitials(channel.name)}
                size={46}
                radius="14px"
                fontSize={14}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{channel.name}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ink3)' }}>
                  @{channel.slug} · {fmt(channel.subscribers)} {t.subscribers}
                </span>
              </span>
              <Icon name="chevron_right" size={20} color="var(--ink3)" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
