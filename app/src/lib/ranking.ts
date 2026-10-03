import { minutesAgo } from './format';
import type { Comment, Data, Post } from '../types';
import type { UserState } from '../store';

export const weights = {
  recency: 0.4,
  engagement: 0.35,
  affinity: 0.25,
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
  const interestBoost = user.interests.includes(post.category) ? 0.12 : 0;
  return (
    weights.recency * recency +
    weights.engagement * engagement +
    weights.affinity * affinity(post.authorId, data.posts, user) +
    interestBoost
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

/** Feed ranking favours freshness, explicit interactions, followed creators and interests. */
export const rankedPosts = (data: Data, user: UserState, meId: string): Post[] =>
  data.posts
    .filter((p) => visibleToMe(p, data, user, meId))
    .slice()
    .sort((a, b) => score(b, data, user) - score(a, data, user));
