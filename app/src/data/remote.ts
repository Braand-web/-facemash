import { supabase } from '../lib/supabase';
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
  mediaUrl: (row.media_url as string | null) ?? undefined,
});

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
    subscriptions,
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
    supabase.from('messages').select('*, message_reactions(icon)'),
    supabase.from('channels').select('*, channel_posts(*, channel_post_media(*))'),
    supabase.from('channel_subscriptions').select('channel_id').eq('profile_id', profileId),
    supabase.from('stories').select('*').order('created_at', { ascending: true }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('user_settings').select('*').eq('profile_id', profileId).maybeSingle(),
  ]);

  if (profiles.error) return null;

  const users = ((profiles.data as Row[] | null) ?? []).map(toUser);
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

  const messageRows = ((messages.data as Row[] | null) ?? []).map(toMessage);
  const messagesByThread: Record<string, Message[]> = {};
  ((messages.data as Row[] | null) ?? []).forEach((row, i) => {
    const key = String(row.thread_id);
    messagesByThread[key] = [...(messagesByThread[key] ?? []), messageRows[i]];
  });
  Object.values(messagesByThread).forEach((list) => list.sort((a, b) => a.createdAt - b.createdAt));

  const myMemberships = ((members.data as Row[] | null) ?? []).filter(
    (row) => String(row.profile_id) === profileId,
  );

  const conversations: Conversation[] = [];
  const groups: Group[] = [];
  const pins: Record<string, boolean> = {};
  const archived: Record<string, boolean> = {};
  const muted: Record<string, boolean> = {};
  const unreadAt: Record<string, number> = {};

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
      });
    } else {
      groups.push({
        id: threadId,
        name: String(thread.name ?? ''),
        description: String(thread.description ?? ''),
        hue: Number(thread.hue ?? 265),
        unread: Number(membership.unread ?? 0),
        members: ((members.data as Row[] | null) ?? [])
          .filter((row) => String(row.thread_id) === threadId)
          .map((row) => ({ userId: String(row.profile_id), role: String(row.role) as Role })),
        messages: messagesByThread[threadId] ?? [],
        ephemeralSeconds,
      });
    }
  });

  const subscribed = new Set(
    ((subscriptions.data as Row[] | null) ?? []).map((row) => String(row.channel_id)),
  );

  const channelList: Channel[] = ((channels.data as Row[] | null) ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ''),
    hue: Number(row.hue ?? 182),
    subscribers: Number(row.subscribers ?? 0),
    subscribed: subscribed.has(String(row.id)),
    posts: ((row.channel_posts as Row[] | null) ?? [])
      .slice()
      .sort((a, b) => asDate(b.created_at) - asDate(a.created_at))
      .map((post) => ({
        id: String(post.id),
        text: String(post.text),
        createdAt: asDate(post.created_at),
        views: Number(post.views ?? 0),
        reactions: (post.reaction_counts as Record<string, number> | null) ?? {},
        media: ((post.channel_post_media as Row[] | null) ?? []).map((m) => ({
          label: String(m.label),
          ratio: String(m.ratio),
        })),
      })),
  }));

  const storyGroups: StoryGroup[] = [];
  ((stories.data as Row[] | null) ?? []).forEach((row) => {
    const authorId = String(row.author_id);
    const item = { label: String(row.label), createdAt: asDate(row.created_at) };
    const existing = storyGroups.find((group) => group.userId === authorId);
    if (existing) existing.items.push(item);
    else storyGroups.push({ userId: authorId, items: [item] });
  });

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

/** Writes mirror the optimistic local update; failures are logged, never thrown at the UI. */
const run = async (label: string, work: () => PromiseLike<{ error: unknown }>) => {
  if (!supabase) return;
  const { error } = await work();
  if (error) console.error(`facemash: ${label} failed`, error);
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
        handlers.onMessage(String(row.thread_id), toMessage(row));
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'facemash', table: 'messages' },
      (payload) => {
        const row = payload.new as Row;
        handlers.onMessageUpdate(String(row.thread_id), toMessage(row));
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
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export const remote = {
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

  report: (profileId: string, target: { postId?: string; profileId?: string }) =>
    run('report', () =>
      table('reports').insert({
        reporter_id: profileId,
        post_id: target.postId ?? null,
        profile_id: target.profileId ?? null,
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

  createPost: async (post: Post) => {
    if (!supabase) return;
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
      return;
    }
    if (post.media.length) {
      await run('createPost media', () =>
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
    }
  },

  updatePost: async (post: Post) => {
    if (!supabase) return;
    await run('updatePost', () =>
      table('posts')
        .update({
          text: post.text,
          tags: post.tags,
          visibility: post.visibility,
          location: post.location ?? null,
        })
        .eq('id', post.id),
    );
    await run('updatePost media clear', () => table('post_media').delete().eq('post_id', post.id));
    if (post.media.length) {
      await run('updatePost media', () =>
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
    }
  },

  deletePost: (postId: string) => run('deletePost', () => table('posts').delete().eq('id', postId)),

  createThread: async (thread: {
    id: string;
    kind: 'dm' | 'group';
    name: string;
    description: string;
    hue: number;
    createdBy: string;
    members: { profileId: string; role: Role }[];
  }) => {
    if (!supabase) return;
    const { error } = await table('threads').insert({
      id: thread.id,
      kind: thread.kind,
      name: thread.name,
      description: thread.description,
      hue: thread.hue,
      created_by: thread.createdBy,
    });
    if (error) {
      console.error('facemash: createThread failed', error);
      return;
    }
    await run('createThread members', () =>
      table('thread_members').insert(
        thread.members.map((member) => ({
          thread_id: thread.id,
          profile_id: member.profileId,
          role: member.role,
        })),
      ),
    );
  },

  addMessage: (threadId: string, message: Message) =>
    run('addMessage', () =>
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
        media_url: message.mediaUrl ?? null,
      }),
    ),

  setMessageStatus: (messageId: string, status: Message['status']) =>
    run('setMessageStatus', () => table('messages').update({ status }).eq('id', messageId)),

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
    const extension = file.name.split('.').pop() ?? 'bin';
    const path = `${profileId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      console.error('facemash: uploadMedia failed', error);
      return null;
    }
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  },

  setMembership: (
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
  ) =>
    run('setMembership', () =>
      table('thread_members').update(patch).eq('thread_id', threadId).eq('profile_id', profileId),
    ),

  removeMember: (threadId: string, profileId: string) =>
    run('removeMember', () =>
      table('thread_members').delete().eq('thread_id', threadId).eq('profile_id', profileId),
    ),

  setChannelSubscription: (channelId: string, profileId: string, on: boolean) =>
    run('subscribeChannel', () =>
      on
        ? table('channel_subscriptions').insert({ channel_id: channelId, profile_id: profileId })
        : table('channel_subscriptions')
            .delete()
            .eq('channel_id', channelId)
            .eq('profile_id', profileId),
    ),

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

  saveProfile: (profileId: string, patch: { name: string; bio: string; location: string }) =>
    run('saveProfile', () =>
      table('profiles')
        .update({ name: patch.name, bio: patch.bio, location: patch.location })
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
