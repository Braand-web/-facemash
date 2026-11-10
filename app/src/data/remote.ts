import { supabase } from '../lib/supabase';
import { makeStory } from '../lib/stories';
import type { UserState } from '../store';
import type {
  AppNotification,
  Channel,
  Comment,
  Conversation,
  Data,
  Group,
  Message,
  MessageKind,
  Post,
  PostKind,
  Role,
  StoryGroup,
  User,
  Visibility,
} from '../types';

/** True when the app has Supabase credentials and can run against the real database. */
export const remoteEnabled = supabase !== null;

type Row = Record<string, unknown>;

const asDate = (value: unknown): number => new Date(String(value)).getTime();

const toUser = (row: Row): User => ({
  id: String(row.id),
  name: String(row.name),
  username: String(row.username),
  hue: Number(row.hue),
  bio: String(row.bio ?? ''),
  location: String(row.location ?? ''),
  followers: Number(row.followers ?? 0),
  following: Number(row.following ?? 0),
  isPrivate: Boolean(row.is_private),
  avatarPath: (row.avatar_path as string | null) ?? undefined,
});

const toPost = (row: Row): Post => ({
  id: String(row.id),
  authorId: String(row.author_id),
  kind: String(row.kind) as PostKind,
  text: String(row.text ?? ''),
  tags: (row.tags as string[] | null) ?? [],
  visibility: String(row.visibility) as Visibility,
  location: (row.location as string | null) ?? undefined,
  createdAt: asDate(row.created_at),
  likes: Number(row.likes ?? 0),
  reposts: Number(row.reposts ?? 0),
  shares: Number(row.shares ?? 0),
  views: Number(row.views ?? 0),
  completion: Number(row.completion ?? 0),
  watchSeconds: Number(row.watch_seconds ?? 0),
  category: String(row.category ?? 'lifestyle'),
  media: ((row.post_media as Row[] | null) ?? [])
    .slice()
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((m) => ({
      label: String(m.label),
      ratio: String(m.ratio),
      url: (m.url as string | null) ?? undefined,
      video: Boolean(m.video),
    })),
});

const toMessage = (row: Row): Message => ({
  id: String(row.id),
  from: String(row.sender_id),
  kind: String(row.kind) as MessageKind,
  text: (row.text as string | null) ?? undefined,
  mediaLabel: (row.media_label as string | null) ?? undefined,
  docName: (row.doc_name as string | null) ?? undefined,
  docSize: (row.doc_size as string | null) ?? undefined,
  createdAt: asDate(row.created_at),
  status: String(row.status) as Message['status'],
  reactions: ((row.message_reactions as Row[] | null) ?? []).map((r) => String(r.icon)),
  replyTo: row.reply_to_id
    ? { id: String(row.reply_to_id), text: String(row.reply_to_text ?? '') }
    : undefined,
  sharedPostId: (row.shared_post_id as string | null) ?? undefined,
  sharedText: (row.shared_text as string | null) ?? undefined,
  mediaUrl: typeof row.media_url === 'string' && /^https?:\/\//i.test(row.media_url) ? row.media_url : undefined,
  mediaPath: typeof row.media_url === 'string' && !/^https?:\/\//i.test(row.media_url) ? row.media_url : undefined,
});

