import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ME, seedData, seedFollows } from './data/seed';
import { loadProfileId, loadSnapshot, remote, remoteEnabled, subscribeRealtime } from './data/remote';
import { supabase } from './lib/supabase';
import { dict, type Dict } from './lib/i18n';
import { mmss } from './lib/format';
import type {
  AppNotification,
  Channel,
  Comment,
  Conversation,
  Data,
  Group,
  Lang,
  MediaItem,
  Message,
  MessageKind,
  Post,
  PostKind,
  Role,
  Session,
  Theme,
  ThreadKind,
  User,
  Visibility,
} from './types';

const STORAGE_KEY = 'facemash.v1';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface ComposerState {
  open: boolean;
  text: string;
  kind: PostKind;
  media: MediaItem[];
  tags: string;
  visibility: Visibility;
  location: string;
  editing: string | null;
  busy: boolean;
  error: string;
}

export interface CallState {
  kind: 'audio' | 'video';
  userId: string;
  seconds: number;
  live: boolean;
}

export interface RecState {
  seconds: number;
  cancel: boolean;
  startX: number;
}

export type Sheet =
  | { kind: 'post'; id: string; mine: boolean; author: string }
  | { kind: 'user'; id: string }
  | { kind: 'convo'; id: string; pinned: boolean; archived: boolean };

export interface MsgMenu {
  id: string;
  mine: boolean;
  text: string;
}

/** Flags and collections owned by the signed-in user. */
export interface UserState {
  likes: Record<string, boolean>;
  saves: Record<string, boolean>;
  reposts: Record<string, boolean>;
  follows: Record<string, boolean>;
  blocked: Record<string, boolean>;
  pins: Record<string, boolean>;
  archived: Record<string, boolean>;
  muted: Record<string, boolean>;
  /** Follow requests this account has sent and that are still pending. */
  requested: Record<string, boolean>;
  unreadAt: Record<string, number>;
  interests: string[];
}

interface PersistedState {
  data: Data;
  user: UserState;
  theme: Theme;
  lang: Lang;
  session: Session | null;
  onboardingStep: number;
  onboarding: { bio: string; location: string };
}

const emptyUserState = (): UserState => ({
  likes: {},
  saves: {},
  reposts: {},
  follows: seedFollows(),
  blocked: {},
  pins: {},
  archived: {},
  muted: {},
  requested: {},
  unreadAt: {},
  interests: [],
});

const emptyComposer = (): ComposerState => ({
  open: false,
  text: '',
  kind: 'text',
  media: [],
  tags: '',
  visibility: 'public',
  location: '',
  editing: null,
  busy: false,
  error: '',
});

interface AppValue {
  /* data */
  data: Data;
  user: UserState;
  meId: string;
  me: User;
  userById: (id: string) => User;
  session: Session | null;
  /* preferences */
  theme: Theme;
  lang: Lang;
  t: Dict;
  toggleTheme: () => void;
  toggleLang: () => void;
  /* auth + onboarding */
  signIn: (session: Session) => void;
  signOut: () => void;
  onboardingStep: number;
  onboarding: { bio: string; location: string };
  setOnboarding: (patch: Partial<{ bio: string; location: string }>) => void;
  advanceOnboarding: (finish: boolean) => void;
  toggleInterest: (name: string) => void;
  /* engagement */
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  blockUser: (userId: string) => void;
  addComment: (postId: string, text: string, parentId?: string | null) => void;
  /* posts */
  composer: ComposerState;
  setComposer: (patch: Partial<ComposerState>) => void;
  openComposer: () => void;
  closeComposer: () => void;
  editPost: (postId: string) => void;
  publish: (onDone: () => void) => void;
  deletePost: (postId: string) => void;
  /* messaging */
  sendMessage: (kind: ThreadKind, threadId: string, text: string, replyTo?: Message['replyTo']) => void;
  pushMessage: (kind: ThreadKind, threadId: string, extra: Partial<Message> & { kind: MessageKind }) => void;
  reactToMessage: (kind: ThreadKind, threadId: string, messageId: string, icon: string) => void;
  deleteMessage: (kind: ThreadKind, threadId: string, messageId: string) => void;
  openConversationWith: (userId: string) => string;
  markThreadRead: (kind: ThreadKind, threadId: string) => void;
  markUnread: (threadId: string) => void;
  togglePin: (threadId: string) => void;
  toggleArchive: (threadId: string) => void;
  toggleMute: (threadId: string) => void;
  setEphemeral: (kind: ThreadKind, threadId: string, seconds: number) => void;
  purgeExpired: () => void;
  forwardMessage: (message: Message, target: { kind: ThreadKind; id: string }) => void;
  createGroup: (name: string, description: string) => string;
  leaveGroup: (groupId: string) => void;
  setMemberRole: (groupId: string, userId: string, role: Role) => void;
  removeMember: (groupId: string, userId: string) => void;
  subscribeChannel: (channelId: string) => void;
  reactToChannelPost: (channelId: string, postId: string, icon: string) => void;
  sharePost: (postId: string, target: { kind: 'dm' | 'group'; id: string }) => void;
  /* notifications */
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  respondToFollowRequest: (notificationId: string, accept: boolean) => void;
  /* profile */
  saveProfile: (patch: { name: string; bio: string; location: string }) => void;
  togglePrivateAccount: () => void;
  /* typing simulation */
  typingThreadId: string | null;
  /* loading */
  loading: boolean;
  refresh: () => Promise<void>;
  /** True when reads and writes go to Supabase rather than local demo state. */
  syncing: boolean;
  /* transient ui */
  toast: string;
  showToast: (message: string) => void;
  offline: boolean;
}

