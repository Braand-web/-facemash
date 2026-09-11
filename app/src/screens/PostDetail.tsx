import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Icon } from '../components/Icon';
import { PostCard } from '../components/PostCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useApp } from '../store';
import { useLayout } from '../viewport';
import { initials as toInitials, rel } from '../lib/format';

export function PostDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, t, lang, userById, addComment } = useApp();
  const { wide } = useLayout();
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; text: string } | null>(null);

  const post = data.posts.find((p) => p.id === params.id);
  if (!post) {
    return (
      <>
        <ScreenHeader title={t.thread} onBack={() => navigate('/')} />
        <p style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--ink3)' }}>{t.emptyFeed}</p>
      </>
    );
  }

  const comments = data.comments[post.id] ?? [];

  const send = () => {
    if (!draft.trim()) return;
    addComment(post.id, draft, replyTo?.id ?? null);
    setDraft('');
    setReplyTo(null);
  };

  return (
    <>
      <ScreenHeader title={t.thread} onBack={() => navigate(-1)} />
      <PostCard post={post} />
      <div style={{ padding: '16px 16px 110px' }}>
        <h3
          style={{
            margin: '0 0 14px',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: 'var(--ink3)',
            fontFamily: "'Bricolage Grotesque',sans-serif",
          }}
        >
          {t.comments}
        </h3>
        {comments.length === 0 && (
          <p style={{ margin: 0, padding: '28px 0', textAlign: 'center', color: 'var(--ink3)', fontSize: 14.5 }}>
            {t.emptyFeed}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {comments.map((comment) => {
            const author = userById(comment.userId);
            return (
              <div key={comment.id}>
                <div style={{ display: 'flex', gap: 11 }}>
                  <Avatar hue={author.hue} initials={toInitials(author.name)} size={38} fontSize={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{author.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{rel(comment.createdAt, lang)}</span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 14.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                      {comment.text}
                    </p>
                    <button
                      className="hov-ink"
                      onClick={() => setReplyTo({ id: comment.id, text: comment.text })}
                      style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink3)', fontWeight: 500 }}
                    >
                      {t.reply}
                    </button>
                  </div>
                </div>
                {comment.replies.length > 0 && (
                  <div
                    style={{
                      margin: '12px 0 0 49px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      paddingLeft: 14,
                      borderLeft: '1px solid var(--line)',
                    }}
                  >
                    {comment.replies.map((reply) => {
                      const replyAuthor = userById(reply.userId);
                      return (
                        <div key={reply.id} style={{ display: 'flex', gap: 10 }}>
                          <Avatar
                            hue={replyAuthor.hue}
                            initials={toInitials(replyAuthor.name)}
                            size={31}
                            fontSize={11.5}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{replyAuthor.name}</span>
                              <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                                {rel(reply.createdAt, lang)}
                              </span>
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 14, lineHeight: 1.5 }}>{reply.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: wide ? 0 : 71,
          zIndex: 35,
          padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
          background: 'color-mix(in oklab, var(--bg) 92%, transparent)',
          backdropFilter: 'blur(18px)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {replyTo && (
            <button
              onClick={() => setReplyTo(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 999,
                background: 'var(--surface)',
                fontSize: 12.5,
                color: 'var(--ink2)',
                maxWidth: '40%',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              <Icon name="reply" size={15} color="var(--accent)" />
              {replyTo.text}
            </button>
          )}
          <input
            className="field"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder={t.addComment}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '12px 15px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: 15,
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            style={{
              width: 42,
              height: 42,
              flex: '0 0 42px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--accentInk)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="send" size={21} fill={1} />
          </button>
        </div>
      </div>
    </>
  );
}