async function signThreadMedia(messages: Message[]): Promise<Message[]> {
  if (!supabase) return messages;
  const paths = [...new Set(messages.map((message) => message.mediaPath).filter((path): path is string => !!path))];
  if (!paths.length) return messages;
  const { data, error } = await supabase.storage.from('thread-media').createSignedUrls(paths, 3600);
  if (error) {
    console.warn('facemash: private message attachments could not be signed', error.message);
    return messages;
  }
  const urls = new Map((data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
  return messages.map((message) => ({ ...message, mediaUrl: message.mediaPath ? urls.get(message.mediaPath) : message.mediaUrl }));
}

/** The signed-in user's profile row id, which every other table keys off. */
export async function loadProfileId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return String(data.id);
}

export interface RemoteSnapshot {
  data: Data;
  user: UserState;
  settings: { theme: 'dark' | 'light'; lang: 'fr' | 'en'; onboarded: boolean };
}

export async function loadSnapshot(profileId: string): Promise<RemoteSnapshot | null> {
  if (!supabase) return null;

  const [
    profiles,
    posts,
    comments,
    likes,
    saves,
    reposts,
    follows,
    blocks,
    requests,
    members,
    messages,
    channels,
    channelAdmins,
    subscriptions,
    joinRequests,
    channelJoinRequests,
    stories,
    notifications,
    settings,
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('posts').select('*, post_media(*)'),
    supabase.from('comments').select('*'),
    supabase.from('likes').select('post_id').eq('profile_id', profileId),
    supabase.from('saves').select('post_id').eq('profile_id', profileId),
    supabase.from('reposts').select('post_id').eq('profile_id', profileId),
    supabase.from('follows').select('following_id').eq('follower_id', profileId),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', profileId),
    supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', profileId)
      .eq('status', 'pending'),
    supabase.from('thread_members').select('*, threads(*)'),
    supabase.rpc('my_recent_thread_messages', { per_thread: 60 }),
    supabase.from('channels').select('*, channel_posts(*, channel_post_media(*))'),
    supabase.from('channel_admins').select('channel_id, profile_id'),
    supabase.from('channel_subscriptions').select('channel_id').eq('profile_id', profileId),
    supabase.from('group_join_requests').select('id, thread_id, profile_id, created_at').eq('status', 'pending'),
    supabase.from('channel_join_requests').select('id, channel_id, profile_id, created_at').eq('status', 'pending'),
    supabase.from('stories').select('*').order('created_at', { ascending: true }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('user_settings').select('*').eq('profile_id', profileId).maybeSingle(),
  ]);

  if (profiles.error || messages.error) return null;

  const profileRows = (profiles.data as Row[] | null) ?? [];
  const avatarPaths = profileRows.map((row) => row.avatar_path).filter((path): path is string => typeof path === 'string' && !!path);
  const avatarUrls = new Map<string, string>();
  if (avatarPaths.length) {
    const { data: signedAvatars, error: avatarError } = await supabase.storage.from('avatars').createSignedUrls(avatarPaths, 3600);
    if (avatarError) console.warn('facemash: private profile photos could not be signed', avatarError.message);
    signedAvatars?.forEach((item) => {
      if (item.path && item.signedUrl) avatarUrls.set(item.path, item.signedUrl);
    });
  }
  const users = profileRows.map((row) => {
    const user = toUser(row);
    return { ...user, avatarUrl: user.avatarPath ? avatarUrls.get(user.avatarPath) : undefined };
  });
  const allPosts = ((posts.data as Row[] | null) ?? []).map(toPost);

  const commentsByPost: Record<string, Comment[]> = {};
  const commentRows = ((comments.data as Row[] | null) ?? []).slice();
  commentRows
    .filter((row) => !row.parent_id)
    .forEach((row) => {
      const entry: Comment = {
        id: String(row.id),
        userId: String(row.author_id),
        text: String(row.text),
        createdAt: asDate(row.created_at),
        likes: Number(row.likes ?? 0),
        replies: commentRows
          .filter((child) => child.parent_id === row.id)
          .map((child) => ({
            id: String(child.id),
            userId: String(child.author_id),
            text: String(child.text),
            createdAt: asDate(child.created_at),
            likes: Number(child.likes ?? 0),
          })),
      };
      const key = String(row.post_id);
      commentsByPost[key] = [...(commentsByPost[key] ?? []), entry];
    });

  const rawMessages = (messages.data as Row[] | null) ?? [];
  const messageIds = rawMessages.map((row) => String(row.id));
  const reactionsResult = messageIds.length
    ? await supabase.from('message_reactions').select('message_id, icon').in('message_id', messageIds)
    : { data: [], error: null };
  const reactionsByMessage = new Map<string, Row[]>();
  ((reactionsResult.data as Row[] | null) ?? []).forEach((row) => {
    const id = String(row.message_id);
    reactionsByMessage.set(id, [...(reactionsByMessage.get(id) ?? []), { icon: row.icon }]);
  });
  const signedMessages = await signThreadMedia(rawMessages.map((row) => toMessage({
    ...row, message_reactions: reactionsByMessage.get(String(row.id)) ?? [],
  })));
  const messageRows = signedMessages;
  const messagesByThread: Record<string, Message[]> = {};
  ((messages.data as Row[] | null) ?? []).forEach((row, i) => {
    const key = String(row.thread_id);
    messagesByThread[key] = [...(messagesByThread[key] ?? []), messageRows[i]];
  });
  Object.values(messagesByThread).forEach((list) => list.sort((a, b) => a.createdAt - b.createdAt));
  const threadsWithOlderMessages = new Set(
    Object.entries(messagesByThread).filter(([, list]) => list.length > 60).map(([threadId]) => threadId),
  );
  Object.values(messagesByThread).forEach((list) => {
    if (list.length > 60) list.splice(0, list.length - 60);
  });

  const myMemberships = ((members.data as Row[] | null) ?? []).filter(
    (row) => String(row.profile_id) === profileId,
  );
  const groupAvatarPaths = [...new Set(myMemberships.flatMap((membership) => {
    const thread = membership.threads as Row | null;
    return thread?.kind === 'group' && typeof thread.avatar_path === 'string' ? [thread.avatar_path] : [];
  }))];
  const groupAvatarUrls = new Map<string, string>();
  if (groupAvatarPaths.length) {
    const { data: signed, error } = await supabase.storage.from('thread-media').createSignedUrls(groupAvatarPaths, 3600);
    if (error) console.warn('facemash: group images could not be signed', error.message);
    signed?.forEach((item) => { if (item.path && item.signedUrl) groupAvatarUrls.set(item.path, item.signedUrl); });
  }

  const conversations: Conversation[] = [];
  const groups: Group[] = [];
  const pins: Record<string, boolean> = {};
  const archived: Record<string, boolean> = {};
  const muted: Record<string, boolean> = {};
  const unreadAt: Record<string, number> = {};
  const joinRequestRows = (joinRequests.data as Row[] | null) ?? [];

  myMemberships.forEach((membership) => {
    const thread = membership.threads as Row | null;
    if (!thread) return;
    const threadId = String(thread.id);
    if (membership.pinned) pins[threadId] = true;
    if (membership.archived) archived[threadId] = true;
    if (membership.muted) muted[threadId] = true;
    if (Number(membership.unread_at ?? 0) > 0) unreadAt[threadId] = Number(membership.unread_at);
    const ephemeralSeconds = Number(thread.ephemeral_seconds ?? 0);

    if (thread.kind === 'dm') {
      const other = ((members.data as Row[] | null) ?? []).find(
        (row) => String(row.thread_id) === threadId && String(row.profile_id) !== profileId,
      );
      conversations.push({
        id: threadId,
        userId: other ? String(other.profile_id) : profileId,
        unread: Number(membership.unread ?? 0),
        messages: messagesByThread[threadId] ?? [],
        ephemeralSeconds,
        hasMore: threadsWithOlderMessages.has(threadId),
      });
    } else {
      groups.push({
        id: threadId,
        name: String(thread.name ?? ''),
        description: String(thread.description ?? ''),
        hue: Number(thread.hue ?? 265),
        avatarPath: (thread.avatar_path as string | null) ?? undefined,
        avatarUrl: typeof thread.avatar_path === 'string' ? groupAvatarUrls.get(thread.avatar_path) : undefined,
        invitePolicy: String(thread.invite_policy ?? 'admins') as Group['invitePolicy'],
        approvalRequired: Boolean(thread.approval_required),
        notificationsEnabled: thread.notifications_enabled !== false,
        postingMode: String(thread.posting_mode ?? 'all') as Group['postingMode'],
        slowModeSeconds: Number(thread.slow_mode_seconds ?? 0),
        unread: Number(membership.unread ?? 0),
        members: ((members.data as Row[] | null) ?? [])
          .filter((row) => String(row.thread_id) === threadId)
          .map((row) => ({ userId: String(row.profile_id), role: String(row.role) as Role })),
        messages: messagesByThread[threadId] ?? [],
        ephemeralSeconds,
        hasMore: threadsWithOlderMessages.has(threadId),
        joinRequests: joinRequestRows.filter((request) => String(request.thread_id) === threadId).map((request) => ({
          id: String(request.id), userId: String(request.profile_id), createdAt: asDate(request.created_at),
        })),
      });
    }
  });

  const subscribed = new Set(
    ((subscriptions.data as Row[] | null) ?? []).map((row) => String(row.channel_id)),
  );
  const adminRows = (channelAdmins.data as Row[] | null) ?? [];
  const channelRows = (channels.data as Row[] | null) ?? [];
  const channelAvatarPaths = [...new Set(channelRows.map((row) => row.avatar_path).filter((path): path is string => typeof path === 'string' && !!path))];
  const channelAvatarUrls = new Map<string, string>();
  if (channelAvatarPaths.length) {
    const { data: signed, error } = await supabase.storage.from('channel-media').createSignedUrls(channelAvatarPaths, 3600);
    if (error) console.warn('facemash: channel images could not be signed', error.message);
    signed?.forEach((item) => { if (item.path && item.signedUrl) channelAvatarUrls.set(item.path, item.signedUrl); });
  }

  const channelList: Channel[] = channelRows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ''),
    hue: Number(row.hue ?? 182),
    subscribers: Number(row.subscribers ?? 0),
    subscribed: subscribed.has(String(row.id)),
    ownerProfileId: (row.owner_profile_id as string | null) ?? undefined,
    adminProfileIds: adminRows.filter((admin) => String(admin.channel_id) === String(row.id)).map((admin) => String(admin.profile_id)),
    isPrivate: Boolean(row.is_private),
    linkedThreadId: (row.linked_thread_id as string | null) ?? undefined,
    joinRequests: ((channelJoinRequests.data as Row[] | null) ?? []).filter((request) => String(request.channel_id) === String(row.id)).map((request) => ({
      id: String(request.id), profileId: String(request.profile_id), createdAt: asDate(request.created_at),
    })),
    avatarPath: (row.avatar_path as string | null) ?? undefined,
    avatarUrl: typeof row.avatar_path === 'string' ? channelAvatarUrls.get(row.avatar_path) : undefined,
    posts: ((row.channel_posts as Row[] | null) ?? [])
      .slice()
      .sort((a, b) => asDate(b.created_at) - asDate(a.created_at))
      .map((post) => ({
        id: String(post.id),
        authorId: (post.author_id as string | null) ?? undefined,
        text: String(post.text),
        createdAt: asDate(post.created_at),
        views: Number(post.views ?? 0),
        reactions: (post.reaction_counts as Record<string, number> | null) ?? {},
        media: ((post.channel_post_media as Row[] | null) ?? []).map((m) => ({
          label: String(m.label),
          ratio: String(m.ratio),
          url: (m.media_url as string | null) ?? undefined,
        })),
      })),
  }));

  const storyGroups: StoryGroup[] = [];
  ((stories.data as Row[] | null) ?? []).forEach((row) => {
    const authorId = String(row.author_id);
    const item = makeStory(String(row.label), asDate(row.created_at), String(row.id));
    const existing = storyGroups.find((group) => group.userId === authorId);
    if (existing) existing.items.push(item);
    else storyGroups.push({ userId: authorId, items: [item] });
  });
  // Your own story leads, so the rail and the viewer agree on the order.
  storyGroups.sort((a, b) => Number(b.userId === profileId) - Number(a.userId === profileId));

  const notificationList: AppNotification[] = ((notifications.data as Row[] | null) ?? []).map((row) => ({
    id: String(row.id),
    kind: String(row.kind) as AppNotification['kind'],
    userId: String(row.actor_id),
    postId: (row.post_id as string | null) ?? undefined,
    createdAt: asDate(row.created_at),
    read: Boolean(row.read),
    text: (row.text as string | null) ?? undefined,
    groupName: (row.group_name as string | null) ?? undefined,
    requestState: (row.request_state as AppNotification['requestState']) ?? undefined,
  }));

  const flags = (rows: Row[] | null, key: string): Record<string, boolean> =>
    Object.fromEntries((rows ?? []).map((row) => [String(row[key]), true]));

  const settingsRow = (settings.data as Row | null) ?? null;

  return {
    data: {
      users,
      posts: allPosts,
      comments: commentsByPost,
      conversations,
      groups,
      channels: channelList,
      notifications: notificationList,
      stories: storyGroups,
    },
    user: {
      likes: flags(likes.data as Row[] | null, 'post_id'),
      saves: flags(saves.data as Row[] | null, 'post_id'),
      reposts: flags(reposts.data as Row[] | null, 'post_id'),
      follows: flags(follows.data as Row[] | null, 'following_id'),
      blocked: flags(blocks.data as Row[] | null, 'blocked_id'),
      requested: flags(requests.data as Row[] | null, 'target_id'),
      pins,
      archived,
      muted,
      unreadAt,
      interests: (settingsRow?.interests as string[] | null) ?? [],
    },
    settings: {
      theme: (settingsRow?.theme as 'dark' | 'light') ?? 'dark',
      lang: (settingsRow?.lang as 'fr' | 'en') ?? 'fr',
      onboarded: Boolean(settingsRow?.onboarded),
    },
  };
}

