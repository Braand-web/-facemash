-- Facemash lives in its own schema so it never collides with anything already in
-- the public schema of this project.
create schema if not exists facemash;

grant usage on schema facemash to anon, authenticated, service_role;

-- ---------------------------------------------------------------- profiles --
-- A profile can exist without an auth user: the demo accounts that seed the feed
-- have no login. Real accounts link through auth_id.
create table facemash.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users (id) on delete cascade,
  username text not null unique,
  name text not null,
  hue smallint not null default 265,
  bio text not null default '',
  location text not null default '',
  followers integer not null default 0,
  following integer not null default 0,
  created_at timestamptz not null default now()
);

create index profiles_auth_id_idx on facemash.profiles (auth_id);

-- The caller's profile id. Used by every policy below.
create or replace function facemash.me()
returns uuid
language sql
stable
security definer
set search_path = facemash, public
as $$
  select id from facemash.profiles where auth_id = auth.uid();
$$;

create or replace function facemash.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = facemash, public
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1)
  );
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  if base_username = '' then
    base_username := 'membre';
  end if;

  candidate := base_username;
  while exists (select 1 from facemash.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into facemash.profiles (auth_id, username, name, hue)
  values (
    new.id,
    candidate,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), candidate),
    (abs(hashtext(new.id::text)) % 360)
  );

  insert into facemash.user_settings (profile_id)
  select id from facemash.profiles where auth_id = new.id;

  return new;
end;
$$;

-- --------------------------------------------------------------- settings --
create table facemash.user_settings (
  profile_id uuid primary key references facemash.profiles (id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  interests text[] not null default '{}',
  onboarded boolean not null default false
);

create trigger on_auth_user_created
after insert on auth.users
for each row execute function facemash.handle_new_user();

-- ------------------------------------------------------------------ posts --
create table facemash.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references facemash.profiles (id) on delete cascade,
  kind text not null check (kind in ('text', 'photo', 'video', 'carousel')),
  text text not null default '',
  tags text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  location text,
  created_at timestamptz not null default now(),
  likes integer not null default 0,
  reposts integer not null default 0,
  shares integer not null default 0,
  views integer not null default 0,
  completion real not null default 0,
  watch_seconds integer not null default 0,
  category text not null default 'lifestyle'
);

create index posts_author_idx on facemash.posts (author_id);
create index posts_created_idx on facemash.posts (created_at desc);

create table facemash.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references facemash.posts (id) on delete cascade,
  position smallint not null default 0,
  label text not null,
  ratio text not null default '4/5'
);

create index post_media_post_idx on facemash.post_media (post_id, position);

create table facemash.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references facemash.posts (id) on delete cascade,
  parent_id uuid references facemash.comments (id) on delete cascade,
  author_id uuid not null references facemash.profiles (id) on delete cascade,
  text text not null,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create index comments_post_idx on facemash.comments (post_id, created_at);

