export type Lang = 'fr' | 'en';
export type Theme = 'dark' | 'light';
export type Visibility = 'public' | 'followers' | 'private';
export type PostKind = 'text' | 'photo' | 'video' | 'carousel';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageKind = 'text' | 'photo' | 'voice' | 'doc';
export type Role = 'owner' | 'admin' | 'member';
export type ThreadKind = 'dm' | 'group' | 'channel';

export type Route =
  | 'home'
  | 'explore'
  | 'messages'
  | 'thread'
  | 'profile'
  | 'notifications'
  | 'saved'
  | 'tag'
  | 'post'
  | 'settings';

export interface User {
  id: string;
  name: string;
  username: string;
  hue: number;
  bio: string;
  location: string;
  followers: number;
  following: number;
}

export interface MediaItem {
  label: string;
  ratio: string;
}

export interface Post {
  id: string;
  authorId: string;
  kind: PostKind;
  text: string;
  tags: string[];
  visibility: Visibility;
  createdAt: number;
  likes: number;
  reposts: number;
  shares: number;
  views: number;
  completion: number;
  watchSeconds: number;
  category: string;
  media: MediaItem[];
  location?: string;
}

export interface CommentReply {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
  likes: number;
}

export interface Comment extends CommentReply {
  replies: CommentReply[];
}

export interface Message {
  id: string;
  from: string;
  kind: MessageKind;
  text?: string;
  mediaLabel?: string;
  docName?: string;
  docSize?: string;
  createdAt: number;
  status: MessageStatus;
  reactions?: string[];
  replyTo?: { id: string; text: string };
  sharedPostId?: string;
  sharedText?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  unread: number;
  messages: Message[];
}

export interface GroupMember {
  userId: string;
  role: Role;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  hue: number;
  unread: number;
  members: GroupMember[];
  messages: Message[];
}

export interface ChannelPost {
  id: string;
  text: string;
  createdAt: number;
  views: number;
  reactions: Record<string, number>;
  media: MediaItem[];
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string;
  hue: number;
  subscribers: number;
  subscribed: boolean;
  posts: ChannelPost[];
}

export type NotificationKind =
  | 'follow'
  | 'like'
  | 'comment'
  | 'reply'
  | 'repost'
  | 'mention'
  | 'message'
  | 'invite';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  userId: string;
  postId?: string;
  createdAt: number;
  read: boolean;
  text?: string;
  groupName?: string;
}

export interface StoryItem {
  label: string;
  createdAt: number;
}

export interface StoryGroup {
  userId: string;
  items: StoryItem[];
}

export interface Session {
  onboarded: boolean;
  /** Supabase auth user id, absent for the local demo session. */
  authId?: string;
  demo?: boolean;
}

export interface Data {
  users: User[];
  posts: Post[];
  comments: Record<string, Comment[]>;
  conversations: Conversation[];
  groups: Group[];
  channels: Channel[];
  notifications: AppNotification[];
  stories: StoryGroup[];
}
