-- Secure foundations for private avatars, managed groups and real channels.

alter table facemash.profiles add column if not exists avatar_path text;
grant update (avatar_path) on facemash.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

drop policy if exists "facemash avatar read" on storage.objects;
create policy "facemash avatar read" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = facemash.me()::text
      or exists (
        select 1 from facemash.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and (
            not p.is_private
            or exists (
              select 1 from facemash.follows f
              where f.follower_id = facemash.me() and f.following_id = p.id
            )
          )
      )
    )
  );
drop policy if exists "facemash avatar insert" on storage.objects;
create policy "facemash avatar insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = facemash.me()::text
  );
drop policy if exists "facemash avatar delete" on storage.objects;
create policy "facemash avatar delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = facemash.me()::text
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('thread-media', 'thread-media', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
drop policy if exists "facemash thread media read" on storage.objects;
create policy "facemash thread media read" on storage.objects for select to authenticated
using (
  bucket_id = 'thread-media'
  and exists (
    select 1 from facemash.threads t
    where t.id::text = (storage.foldername(name))[1] and facemash.is_member(t.id)
  )
);
drop policy if exists "facemash thread media insert" on storage.objects;
create policy "facemash thread media insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'thread-media'
  and (storage.foldername(name))[2] = facemash.me()::text
  and exists (
    select 1 from facemash.threads t
    where t.id::text = (storage.foldername(name))[1] and facemash.is_member(t.id)
  )
);
drop policy if exists "facemash thread media delete" on storage.objects;
create policy "facemash thread media delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'thread-media'
  and (storage.foldername(name))[2] = facemash.me()::text
);

alter table facemash.threads
  add column if not exists is_private boolean not null default true,
  add column if not exists avatar_path text,
  add column if not exists approval_required boolean not null default false,
  add column if not exists slow_mode_seconds integer not null default 0 check (slow_mode_seconds between 0 and 3600);

create or replace function facemash_private.validate_group_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'group' and (
    length(trim(new.name)) not between 2 and 80
    or length(coalesce(new.description, '')) > 500
  ) then
    raise exception using errcode = '22023', message = 'invalid group details';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_group_details on facemash.threads;
create trigger validate_group_details before insert or update of name, description, kind on facemash.threads
for each row execute function facemash_private.validate_group_details();

