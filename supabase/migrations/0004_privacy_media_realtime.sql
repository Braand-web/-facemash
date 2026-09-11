-- Private accounts, follow requests, muting, disappearing messages, uploaded media,
-- notification triggers, realtime and the storage bucket.

alter table facemash.profiles add column if not exists is_private boolean not null default false;
alter table facemash.thread_members add column if not exists muted boolean not null default false;
alter table facemash.threads add column if not exists ephemeral_seconds integer not null default 0;
alter table facemash.post_media add column if not exists url text;
alter table facemash.post_media add column if not exists video boolean not null default false;
alter table facemash.messages add column if not exists media_url text;
alter table facemash.notifications
  add column if not exists request_state text check (request_state in ('pending', 'accepted', 'declined'));

-- ------------------------------------------------------- follow requests --
create table if not exists facemash.follow_requests (
  requester_id uuid not null references facemash.profiles (id) on delete cascade,
  target_id uuid not null references facemash.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id <> target_id)
);

alter table facemash.follow_requests enable row level security;

create policy follow_requests_read on facemash.follow_requests
  for select to authenticated using (requester_id = facemash.me() or target_id = facemash.me());
create policy follow_requests_insert on facemash.follow_requests
  for insert to authenticated with check (requester_id = facemash.me());
create policy follow_requests_update on facemash.follow_requests
  for update to authenticated using (target_id = facemash.me())
  with check (target_id = facemash.me());
create policy follow_requests_delete on facemash.follow_requests
  for delete to authenticated using (requester_id = facemash.me());

-- Accepting inserts a follow on behalf of the requester, which their own policy
-- cannot do, so it runs here with definer rights after checking the caller.
create or replace function facemash.accept_follow_request(requester uuid)
returns void language plpgsql security definer set search_path = facemash as $$
declare
  target uuid := facemash.me();
begin
  if not exists (
    select 1 from facemash.follow_requests r
    where r.requester_id = requester and r.target_id = target and r.status = 'pending'
  ) then
    raise exception 'no pending follow request';
  end if;

  update facemash.follow_requests
     set status = 'accepted'
   where requester_id = requester and target_id = target;

  insert into facemash.follows (follower_id, following_id)
  values (requester, target)
  on conflict do nothing;
end;
$$;

grant execute on function facemash.accept_follow_request(uuid) to authenticated;

-- ---------------------------------------------------- notification feeds --
-- Notifications are written by triggers: no client may insert them directly.
create or replace function facemash.notify_follow_request()
returns trigger language plpgsql security definer set search_path = facemash as $$
begin
  insert into facemash.notifications (profile_id, actor_id, kind, request_state)
  values (new.target_id, new.requester_id, 'follow_request', 'pending');
  return null;
end;
$$;

drop trigger if exists follow_request_notification on facemash.follow_requests;
create trigger follow_request_notification
after insert on facemash.follow_requests
for each row execute function facemash.notify_follow_request();

create or replace function facemash.notify_follow()
returns trigger language plpgsql security definer set search_path = facemash as $$
begin
  insert into facemash.notifications (profile_id, actor_id, kind)
  values (new.following_id, new.follower_id, 'follow');
  return null;
end;
$$;

drop trigger if exists follow_notification on facemash.follows;
create trigger follow_notification
after insert on facemash.follows
for each row execute function facemash.notify_follow();

create or replace function facemash.notify_like()
returns trigger language plpgsql security definer set search_path = facemash as $$
declare
  author uuid;
begin
  select author_id into author from facemash.posts where id = new.post_id;
  if author is not null and author <> new.profile_id then
    insert into facemash.notifications (profile_id, actor_id, kind, post_id)
    values (author, new.profile_id, 'like', new.post_id);
  end if;
  return null;
end;
$$;

drop trigger if exists like_notification on facemash.likes;
create trigger like_notification
after insert on facemash.likes
for each row execute function facemash.notify_like();

create or replace function facemash.notify_comment()
returns trigger language plpgsql security definer set search_path = facemash as $$
declare
  recipient uuid;
begin
  if new.parent_id is null then
    select author_id into recipient from facemash.posts where id = new.post_id;
  else
    select author_id into recipient from facemash.comments where id = new.parent_id;
  end if;

  if recipient is not null and recipient <> new.author_id then
    insert into facemash.notifications (profile_id, actor_id, kind, post_id, text)
    values (
      recipient,
      new.author_id,
      case when new.parent_id is null then 'comment' else 'reply' end,
      new.post_id,
      left(new.text, 140)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists comment_notification on facemash.comments;
create trigger comment_notification
after insert on facemash.comments
for each row execute function facemash.notify_comment();

-- --------------------------------------------- posts visibility with privacy --
drop policy if exists posts_read on facemash.posts;
create policy posts_read on facemash.posts
  for select to authenticated using (
    author_id = facemash.me()
    or (
      visibility <> 'private'
      and (
        visibility <> 'followers'
        or exists (
          select 1 from facemash.follows f
          where f.follower_id = facemash.me() and f.following_id = posts.author_id
        )
      )
      and (
        not exists (select 1 from facemash.profiles p where p.id = posts.author_id and p.is_private)
        or exists (
          select 1 from facemash.follows f2
          where f2.follower_id = facemash.me() and f2.following_id = posts.author_id
        )
      )
    )
  );

-- ---------------------------------------------------------------- realtime --
alter publication supabase_realtime add table facemash.messages;
alter publication supabase_realtime add table facemash.notifications;
alter publication supabase_realtime add table facemash.posts;

-- ----------------------------------------------------------------- storage --
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "facemash media read" on storage.objects;
create policy "facemash media read" on storage.objects
  for select to public using (bucket_id = 'media');

drop policy if exists "facemash media insert" on storage.objects;
create policy "facemash media insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = facemash.me()::text);

drop policy if exists "facemash media delete" on storage.objects;
create policy "facemash media delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = facemash.me()::text);
