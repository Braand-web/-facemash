-- Complete the community creation/settings controls on top of the private media
-- and channel ownership foundation from 20261003100000.
alter table facemash.threads
  add column if not exists invite_policy text not null default 'admins' check (invite_policy in ('admins','members')),
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists posting_mode text not null default 'all' check (posting_mode in ('all','admins')),
  add column if not exists closed_at timestamptz;
alter table facemash.channels
  add column if not exists closed_at timestamptz;
alter table facemash.channel_invites
  add column if not exists max_uses integer check (max_uses is null or max_uses between 1 and 1000000),
  add column if not exists uses integer not null default 0,
  add column if not exists approval_required boolean not null default false;
alter table facemash.reports
  add column if not exists thread_id uuid references facemash.threads(id) on delete cascade,
  add column if not exists channel_id uuid references facemash.channels(id) on delete cascade,
  add column if not exists channel_post_id uuid references facemash.channel_posts(id) on delete cascade;

create table if not exists facemash.community_creation_log(
  id bigint generated always as identity primary key,
  profile_id uuid not null references facemash.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists community_creation_log_recent on facemash.community_creation_log(profile_id,created_at desc);
create table if not exists facemash.channel_join_requests(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references facemash.channels(id) on delete cascade,
  profile_id uuid not null references facemash.profiles(id) on delete cascade,
  invite_id uuid not null references facemash.channel_invites(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','approved','declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(channel_id,profile_id)
);
create table if not exists facemash.community_audit_log(
  id bigint generated always as identity primary key,
  actor_id uuid references facemash.profiles(id) on delete set null,
  thread_id uuid references facemash.threads(id) on delete cascade,
  channel_id uuid references facemash.channels(id) on delete cascade,
  action text not null,
  target_profile uuid references facemash.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists community_audit_thread_idx on facemash.community_audit_log(thread_id,created_at desc);
create index if not exists community_audit_channel_idx on facemash.community_audit_log(channel_id,created_at desc);
alter table facemash.community_creation_log enable row level security;
alter table facemash.channel_join_requests enable row level security;
alter table facemash.community_audit_log enable row level security;

create policy channel_join_requests_read on facemash.channel_join_requests for select to authenticated
using(profile_id=facemash.me() or facemash_private.can_manage_channel(channel_id));
create policy community_audit_read on facemash.community_audit_log for select to authenticated
using((thread_id is not null and facemash_private.can_manage_thread(thread_id)) or
      (channel_id is not null and facemash_private.can_manage_channel(channel_id)));
create policy community_reports_insert on facemash.reports for insert to authenticated with check(
  reporter_id=facemash.me() and (post_id is not null or profile_id is not null or thread_id is not null or channel_id is not null or channel_post_id is not null));

create or replace function facemash_private.log_community_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); thread_key uuid; channel_key uuid; subject uuid; action_name text;
begin
  if tg_table_name='thread_members' then
    thread_key:=coalesce(new.thread_id,old.thread_id); subject:=coalesce(new.profile_id,old.profile_id);
    if tg_op='INSERT' then action_name:='member_added'; elsif tg_op='DELETE' then action_name:='member_removed';
    elsif new.role is distinct from old.role then action_name:='role_changed'; else return null; end if;
  elsif tg_table_name='channel_admins' then
    channel_key:=coalesce(new.channel_id,old.channel_id); subject:=coalesce(new.profile_id,old.profile_id);
    action_name:=case when tg_op='INSERT' then 'channel_admin_added' else 'channel_admin_removed' end;
  elsif tg_table_name='channel_posts' then
    channel_key:=coalesce(new.channel_id,old.channel_id); subject:=coalesce(new.author_id,old.author_id);
    action_name:=case when tg_op='INSERT' then 'channel_post_published' when tg_op='DELETE' then 'channel_post_deleted' else 'channel_post_updated' end;
  else return null; end if;
  insert into facemash.community_audit_log(actor_id,thread_id,channel_id,action,target_profile)
    values(actor,thread_key,channel_key,action_name,subject);
  return null;
end; $$;
revoke all on function facemash_private.log_community_change() from public,anon,authenticated;
drop trigger if exists audit_thread_membership on facemash.thread_members;
create trigger audit_thread_membership after insert or update of role or delete on facemash.thread_members
for each row execute function facemash_private.log_community_change();
drop trigger if exists audit_channel_admins on facemash.channel_admins;
create trigger audit_channel_admins after insert or delete on facemash.channel_admins
for each row execute function facemash_private.log_community_change();
drop trigger if exists audit_channel_posts on facemash.channel_posts;
create trigger audit_channel_posts after insert or update or delete on facemash.channel_posts
for each row execute function facemash_private.log_community_change();

create or replace function facemash_private.verified_community_creator()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function facemash_private.verified_community_creator() from public,anon;
grant execute on function facemash_private.verified_community_creator() to authenticated;

-- Groups are created atomically with their initial participants. Three new
-- communities per 24h; advisory lock closes concurrent-request loopholes.
create or replace function facemash.create_managed_group(
 target_thread uuid,thread_name text,thread_description text,target_members uuid[],
 group_invites text,group_approval boolean,group_notifications boolean,group_posting text,group_slow_mode integer
) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); member_count integer;
begin
 if actor is null or not facemash_private.verified_community_creator() then raise exception using errcode='42501',message='verified account required'; end if;
 if target_thread is null or length(btrim(coalesce(thread_name,''))) not between 2 and 50
  or length(coalesce(thread_description,''))>500
  or group_invites is null or group_invites not in('admins','members')
  or group_posting is null or group_posting not in('all','admins')
  or coalesce(group_slow_mode,0) not between 0 and 3600 or coalesce(cardinality(target_members),0)>999
 then raise exception using errcode='22023',message='invalid group settings'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if (select count(*) from facemash.community_creation_log l where l.profile_id=actor and l.created_at>now()-interval '24 hours')>=3
 then raise exception using errcode='42900',message='daily community creation limit reached'; end if;
 if exists(select 1 from unnest(coalesce(target_members,'{}'::uuid[])) m where m<>actor and exists(
   select 1 from facemash.blocks b where (b.blocker_id=actor and b.blocked_id=m) or (b.blocker_id=m and b.blocked_id=actor)))
 then raise exception using errcode='42501',message='cannot invite a blocked account'; end if;
 select count(distinct profile_id)+1 into member_count from unnest(coalesce(target_members,'{}'::uuid[])) profile_id where profile_id<>actor;
 if member_count>1000 then raise exception using errcode='22023',message='group limit is 1000'; end if;
 insert into facemash.threads(id,kind,name,description,hue,created_by,is_private,approval_required,slow_mode_seconds,invite_policy,notifications_enabled,posting_mode)
 values(target_thread,'group',btrim(thread_name),coalesce(thread_description,''),265,actor,true,coalesce(group_approval,false),coalesce(group_slow_mode,0),group_invites,coalesce(group_notifications,true),group_posting);
 insert into facemash.thread_members(thread_id,profile_id,role) values(target_thread,actor,'owner');
 insert into facemash.thread_members(thread_id,profile_id,role)
  select target_thread,m,'member' from unnest(coalesce(target_members,'{}'::uuid[])) m where m<>actor on conflict do nothing;
 insert into facemash.community_creation_log(profile_id) values(actor);
end; $$;

create or replace function facemash.create_managed_channel(
 target_channel uuid,channel_name text,channel_slug text,channel_description text,channel_hue smallint,
 private_channel boolean,create_discussion boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); discussion uuid;
begin
 if actor is null or not facemash_private.verified_community_creator() then raise exception using errcode='42501',message='verified account required'; end if;
 if length(btrim(coalesce(channel_name,''))) not between 2 and 60 or channel_slug is null
  or channel_slug !~ '^[a-z0-9][a-z0-9_-]{2,29}$'
  or length(coalesce(channel_description,''))>500 then raise exception using errcode='22023',message='invalid channel details'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if (select count(*) from facemash.community_creation_log l where l.profile_id=actor and l.created_at>now()-interval '24 hours')>=3
  then raise exception using errcode='42900',message='daily community creation limit reached'; end if;
 if create_discussion then
  discussion:=gen_random_uuid();
  insert into facemash.threads(id,kind,name,description,hue,created_by,is_private)
   values(discussion,'group',btrim(channel_name)||' · discussion',coalesce(channel_description,''),coalesce(channel_hue,182),actor,true);
  insert into facemash.thread_members(thread_id,profile_id,role) values(discussion,actor,'owner');
 end if;
 insert into facemash.channels(id,name,slug,description,hue,owner_profile_id,is_private,linked_thread_id)
  values(target_channel,btrim(channel_name),lower(channel_slug),coalesce(channel_description,''),coalesce(channel_hue,182),actor,coalesce(private_channel,false),discussion);
 insert into facemash.channel_subscriptions(channel_id,profile_id) values(target_channel,actor);
 insert into facemash.community_creation_log(profile_id) values(actor);
 return target_channel;
end; $$;

-- Keep the old general RPC for DMs only; group creation must use the verified,
-- rate-limited transactional endpoint above.
create or replace function facemash.create_thread(
 target_thread uuid,thread_kind text,thread_name text,thread_description text,thread_hue smallint,target_members jsonb
) returns void language plpgsql security invoker set search_path='' as $$
declare actor uuid:=facemash.me(); member_count integer; unique_count integer; owner_count integer; actor_owner_count integer; invalid_count integer;
begin
 if auth.uid() is null or actor is null then raise exception using errcode='42501',message='not authenticated'; end if;
 if target_thread is null or thread_kind is distinct from 'dm' then raise exception using errcode='22023',message='use the managed group creation flow'; end if;
 if jsonb_typeof(target_members) is distinct from 'array' then raise exception using errcode='22023',message='members must be an array'; end if;
 select count(*),count(distinct m.profile_id),count(*) filter(where m.role='owner'),
  count(*) filter(where m.profile_id=actor and m.role='owner'),
  count(*) filter(where m.profile_id is null or m.role is null or m.role not in('owner','admin','member'))
 into member_count,unique_count,owner_count,actor_owner_count,invalid_count
 from jsonb_to_recordset(target_members) as m(profile_id uuid,role text);
 if member_count<>2 or member_count<>unique_count or owner_count<>1 or actor_owner_count<>1 or invalid_count<>0
 then raise exception using errcode='22023',message='invalid direct-message participants'; end if;
 if exists(select 1 from jsonb_to_recordset(target_members) as m(profile_id uuid,role text) where m.profile_id<>actor and m.role<>'member')
 then raise exception using errcode='22023',message='invalid direct-message role'; end if;
 insert into facemash.threads(id,kind,name,description,hue,created_by)
 values(target_thread,'dm',coalesce(thread_name,''),coalesce(thread_description,''),coalesce(thread_hue,265),actor);
 insert into facemash.thread_members(thread_id,profile_id,role) values(target_thread,actor,'owner');
 insert into facemash.thread_members(thread_id,profile_id,role)
  select target_thread,m.profile_id,m.role from jsonb_to_recordset(target_members) as m(profile_id uuid,role text) where m.profile_id<>actor;
end; $$;

-- Lock down direct changes to group security settings while preserving the
-- disappearing-message timer used by the app.
revoke update on facemash.threads from authenticated;
grant update(ephemeral_seconds) on facemash.threads to authenticated;

create or replace function facemash.update_group_settings(
 target_thread uuid,next_name text,next_description text,next_avatar_path text,next_invite_policy text,
 next_approval boolean,next_notifications boolean,next_posting_mode text,next_slow_mode integer
) returns void language plpgsql security definer set search_path='' as $$
declare actor_role text;
begin
 perform 1 from facemash.threads where id=target_thread and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='group unavailable'; end if;
 select role into actor_role from facemash.thread_members where thread_id=target_thread and profile_id=facemash.me();
 if actor_role is null or actor_role not in('owner','admin') then raise exception using errcode='42501',message='group admin required'; end if;
 if actor_role<>'owner' and (
  next_invite_policy is distinct from(select invite_policy from facemash.threads where id=target_thread)
  or next_approval is distinct from(select approval_required from facemash.threads where id=target_thread)
  or next_posting_mode is distinct from(select posting_mode from facemash.threads where id=target_thread)
  or next_slow_mode is distinct from(select slow_mode_seconds from facemash.threads where id=target_thread))
 then raise exception using errcode='42501',message='only the owner can change security settings'; end if;
 if length(btrim(coalesce(next_name,''))) not between 2 and 50 or length(coalesce(next_description,''))>500
  or next_invite_policy is null or next_invite_policy not in('admins','members')
  or next_posting_mode is null or next_posting_mode not in('all','admins') or coalesce(next_slow_mode,0) not between 0 and 3600
  or (next_avatar_path is not null and next_avatar_path not like target_thread::text||'/'||facemash.me()::text||'/%')
 then raise exception using errcode='22023',message='invalid group settings'; end if;
 update facemash.threads set name=btrim(next_name),description=coalesce(next_description,''),avatar_path=next_avatar_path,
  invite_policy=next_invite_policy,approval_required=coalesce(next_approval,false),
  notifications_enabled=coalesce(next_notifications,true),posting_mode=next_posting_mode,
  slow_mode_seconds=coalesce(next_slow_mode,0)
 where id=target_thread and kind='group' and closed_at is null;
end; $$;

-- Channels inherit the existing channel-specific schema and private-media rules.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('channel-media','channel-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "facemash channel media read" on storage.objects;
create policy "facemash channel media read" on storage.objects for select to authenticated using(
 bucket_id='channel-media' and exists(select 1 from facemash.channels c where c.id::text=(storage.foldername(name))[1]
  and (not c.is_private or facemash_private.can_read_channel(c.id))));
drop policy if exists "facemash channel media insert" on storage.objects;
create policy "facemash channel media insert" on storage.objects for insert to authenticated with check(
 bucket_id='channel-media' and (storage.foldername(name))[2]=facemash.me()::text
 and facemash_private.can_manage_channel(((storage.foldername(name))[1])::uuid)
 and exists(select 1 from facemash.channels c where c.id::text=(storage.foldername(name))[1] and c.closed_at is null));
drop policy if exists "facemash channel media delete" on storage.objects;
create policy "facemash channel media delete" on storage.objects for delete to authenticated using(
 bucket_id='channel-media' and (storage.foldername(name))[2]=facemash.me()::text);

-- A linkable optional discussion is an ordinary private group with owner/admin
-- rules, never a second public feed.
create or replace function facemash.link_channel_discussion(target_channel uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); channel_row facemash.channels%rowtype; thread_id uuid;
begin
 select * into channel_row from facemash.channels where id=target_channel for update;
 if not found or channel_row.owner_profile_id is distinct from actor or channel_row.closed_at is not null then raise exception using errcode='42501',message='open channel owner required'; end if;
 if channel_row.linked_thread_id is not null then return channel_row.linked_thread_id; end if;
 thread_id:=gen_random_uuid();
 insert into facemash.threads(id,kind,name,description,hue,created_by,is_private)
 values(thread_id,'group',channel_row.name||' · discussion',channel_row.description,channel_row.hue,actor,true);
 insert into facemash.thread_members(thread_id,profile_id,role) values(thread_id,actor,'owner');
 update facemash.channels set linked_thread_id=thread_id where id=target_channel;
 return thread_id;
end; $$;
create or replace function facemash.join_channel_discussion(target_channel uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); thread_key uuid;
begin
 select c.linked_thread_id into thread_key from facemash.channels c
  where c.id=target_channel and c.closed_at is null
   and (c.owner_profile_id=actor or exists(select 1 from facemash.channel_subscriptions s where s.channel_id=c.id and s.profile_id=actor));
 if thread_key is null then raise exception using errcode='42501',message='channel subscription required'; end if;
 if exists(select 1 from facemash.thread_members where thread_id=thread_key and profile_id=actor) then return thread_key; end if;
 if exists(select 1 from facemash.blocks b join facemash.thread_members m on m.thread_id=thread_key
   where (b.blocker_id=actor and b.blocked_id=m.profile_id) or (b.blocker_id=m.profile_id and b.blocked_id=actor))
 then raise exception using errcode='42501',message='group membership cannot be created due to a block'; end if;
 perform 1 from facemash.threads where id=thread_key and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='discussion is closed'; end if;
 if (select count(*) from facemash.thread_members where thread_id=thread_key)>=1000 then
  raise exception using errcode='54000',message='discussion member limit reached';
 end if;
 insert into facemash.thread_members(thread_id,profile_id,role) values(thread_key,actor,'member') on conflict do nothing;
 return thread_key;
end; $$;
create or replace function facemash.set_channel_avatar(target_channel uuid,target_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from facemash.channels where id=target_channel and closed_at is null for update;
 if not found or not facemash_private.can_manage_channel(target_channel) or
  (target_path is not null and target_path not like target_channel::text||'/'||facemash.me()::text||'/%')
 then raise exception using errcode='42501',message='channel admin and owned image required'; end if;
 update facemash.channels set avatar_path=target_path where id=target_channel;
end; $$;
create or replace function facemash.update_channel_details(target_channel uuid,next_name text,next_description text,next_avatar_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from facemash.channels where id=target_channel and closed_at is null for update;
 if not found or not facemash_private.can_manage_channel(target_channel)
  or length(btrim(coalesce(next_name,''))) not between 2 and 60
  or length(coalesce(next_description,''))>500
  or (next_avatar_path is not null and next_avatar_path not like target_channel::text||'/'||facemash.me()::text||'/%')
 then raise exception using errcode='42501',message='channel admin and valid details required'; end if;
 update facemash.channels set name=btrim(next_name),description=coalesce(next_description,''),avatar_path=next_avatar_path where id=target_channel;
end; $$;

-- Finite, expiring, revocable channel invite links with explicit join approval.
drop function if exists facemash.create_channel_invite(uuid,text,timestamptz);
create function facemash.create_channel_invite(
 target_channel uuid,invite_token text,invite_expiry timestamptz,invite_approval boolean,invite_max_uses integer
)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from facemash.channels where id=target_channel and closed_at is null for update;
 if not found or not facemash_private.can_manage_channel(target_channel)
  or invite_token is null or invite_token !~ '^[a-f0-9]{64}$'
  or invite_expiry is null or invite_expiry<=now() or invite_expiry>now()+interval '90 days'
  or invite_approval is null
  or coalesce(invite_max_uses,100) not between 1 and 500 then
  raise exception using errcode='42501',message='invalid channel invite';
 end if;
 insert into facemash.channel_invites(channel_id,token,created_by,expires_at,max_uses,approval_required)
 values(target_channel,invite_token,facemash.me(),invite_expiry,coalesce(invite_max_uses,100),coalesce(invite_approval,false));
end; $$;
create or replace function facemash.revoke_channel_invite(invite_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare channel_key uuid;
begin
 select channel_id into channel_key from facemash.channel_invites where id=invite_id for update;
 if channel_key is null or not facemash_private.can_manage_channel(channel_key) then raise exception using errcode='42501',message='channel admin required'; end if;
 update facemash.channel_invites set revoked_at=now() where id=invite_id;
end; $$;
-- PostgreSQL cannot change a function's return type with CREATE OR REPLACE.
-- The foundation migration returned boolean; the managed flow returns a
-- status so clients can distinguish invalid, pending, and joined invitations.
drop function if exists facemash.join_channel_invite(text);
create function facemash.join_channel_invite(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare invite_row facemash.channel_invites%rowtype;
begin
 if facemash.me() is null or not facemash_private.verified_community_creator() then raise exception using errcode='42501',message='verified account required'; end if;
 select * into invite_row from facemash.channel_invites where token=invite_token and revoked_at is null
  and (expires_at is null or expires_at>now()) and (max_uses is null or uses<max_uses) for update;
 if not found then return jsonb_build_object('status','invalid'); end if;
 -- Serialize against channel closure: never subscribe to a channel that was
 -- closed while this invitation was being redeemed.
 perform 1 from facemash.channels where id=invite_row.channel_id and closed_at is null for update;
 if not found then return jsonb_build_object('status','invalid'); end if;
 if exists(select 1 from facemash.blocks b join facemash.channel_admins a on a.channel_id=invite_row.channel_id
  where (b.blocker_id=facemash.me() and b.blocked_id=a.profile_id)
     or (b.blocker_id=a.profile_id and b.blocked_id=facemash.me()))
  or exists(select 1 from facemash.blocks b join facemash.channels c on c.id=invite_row.channel_id
   where (b.blocker_id=facemash.me() and b.blocked_id=c.owner_profile_id)
      or (b.blocker_id=c.owner_profile_id and b.blocked_id=facemash.me())) then
  return jsonb_build_object('status','invalid');
 end if;
 if exists(select 1 from facemash.channel_subscriptions where channel_id=invite_row.channel_id and profile_id=facemash.me()) then
  return jsonb_build_object('status','joined','channel_id',invite_row.channel_id);
 end if;
 if invite_row.approval_required then
  if exists(select 1 from facemash.channel_join_requests where channel_id=invite_row.channel_id and profile_id=facemash.me() and status='pending') then
   return jsonb_build_object('status','pending','channel_id',invite_row.channel_id);
  end if;
  insert into facemash.channel_join_requests(channel_id,profile_id,invite_id) values(invite_row.channel_id,facemash.me(),invite_row.id)
   on conflict(channel_id,profile_id) do update set status='pending',invite_id=excluded.invite_id,created_at=now();
  update facemash.channel_invites set uses=uses+1 where id=invite_row.id;
  return jsonb_build_object('status','pending','channel_id',invite_row.channel_id);
 end if;
 insert into facemash.channel_subscriptions(channel_id,profile_id) values(invite_row.channel_id,facemash.me()) on conflict do nothing;
 update facemash.channel_invites set uses=uses+1 where id=invite_row.id;
 return jsonb_build_object('status','joined','channel_id',invite_row.channel_id);
end; $$;
create or replace function facemash.resolve_channel_join_request(request_id uuid,approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare request_row facemash.channel_join_requests%rowtype; invite_row facemash.channel_invites%rowtype;
begin
 if approve is null then raise exception using errcode='22023',message='approval decision required'; end if;
 select * into request_row from facemash.channel_join_requests where id=request_id and status='pending';
 if not found then raise exception using errcode='42501',message='pending channel request required'; end if;
 select * into invite_row from facemash.channel_invites where id=request_row.invite_id for update;
 perform 1 from facemash.channels where id=request_row.channel_id and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='channel is closed'; end if;
 select * into request_row from facemash.channel_join_requests where id=request_id and status='pending' for update;
 if not found then raise exception using errcode='40001',message='request already resolved'; end if;
 if not facemash_private.can_manage_channel(request_row.channel_id) then raise exception using errcode='42501',message='channel admin required'; end if;
 if approve then
  if invite_row.id is null or invite_row.revoked_at is not null or (invite_row.expires_at is not null and invite_row.expires_at<=now()) then
   raise exception using errcode='55000',message='channel invitation is no longer valid';
  end if;
  if exists(select 1 from facemash.blocks b join facemash.channel_admins a on a.channel_id=request_row.channel_id
   where (b.blocker_id=request_row.profile_id and b.blocked_id=a.profile_id)
      or (b.blocker_id=a.profile_id and b.blocked_id=request_row.profile_id))
   or exists(select 1 from facemash.blocks b join facemash.channels c on c.id=request_row.channel_id
    where (b.blocker_id=request_row.profile_id and b.blocked_id=c.owner_profile_id)
       or (b.blocker_id=c.owner_profile_id and b.blocked_id=request_row.profile_id)) then
   raise exception using errcode='42501',message='blocked account cannot join channel';
  end if;
 end if;
 update facemash.channel_join_requests set status=case when approve then 'approved' else 'declined' end,resolved_at=now() where id=request_id;
 if approve then insert into facemash.channel_subscriptions(channel_id,profile_id) values(request_row.channel_id,request_row.profile_id) on conflict do nothing; end if;
end; $$;

-- Serialize group joins on the group row so the 1,000-member ceiling cannot
-- be exceeded by simultaneous links, approvals, or administrator adds.
create or replace function facemash.join_group_invite(invite_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare invite_row facemash.group_invites%rowtype;
begin
 if facemash.me() is null then raise exception using errcode='42501',message='not authenticated'; end if;
 select i.* into invite_row from facemash.group_invites i
  where i.token=invite_token and i.revoked_at is null and (i.expires_at is null or i.expires_at>now())
   and (i.max_uses is null or i.uses<i.max_uses) for update;
 if not found then return jsonb_build_object('status','invalid'); end if;
 perform 1 from facemash.threads where id=invite_row.thread_id and kind='group' and closed_at is null for update;
 if not found then return jsonb_build_object('status','invalid'); end if;
 if exists(select 1 from facemash.thread_members where thread_id=invite_row.thread_id and profile_id=facemash.me()) then
  return jsonb_build_object('status','member','thread_id',invite_row.thread_id);
 end if;
 if exists(select 1 from facemash.blocks b join facemash.thread_members m on m.thread_id=invite_row.thread_id
  where (b.blocker_id=facemash.me() and b.blocked_id=m.profile_id)
     or (b.blocker_id=m.profile_id and b.blocked_id=facemash.me())) then
  return jsonb_build_object('status','invalid');
 end if;
 if (select count(*) from facemash.thread_members where thread_id=invite_row.thread_id)>=1000 then
  return jsonb_build_object('status','full','thread_id',invite_row.thread_id);
 end if;
 if invite_row.approval_required then
  if exists(select 1 from facemash.group_join_requests where thread_id=invite_row.thread_id
   and profile_id=facemash.me() and status='pending') then
   return jsonb_build_object('status','pending','thread_id',invite_row.thread_id);
  end if;
  insert into facemash.group_join_requests(thread_id,profile_id,invite_id)
   values(invite_row.thread_id,facemash.me(),invite_row.id)
   on conflict(thread_id,profile_id) do update set status='pending',invite_id=excluded.invite_id,created_at=now();
  update facemash.group_invites set uses=uses+1 where id=invite_row.id;
  return jsonb_build_object('status','pending','thread_id',invite_row.thread_id);
 end if;
 insert into facemash.thread_members(thread_id,profile_id,role) values(invite_row.thread_id,facemash.me(),'member');
 update facemash.group_invites set uses=uses+1 where id=invite_row.id;
 return jsonb_build_object('status','joined','thread_id',invite_row.thread_id);
end; $$;

create or replace function facemash.resolve_group_join_request(request_id uuid,accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare request_row facemash.group_join_requests%rowtype; invite_key uuid; invite_row facemash.group_invites%rowtype;
begin
 if accept is null then raise exception using errcode='22023',message='approval decision required'; end if;
 select invite_id into invite_key from facemash.group_join_requests where id=request_id and status='pending';
 if not found then raise exception using errcode='42501',message='pending group request required'; end if;
 select * into invite_row from facemash.group_invites where id=invite_key for update;
 select * into request_row from facemash.group_join_requests where id=request_id and status='pending';
 if not found or request_row.invite_id is distinct from invite_key then raise exception using errcode='40001',message='request changed; retry'; end if;
 perform 1 from facemash.threads where id=request_row.thread_id and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='group is closed'; end if;
 select * into request_row from facemash.group_join_requests where id=request_id and status='pending' for update;
 if not found or request_row.invite_id is distinct from invite_key then raise exception using errcode='40001',message='request already resolved'; end if;
 if not facemash_private.can_manage_thread(request_row.thread_id) then raise exception using errcode='42501',message='group admin required'; end if;
 if accept then
  if not found or invite_row.revoked_at is not null then raise exception using errcode='55000',message='group invitation was revoked'; end if;
  if exists(select 1 from facemash.blocks b join facemash.thread_members m on m.thread_id=request_row.thread_id
   where (b.blocker_id=request_row.profile_id and b.blocked_id=m.profile_id)
      or (b.blocker_id=m.profile_id and b.blocked_id=request_row.profile_id)) then
   raise exception using errcode='42501',message='blocked account cannot join group';
  end if;
  if (select count(*) from facemash.thread_members where thread_id=request_row.thread_id)>=1000 then
   raise exception using errcode='54000',message='group member limit reached';
  end if;
 end if;
 update facemash.group_join_requests set status=case when accept then 'approved' else 'declined' end where id=request_id;
 if accept then insert into facemash.thread_members(thread_id,profile_id,role)
  values(request_row.thread_id,request_row.profile_id,'member') on conflict do nothing; end if;
end; $$;

create or replace function facemash.add_thread_member(target_thread uuid,target_profile uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from facemash.threads where id=target_thread and kind='group' and closed_at is null for update;
 if not found or not facemash_private.can_manage_thread(target_thread) then raise exception using errcode='42501',message='open group admin required'; end if;
 if exists(select 1 from facemash.thread_members where thread_id=target_thread and profile_id=target_profile) then return; end if;
 if exists(select 1 from facemash.blocks where (blocker_id=facemash.me() and blocked_id=target_profile)
  or (blocker_id=target_profile and blocked_id=facemash.me())) then raise exception using errcode='42501',message='blocked account cannot be added'; end if;
 if (select count(*) from facemash.thread_members where thread_id=target_thread)>=1000 then raise exception using errcode='54000',message='group member limit reached'; end if;
 insert into facemash.thread_members(thread_id,profile_id,role) values(target_thread,target_profile,'member');
end; $$;

create or replace function facemash.remove_thread_member(target_thread uuid,target_profile uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); actor_role text; target_role text;
begin
 perform 1 from facemash.threads where id=target_thread and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='group unavailable'; end if;
 select role into actor_role from facemash.thread_members where thread_id=target_thread and profile_id=actor;
 select role into target_role from facemash.thread_members where thread_id=target_thread and profile_id=target_profile;
 if actor_role is null or target_role is null then raise exception using errcode='42501',message='group membership required'; end if;
 if actor=target_profile and target_role='owner' then raise exception using errcode='23514',message='transfer ownership before leaving'; end if;
 if actor<>target_profile and (actor_role not in('owner','admin') or target_role='owner' or (actor_role='admin' and target_role<>'member'))
  then raise exception using errcode='42501',message='insufficient group permissions'; end if;
 delete from facemash.thread_members where thread_id=target_thread and profile_id=target_profile;
end; $$;

create or replace function facemash.set_thread_member_role(target_thread uuid,target_profile uuid,new_role text)
returns void language plpgsql security definer set search_path='' as $$
declare target_role text;
begin
 perform 1 from facemash.threads where id=target_thread and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='group unavailable'; end if;
 if not exists(select 1 from facemash.thread_members where thread_id=target_thread and profile_id=facemash.me() and role='owner')
  then raise exception using errcode='42501',message='group owner required'; end if;
 select role into target_role from facemash.thread_members where thread_id=target_thread and profile_id=target_profile;
 if target_role is null or new_role is null or new_role not in('admin','member') or target_role='owner' then
  raise exception using errcode='22023',message='invalid group role change'; end if;
 update facemash.thread_members set role=new_role where thread_id=target_thread and profile_id=target_profile;
end; $$;

create or replace function facemash.set_channel_admin(target_channel uuid,target_profile uuid,make_admin boolean)
returns void language plpgsql security definer set search_path='' as $$
declare channel_owner uuid;
begin
 select owner_profile_id into channel_owner from facemash.channels where id=target_channel and closed_at is null for update;
 if channel_owner is null or channel_owner is distinct from facemash.me() then raise exception using errcode='42501',message='open channel owner required'; end if;
 if target_profile is null or target_profile=channel_owner or make_admin is null then
  raise exception using errcode='22023',message='invalid channel admin change';
 end if;
 if make_admin then insert into facemash.channel_admins(channel_id,profile_id) values(target_channel,target_profile) on conflict do nothing;
 else delete from facemash.channel_admins where channel_id=target_channel and profile_id=target_profile; end if;
end; $$;

create or replace function facemash.close_community(target_thread uuid,target_channel uuid)
returns void language plpgsql security definer set search_path='' as $$
declare community_kind text; is_closed boolean; owner_profile uuid;
begin
 if (target_thread is null)=(target_channel is null) then raise exception using errcode='22023',message='select a single community'; end if;
 if target_thread is not null then
  select kind,closed_at is not null into community_kind,is_closed from facemash.threads where id=target_thread for update;
  if community_kind is distinct from 'group' or is_closed then raise exception using errcode='55000',message='group unavailable'; end if;
  if not exists(select 1 from facemash.thread_members where thread_id=target_thread and profile_id=facemash.me() and role='owner')
   then raise exception using errcode='42501',message='group owner required'; end if;
  update facemash.threads set closed_at=now() where id=target_thread;
 else
  select owner_profile_id,closed_at is not null into owner_profile,is_closed from facemash.channels where id=target_channel for update;
  if owner_profile is null or owner_profile is distinct from facemash.me() or is_closed is distinct from false
   then raise exception using errcode='42501',message='channel owner required'; end if;
  update facemash.channels set closed_at=now() where id=target_channel;
 end if;
end; $$;

-- Ownership transfer is only meaningful for an open group, never a DM, and
-- is serialized so two simultaneous transfers cannot leave ambiguous owners.
create or replace function facemash.transfer_thread_owner(target_thread uuid,target_profile uuid)
returns void language plpgsql security definer set search_path='' as $$
declare community_kind text; is_closed boolean;
begin
 select kind,closed_at is not null into community_kind,is_closed from facemash.threads where id=target_thread for update;
 if community_kind is distinct from 'group' or is_closed then raise exception using errcode='55000',message='group unavailable'; end if;
 if not exists(select 1 from facemash.thread_members where thread_id=target_thread and profile_id=facemash.me() and role='owner')
  then raise exception using errcode='42501',message='group owner required'; end if;
 if target_profile is null or target_profile=facemash.me() or not exists(select 1 from facemash.thread_members where thread_id=target_thread and profile_id=target_profile)
  then raise exception using errcode='P0002',message='target group member not found'; end if;
 update facemash.thread_members set role='admin' where thread_id=target_thread and profile_id=facemash.me();
 update facemash.thread_members set role='owner' where thread_id=target_thread and profile_id=target_profile;
end; $$;

create or replace function facemash.remove_thread_member(target_thread uuid,target_profile uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=facemash.me(); actor_role text; target_role text;
begin
 perform 1 from facemash.threads where id=target_thread and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='group unavailable'; end if;
 select role into actor_role from facemash.thread_members where thread_id=target_thread and profile_id=actor;
 select role into target_role from facemash.thread_members where thread_id=target_thread and profile_id=target_profile;
 if actor_role is null or target_role is null then raise exception using errcode='42501',message='group membership required'; end if;
 if actor=target_profile and target_role='owner' then raise exception using errcode='23514',message='transfer ownership before leaving'; end if;
 if actor<>target_profile and (actor_role not in('owner','admin') or target_role='owner' or (actor_role='admin' and target_role<>'member'))
  then raise exception using errcode='42501',message='insufficient group permissions'; end if;
 delete from facemash.thread_members where thread_id=target_thread and profile_id=target_profile;
end; $$;
create or replace function facemash.set_thread_member_role(target_thread uuid,target_profile uuid,new_role text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_role text; target_role text;
begin
 perform 1 from facemash.threads where id=target_thread and kind='group' and closed_at is null for update;
 if not found then raise exception using errcode='55000',message='group unavailable'; end if;
 select role into actor_role from facemash.thread_members where thread_id=target_thread and profile_id=facemash.me();
 select role into target_role from facemash.thread_members where thread_id=target_thread and profile_id=target_profile;
 if actor_role is distinct from 'owner' or target_role is null then raise exception using errcode='42501',message='group owner required'; end if;
 if new_role not in('admin','member') or target_role='owner' then raise exception using errcode='22023',message='use explicit ownership transfer'; end if;
 update facemash.thread_members set role=new_role where thread_id=target_thread and profile_id=target_profile;
end; $$;

-- A public channel remains discoverable, but a closed one is not.
drop policy if exists channels_read on facemash.channels;
create policy channels_read on facemash.channels for select to authenticated
using(closed_at is null and (not is_private or owner_profile_id=facemash.me() or facemash_private.can_read_channel(id)));
drop policy if exists channel_posts_read on facemash.channel_posts;
create policy channel_posts_read on facemash.channel_posts for select to authenticated
using(exists(select 1 from facemash.channels c where c.id=channel_id and c.closed_at is null and facemash_private.can_read_channel(c.id)));
drop policy if exists channel_subscriptions_own on facemash.channel_subscriptions;
create policy channel_subscriptions_own on facemash.channel_subscriptions for all to authenticated
using(profile_id=facemash.me())
with check(profile_id=facemash.me() and exists(select 1 from facemash.channels c where c.id=channel_id and not c.is_private and c.closed_at is null));

-- Closed communities retain their records for recovery/audit, but former
-- members cannot keep reading their messages, membership lists, or media.
drop policy if exists threads_read on facemash.threads;
create policy threads_read on facemash.threads for select to authenticated
using(closed_at is null and facemash.is_member(id));
drop policy if exists thread_members_read on facemash.thread_members;
create policy thread_members_read on facemash.thread_members for select to authenticated
using(exists(select 1 from facemash.threads t where t.id=thread_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists thread_members_delete on facemash.thread_members;
create policy thread_members_delete on facemash.thread_members for delete to authenticated
using(profile_id=facemash.me() and role<>'owner' and exists(select 1 from facemash.threads t
 where t.id=thread_id and t.kind='group' and t.closed_at is null));
drop policy if exists threads_update_member on facemash.threads;
create policy threads_update_member on facemash.threads for update to authenticated
using(closed_at is null and facemash.is_member(id)) with check(closed_at is null and facemash.is_member(id));
drop policy if exists messages_read on facemash.messages;
create policy messages_read on facemash.messages for select to authenticated
using(exists(select 1 from facemash.threads t where t.id=thread_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists messages_insert on facemash.messages;
create policy messages_insert on facemash.messages for insert to authenticated
with check(sender_id=facemash.me() and exists(select 1 from facemash.threads t
 where t.id=thread_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists messages_update on facemash.messages;
create policy messages_update on facemash.messages for update to authenticated
using(exists(select 1 from facemash.threads t where t.id=thread_id and t.closed_at is null and facemash.is_member(t.id)))
with check(exists(select 1 from facemash.threads t where t.id=thread_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists messages_delete_own on facemash.messages;
create policy messages_delete_own on facemash.messages for delete to authenticated
using(sender_id=facemash.me() and exists(select 1 from facemash.threads t
 where t.id=thread_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists message_reactions_read on facemash.message_reactions;
create policy message_reactions_read on facemash.message_reactions for select to authenticated
using(exists(select 1 from facemash.messages m join facemash.threads t on t.id=m.thread_id
 where m.id=message_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists message_reactions_own on facemash.message_reactions;
create policy message_reactions_own on facemash.message_reactions for all to authenticated
using(profile_id=facemash.me() and exists(select 1 from facemash.messages m join facemash.threads t on t.id=m.thread_id
 where m.id=message_id and t.closed_at is null and facemash.is_member(t.id)))
with check(profile_id=facemash.me() and exists(select 1 from facemash.messages m join facemash.threads t on t.id=m.thread_id
 where m.id=message_id and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists channel_post_reactions_read on facemash.channel_post_reactions;
create policy channel_post_reactions_read on facemash.channel_post_reactions for select to authenticated
using(exists(select 1 from facemash.channel_posts p join facemash.channels c on c.id=p.channel_id
 where p.id=channel_post_id and c.closed_at is null and facemash_private.can_read_channel(c.id)));
drop policy if exists channel_post_reactions_own on facemash.channel_post_reactions;
create policy channel_post_reactions_own on facemash.channel_post_reactions for all to authenticated
using(profile_id=facemash.me() and exists(select 1 from facemash.channel_posts p join facemash.channels c on c.id=p.channel_id
 where p.id=channel_post_id and c.closed_at is null and facemash_private.can_read_channel(c.id)))
with check(profile_id=facemash.me() and exists(select 1 from facemash.channel_posts p join facemash.channels c on c.id=p.channel_id
 where p.id=channel_post_id and c.closed_at is null and facemash_private.can_read_channel(c.id)));
drop policy if exists channel_post_media_read on facemash.channel_post_media;
create policy channel_post_media_read on facemash.channel_post_media for select to authenticated
using(exists(select 1 from facemash.channel_posts p join facemash.channels c on c.id=p.channel_id
 where p.id=channel_post_id and c.closed_at is null and facemash_private.can_read_channel(c.id)));

drop policy if exists channel_posts_insert_admin on facemash.channel_posts;
create policy channel_posts_insert_admin on facemash.channel_posts for insert to authenticated
with check(author_id=facemash.me() and facemash_private.can_manage_channel(channel_id)
 and exists(select 1 from facemash.channels c where c.id=channel_id and c.closed_at is null));
drop policy if exists channel_posts_update_admin on facemash.channel_posts;
create policy channel_posts_update_admin on facemash.channel_posts for update to authenticated
using(facemash_private.can_manage_channel(channel_id) and exists(select 1 from facemash.channels c where c.id=channel_id and c.closed_at is null))
with check(facemash_private.can_manage_channel(channel_id) and exists(select 1 from facemash.channels c where c.id=channel_id and c.closed_at is null));
drop policy if exists channel_posts_delete_admin on facemash.channel_posts;
create policy channel_posts_delete_admin on facemash.channel_posts for delete to authenticated
using(facemash_private.can_manage_channel(channel_id) and exists(select 1 from facemash.channels c where c.id=channel_id and c.closed_at is null));
drop policy if exists channel_media_write_admin on facemash.channel_post_media;
create policy channel_media_write_admin on facemash.channel_post_media for all to authenticated
using(exists(select 1 from facemash.channel_posts p join facemash.channels c on c.id=p.channel_id
 where p.id=channel_post_id and c.closed_at is null and facemash_private.can_manage_channel(c.id)))
with check(exists(select 1 from facemash.channel_posts p join facemash.channels c on c.id=p.channel_id
 where p.id=channel_post_id and c.closed_at is null and facemash_private.can_manage_channel(c.id)));

drop policy if exists "facemash thread media read" on storage.objects;
create policy "facemash thread media read" on storage.objects for select to authenticated using(
 bucket_id='thread-media' and exists(select 1 from facemash.threads t
  where t.id::text=(storage.foldername(name))[1] and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists "facemash thread media insert" on storage.objects;
create policy "facemash thread media insert" on storage.objects for insert to authenticated with check(
 bucket_id='thread-media' and (storage.foldername(name))[2]=facemash.me()::text
 and exists(select 1 from facemash.threads t where t.id::text=(storage.foldername(name))[1]
  and t.closed_at is null and facemash.is_member(t.id)));
drop policy if exists "facemash channel media read" on storage.objects;
create policy "facemash channel media read" on storage.objects for select to authenticated using(
 bucket_id='channel-media' and exists(select 1 from facemash.channels c where c.id::text=(storage.foldername(name))[1]
  and c.closed_at is null and (not c.is_private or facemash_private.can_read_channel(c.id))));

create or replace function facemash.older_thread_messages(target_thread uuid,before_time timestamptz,requested integer default 50)
returns setof facemash.messages language sql stable security invoker set search_path='' as $$
 select m.* from facemash.messages m join facemash.threads t on t.id=m.thread_id
 where m.thread_id=target_thread and m.created_at<before_time and t.closed_at is null and facemash.is_member(target_thread)
 order by m.created_at desc,m.id desc limit least(greatest(coalesce(requested,50),1),100)+1;
$$;

revoke insert,update,delete on facemash.community_creation_log,facemash.channel_join_requests,facemash.community_audit_log from authenticated,anon;
revoke execute on function facemash.create_thread(uuid,text,text,text,smallint,jsonb) from public,anon;
revoke execute on function facemash.create_channel(uuid,text,text,text,smallint,boolean) from public,anon,authenticated;
revoke all on function facemash.create_managed_group(uuid,text,text,uuid[],text,boolean,boolean,text,integer),
 facemash.update_group_settings(uuid,text,text,text,text,boolean,boolean,text,integer),
 facemash.link_channel_discussion(uuid),facemash.set_channel_avatar(uuid,text),facemash.update_channel_details(uuid,text,text,text),
 facemash.join_channel_discussion(uuid),
 facemash.revoke_channel_invite(uuid),facemash.join_channel_invite(text),
 facemash.resolve_channel_join_request(uuid,boolean),facemash.close_community(uuid,uuid),
 facemash.create_managed_channel(uuid,text,text,text,smallint,boolean,boolean),
 facemash.set_channel_admin(uuid,uuid,boolean),
 facemash.remove_thread_member(uuid,uuid),facemash.set_thread_member_role(uuid,uuid,text),
 facemash.create_channel_invite(uuid,text,timestamptz,boolean,integer) from public,anon;
grant execute on function facemash.create_managed_group(uuid,text,text,uuid[],text,boolean,boolean,text,integer),
 facemash.create_managed_channel(uuid,text,text,text,smallint,boolean,boolean),
 facemash.update_group_settings(uuid,text,text,text,text,boolean,boolean,text,integer),
 facemash.create_group_invite(uuid,text,timestamptz,boolean,integer),
 facemash.join_group_invite(text),facemash.resolve_group_join_request(uuid,boolean),
 facemash.transfer_thread_owner(uuid,uuid),facemash.add_thread_member(uuid,uuid),
 facemash.set_channel_admin(uuid,uuid,boolean),
 facemash.link_channel_discussion(uuid),facemash.set_channel_avatar(uuid,text),facemash.update_channel_details(uuid,text,text,text),
 facemash.join_channel_discussion(uuid),
 facemash.create_channel_invite(uuid,text,timestamptz,boolean,integer),facemash.revoke_channel_invite(uuid),
 facemash.join_channel_invite(text),facemash.resolve_channel_join_request(uuid,boolean),
 facemash.close_community(uuid,uuid),facemash.create_thread(uuid,text,text,text,smallint,jsonb),
 facemash.remove_thread_member(uuid,uuid),facemash.set_thread_member_role(uuid,uuid,text)
 to authenticated;
