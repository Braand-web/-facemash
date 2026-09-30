import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PostCard } from '../components/PostCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { CommentComposer, CommentList, type ReplyTarget } from '../components/Comments';
import { EmptyState } from '../components/ui';
import { useApp } from '../store';
import { useLayout } from '../viewport';
import { commentCount } from '../lib/ranking';

export function PostDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const { data, t } = useApp();
  const { wide } = useLayout();
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const post = data.posts.find((p) => p.id === params.id);

  if (!post) {
    return (
      <>
        <ScreenHeader title={t.thread} onBack={() => navigate('/')} />
        <EmptyState icon="search_off" title={t.postMissing} body={t.postMissingHint} action={<button className="btn btn-primary" onClick={() => navigate('/')}>{t.home}</button>} />
      </>
    );
  }

  const comments = data.comments[post.id] ?? [];
  return (
    <>
      <ScreenHeader title={t.thread} onBack={() => navigate(-1)} />
      <div style={{ paddingTop: 12 }}>
        <PostCard post={post} />
      </div>
      <div style={{ padding: '8px 16px 24px' }}>
        <h3 className="section-title" style={{ margin: '0 0 16px', fontSize: 17 }}>
          {t.comments} <span style={{ color: 'var(--ink3)' }}>{commentCount(data.comments, post.id)}</span>
        </h3>
        <CommentList comments={comments} onReply={setReply} />
      </div>
      <div style={{ position: 'sticky', bottom: wide ? 0 : 'calc(84px + var(--safe-bottom))', zIndex: 35, borderRadius: wide ? '22px 22px 0 0' : 22, overflow: 'hidden', margin: wide ? 0 : '0 10px', border: '1px solid var(--line)' }}>
        <CommentComposer emoji={false} postId={post.id} reply={reply} onClearReply={() => setReply(null)} />
      </div>
    </>
  );
}