const AppContext = createContext<AppValue | null>(null);

const load = (): PersistedState => {
  const base: PersistedState = {
    data: seedData(),
    user: emptyUserState(),
    theme: 'dark',
    lang: 'fr',
    session: null,
    onboardingStep: 1,
    onboarding: { bio: '', location: '' },
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    return {
      ...base,
      ...saved,
      data: { ...base.data, ...(saved.data ?? {}) },
      user: { ...base.user, ...(saved.user ?? {}) },
    };
  } catch {
    return base;
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [data, setData] = useState<Data>(initial.data);
  const [user, setUser] = useState<UserState>(initial.user);
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [session, setSession] = useState<Session | null>(initial.session);
  const [onboardingStep, setOnboardingStep] = useState(initial.onboardingStep);
  const [onboarding, setOnboardingState] = useState(initial.onboarding);
  const [composer, setComposerState] = useState<ComposerState>(emptyComposer);
  const [toast, setToast] = useState('');
  const [typingThreadId, setTypingThreadId] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [remoteProfileId, setRemoteProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  // Read in timers and callbacks that must not close over a stale render.
  const composerRef = useRef(composer);
  const dataRef = useRef(data);
  const userRef = useRef(user);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  composerRef.current = composer;
  dataRef.current = data;
  userRef.current = user;

  /** Browser notification for an incoming message, unless the thread is muted. */
  const notify = useCallback((threadId: string, message: Message) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (userRef.current.muted[threadId]) return;
    const sender = dataRef.current.users.find((u) => u.id === message.from);
    try {
      new Notification(sender?.name ?? 'Facemash', {
        body: message.text ?? message.mediaLabel ?? '',
        tag: threadId,
      });
    } catch {
      /* some browsers only allow notifications from a service worker */
    }
  }, []);

  const meId = remoteProfileId ?? ME;
  const syncing = remoteProfileId !== null;
  const t = dict[lang];

  // Pick up a Supabase session that already exists — a refresh, or the click on a
  // confirmation link that lands back on the app.
  useEffect(() => {
    if (!remoteEnabled || !supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const authId = data.session?.user.id;
        if (authId) setSession((prev) => (prev?.authId ? prev : { onboarded: true, authId }));
      })
      .catch(() => {
        /* unreachable backend: the app stays on local state */
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user) setSession((prev) => (prev?.authId ? prev : { onboarded: true, authId: next.user.id }));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // A signed-in account replaces the seeded demo state with its own rows.
  useEffect(() => {
    if (!remoteEnabled || !session?.authId) {
      setRemoteProfileId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const profileId = await loadProfileId().catch(() => null);
      if (cancelled || !profileId) {
        setLoading(false);
        return;
      }
      const snapshot = await loadSnapshot(profileId).catch(() => null);
      if (cancelled || !snapshot) {
        setLoading(false);
        return;
      }
      setRemoteProfileId(profileId);
      setData(snapshot.data);
      setUser(snapshot.user);
      setTheme(snapshot.settings.theme);
      setLang(snapshot.settings.lang);
      setSession((prev) => (prev ? { ...prev, onboarded: snapshot.settings.onboarded } : prev));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.authId]);

  // Live updates once the account is connected: new messages land without a refresh,
  // and an unmuted incoming message raises a browser notification when permitted.
  useEffect(() => {
    if (!remoteProfileId) return;
    return subscribeRealtime(remoteProfileId, {
      onMessage: (threadId, message) => {
        setData((prev) => {
          const inConversation = prev.conversations.some((c) => c.id === threadId);
          const known = inConversation || prev.groups.some((g) => g.id === threadId);
          if (!known) return prev;
          const add = <T extends { id: string; messages: Message[]; unread: number }>(thread: T): T =>
            thread.id !== threadId || thread.messages.some((m) => m.id === message.id)
              ? thread
              : { ...thread, messages: [...thread.messages, message], unread: thread.unread + 1 };
          return {
            ...prev,
            conversations: prev.conversations.map(add),
            groups: prev.groups.map(add),
          };
        });
        notify(threadId, message);
      },
      onMessageUpdate: (threadId, message) => {
        const replace = <T extends { id: string; messages: Message[] }>(thread: T): T =>
          thread.id !== threadId
            ? thread
            : { ...thread, messages: thread.messages.map((m) => (m.id === message.id ? message : m)) };
        setData((prev) => ({
          ...prev,
          conversations: prev.conversations.map(replace),
          groups: prev.groups.map(replace),
        }));
      },
      onMessageDelete: (messageId) => {
        const strip = <T extends { messages: Message[] }>(thread: T): T => ({
          ...thread,
          messages: thread.messages.filter((m) => m.id !== messageId),
        });
        setData((prev) => ({
          ...prev,
          conversations: prev.conversations.map(strip),
          groups: prev.groups.map(strip),
        }));
      },
      onNotification: () => void refreshRef.current(),
      onPost: () => void refreshRef.current(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteProfileId]);

  /** Pull-to-refresh: re-read the backend, or just let the gesture settle in demo mode. */
  const refresh = useCallback(async () => {
    if (!remoteProfileId) {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      return;
    }
    const snapshot = await loadSnapshot(remoteProfileId).catch(() => null);
    if (!snapshot) return;
    setData(snapshot.data);
    setUser(snapshot.user);
  }, [remoteProfileId]);

  refreshRef.current = refresh;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    // With a backend, the database is the source of truth; only preferences and the
    // session are cached locally.
    const payload: PersistedState = syncing
      ? { data: seedData(), user: emptyUserState(), theme, lang, session, onboardingStep, onboarding }
      : { data, user, theme, lang, session, onboardingStep, onboarding };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full or unavailable — the session still works in memory */
    }
  }, [data, user, theme, lang, session, onboardingStep, onboarding, syncing]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  }, []);

  const userById = useCallback(
    (id: string) => data.users.find((u) => u.id === id) ?? data.users[0],
    [data.users],
  );
  const me = userById(meId);

  const toggleFlag = useCallback(
    (
      key: 'likes' | 'saves' | 'reposts' | 'follows' | 'blocked' | 'pins' | 'archived' | 'muted' | 'requested',
      id: string,
    ) => {
      setUser((prev) => {
        const next = { ...prev[key] };
        if (next[id]) delete next[id];
        else next[id] = true;
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const toggleLike = useCallback(
    (postId: string) => {
      const on = !user.likes[postId];
      toggleFlag('likes', postId);
      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId ? { ...p, likes: Math.max(0, p.likes + (on ? 1 : -1)) } : p,
        ),
      }));
      if (syncing) void remote.setFlag('likes', meId, postId, on);
    },
    [toggleFlag, user.likes, syncing, meId],
  );

  const toggleRepost = useCallback(
    (postId: string) => {
      const on = !user.reposts[postId];
      toggleFlag('reposts', postId);
      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId ? { ...p, reposts: Math.max(0, p.reposts + (on ? 1 : -1)) } : p,
        ),
      }));
      if (syncing) void remote.setFlag('reposts', meId, postId, on);
    },
    [toggleFlag, user.reposts, syncing, meId],
  );

  /**
   * Following a private account sends a request instead; tapping again withdraws it.
   * Everything else follows straight away.
   */
  const toggleFollow = useCallback(
    (userId: string) => {
      const following = !!user.follows[userId];
      const target = data.users.find((u) => u.id === userId);

      if (!following && target?.isPrivate) {
        const pending = !!user.requested[userId];
        toggleFlag('requested', userId);
        if (!pending) showToast(t.requested);
        if (syncing) void remote.setFollowRequest(meId, userId, !pending);
        return;
      }

      toggleFlag('follows', userId);
      if (syncing) void remote.setFollow(meId, userId, !following);
    },
    [toggleFlag, user.follows, user.requested, data.users, syncing, meId, showToast, t],
  );

  const toggleMute = useCallback(
    (threadId: string) => {
      const on = !user.muted[threadId];
      toggleFlag('muted', threadId);
      if (syncing) void remote.setMembership(threadId, meId, { muted: on });
    },
    [toggleFlag, user.muted, syncing, meId],
  );

  const togglePin = useCallback(
    (threadId: string) => {
      const on = !user.pins[threadId];
      toggleFlag('pins', threadId);
      if (syncing) void remote.setMembership(threadId, meId, { pinned: on });
    },
    [toggleFlag, user.pins, syncing, meId],
  );

  const toggleArchive = useCallback(
    (threadId: string) => {
      const on = !user.archived[threadId];
      toggleFlag('archived', threadId);
      if (syncing) void remote.setMembership(threadId, meId, { archived: on });
    },
    [toggleFlag, user.archived, syncing, meId],
  );

  const toggleSave = useCallback(
    (postId: string) => {
      const wasSaved = !!user.saves[postId];
      toggleFlag('saves', postId);
      showToast(wasSaved ? t.unsavedOk : t.savedOk);
      if (syncing) void remote.setFlag('saves', meId, postId, !wasSaved);
    },
    [toggleFlag, showToast, t, user.saves, syncing, meId],
  );

  const blockUser = useCallback(
    (userId: string) => {
      setUser((prev) => ({ ...prev, blocked: { ...prev.blocked, [userId]: true } }));
      showToast(t.blocked);
      if (syncing) void remote.block(meId, userId);
    },
    [showToast, t, syncing, meId],
  );

  const addComment = useCallback(
    (postId: string, text: string, parentId?: string | null) => {
      if (!text.trim()) return;
      const entry: Comment = {
        id: newId(),
        userId: meId,
        text: text.trim(),
        createdAt: Date.now(),
        likes: 0,
        replies: [],
      };
      if (syncing) {
        void remote.addComment({
          id: entry.id,
          postId,
          parentId: parentId ?? null,
          authorId: meId,
          text: entry.text,
        });
      }
      setData((prev) => {
        const list = (prev.comments[postId] ?? []).slice();
        if (parentId) {
          const i = list.findIndex((c) => c.id === parentId);
          if (i >= 0) list[i] = { ...list[i], replies: [...list[i].replies, entry] };
        } else {
          list.unshift(entry);
        }
        return { ...prev, comments: { ...prev.comments, [postId]: list } };
      });
    },
    [meId, syncing],
  );

  const setComposer = useCallback((patch: Partial<ComposerState>) => {
    setComposerState((prev) => ({ ...prev, ...patch }));
  }, []);

  const openComposer = useCallback(() => setComposer({ open: true }), [setComposer]);
  const closeComposer = useCallback(() => setComposer({ open: false, error: '' }), [setComposer]);

  const editPost = useCallback(
    (postId: string) => {
      const post = data.posts.find((p) => p.id === postId);
      if (!post) return;
      setComposerState({
        open: true,
        text: post.text,
        kind: post.kind,
        media: post.media,
        tags: post.tags.join(' '),
        visibility: post.visibility,
        location: post.location ?? '',
        editing: post.id,
        busy: false,
        error: '',
      });
    },
    [data.posts],
  );

  const publish = useCallback(
    (onDone: () => void) => {
      const draft = composerRef.current;
      if (!draft.text.trim() && !draft.media.length) {
        setComposerState((prev) => ({ ...prev, error: t.uploadErr }));
        return;
      }
      setComposerState((prev) => ({ ...prev, busy: true, error: '' }));
      window.setTimeout(() => {
        const current = composerRef.current;
        if (!current.busy) return;
        const tags = current.tags
          .split(/[,\s]+/)
          .filter(Boolean)
          .map((x) => (x[0] === '#' ? x : '#' + x));

        if (current.editing) {
          const existing = dataRef.current.posts.find((p) => p.id === current.editing);
          if (existing) {
            const updated: Post = {
              ...existing,
              text: current.text,
              tags,
              visibility: current.visibility,
              media: current.media,
              location: current.location,
            };
            setData((prev) => ({
              ...prev,
              posts: prev.posts.map((p) => (p.id === updated.id ? updated : p)),
            }));
            if (syncing) void remote.updatePost(updated);
          }
        } else {
          const post: Post = {
            id: newId(),
            authorId: meId,
            kind: current.kind,
            text: current.text,
            tags,
            visibility: current.visibility,
            location: current.location,
            createdAt: Date.now(),
            likes: 0,
            reposts: 0,
            shares: 0,
            views: 0,
            completion: current.kind === 'video' ? 0.5 : 0,
            watchSeconds: 0,
            category: user.interests[0] ?? 'lifestyle',
            media: current.media,
          };
          setData((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
          if (syncing) void remote.createPost(post);
        }

        setComposerState(emptyComposer());
        showToast(t.published);
        onDone();
      }, 700);
    },
    [meId, showToast, t, user.interests, syncing],
  );

  const deletePost = useCallback(
    (postId: string) => {
      setData((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== postId) }));
      showToast(t.deleted);
      if (syncing) void remote.deletePost(postId);
    },
    [showToast, t, syncing],
  );

  /* ---------- messaging ---------- */

  const patchThread = useCallback(
    (kind: ThreadKind, threadId: string, fn: (messages: Message[]) => Message[], extra?: Partial<Conversation & Group>) => {
      setData((prev) => {
        if (kind === 'dm') {
          return {
            ...prev,
            conversations: prev.conversations.map((c) =>
              c.id === threadId ? { ...c, ...extra, messages: fn(c.messages) } : c,
            ),
          };
        }
        if (kind === 'group') {
          return {
            ...prev,
            groups: prev.groups.map((g) =>
              g.id === threadId ? { ...g, ...extra, messages: fn(g.messages) } : g,
            ),
          };
        }
        return prev;
      });
    },
    [],
  );

  const setMessageStatus = useCallback(
    (kind: ThreadKind, threadId: string, messageId: string, status: Message['status']) => {
      patchThread(kind, threadId, (messages) =>
        messages.map((m) => (m.id === messageId ? { ...m, status } : m)),
      );
      if (syncing) void remote.setMessageStatus(messageId, status);
    },
    [patchThread, syncing],
  );

  const cannedReply = useCallback(
    (userId: string) => {
      const fr: Record<string, string> = {
        u1: 'Impeccable. 6h30 sur place, j’apporte le café.',
        u2: 'Envoie le diff, je regarde ce soir.',
        u3: 'Je te fais écouter la version longue demain.',
        u4: '8h alors. Prends la veste, il va faire frais.',
        u5: 'Reçu. Je relance un run après le boulot.',
        u6: 'Noté, je mets ça dans le point de lundi.',
        u7: 'Tu vas rire, il m’est arrivé exactement pareil.',
      };
      const en: Record<string, string> = {
        u1: 'Perfect. 6:30 on site, I’ll bring coffee.',
        u2: 'Send the diff, I’ll look tonight.',
        u3: 'I’ll play you the long version tomorrow.',
        u4: '8am then. Bring a jacket, it’ll be cold.',
        u5: 'Got it. Doing another run after work.',
        u6: 'Noted, I’ll add it to Monday’s check-in.',
        u7: 'You’ll laugh, the exact same thing happened to me.',
      };
      const table = lang === 'fr' ? fr : en;
      return table[userId] ?? (lang === 'fr' ? 'Bien reçu.' : 'Got it.');
    },
    [lang],
  );

  const sendMessage = useCallback(
    (kind: ThreadKind, threadId: string, text: string, replyTo?: Message['replyTo']) => {
      if (!text.trim()) return;
      const message: Message = {
        id: newId(),
        from: meId,
        kind: 'text',
        text: text.trim(),
        createdAt: Date.now(),
        status: 'sent',
        replyTo,
      };
      patchThread(kind, threadId, (messages) => [...messages, message], { unread: 0 });
      if (syncing) {
        void remote.addMessage(threadId, message);
        return;
      }
      window.setTimeout(() => setMessageStatus(kind, threadId, message.id, 'delivered'), 550);
      window.setTimeout(() => setMessageStatus(kind, threadId, message.id, 'read'), kind === 'dm' ? 1600 : 1800);
      if (kind !== 'dm') return;
      window.setTimeout(() => setTypingThreadId(threadId), 1900);
      window.setTimeout(() => {
        setTypingThreadId(null);
        setData((prev) => {
          const convo = prev.conversations.find((c) => c.id === threadId);
          if (!convo) return prev;
          const reply: Message = {
            id: newId(),
            from: convo.userId,
            kind: 'text',
            text: cannedReply(convo.userId),
            createdAt: Date.now(),
            status: 'sent',
          };
          return {
            ...prev,
            conversations: prev.conversations.map((c) =>
              c.id === threadId ? { ...c, messages: [...c.messages, reply] } : c,
            ),
          };
        });
      }, 3700);
    },
    [cannedReply, meId, patchThread, setMessageStatus, syncing],
  );

  const pushMessage = useCallback(
    (kind: ThreadKind, threadId: string, extra: Partial<Message> & { kind: MessageKind }) => {
      const message: Message = {
        id: newId(),
        from: meId,
        createdAt: Date.now(),
        status: 'sent',
        ...extra,
      };
      patchThread(kind, threadId, (messages) => [...messages, message]);
      if (syncing) {
        void remote.addMessage(threadId, message);
        return;
      }
      window.setTimeout(() => setMessageStatus(kind, threadId, message.id, 'delivered'), 600);
      window.setTimeout(() => setMessageStatus(kind, threadId, message.id, 'read'), 1700);
    },
    [meId, patchThread, setMessageStatus, syncing],
  );

  const reactToMessage = useCallback(
    (kind: ThreadKind, threadId: string, messageId: string, icon: string) => {
      patchThread(kind, threadId, (messages) =>
        messages.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = (m.reactions ?? []).slice();
          const i = reactions.indexOf(icon);
          if (i >= 0) reactions.splice(i, 1);
          else reactions.push(icon);
          return { ...m, reactions };
        }),
      );
      if (syncing) {
        const current = (kind === 'dm' ? data.conversations : data.groups)
          .find((thread) => thread.id === threadId)
          ?.messages.find((m) => m.id === messageId);
        const on = !current?.reactions?.includes(icon);
        void remote.reactToMessage(messageId, meId, icon, on);
      }
    },
    [patchThread, syncing, data.conversations, data.groups, meId],
  );

  const deleteMessage = useCallback(
    (kind: ThreadKind, threadId: string, messageId: string) => {
      patchThread(kind, threadId, (messages) => messages.filter((m) => m.id !== messageId));
      if (syncing) void remote.deleteMessage(messageId);
    },
    [patchThread, syncing],
  );

  const openConversationWith = useCallback(
    (userId: string) => {
      const existing = data.conversations.find((c) => c.userId === userId);
      if (existing) return existing.id;
      const convo: Conversation = { id: newId(), userId, unread: 0, messages: [] };
      setData((prev) => ({ ...prev, conversations: [...prev.conversations, convo] }));
      if (syncing) {
        void remote.createThread({
          id: convo.id,
          kind: 'dm',
          name: '',
          description: '',
          hue: 265,
          createdBy: meId,
          members: [
            { profileId: meId, role: 'owner' },
            { profileId: userId, role: 'member' },
          ],
        });
      }
      return convo.id;
    },
    [data.conversations, syncing, meId],
  );

  const markThreadRead = useCallback(
    (kind: ThreadKind, threadId: string) => {
      const thread =
        kind === 'dm'
          ? data.conversations.find((c) => c.id === threadId)
          : data.groups.find((g) => g.id === threadId);
      const unread = thread?.unread ?? 0;
      // The divider is anchored to when reading stopped, so it stays put as the
      // conversation grows.
      const unreadSince = unread
        ? thread?.messages[thread.messages.length - unread]?.createdAt ?? 0
        : 0;
      if (unreadSince) {
        setUser((prev) => ({ ...prev, unreadAt: { ...prev.unreadAt, [threadId]: unreadSince } }));
      }
      setData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) => (c.id === threadId ? { ...c, unread: 0 } : c)),
        groups: prev.groups.map((g) => (g.id === threadId ? { ...g, unread: 0 } : g)),
      }));
      if (syncing) void remote.setMembership(threadId, meId, { unread: 0, unread_at: unreadSince });
    },
    [data.conversations, data.groups, syncing, meId],
  );

  const markUnread = useCallback(
    (threadId: string) => {
      setData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === threadId ? { ...c, unread: Math.max(1, c.unread) } : c,
        ),
        groups: prev.groups.map((g) => (g.id === threadId ? { ...g, unread: Math.max(1, g.unread) } : g)),
      }));
      if (syncing) void remote.setMembership(threadId, meId, { unread: 1 });
    },
    [syncing, meId],
  );

  const createGroup = useCallback(
    (name: string, description: string) => {
      const group: Group = {
        id: newId(),
        name: name.trim(),
        description,
        hue: 265,
        unread: 0,
        members: [{ userId: meId, role: 'owner' }],
        messages: [],
      };
      setData((prev) => ({ ...prev, groups: [...prev.groups, group] }));
      if (syncing) {
        void remote.createThread({
          id: group.id,
          kind: 'group',
          name: group.name,
          description: group.description,
          hue: group.hue,
          createdBy: meId,
          members: [{ profileId: meId, role: 'owner' }],
        });
      }
      return group.id;
    },
    [meId, syncing],
  );

  const leaveGroup = useCallback(
    (groupId: string) => {
      setData((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, members: g.members.filter((m) => m.userId !== meId) } : g,
        ),
      }));
      showToast(t.leave);
      if (syncing) void remote.removeMember(groupId, meId);
    },
    [meId, showToast, t, syncing],
  );

  const setMemberRole = useCallback(
    (groupId: string, userId: string, role: Role) => {
      setData((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId
            ? { ...g, members: g.members.map((m) => (m.userId === userId ? { ...m, role } : m)) }
            : g,
        ),
      }));
      if (syncing) void remote.setMembership(groupId, userId, { role });
    },
    [syncing],
  );

  const removeMember = useCallback(
    (groupId: string, userId: string) => {
      setData((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, members: g.members.filter((m) => m.userId !== userId) } : g,
        ),
      }));
      if (syncing) void remote.removeMember(groupId, userId);
    },
    [syncing],
  );

  const subscribeChannel = useCallback(
    (channelId: string) => {
      const wasSubscribed = !!data.channels.find((c) => c.id === channelId)?.subscribed;
      setData((prev) => ({
        ...prev,
        channels: prev.channels.map((c: Channel) =>
          c.id === channelId
            ? { ...c, subscribed: !c.subscribed, subscribers: c.subscribed ? c.subscribers - 1 : c.subscribers + 1 }
            : c,
        ),
      }));
      if (syncing) void remote.setChannelSubscription(channelId, meId, !wasSubscribed);
    },
    [data.channels, syncing, meId],
  );

  const reactToChannelPost = useCallback(
    (channelId: string, postId: string, icon: string) => {
      setData((prev) => ({
        ...prev,
        channels: prev.channels.map((c) =>
          c.id !== channelId
            ? c
            : {
                ...c,
                posts: c.posts.map((p) =>
                  p.id !== postId ? p : { ...p, reactions: { ...p.reactions, [icon]: (p.reactions[icon] ?? 0) + 1 } },
                ),
              },
        ),
      }));
      if (syncing) void remote.reactToChannelPost(postId, meId, icon);
    },
    [syncing, meId],
  );

  const sharePost = useCallback(
    (postId: string, target: { kind: 'dm' | 'group'; id: string }) => {
      const post = data.posts.find((p) => p.id === postId);
      const message: Message = {
        id: newId(),
        from: meId,
        kind: 'text',
        createdAt: Date.now(),
        status: 'sent',
        sharedPostId: postId,
        sharedText: post?.text ?? '',
      };
      patchThread(target.kind, target.id, (messages) => [...messages, message]);
      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)),
      }));
      showToast(t.sentOk);
      if (syncing) void remote.addMessage(target.id, message);
    },
    [data.posts, meId, patchThread, showToast, t, syncing],
  );

  /** Disappearing messages, per conversation. 0 turns the timer off. */
  const setEphemeral = useCallback(
    (kind: ThreadKind, threadId: string, seconds: number) => {
      setData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === threadId ? { ...c, ephemeralSeconds: seconds } : c,
        ),
        groups: prev.groups.map((g) => (g.id === threadId ? { ...g, ephemeralSeconds: seconds } : g)),
      }));
      if (syncing) void remote.setEphemeral(threadId, seconds);
      void kind;
    },
    [syncing],
  );

  /** Drops messages whose disappearing window has passed, in state and in the database. */
  const purgeExpired = useCallback(() => {
    const now = Date.now();
    const expired: string[] = [];
    const keep = (thread: { ephemeralSeconds?: number; messages: Message[] }) => {
      if (!thread.ephemeralSeconds) return thread.messages;
      const cutoff = now - thread.ephemeralSeconds * 1000;
      const survivors = thread.messages.filter((m) => m.createdAt >= cutoff);
      thread.messages.forEach((m) => m.createdAt < cutoff && expired.push(m.id));
      return survivors;
    };
    setData((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => ({ ...c, messages: keep(c) })),
      groups: prev.groups.map((g) => ({ ...g, messages: keep(g) })),
    }));
    if (syncing && expired.length) void remote.deleteMessages(expired);
  }, [syncing]);

  const forwardMessage = useCallback(
    (message: Message, target: { kind: ThreadKind; id: string }) => {
      const copy: Message = {
        ...message,
        id: newId(),
        from: meId,
        createdAt: Date.now(),
        status: 'sent',
        reactions: [],
        replyTo: undefined,
      };
      patchThread(target.kind, target.id, (messages) => [...messages, copy]);
      showToast(t.forwarded);
      if (syncing) void remote.addMessage(target.id, copy);
    },
    [meId, patchThread, showToast, t, syncing],
  );

  const markAllNotificationsRead = useCallback(() => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n: AppNotification) => ({ ...n, read: true })),
    }));
    if (syncing) void remote.markNotificationsRead(meId);
  }, [syncing, meId]);

  const markNotificationRead = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
      if (syncing) void remote.markNotificationsRead(meId, [id]);
    },
    [syncing, meId],
  );

  /** Accept or decline a follow request that arrived in the notifications list. */
  const respondToFollowRequest = useCallback(
    (notificationId: string, accept: boolean) => {
      const notification = dataRef.current.notifications.find((n) => n.id === notificationId);
      if (!notification) return;
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true, requestState: accept ? 'accepted' : 'declined' } : n,
        ),
        users: accept
          ? prev.users.map((u) =>
              u.id === meId ? { ...u, followers: u.followers + 1 } : u,
            )
          : prev.users,
      }));
      showToast(accept ? t.requestAccepted : t.requestDeclined);
      if (syncing) void remote.resolveFollowRequest(notification.userId, meId, accept);
    },
    [meId, showToast, t, syncing],
  );

  const togglePrivateAccount = useCallback(() => {
    const next = !dataRef.current.users.find((u) => u.id === meId)?.isPrivate;
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === meId ? { ...u, isPrivate: next } : u)),
    }));
    if (syncing) void remote.setPrivate(meId, next);
  }, [meId, syncing]);

  const saveProfile = useCallback(
    (patch: { name: string; bio: string; location: string }) => {
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === meId ? { ...u, name: patch.name || u.name, bio: patch.bio, location: patch.location } : u,
        ),
      }));
      showToast(t.savedOk);
      if (syncing) void remote.saveProfile(meId, patch);
    },
    [meId, showToast, t, syncing],
  );

  const signIn = useCallback((next: Session) => setSession(next), []);
  const signOut = useCallback(() => {
    if (remoteEnabled) void supabase?.auth.signOut();
    setRemoteProfileId(null);
    setSession(null);
  }, []);

  const setOnboarding = useCallback((patch: Partial<{ bio: string; location: string }>) => {
    setOnboardingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const advanceOnboarding = useCallback(
    (finish: boolean) => {
      if (!finish) {
        setOnboardingStep((step) => step + 1);
        return;
      }
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === meId
            ? { ...u, bio: onboarding.bio || u.bio, location: onboarding.location || u.location }
            : u,
        ),
      }));
      setSession((prev) => ({ ...(prev ?? {}), onboarded: true }));
      if (syncing) {
        void remote.saveProfile(meId, {
          name: me.name,
          bio: onboarding.bio || me.bio,
          location: onboarding.location || me.location,
        });
        void remote.saveSettings(meId, { onboarded: true, interests: user.interests });
      }
    },
    [meId, onboarding, syncing, me, user.interests],
  );

  const toggleInterest = useCallback(
    (name: string) => {
      const interests = user.interests.includes(name)
        ? user.interests.filter((x) => x !== name)
        : [...user.interests, name];
      setUser((prev) => ({ ...prev, interests }));
      if (syncing) void remote.saveSettings(meId, { interests });
    },
    [user.interests, syncing, meId],
  );

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (syncing) void remote.saveSettings(meId, { theme: next });
  }, [theme, syncing, meId]);

  const toggleLang = useCallback(() => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    if (syncing) void remote.saveSettings(meId, { lang: next });
  }, [lang, syncing, meId]);

  const value: AppValue = {
    data,
    user,
    meId,
    me,
    userById,
    session,
    theme,
    lang,
    t,
    toggleTheme,
    toggleLang,
    signIn,
    signOut,
    onboardingStep,
    onboarding,
    setOnboarding,
    advanceOnboarding,
    toggleInterest,
    toggleLike,
    toggleSave,
    toggleRepost,
    toggleFollow,
    blockUser,
    addComment,
    composer,
    setComposer,
    openComposer,
    closeComposer,
    editPost,
    publish,
    deletePost,
    sendMessage,
    pushMessage,
    reactToMessage,
    deleteMessage,
    openConversationWith,
    markThreadRead,
    markUnread,
    togglePin,
    toggleArchive,
    toggleMute,
    setEphemeral,
    purgeExpired,
    forwardMessage,
    createGroup,
    leaveGroup,
    setMemberRole,
    removeMember,
    subscribeChannel,
    reactToChannelPost,
    sharePost,
    markAllNotificationsRead,
    markNotificationRead,
    respondToFollowRequest,
    saveProfile,
    togglePrivateAccount,
    typingThreadId,
    loading,
    refresh,
    syncing,
    toast,
    showToast,
    offline,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

export { mmss };