create table if not exists facemash.group_invites (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references facemash.threads(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references facemash.profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  approval_required boolean not null default false,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now()
);
create table if not exists facemash.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references facemash.threads(id) on delete cascade,
  profile_id uuid not null references facemash.profiles(id) on delete cascade,
  invite_id uuid not null references facemash.group_invites(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  unique (thread_id, profile_id)
);
alter table facemash.group_invites enable row level security;
alter table facemash.group_join_requests enable row level security;

create or replace function facemash_private.can_manage_thread(target_thread uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from facemash.thread_members m
    where m.thread_id = target_thread and m.profile_id = facemash.me()
      and m.role in ('owner', 'admin')
  );
$$;
revoke all on function facemash_private.can_manage_thread(uuid) from public, anon;
grant execute on function facemash_private.can_manage_thread(uuid) to authenticated;

create or replace function facemash_private.enforce_group_member_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  current_kind text;
begin
  -- Serialize concurrent joins so the hard group limit cannot be exceeded.
  select kind into current_kind from facemash.threads where id = new.thread_id for update;
  if current_kind = 'group' and not exists (
    select 1 from facemash.thread_members where thread_id = new.thread_id and profile_id = new.profile_id
  ) and (select count(*) from facemash.thread_members where thread_id = new.thread_id) >= 1000 then
    raise exception using errcode = '54000', message = 'group member limit reached';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_group_member_limit on facemash.thread_members;
create trigger enforce_group_member_limit before insert on facemash.thread_members
for each row execute function facemash_private.enforce_group_member_limit();

drop policy if exists thread_members_insert on facemash.thread_members;
create policy thread_members_insert on facemash.thread_members for insert to authenticated
with check (
  (
    profile_id = facemash.me()
    and facemash_private.can_add_initial_thread_member(thread_id, profile_id)
  )
  or (
    profile_id <> facemash.me()
    and role = 'member'
    and facemash_private.can_manage_thread(thread_id)
  )
);

create or replace function facemash.add_thread_member(target_thread uuid, target_profile uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not facemash_private.can_manage_thread(target_thread) then
    raise exception using errcode = '42501', message = 'group admin required';
  end if;
  if not exists (select 1 from facemash.threads where id = target_thread and kind = 'group') then
    raise exception using errcode = '22023', message = 'not a group';
  end if;
  insert into facemash.thread_members(thread_id, profile_id, role)
  values (target_thread, target_profile, 'member') on conflict do nothing;
end;
$$;
revoke all on function facemash.add_thread_member(uuid, uuid) from public, anon;
grant execute on function facemash.add_thread_member(uuid, uuid) to authenticated;

create or replace function facemash.create_group_invite(
  target_thread uuid, invite_token text, invite_expiry timestamptz,
  invite_approval boolean, invite_max_uses integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare created_id uuid;
declare actor_role text;
declare invite_policy text;
declare group_approval boolean;
begin
  select m.role,t.invite_policy,t.approval_required into actor_role,invite_policy,group_approval
    from facemash.threads t join facemash.thread_members m on m.thread_id=t.id
    where t.id=target_thread and t.kind='group' and t.closed_at is null and m.profile_id=facemash.me();
  if actor_role is null or (actor_role not in ('owner','admin') and not (actor_role='member' and invite_policy='members')) then
    raise exception using errcode = '42501', message = 'group invite permission required';
  end if;
  -- Invite entropy is generated in the client with crypto.getRandomValues();
  -- enforce the same opaque 256-bit format at the RPC boundary so callers
  -- cannot create guessable links by choosing a short/predictable token.
  if invite_token is null or invite_token !~ '^[a-f0-9]{64}$'
    or invite_expiry is null or invite_expiry <= now() or invite_expiry > now() + interval '90 days'
    or (invite_max_uses is not null and invite_max_uses not between 1 and 10000) then
    raise exception using errcode = '22023', message = 'invalid invite';
  end if;
  insert into facemash.group_invites(thread_id, token, created_by, expires_at, approval_required, max_uses)
  values (target_thread, invite_token, facemash.me(), invite_expiry,
    coalesce(invite_approval,false) or coalesce(group_approval,false), invite_max_uses)
  returning id into created_id;
  return created_id;
end;
$$;
drop function if exists facemash.join_group_invite(text);
create function facemash.join_group_invite(invite_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite_row facemash.group_invites%rowtype;
begin
  if facemash.me() is null then raise exception using errcode = '42501', message = 'not authenticated'; end if;
  select i.* into invite_row from facemash.group_invites i
   join facemash.threads t on t.id=i.thread_id
   where i.token = invite_token and i.revoked_at is null and t.kind='group' and t.closed_at is null
     and (i.expires_at is null or i.expires_at > now())
     and (i.max_uses is null or i.uses < i.max_uses)
   for update of i;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if exists (select 1 from facemash.thread_members where thread_id = invite_row.thread_id and profile_id = facemash.me()) then
    return jsonb_build_object('status', 'member', 'thread_id', invite_row.thread_id);
  end if;
  if invite_row.approval_required then
    insert into facemash.group_join_requests(thread_id, profile_id, invite_id)
    values (invite_row.thread_id, facemash.me(), invite_row.id)
    on conflict (thread_id, profile_id) do update set status = 'pending', invite_id = excluded.invite_id, created_at = now();
    return jsonb_build_object('status', 'pending', 'thread_id', invite_row.thread_id);
  end if;
  insert into facemash.thread_members(thread_id, profile_id, role) values (invite_row.thread_id, facemash.me(), 'member');
  update facemash.group_invites set uses = uses + 1 where id = invite_row.id;
  return jsonb_build_object('status', 'joined', 'thread_id', invite_row.thread_id);
end;
$$;
create or replace function facemash.resolve_group_join_request(request_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare request_row facemash.group_join_requests%rowtype;
begin
  select * into request_row from facemash.group_join_requests where id = request_id and status='pending' for update;
  if not found or not facemash_private.can_manage_thread(request_row.thread_id) then
    raise exception using errcode = '42501', message = 'group admin required';
  end if;
  if accept and exists (select 1 from facemash.threads where id=request_row.thread_id and closed_at is not null) then
    raise exception using errcode='55000', message='group is closed';
  end if;
  update facemash.group_join_requests set status = case when accept then 'approved' else 'declined' end where id = request_id;
  if accept then
    insert into facemash.thread_members(thread_id, profile_id, role)
    values (request_row.thread_id, request_row.profile_id, 'member') on conflict do nothing;
    update facemash.group_invites set uses = uses + 1 where id = request_row.invite_id;
  end if;
end;
$$;
create or replace function facemash.revoke_group_invites(target_thread uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not facemash_private.can_manage_thread(target_thread) then
    raise exception using errcode = '42501', message = 'group admin required';
  end if;
  update facemash.group_invites set revoked_at = now()
    where thread_id = target_thread and revoked_at is null;
end;
$$;
revoke all on function facemash.create_group_invite(uuid, text, timestamptz, boolean, integer) from public, anon;
revoke all on function facemash.join_group_invite(text) from public, anon;
revoke all on function facemash.resolve_group_join_request(uuid, boolean) from public, anon;
revoke all on function facemash.revoke_group_invites(uuid) from public, anon;
grant execute on function facemash.create_group_invite(uuid, text, timestamptz, boolean, integer) to authenticated;
grant execute on function facemash.join_group_invite(text) to authenticated;
grant execute on function facemash.resolve_group_join_request(uuid, boolean) to authenticated;
grant execute on function facemash.revoke_group_invites(uuid) to authenticated;

create policy group_invites_admin_read on facemash.group_invites for select to authenticated
using (facemash_private.can_manage_thread(thread_id));
create policy group_requests_admin_read on facemash.group_join_requests for select to authenticated
using (facemash_private.can_manage_thread(thread_id) or profile_id = facemash.me());

create or replace function facemash.transfer_thread_owner(target_thread uuid, target_profile uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from facemash.thread_members where thread_id = target_thread
      and profile_id = facemash.me() and role = 'owner'
  ) then raise exception using errcode = '42501', message = 'owner required'; end if;
  if not exists (select 1 from facemash.thread_members where thread_id = target_thread and profile_id = target_profile) then
    raise exception using errcode = 'P0002', message = 'target member not found';
  end if;
  update facemash.thread_members set role = 'admin' where thread_id = target_thread and profile_id = facemash.me();
  update facemash.thread_members set role = 'owner' where thread_id = target_thread and profile_id = target_profile;
end;
$$;
revoke all on function facemash.transfer_thread_owner(uuid, uuid) from public, anon;
grant execute on function facemash.transfer_thread_owner(uuid, uuid) to authenticated;

-- A read/delivery receipt is recorded only by the receiving account when the
-- message arrives or the conversation is opened. A sender cannot self-acknowledge.
revoke update (status) on facemash.messages from authenticated;
create or replace function facemash.acknowledge_thread_messages(target_thread uuid, read_now boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := facemash.me();
begin
  if actor is null or not facemash.is_member(target_thread) then
    raise exception using errcode = '42501', message = 'thread membership required';
  end if;
  update facemash.thread_members set unread = 0, unread_at = 0
    where thread_id = target_thread and profile_id = actor;
  if exists (select 1 from facemash.threads where id = target_thread and kind = 'dm') then
    update facemash.messages set status = case when read_now then 'read' else 'delivered' end
      where thread_id = target_thread and sender_id <> actor
        and (status = 'sent' or (read_now and status <> 'read'));
  end if;
end;
$$;
revoke all on function facemash.acknowledge_thread_messages(uuid, boolean) from public, anon;
grant execute on function facemash.acknowledge_thread_messages(uuid, boolean) to authenticated;

-- Bound initial chat hydration and expose cursor pagination for the active thread.
create or replace function facemash.my_recent_thread_messages(per_thread integer default 60)
returns setof facemash.messages language sql stable security invoker set search_path = '' as $$
  select latest.*
  from facemash.thread_members mine
  cross join lateral (
    select m.* from facemash.messages m
    where m.thread_id = mine.thread_id
    order by m.created_at desc, m.id desc
    limit least(greatest(coalesce(per_thread, 60), 1), 100) + 1
  ) latest
  where mine.profile_id = facemash.me()
  order by latest.thread_id, latest.created_at desc, latest.id desc;
$$;
create or replace function facemash.older_thread_messages(target_thread uuid, before_time timestamptz, requested integer default 50)
returns setof facemash.messages language sql stable security invoker set search_path = '' as $$
  select m.* from facemash.messages m
  where m.thread_id = target_thread and m.created_at < before_time
    and facemash.is_member(target_thread)
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(requested, 50), 1), 100) + 1;
$$;
revoke all on function facemash.my_recent_thread_messages(integer) from public, anon;
revoke all on function facemash.older_thread_messages(uuid, timestamptz, integer) from public, anon;
grant execute on function facemash.my_recent_thread_messages(integer) to authenticated;
grant execute on function facemash.older_thread_messages(uuid, timestamptz, integer) to authenticated;

create or replace function facemash_private.enforce_group_slow_mode()
returns trigger language plpgsql security definer set search_path = '' as $$
declare wait_seconds integer;
declare group_posting_mode text;
declare member_role text;
declare last_sent timestamptz;
begin
  select slow_mode_seconds, posting_mode into wait_seconds, group_posting_mode
    from facemash.threads where id = new.thread_id and kind = 'group';
  if exists (select 1 from facemash.threads where id=new.thread_id and closed_at is not null) then
    raise exception using errcode='55000', message='group is closed';
  end if;
  if group_posting_mode='admins' then
    select role into member_role from facemash.thread_members where thread_id=new.thread_id and profile_id=new.sender_id;
    if member_role is null or member_role not in ('owner','admin') then
      raise exception using errcode='42501', message='only group admins can post';
    end if;
  end if;
  if coalesce(wait_seconds, 0) > 0 then
    -- Serialize simultaneous sends from the same member to enforce slow mode.
    perform pg_advisory_xact_lock(hashtextextended(new.thread_id::text || ':' || new.sender_id::text, 0));
    select max(created_at) into last_sent from facemash.messages
      where thread_id = new.thread_id and sender_id = new.sender_id;
    if last_sent is not null and last_sent > now() - make_interval(secs => wait_seconds) then
      raise exception using errcode = 'P0001', message = 'group slow mode active';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_group_slow_mode on facemash.messages;
create trigger enforce_group_slow_mode before insert on facemash.messages
for each row execute function facemash_private.enforce_group_slow_mode();

-- Channel ownership and visibility are enforced in SQL, never trusted to the client.
alter table facemash.channels
  add column if not exists owner_profile_id uuid references facemash.profiles(id) on delete set null,
  add column if not exists is_private boolean not null default false,
  add column if not exists avatar_path text,
  add column if not exists linked_thread_id uuid references facemash.threads(id) on delete set null;
alter table facemash.channel_posts add column if not exists author_id uuid references facemash.profiles(id) on delete set null;
alter table facemash.channel_post_media add column if not exists media_url text;
create table if not exists facemash.channel_admins (
  channel_id uuid not null references facemash.channels(id) on delete cascade,
  profile_id uuid not null references facemash.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(channel_id, profile_id)
);
create table if not exists facemash.channel_invites (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references facemash.channels(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references facemash.profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table facemash.channel_admins enable row level security;
alter table facemash.channel_invites enable row level security;

create or replace function facemash_private.can_manage_channel(target_channel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from facemash.channels c where c.id = target_channel and c.owner_profile_id = facemash.me()
  ) or exists (
    select 1 from facemash.channel_admins a where a.channel_id = target_channel and a.profile_id = facemash.me()
  );
$$;
revoke all on function facemash_private.can_manage_channel(uuid) from public, anon;
grant execute on function facemash_private.can_manage_channel(uuid) to authenticated;

create or replace function facemash_private.can_read_channel(target_channel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from facemash.channels c where c.id = target_channel and (
      not c.is_private or c.owner_profile_id = facemash.me()
      or facemash_private.can_manage_channel(c.id)
      or exists (select 1 from facemash.channel_subscriptions s where s.channel_id = c.id and s.profile_id = facemash.me())
    )
  );
$$;
revoke all on function facemash_private.can_read_channel(uuid) from public, anon;
grant execute on function facemash_private.can_read_channel(uuid) to authenticated;

drop policy if exists channels_read on facemash.channels;
create policy channels_read on facemash.channels for select to authenticated
using (not is_private or owner_profile_id = facemash.me() or facemash_private.can_read_channel(id));
drop policy if exists channel_posts_read on facemash.channel_posts;
create policy channel_posts_read on facemash.channel_posts for select to authenticated using (facemash_private.can_read_channel(channel_id));
drop policy if exists channel_post_media_read on facemash.channel_post_media;
create policy channel_post_media_read on facemash.channel_post_media for select to authenticated using (
  exists (select 1 from facemash.channel_posts p where p.id = channel_post_id and facemash_private.can_read_channel(p.channel_id))
);
drop policy if exists channel_post_reactions_read on facemash.channel_post_reactions;
create policy channel_post_reactions_read on facemash.channel_post_reactions for select to authenticated using (
  exists (select 1 from facemash.channel_posts p where p.id = channel_post_id and facemash_private.can_read_channel(p.channel_id))
);
drop policy if exists channel_post_reactions_own on facemash.channel_post_reactions;
create policy channel_post_reactions_own on facemash.channel_post_reactions for all to authenticated
using (profile_id = facemash.me() and exists (
  select 1 from facemash.channel_posts p where p.id = channel_post_id and facemash_private.can_read_channel(p.channel_id)
))
with check (profile_id = facemash.me() and exists (
  select 1 from facemash.channel_posts p where p.id = channel_post_id and facemash_private.can_read_channel(p.channel_id)
));
drop policy if exists channel_subscriptions_own on facemash.channel_subscriptions;
create policy channel_subscriptions_own on facemash.channel_subscriptions for all to authenticated
using (profile_id = facemash.me())
with check (
  profile_id = facemash.me()
  and exists (select 1 from facemash.channels c where c.id = channel_id and (not c.is_private or facemash_private.can_read_channel(c.id)))
);
create policy channel_admins_read on facemash.channel_admins for select to authenticated
using (facemash_private.can_manage_channel(channel_id) or profile_id = facemash.me());
create policy channel_invites_read on facemash.channel_invites for select to authenticated
using (facemash_private.can_manage_channel(channel_id));
create policy channel_posts_insert_admin on facemash.channel_posts for insert to authenticated
with check (author_id = facemash.me() and facemash_private.can_manage_channel(channel_id));
create policy channel_posts_update_admin on facemash.channel_posts for update to authenticated
using (facemash_private.can_manage_channel(channel_id)) with check (facemash_private.can_manage_channel(channel_id));
create policy channel_posts_delete_admin on facemash.channel_posts for delete to authenticated
using (facemash_private.can_manage_channel(channel_id));
create policy channel_media_write_admin on facemash.channel_post_media for all to authenticated
using (exists (select 1 from facemash.channel_posts p where p.id = channel_post_id and facemash_private.can_manage_channel(p.channel_id)))
with check (exists (select 1 from facemash.channel_posts p where p.id = channel_post_id and facemash_private.can_manage_channel(p.channel_id)));

create or replace function facemash.create_channel(
  target_channel uuid, channel_name text, channel_slug text, channel_description text,
  channel_hue smallint, private_channel boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if facemash.me() is null or length(trim(channel_name)) not between 2 and 60
    or channel_slug !~ '^[a-z0-9][a-z0-9_-]{2,29}$'
    or length(coalesce(channel_description, '')) > 500 then
    raise exception using errcode = '22023', message = 'invalid channel details';
  end if;
  insert into facemash.channels(id, name, slug, description, hue, owner_profile_id, is_private)
  values (target_channel, trim(channel_name), channel_slug, coalesce(channel_description, ''), channel_hue, facemash.me(), private_channel);
  insert into facemash.channel_subscriptions(channel_id, profile_id) values (target_channel, facemash.me());
end;
$$;
revoke all on function facemash.create_channel(uuid, text, text, text, smallint, boolean) from public, anon;
grant execute on function facemash.create_channel(uuid, text, text, text, smallint, boolean) to authenticated;

create or replace function facemash.create_channel_invite(target_channel uuid, invite_token text, invite_expiry timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not facemash_private.can_manage_channel(target_channel) or length(invite_token) < 32 then
    raise exception using errcode = '42501', message = 'channel admin required';
  end if;
  insert into facemash.channel_invites(channel_id, token, created_by, expires_at)
  values (target_channel, invite_token, facemash.me(), invite_expiry);
end;
$$;
create or replace function facemash.join_channel_invite(invite_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  select channel_id into target from facemash.channel_invites
  where token = invite_token and revoked_at is null and (expires_at is null or expires_at > now());
  if target is null or facemash.me() is null then return false; end if;
  insert into facemash.channel_subscriptions(channel_id, profile_id) values (target, facemash.me()) on conflict do nothing;
  return true;
end;
$$;
create or replace function facemash.revoke_channel_invites(target_channel uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not facemash_private.can_manage_channel(target_channel) then
    raise exception using errcode = '42501', message = 'channel admin required';
  end if;
  update facemash.channel_invites set revoked_at = now()
    where channel_id = target_channel and revoked_at is null;
end;
$$;
create or replace function facemash.set_channel_admin(target_channel uuid, target_profile uuid, make_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from facemash.channels where id = target_channel and owner_profile_id = facemash.me()) then
    raise exception using errcode = '42501', message = 'channel owner required';
  end if;
  if target_profile = facemash.me() then
    raise exception using errcode = '22023', message = 'owner cannot edit self as admin';
  end if;
  if make_admin then
    insert into facemash.channel_admins(channel_id, profile_id) values (target_channel, target_profile) on conflict do nothing;
  else
    delete from facemash.channel_admins where channel_id = target_channel and profile_id = target_profile;
  end if;
end;
$$;
revoke all on function facemash.create_channel_invite(uuid, text, timestamptz) from public, anon;
revoke all on function facemash.join_channel_invite(text) from public, anon;
revoke all on function facemash.revoke_channel_invites(uuid) from public, anon;
revoke all on function facemash.set_channel_admin(uuid, uuid, boolean) from public, anon;
grant execute on function facemash.create_channel_invite(uuid, text, timestamptz) to authenticated;
grant execute on function facemash.join_channel_invite(text) to authenticated;
grant execute on function facemash.revoke_channel_invites(uuid) to authenticated;
grant execute on function facemash.set_channel_admin(uuid, uuid, boolean) to authenticated;

revoke insert, update, delete on facemash.channels from authenticated;
revoke update (subscribers) on facemash.channels from authenticated;
grant select on facemash.channels to authenticated;
grant insert, update, delete on facemash.channel_posts, facemash.channel_post_media to authenticated;