const table = (name: string) => supabase!.from(name);

const pendingThreadCreations = new Map<string, Promise<boolean>>();

/** Writes mirror optimistic UI updates; callers can roll back when persistence fails. */
const run = async (label: string, work: () => PromiseLike<{ error: unknown }>) => {
  if (!supabase) return false;
  try {
    const { error } = await work();
    if (error) {
      console.error(`facemash: ${label} failed`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`facemash: ${label} failed`, error);
    return false;
  }
};

export interface RealtimeHandlers {
  onMessage: (threadId: string, message: Message) => void;
  onMessageUpdate: (threadId: string, message: Message) => void;
  onMessageDelete: (messageId: string) => void;
  onNotification: () => void;
  onPost: () => void;
}

/**
 * Live updates for the threads this account belongs to, plus its notifications.
 * Returns an unsubscribe function; a no-op when there is no backend.
 */
export function subscribeRealtime(profileId: string, handlers: RealtimeHandlers): () => void {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`facemash:${profileId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'facemash', table: 'messages' },
      (payload) => {
        const row = payload.new as Row;
        if (String(row.sender_id) === profileId) return;
        void signThreadMedia([toMessage(row)]).then(([message]) => handlers.onMessage(String(row.thread_id), message));
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'facemash', table: 'messages' },
      (payload) => {
        const row = payload.new as Row;
        void signThreadMedia([toMessage(row)]).then(([message]) => handlers.onMessageUpdate(String(row.thread_id), message));
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'facemash', table: 'messages' },
      (payload) => handlers.onMessageDelete(String((payload.old as Row).id)),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'facemash', table: 'notifications', filter: `profile_id=eq.${profileId}` },
      () => handlers.onNotification(),
    )
    .on('postgres_changes', { event: 'INSERT', schema: 'facemash', table: 'posts' }, () =>
      handlers.onPost(),
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('facemash: realtime subscription failed', status, error);
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}

export const remote = {
  resolveInviteCode: async (code: string): Promise<{ name: string | null; username: string | null; isPublic: boolean } | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('resolve_invite_code', { invite_code: code });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Row | null;
      return row ? {
        name: (row.name as string | null) ?? null,
        username: (row.username as string | null) ?? null,
        isPublic: Boolean(row.is_public),
      } : null;
    } catch (error) {
      console.error('facemash: resolveInviteCode failed', error);
      return null;
    }
  },

  claimReferralCode: async (code: string): Promise<boolean | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('claim_referral', { invite_code: code });
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('facemash: claimReferralCode failed', error);
      return null;
    }
  },

  myInviteCode: async (): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('my_invite_code');
      if (error) throw error;
      return typeof data === 'string' ? data : null;
    } catch (error) {
      console.error('facemash: myInviteCode failed', error);
      return null;
    }
  },

  myReferralCounts: async (): Promise<{ registered: number; onboarded: number } | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('my_referral_counts');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Row | null;
      return row ? {
        registered: Number(row.registered_count ?? 0),
        onboarded: Number(row.onboarded_count ?? 0),
      } : null;
    } catch (error) {
      console.error('facemash: myReferralCounts failed', error);
      return null;
    }
  },

  setFlag: (
    name: 'likes' | 'saves' | 'reposts',
    profileId: string,
    postId: string,
    on: boolean,
  ) =>
    run(name, () =>
      on
        ? table(name).insert({ profile_id: profileId, post_id: postId })
        : table(name).delete().eq('profile_id', profileId).eq('post_id', postId),
    ),

  setFollow: (profileId: string, targetId: string, on: boolean) =>
    run('follow', () =>
      on
        ? table('follows').insert({ follower_id: profileId, following_id: targetId })
        : table('follows').delete().eq('follower_id', profileId).eq('following_id', targetId),
    ),

  block: (profileId: string, targetId: string) =>
    run('block', () => table('blocks').insert({ blocker_id: profileId, blocked_id: targetId })),

  unblock: (profileId: string, targetId: string) =>
    run('unblock', () => table('blocks').delete().eq('blocker_id', profileId).eq('blocked_id', targetId)),

  /** Returns the new row id so the story can be deleted later. */
  createStory: async (profileId: string, label: string): Promise<string | null> => {
    if (!supabase) return null;
    const { data, error } = await table('stories')
      .insert({ author_id: profileId, label })
      .select('id')
      .single();
    if (error || !data) {
      console.error('facemash: createStory failed', error);
      return null;
    }
    return String((data as Row).id);
  },

  deleteStory: (storyId: string) => run('deleteStory', () => table('stories').delete().eq('id', storyId)),

  report: (profileId: string, target: {
    postId?: string;
    profileId?: string;
    threadId?: string;
    channelId?: string;
    channelPostId?: string;
  }) =>
    run('report', () =>
      table('reports').insert({
        reporter_id: profileId,
        post_id: target.postId ?? null,
        profile_id: target.profileId ?? null,
        thread_id: target.threadId ?? null,
        channel_id: target.channelId ?? null,
        channel_post_id: target.channelPostId ?? null,
      }),
    ),

  addComment: (comment: {
    id: string;
    postId: string;
    parentId: string | null;
    authorId: string;
    text: string;
  }) =>
    run('comment', () =>
      table('comments').insert({
        id: comment.id,
        post_id: comment.postId,
        parent_id: comment.parentId,
        author_id: comment.authorId,
        text: comment.text,
      }),
    ),

  createPost: async (post: Post): Promise<boolean> => {
    if (!supabase || post.media.some((media) => media.url?.startsWith('blob:'))) return false;
    try {
      const { error } = await table('posts').insert({
        id: post.id,
        author_id: post.authorId,
        kind: post.kind,
        text: post.text,
        tags: post.tags,
        visibility: post.visibility,
        location: post.location ?? null,
        completion: post.completion,
        watch_seconds: post.watchSeconds,
        category: post.category,
      });
      if (error) {
        console.error('facemash: createPost failed', error);
        return false;
      }
      if (post.media.length) {
        const mediaSaved = await run('createPost media', () =>
          table('post_media').insert(
            post.media.map((media, position) => ({
              post_id: post.id,
              position,
              label: media.label,
              ratio: media.ratio,
              url: media.url ?? null,
              video: !!media.video,
            })),
          ),
        );
        if (!mediaSaved) {
          await run('createPost rollback', () => table('posts').delete().eq('id', post.id));
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('facemash: createPost failed', error);
      return false;
    }
  },

  updatePost: async (post: Post): Promise<boolean> => {
    if (!supabase || post.media.some((media) => media.url?.startsWith('blob:'))) return false;
    try {
      const { data, error } = await supabase.rpc('update_post_with_media', {
        target_post: post.id,
        post_text: post.text,
        post_tags: post.tags,
        post_visibility: post.visibility,
        post_location: post.location ?? null,
        media_items: post.media.map((media) => ({
          label: media.label,
          ratio: media.ratio,
          url: media.url ?? null,
          video: Boolean(media.video),
        })),
      });
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('facemash: updatePost failed', error);
      return false;
    }
  },

  deletePost: (postId: string) => run('deletePost', () => table('posts').delete().eq('id', postId)),

  createThread: (thread: {
    id: string;
    kind: 'dm' | 'group';
    name: string;
    description: string;
    hue: number;
    createdBy: string;
    members: { profileId: string; role: Role }[];
  }) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    const creation = (async () => {
      try {
        const { error } = await client.rpc('create_thread', {
          target_thread: thread.id,
          thread_kind: thread.kind,
          thread_name: thread.name,
          thread_description: thread.description,
          thread_hue: thread.hue,
          target_members: thread.members.map((member) => ({
            profile_id: member.profileId,
            role: member.role,
          })),
        });
        if (error) {
          console.error('facemash: createThread failed', error);
          return false;
        }
        return true;
      } catch (error) {
        console.error('facemash: createThread failed', error);
        return false;
      }
    })();
    pendingThreadCreations.set(thread.id, creation);
    void creation.then(() => {
      if (pendingThreadCreations.get(thread.id) === creation) {
        pendingThreadCreations.delete(thread.id);
      }
    });
    return creation;
  },

  createManagedGroup: async (group: {
    id: string;
    name: string;
    description: string;
    members: string[];
    invitePolicy: 'admins' | 'members';
    approvalRequired: boolean;
    notificationsEnabled: boolean;
    postingMode: 'all' | 'admins';
    slowModeSeconds: number;
  }): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('create_managed_group', {
        target_thread: group.id,
        thread_name: group.name,
        thread_description: group.description,
        target_members: group.members,
        group_invites: group.invitePolicy,
        group_approval: group.approvalRequired,
        group_notifications: group.notificationsEnabled,
        group_posting: group.postingMode,
        group_slow_mode: group.slowModeSeconds,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('facemash: createManagedGroup failed', error);
      return false;
    }
  },

  updateGroupSettings: (threadId: string, patch: {
    name: string; description: string; avatarPath: string | null;
    invitePolicy: 'admins' | 'members'; approvalRequired: boolean;
    notificationsEnabled: boolean; postingMode: 'all' | 'admins'; slowModeSeconds: number;
  }) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('updateGroupSettings', () => client.rpc('update_group_settings', {
      target_thread: threadId,
      next_name: patch.name,
      next_description: patch.description,
      next_avatar_path: patch.avatarPath,
      next_invite_policy: patch.invitePolicy,
      next_approval: patch.approvalRequired,
      next_notifications: patch.notificationsEnabled,
      next_posting_mode: patch.postingMode,
      next_slow_mode: patch.slowModeSeconds,
    }));
  },

  uploadChannelAvatar: async (channelId: string, profileId: string, file: File): Promise<{ path: string; url: string } | null> => {
    const client = supabase;
    if (!client) return null;
    const path = `${channelId}/${profileId}/${crypto.randomUUID()}.jpg`;
    const { error } = await client.storage.from('channel-media').upload(path, file, {
      cacheControl: '3600', contentType: 'image/jpeg', upsert: false,
    });
    if (error) {
      console.error('facemash: uploadChannelAvatar failed', error);
      return null;
    }
    const { data, error: signedError } = await client.storage.from('channel-media').createSignedUrl(path, 3600);
    if (signedError || !data?.signedUrl) {
      console.error('facemash: channel image signing failed', signedError);
      return null;
    }
    return { path, url: data.signedUrl };
  },

  setChannelAvatar: (channelId: string, path: string | null) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('setChannelAvatar', () => client.rpc('set_channel_avatar', { target_channel: channelId, target_path: path }));
  },

  updateChannelDetails: (channelId: string, name: string, description: string, avatarPath: string | null) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('updateChannelDetails', () => client.rpc('update_channel_details', {
      target_channel: channelId,
      next_name: name,
      next_description: description,
      next_avatar_path: avatarPath,
    }));
  },

  linkChannelDiscussion: async (channelId: string): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('link_channel_discussion', { target_channel: channelId });
      if (error) throw error;
      return typeof data === 'string' ? data : null;
    } catch (error) {
      console.error('facemash: linkChannelDiscussion failed', error);
      return null;
    }
  },

  joinChannelDiscussion: async (channelId: string): Promise<string | null> => {
    const client = supabase;
    if (!client) return null;
    try {
      const { data, error } = await client.rpc('join_channel_discussion', { target_channel: channelId });
      if (error) throw error;
      return typeof data === 'string' ? data : null;
    } catch (error) {
      console.error('facemash: joinChannelDiscussion failed', error);
      return null;
    }
  },

  resolveChannelJoinRequest: (requestId: string, approve: boolean) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('resolveChannelJoinRequest', () => client.rpc('resolve_channel_join_request', {
      request_id: requestId,
      approve,
    }));
  },

  transferGroupOwner: (threadId: string, profileId: string) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('transferGroupOwner', () => client.rpc('transfer_thread_owner', {
      target_thread: threadId,
      target_profile: profileId,
    }));
  },

  closeCommunity: (threadId: string | null, channelId: string | null) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('closeCommunity', () => client.rpc('close_community', {
      target_thread: threadId,
      target_channel: channelId,
    }));
  },

  createChannelInvite: async (channelId: string, token: string, expiresAt: string, approvalRequired: boolean) => {
    const client = supabase;
    if (!client) return false;
    try {
      const { error } = await client.rpc('create_channel_invite', {
        target_channel: channelId,
        invite_token: token,
        invite_expiry: expiresAt,
        invite_approval: approvalRequired,
        invite_max_uses: 100,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('facemash: createChannelInvite failed', error);
      return false;
    }
  },

  revokeChannelInvites: (channelId: string) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('revokeChannelInvites', () => client.rpc('revoke_channel_invites', { target_channel: channelId }));
  },

  setChannelAdmin: (channelId: string, profileId: string, makeAdmin: boolean) => {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    return run('setChannelAdmin', () => client.rpc('set_channel_admin', {
      target_channel: channelId,
      target_profile: profileId,
      make_admin: makeAdmin,
    }));
  },

  joinChannelInvite: async (token: string): Promise<{ status: string; channelId?: string } | null> => {
    const client = supabase;
    if (!client) return null;
    try {
      const { data, error } = await client.rpc('join_channel_invite', { invite_token: token });
      if (error) throw error;
      const row = data as Row | null;
      return row && typeof row.status === 'string'
        ? { status: row.status, channelId: typeof row.channel_id === 'string' ? row.channel_id : undefined }
        : null;
    } catch (error) {
      console.error('facemash: joinChannelInvite failed', error);
      return null;
    }
  },

  createGroupInvite: async (threadId: string, token: string, expiresAt: string, approvalRequired: boolean) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('create_group_invite', {
        target_thread: threadId,
        invite_token: token,
        invite_expiry: expiresAt,
        invite_approval: approvalRequired,
        invite_max_uses: null,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('facemash: createGroupInvite failed', error);
      return false;
    }
  },

  revokeGroupInvites: (threadId: string) => {
    if (!supabase) return Promise.resolve(false);
    return run('revokeGroupInvites', () => supabase!.rpc('revoke_group_invites', { target_thread: threadId }));
  },

  joinGroupInvite: async (token: string): Promise<{ status: string; threadId?: string } | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('join_group_invite', { invite_token: token });
      if (error) throw error;
      const row = data as Row | null;
      return row && typeof row.status === 'string'
        ? { status: row.status, threadId: typeof row.thread_id === 'string' ? row.thread_id : undefined }
        : null;
    } catch (error) {
      console.error('facemash: joinGroupInvite failed', error);
      return null;
    }
  },

  resolveGroupJoinRequest: (requestId: string, accept: boolean) => {
    if (!supabase) return Promise.resolve(false);
    return run('resolveGroupJoinRequest', () => supabase!.rpc('resolve_group_join_request', { request_id: requestId, accept }));
  },

  addMessage: async (threadId: string, message: Message) => {
    const pendingCreation = pendingThreadCreations.get(threadId);
    if (pendingCreation && !(await pendingCreation)) return false;
    return run('addMessage', () =>
      table('messages').insert({
        id: message.id,
        thread_id: threadId,
        sender_id: message.from,
        kind: message.kind,
        text: message.text ?? null,
        media_label: message.mediaLabel ?? null,
        doc_name: message.docName ?? null,
        doc_size: message.docSize ?? null,
        status: message.status,
        reply_to_id: message.replyTo?.id ?? null,
        reply_to_text: message.replyTo?.text ?? null,
        shared_post_id: message.sharedPostId ?? null,
        shared_text: message.sharedText ?? null,
        media_url: message.mediaPath ?? message.mediaUrl ?? null,
      }),
    );
  },

  setMessageStatus: (messageId: string, status: Message['status']) =>
    run('setMessageStatus', () => table('messages').update({ status }).eq('id', messageId)),

  acknowledgeThreadMessages: (threadId: string, readNow: boolean) => {
    if (!supabase) return Promise.resolve(false);
    return run('acknowledgeThreadMessages', () =>
      supabase!.rpc('acknowledge_thread_messages', { target_thread: threadId, read_now: readNow }),
    );
  },

  loadOlderMessages: async (threadId: string, before: number, limit = 50): Promise<{ messages: Message[]; hasMore: boolean }> => {
    if (!supabase) return { messages: [], hasMore: false };
    try {
      const { data, error } = await supabase.rpc('older_thread_messages', {
        target_thread: threadId, before_time: new Date(before).toISOString(), requested: limit,
      });
      if (error) throw error;
      const rows = (data as Row[] | null) ?? [];
      const hasMore = rows.length > limit;
      const selected = rows.slice(0, limit);
      const ids = selected.map((row) => String(row.id));
      const { data: reactions } = ids.length
        ? await supabase.from('message_reactions').select('message_id, icon').in('message_id', ids)
        : { data: [] };
      const reactionsById = new Map<string, Row[]>();
      ((reactions as Row[] | null) ?? []).forEach((row) => {
        const key = String(row.message_id);
        reactionsById.set(key, [...(reactionsById.get(key) ?? []), { icon: row.icon }]);
      });
      const mapped = await signThreadMedia(selected.map((row) => toMessage({ ...row, message_reactions: reactionsById.get(String(row.id)) ?? [] })));
      return { messages: mapped.sort((a, b) => a.createdAt - b.createdAt), hasMore };
    } catch (error) {
      console.error('facemash: loadOlderMessages failed', error);
      return { messages: [], hasMore: false };
    }
  },

  reactToMessage: (messageId: string, profileId: string, icon: string, on: boolean) =>
    run('reactToMessage', () =>
      on
        ? table('message_reactions').insert({ message_id: messageId, profile_id: profileId, icon })
        : table('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('profile_id', profileId)
            .eq('icon', icon),
    ),

  deleteMessage: (messageId: string) =>
    run('deleteMessage', () => table('messages').delete().eq('id', messageId)),

  deleteMessages: (messageIds: string[]) =>
    run('deleteMessages', () => table('messages').delete().in('id', messageIds)),

  setEphemeral: (threadId: string, seconds: number) =>
    run('setEphemeral', () =>
      table('threads').update({ ephemeral_seconds: seconds }).eq('id', threadId),
    ),

  setPrivate: (profileId: string, isPrivate: boolean) =>
    run('setPrivate', () => table('profiles').update({ is_private: isPrivate }).eq('id', profileId)),

  setFollowRequest: (requesterId: string, targetId: string, on: boolean) =>
    run('followRequest', () =>
      on
        ? table('follow_requests').insert({ requester_id: requesterId, target_id: targetId })
        : table('follow_requests')
            .delete()
            .eq('requester_id', requesterId)
            .eq('target_id', targetId),
    ),

  resolveFollowRequest: async (requesterId: string, targetId: string, accept: boolean) => {
    if (!supabase) return;
    if (accept) {
      // Creating the follow row on the requester's behalf needs definer rights.
      const { error } = await supabase.rpc('accept_follow_request', { requester: requesterId });
      if (error) console.error('facemash: acceptFollowRequest failed', error);
      return;
    }
    await run('declineFollowRequest', () =>
      table('follow_requests')
        .update({ status: 'declined' })
        .eq('requester_id', requesterId)
        .eq('target_id', targetId),
    );
  },

  /** Uploads to the public media bucket and returns the URL to store on the row. */
  uploadMedia: async (profileId: string, file: File): Promise<string | null> => {
    if (!supabase) return null;
    const extension = file.name.match(/\.([a-zA-Z0-9]{1,16})$/)?.[1]?.toLowerCase() ?? 'bin';
    const path = `${profileId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) {
      console.error('facemash: uploadMedia failed', error);
      return null;
    }
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  },

  uploadThreadMedia: async (threadId: string, profileId: string, file: File): Promise<{ path: string; url: string } | null> => {
    if (!supabase) return null;
    const extension = file.name.match(/\.([a-zA-Z0-9]{1,16})$/)?.[1]?.toLowerCase() ?? 'bin';
    const path = `${threadId}/${profileId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('thread-media').upload(path, file, {
      cacheControl: '3600', contentType: file.type || 'application/octet-stream', upsert: false,
    });
    if (error) {
      console.error('facemash: uploadThreadMedia failed', error);
      return null;
    }
    const { data, error: signedError } = await supabase.storage.from('thread-media').createSignedUrl(path, 3600);
    if (signedError || !data?.signedUrl) {
      console.error('facemash: signing uploaded thread media failed', signedError);
      return null;
    }
    return { path, url: data.signedUrl };
  },

  uploadAvatar: async (profileId: string, file: File): Promise<string | null> => {
    if (!supabase) return null;
    const path = `${profileId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600', contentType: 'image/jpeg', upsert: false,
    });
    if (error) {
      console.error('facemash: uploadAvatar failed', error);
      return null;
    }
    return path;
  },

  signedAvatarUrl: async (path: string): Promise<string | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    if (error) {
      console.error('facemash: signedAvatarUrl failed', error);
      return null;
    }
    return data.signedUrl;
  },

  deleteAvatar: async (path: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.storage.from('avatars').remove([path]);
    if (error) console.error('facemash: deleteAvatar failed', error);
    return !error;
  },

  setMembership: async (
    threadId: string,
    profileId: string,
    patch: Partial<{
      unread: number;
      unread_at: number;
      pinned: boolean;
      archived: boolean;
      muted: boolean;
      role: Role;
    }>,
  ) => {
    const client = supabase;
    if (!client) return;
    const { role, ...membershipPatch } = patch;
    if (Object.keys(membershipPatch).length) {
      await run('setMembership', () =>
        table('thread_members')
          .update(membershipPatch)
          .eq('thread_id', threadId)
          .eq('profile_id', profileId),
      );
    }
    if (role) {
      await run('setMembership role', () =>
        client.rpc('set_thread_member_role', {
          target_thread: threadId,
          target_profile: profileId,
          new_role: role,
        }),
      );
    }
  },

  removeMember: async (threadId: string, profileId: string) => {
    const client = supabase;
    if (!client) return;
    await run('removeMember', () =>
      client.rpc('remove_thread_member', {
        target_thread: threadId,
        target_profile: profileId,
      }),
    );
  },

  setChannelSubscription: (channelId: string, profileId: string, on: boolean) =>
    run('subscribeChannel', () =>
      on
        ? table('channel_subscriptions').insert({ channel_id: channelId, profile_id: profileId })
        : table('channel_subscriptions')
            .delete()
            .eq('channel_id', channelId)
            .eq('profile_id', profileId),
    ),

  createChannel: async (channel: { id: string; name: string; slug: string; description: string; hue: number; isPrivate: boolean; createDiscussion?: boolean }) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('create_managed_channel', {
        target_channel: channel.id,
        channel_name: channel.name,
        channel_slug: channel.slug,
        channel_description: channel.description,
        channel_hue: channel.hue,
        private_channel: channel.isPrivate,
        create_discussion: channel.createDiscussion ?? false,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('facemash: createChannel failed', error);
      return false;
    }
  },

  createChannelPost: (channelId: string, post: { id: string; text: string; authorId: string }) =>
    run('createChannelPost', () => table('channel_posts').insert({
      id: post.id, channel_id: channelId, text: post.text, author_id: post.authorId,
    })),

  reactToChannelPost: (channelPostId: string, profileId: string, icon: string) =>
    run('reactChannelPost', () =>
      table('channel_post_reactions').upsert({
        channel_post_id: channelPostId,
        profile_id: profileId,
        icon,
      }),
    ),

  markNotificationsRead: (profileId: string, ids?: string[]) =>
    run('markNotificationsRead', () => {
      const query = table('notifications').update({ read: true }).eq('profile_id', profileId);
      return ids ? query.in('id', ids) : query;
    }),

  saveProfile: (profileId: string, patch: { name: string; bio: string; location: string; avatarPath?: string | null }) =>
    run('saveProfile', () =>
      table('profiles')
        .update({ name: patch.name, bio: patch.bio, location: patch.location, ...(patch.avatarPath !== undefined ? { avatar_path: patch.avatarPath } : {}) })
        .eq('id', profileId),
    ),

  saveSettings: (
    profileId: string,
    patch: Partial<{ theme: string; lang: string; interests: string[]; onboarded: boolean }>,
  ) =>
    run('saveSettings', () =>
      table('user_settings').upsert({ profile_id: profileId, ...patch }, { onConflict: 'profile_id' }),
    ),
};
