import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { RichText, Sheet, UserAvatar, EmptyState } from './ui';
import { useApp } from '../store';
import { useOverlays } from '../overlays';
import { commentCount } from '../lib/ranking';
import { haptic } from '../lib/haptics';
import { rel } from '../lib/format';
import type { Comment } from '../types';

const QUICK = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

export interface ReplyTarget {
  id: string;
  name: string;
  username: string;
}

function Entry({
  userId,
  text,
  createdAt,
  likes,
  small,
  onReply,
}: {
  userId: string;
  text: string;
  createdAt: number;
  likes: number;
  small?: boolean;
  onReply?: () => void;
}) {
  const navigate = useNavigate();
  const { userById, lang, t } = useApp();
  const author = userById(userId);
  return (
    <div style={{ display: 'flex', gap: 11 }}>
      <UserAvatar userId={userId} size={small ? 30 : 38} onClick={() => navigate(`/profile/${userId}`)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <button onClick={() => navigate(`/profile/${userId}`)} style={{ fontSize: small ? 13.5 : 14.5, fontWeight: 650 }}>
            {author.name}
          </button>
          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{rel(createdAt, lang)}</span>
        </div>
        <p style={{ margin: '2px 0 0', fontSize: small ? 14 : 14.5, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          <RichText text={text} />
        </p>
        <div style={{ display: 'flex', gap: 14, marginTop: 5, fontSize: 12.5, color: 'var(--ink3)', fontWeight: 600 }}>
          {likes > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="favorite" size={13} fill={1} color="var(--like)" />
              {likes}
            </span>
          )}
          {onReply && (
            <button className="hov-ink" onClick={onReply}>
              {t.reply}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentList({ comments, onReply }: { comments: Comment[]; onReply: (target: ReplyTarget) => void }) {
  const { t, userById } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (comments.length === 0) {
    return <EmptyState icon="mode_comment" title={t.noComments} body={t.noCommentsHint} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {comments.map((comment) => {
        const author = userById(comment.userId);
        const expanded = !!open[comment.id];
        return (
          <div key={comment.id} style={{ animation: 'fmIn 300ms var(--ease-out) both' }}>
            <Entry
              userId={comment.userId}
              text={comment.text}
              createdAt={comment.createdAt}
              likes={comment.likes}
              onReply={() => onReply({ id: comment.id, name: author.name, username: author.username })}
            />
            {comment.replies.length > 0 && (
              <div style={{ margin: '10px 0 0 49px' }}>
                <button
                  onClick={() => setOpen((prev) => ({ ...prev, [comment.id]: !expanded }))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 650, color: 'var(--ink3)' }}
                >
                  <span style={{ width: 22, height: 1.5, background: 'var(--line-strong)' }} />
                  {expanded ? t.hideReplies : `${t.viewReplies} (${comment.replies.length})`}
                </button>
                {expanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                    {comment.replies.map((reply) => (
                      <Entry
                        key={reply.id}
                        small
                        userId={reply.userId}
                        text={reply.text}
                        createdAt={reply.createdAt}
                        likes={reply.likes}
                        onReply={() =>
                          onReply({
                            id: comment.id,
                            name: userById(reply.userId).name,
                            username: userById(reply.userId).username,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CommentComposer({
  postId,
  reply,
  onClearReply,
  autoFocus,
  onSent,
  emoji = true,
}: {
  postId: string;
  reply: ReplyTarget | null;
  onClearReply: () => void;
  autoFocus?: boolean;
  onSent?: () => void;
  emoji?: boolean;
}) {
  const { t, me, addComment } = useApp();
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement | null>(null);

  // Replying pre-fills the mention and pulls focus, so the keyboard is already up.
  useEffect(() => {
    if (!reply) return;
    setDraft((current) => (current.startsWith(`@${reply.username} `) ? current : `@${reply.username} `));
    input.current?.focus();
  }, [reply]);

  const send = () => {
    if (!draft.trim()) return;
    addComment(postId, draft, reply?.id ?? null);
    haptic('success');
    setDraft('');
    onClearReply();
    onSent?.();
  };

  return (
    <div
      style={{
        padding: '10px 14px 12px',
        borderTop: '1px solid var(--line)',
        background: 'color-mix(in srgb, var(--bg-elev) 90%, transparent)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {emoji && (
      <div className="hscroll" style={{ gap: 4, paddingBottom: 8 }} aria-label="Emoji">
        {QUICK.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              setDraft((current) => current + emoji);
              input.current?.focus();
            }}
            style={{ fontSize: 22, padding: '2px 6px', borderRadius: 10 }}
          >
            {emoji}
          </button>
        ))}
      </div>
      )}
      {reply && (
        <button
          onClick={() => {
            setDraft('');
            onClearReply();
          }}
          className="chip"
          style={{ marginBottom: 8, minHeight: 30, fontSize: 12.5 }}
        >
          <Icon name="reply" size={14} color="var(--accent-fg)" />
          {t.replyingTo} {reply.name}
          <Icon name="close" size={14} />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserAvatar userId={me.id} size={36} />
        <input
          ref={input}
          className="field"
          autoFocus={autoFocus}
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
          }}
          placeholder={t.addComment}
          enterKeyHint="send"
          style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 16px', borderRadius: 999, fontSize: 15 }}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={!draft.trim()}
          aria-label={t.send}
          style={{ width: 44, minHeight: 44, padding: 0, borderRadius: '50%' }}
        >
          <Icon name="arrow_upward" size={20} />
        </button>
      </div>
    </div>
  );
}

/** Comments as a sheet, so reading them never costs you your place in the feed. */
export function CommentsSheet() {
  const { commentsPostId, closeComments } = useOverlays();
  const { data, t } = useApp();
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const list = useRef<HTMLDivElement | null>(null);

  if (!commentsPostId) return null;
  const comments = data.comments[commentsPostId] ?? [];
  const total = commentCount(data.comments, commentsPostId);

  return (
    <Sheet
      onClose={() => {
        setReply(null);
        closeComments();
      }}
      label={t.comments}
      title={
        <>
          {t.comments} <span style={{ color: 'var(--ink3)', fontWeight: 600 }}>{total}</span>
        </>
      }
      height="min(80dvh, 740px)"
      z={77}
      bodyStyle={{ display: 'flex', flexDirection: 'column' }}
    >
      <div ref={list} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px' }}>
        <CommentList comments={comments} onReply={setReply} />
      </div>
      <CommentComposer
        postId={commentsPostId}
        reply={reply}
        onClearReply={() => setReply(null)}
        onSent={() => list.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </Sheet>
  );
}
