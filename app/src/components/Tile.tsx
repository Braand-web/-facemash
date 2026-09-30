import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { MediaFill } from './ui';
import { useApp } from '../store';
import { fmt } from '../lib/format';
import type { Post } from '../types';

/** A post as a square-ish thumbnail: media, or the first words when there is none. */
export function PostTile({ post, ratio = '3 / 4' }: { post: Post; ratio?: string }) {
  const navigate = useNavigate();
  const { userById } = useApp();
  const author = userById(post.authorId);
  const media = post.media[0];
  const kindIcon = post.kind === 'video' ? 'play_arrow' : post.kind === 'carousel' ? 'grid' : null;
  return (
    <button className="tile" onClick={() => navigate(`/post/${post.id}`)} style={{ aspectRatio: ratio, width: '100%' }} aria-label={post.text.slice(0, 60) || media?.label}>
      {media ? (
        <MediaFill item={media} hue={author.hue} showLabel={false} />
      ) : (
        <span className="media-art" style={{ position: 'absolute', inset: 0, ['--h' as string]: author.hue, display: 'grid', placeItems: 'center', padding: 14 }}>
          <span className="display" style={{ position: 'relative', fontSize: 15, fontWeight: 700, lineHeight: 1.2, textAlign: 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            {post.text}
          </span>
        </span>
      )}
      <span className="tile__shade" />
      {kindIcon && (
        <span className="tile__kind">
          <Icon name={kindIcon} size={14} fill={1} />
        </span>
      )}
      <span className="tile__meta">
        <Icon name="favorite" size={13} fill={1} />
        {fmt(post.likes)}
      </span>
    </button>
  );
}