-- ----------------------------------------------------------- engagement ---
create table facemash.likes (
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  post_id uuid not null references facemash.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

create table facemash.saves (
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  post_id uuid not null references facemash.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

create table facemash.reposts (
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  post_id uuid not null references facemash.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

create table facemash.follows (
  follower_id uuid not null references facemash.profiles (id) on delete cascade,
  following_id uuid not null references facemash.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table facemash.blocks (
  blocker_id uuid not null references facemash.profiles (id) on delete cascade,
  blocked_id uuid not null references facemash.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Counters the feed ranking reads, kept in step with the join tables.
create or replace function facemash.bump_post_likes()
returns trigger language plpgsql security definer set search_path = facemash as $$
begin
  if tg_op = 'INSERT' then
    update facemash.posts set likes = likes + 1 where id = new.post_id;
  else
    update facemash.posts set likes = greatest(0, likes - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger likes_count
after insert or delete on facemash.likes
for each row execute function facemash.bump_post_likes();

create or replace function facemash.bump_post_reposts()
returns trigger language plpgsql security definer set search_path = facemash as $$
begin
  if tg_op = 'INSERT' then
    update facemash.posts set reposts = reposts + 1 where id = new.post_id;
  else
    update facemash.posts set reposts = greatest(0, reposts - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger reposts_count
after insert or delete on facemash.reposts
for each row execute function facemash.bump_post_reposts();

create or replace function facemash.bump_follow_counts()
returns trigger language plpgsql security definer set search_path = facemash as $$
begin
  if tg_op = 'INSERT' then
    update facemash.profiles set followers = followers + 1 where id = new.following_id;
    update facemash.profiles set following = following + 1 where id = new.follower_id;
  else
    update facemash.profiles set followers = greatest(0, followers - 1) where id = old.following_id;
    update facemash.profiles set following = greatest(0, following - 1) where id = old.follower_id;
  end if;
  return null;
end;
$$;

create trigger follows_count
after insert or delete on facemash.follows
for each row execute function facemash.bump_follow_counts();

-- --------------------------------------------------------------- threads --
create table facemash.threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm', 'group')),
  name text not null default '',
  description text not null default '',
  hue smallint not null default 265,
  created_by uuid references facemash.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table facemash.thread_members (
  thread_id uuid not null references facemash.threads (id) on delete cascade,
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  unread integer not null default 0,
  unread_at integer not null default 0,
  pinned boolean not null default false,
  archived boolean not null default false,
  primary key (thread_id, profile_id)
);

create index thread_members_profile_idx on facemash.thread_members (profile_id);

create table facemash.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references facemash.threads (id) on delete cascade,
  sender_id uuid not null references facemash.profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'photo', 'voice', 'doc')),
  text text,
  media_label text,
  doc_name text,
  doc_size text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read')),
  reply_to_id uuid references facemash.messages (id) on delete set null,
  reply_to_text text,
  shared_post_id uuid references facemash.posts (id) on delete set null,
  shared_text text,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on facemash.messages (thread_id, created_at);

create table facemash.message_reactions (
  message_id uuid not null references facemash.messages (id) on delete cascade,
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  icon text not null,
  primary key (message_id, profile_id, icon)
);

-- Membership test used by the thread policies, as a function so the policies do
-- not recurse through thread_members' own RLS.
create or replace function facemash.is_member(target_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = facemash
as $$
  select exists (
    select 1
    from facemash.thread_members m
    where m.thread_id = target_thread
      and m.profile_id = facemash.me()
  );
$$;

-- -------------------------------------------------------------- channels --
create table facemash.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  hue smallint not null default 182,
  subscribers integer not null default 0,
  created_at timestamptz not null default now()
);

create table facemash.channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references facemash.channels (id) on delete cascade,
  text text not null,
  views integer not null default 0,
  -- Baseline reaction counts for seeded posts; live reactions are rows below.
  reaction_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table facemash.channel_post_media (
  id uuid primary key default gen_random_uuid(),
  channel_post_id uuid not null references facemash.channel_posts (id) on delete cascade,
  position smallint not null default 0,
  label text not null,
  ratio text not null default '16/9'
);

create table facemash.channel_post_reactions (
  channel_post_id uuid not null references facemash.channel_posts (id) on delete cascade,
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  icon text not null,
  primary key (channel_post_id, profile_id, icon)
);

create table facemash.channel_subscriptions (
  channel_id uuid not null references facemash.channels (id) on delete cascade,
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (channel_id, profile_id)
);

create or replace function facemash.bump_channel_subscribers()
returns trigger language plpgsql security definer set search_path = facemash as $$
begin
  if tg_op = 'INSERT' then
    update facemash.channels set subscribers = subscribers + 1 where id = new.channel_id;
  else
    update facemash.channels set subscribers = greatest(0, subscribers - 1) where id = old.channel_id;
  end if;
  return null;
end;
$$;

create trigger channel_subscribers_count
after insert or delete on facemash.channel_subscriptions
for each row execute function facemash.bump_channel_subscribers();

-- --------------------------------------------------------------- stories --
create table facemash.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references facemash.profiles (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index stories_author_idx on facemash.stories (author_id, created_at);

-- --------------------------------------------------------- notifications --
create table facemash.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references facemash.profiles (id) on delete cascade,
  actor_id uuid not null references facemash.profiles (id) on delete cascade,
  kind text not null check (kind in ('follow', 'like', 'comment', 'reply', 'repost', 'mention', 'message', 'invite')),
  post_id uuid references facemash.posts (id) on delete cascade,
  thread_id uuid references facemash.threads (id) on delete cascade,
  text text,
  group_name text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on facemash.notifications (profile_id, created_at desc);

-- ------------------------------------------------------------- reporting --
create table facemash.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references facemash.profiles (id) on delete cascade,
  post_id uuid references facemash.posts (id) on delete cascade,
  profile_id uuid references facemash.profiles (id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- RLS --
alter table facemash.profiles enable row level security;
alter table facemash.user_settings enable row level security;
alter table facemash.posts enable row level security;
alter table facemash.post_media enable row level security;
alter table facemash.comments enable row level security;
alter table facemash.likes enable row level security;
alter table facemash.saves enable row level security;
alter table facemash.reposts enable row level security;
alter table facemash.follows enable row level security;
alter table facemash.blocks enable row level security;
alter table facemash.threads enable row level security;
alter table facemash.thread_members enable row level security;
alter table facemash.messages enable row level security;
alter table facemash.message_reactions enable row level security;
alter table facemash.channels enable row level security;
alter table facemash.channel_posts enable row level security;
alter table facemash.channel_post_media enable row level security;
alter table facemash.channel_post_reactions enable row level security;
alter table facemash.channel_subscriptions enable row level security;
alter table facemash.stories enable row level security;
alter table facemash.notifications enable row level security;
alter table facemash.reports enable row level security;

create policy profiles_read on facemash.profiles
  for select to authenticated using (true);
create policy profiles_update_own on facemash.profiles
  for update to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());

create policy settings_own on facemash.user_settings
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());

create policy posts_read on facemash.posts
  for select to authenticated using (
    visibility = 'public'
    or author_id = facemash.me()
    or (
      visibility = 'followers'
      and exists (
        select 1 from facemash.follows f
        where f.follower_id = facemash.me() and f.following_id = posts.author_id
      )
    )
  );
create policy posts_insert_own on facemash.posts
  for insert to authenticated with check (author_id = facemash.me());
create policy posts_update_own on facemash.posts
  for update to authenticated using (author_id = facemash.me()) with check (author_id = facemash.me());
create policy posts_delete_own on facemash.posts
  for delete to authenticated using (author_id = facemash.me());

create policy post_media_read on facemash.post_media
  for select to authenticated using (
    exists (select 1 from facemash.posts p where p.id = post_media.post_id)
  );
create policy post_media_write_own on facemash.post_media
  for all to authenticated
  using (exists (select 1 from facemash.posts p where p.id = post_media.post_id and p.author_id = facemash.me()))
  with check (exists (select 1 from facemash.posts p where p.id = post_media.post_id and p.author_id = facemash.me()));

create policy comments_read on facemash.comments
  for select to authenticated using (
    exists (select 1 from facemash.posts p where p.id = comments.post_id)
  );
create policy comments_insert_own on facemash.comments
  for insert to authenticated with check (author_id = facemash.me());
create policy comments_delete_own on facemash.comments
  for delete to authenticated using (author_id = facemash.me());

create policy likes_own on facemash.likes
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());
create policy saves_own on facemash.saves
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());
create policy reposts_own on facemash.reposts
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());

create policy follows_read on facemash.follows
  for select to authenticated using (true);
create policy follows_write_own on facemash.follows
  for all to authenticated using (follower_id = facemash.me()) with check (follower_id = facemash.me());

create policy blocks_own on facemash.blocks
  for all to authenticated using (blocker_id = facemash.me()) with check (blocker_id = facemash.me());

create policy threads_read on facemash.threads
  for select to authenticated using (facemash.is_member(id));
create policy threads_insert on facemash.threads
  for insert to authenticated with check (created_by = facemash.me());
create policy threads_update_member on facemash.threads
  for update to authenticated using (facemash.is_member(id)) with check (facemash.is_member(id));

create policy thread_members_read on facemash.thread_members
  for select to authenticated using (facemash.is_member(thread_id) or profile_id = facemash.me());
create policy thread_members_insert on facemash.thread_members
  for insert to authenticated with check (
    profile_id = facemash.me()
    or facemash.is_member(thread_id)
    or exists (select 1 from facemash.threads t where t.id = thread_id and t.created_by = facemash.me())
  );
create policy thread_members_update on facemash.thread_members
  for update to authenticated using (profile_id = facemash.me() or facemash.is_member(thread_id))
  with check (profile_id = facemash.me() or facemash.is_member(thread_id));
create policy thread_members_delete on facemash.thread_members
  for delete to authenticated using (profile_id = facemash.me() or facemash.is_member(thread_id));

create policy messages_read on facemash.messages
  for select to authenticated using (facemash.is_member(thread_id));
create policy messages_insert on facemash.messages
  for insert to authenticated with check (sender_id = facemash.me() and facemash.is_member(thread_id));
create policy messages_update on facemash.messages
  for update to authenticated using (facemash.is_member(thread_id)) with check (facemash.is_member(thread_id));
create policy messages_delete_own on facemash.messages
  for delete to authenticated using (sender_id = facemash.me());

create policy message_reactions_read on facemash.message_reactions
  for select to authenticated using (
    exists (select 1 from facemash.messages m where m.id = message_reactions.message_id and facemash.is_member(m.thread_id))
  );
create policy message_reactions_own on facemash.message_reactions
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());

create policy channels_read on facemash.channels
  for select to authenticated using (true);
create policy channel_posts_read on facemash.channel_posts
  for select to authenticated using (true);
create policy channel_post_media_read on facemash.channel_post_media
  for select to authenticated using (true);
create policy channel_post_reactions_read on facemash.channel_post_reactions
  for select to authenticated using (true);
create policy channel_post_reactions_own on facemash.channel_post_reactions
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());
create policy channel_subscriptions_read on facemash.channel_subscriptions
  for select to authenticated using (profile_id = facemash.me());
create policy channel_subscriptions_own on facemash.channel_subscriptions
  for all to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());

create policy stories_read on facemash.stories
  for select to authenticated using (expires_at > now());
create policy stories_own on facemash.stories
  for all to authenticated using (author_id = facemash.me()) with check (author_id = facemash.me());

create policy notifications_own on facemash.notifications
  for select to authenticated using (profile_id = facemash.me());
create policy notifications_update_own on facemash.notifications
  for update to authenticated using (profile_id = facemash.me()) with check (profile_id = facemash.me());

create policy reports_insert_own on facemash.reports
  for insert to authenticated with check (reporter_id = facemash.me());

-- Table privileges; RLS above decides the rows.
grant select, insert, update, delete on all tables in schema facemash to authenticated;
grant select on all tables in schema facemash to anon;
grant usage on all sequences in schema facemash to authenticated;

alter default privileges in schema facemash
  grant select, insert, update, delete on tables to authenticated;
