import { minutesAgo } from './format';
import type { Comment, Data, Post } from '../types';
import type { UserState } from '../store';

export const weights = {
  recency: 0.3,
  engagement: 0.26,
  watch: 0.2,
  completion: 0.12,
  affinity: 0.12,
};

export const commentCount = (comments: Record<string, Comment[]>, postId: string): number =>
  (comments[postId] ?? []).reduce((total, c) => total + 1 + c.replies.length, 0);

/** The stored counter already includes the viewer's like: toggling updates it in place. */
export const likeCount = (post: Post): number => post.likes;

const affinity = (authorId: string, posts: Post[], user: UserState): number => {
  let value = user.follows[authorId] ? 0.8 : 0.25;
  if (posts.some((p) => p.authorId === authorId && user.likes[p.id])) value += 0.2;
  return Math.min(value, 1);
};

export const score = (post: Post, data: Data, user: UserState): number => {
  const recency = 1 / (1 + minutesAgo(post.createdAt) / 60 / 8);
  const engagement = Math.min(
    (likeCount(post) +
      2 * commentCount(data.comments, post.id) +
      3 * post.reposts +
      2 * post.shares) /
      20000,
    1,
  );
  const watch = Math.min(post.watchSeconds / 30, 1);
  const boost = user.interests.includes(post.category) ? 1.15 : 1;
  return (
    (weights.recency * recency +
      weights.engagement * engagement +
      weights.watch * watch +
      weights.completion * post.completion +
      weights.affinity * affinity(post.authorId, data.posts, user)) *
    boost
  );
};

/** A post is out of reach when its author is blocked, or private and not followed. */
export const visibleToMe = (post: Post, data: Data, user: UserState, meId: string): boolean => {
  if (user.blocked[post.authorId]) return false;
  if (post.authorId === meId) return post.visibility !== 'private';
  if (post.visibility === 'private') return false;
  if (post.visibility === 'followers' && !user.follows[post.authorId]) return false;
  const author = data.users.find((u) => u.id === post.authorId);
  if (author?.isPrivate && !user.follows[post.authorId]) return false;
  return true;
};

/** Feed ranking: newest-and-most-engaging first, minus everything out of reach. */
export const rankedPosts = (data: Data, user: UserState, meId: string): Post[] =>
  data.posts
    .filter((p) => visibleToMe(p, data, user, meId))
    .slice()
    .sort((a, b) => score(b, data, user) - score(a, data, user));
