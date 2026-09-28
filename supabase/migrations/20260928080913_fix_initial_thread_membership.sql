-- The original membership policy queried threads through its own RLS policy.
-- Since threads_read requires membership, the first membership insert could
-- never see the thread it had just created. Keep this narrowly scoped helper
-- outside the PostgREST-exposed schemas and let it inspect the bootstrap rows.
create schema if not exists facemash_private;
revoke all on schema facemash_private from public, anon;
grant usage on schema facemash_private to authenticated;

create or replace function facemash_private.can_add_initial_thread_member(
  target_thread uuid,
  target_profile uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and target_profile = facemash.me()
    and exists (
      select 1
      from facemash.threads t
      where t.id = target_thread
        and t.created_by = facemash.me()
    )
    and not exists (
      select 1
      from facemash.thread_members existing
      where existing.thread_id = target_thread
    );
$$;

revoke all on function facemash_private.can_add_initial_thread_member(uuid, uuid)
  from public, anon;
grant execute on function facemash_private.can_add_initial_thread_member(uuid, uuid)
  to authenticated;

drop policy if exists thread_members_insert on facemash.thread_members;
create policy thread_members_insert on facemash.thread_members
  for insert to authenticated
  with check (
    facemash.is_member(thread_id)
    or facemash_private.can_add_initial_thread_member(thread_id, profile_id)
  );

-- Create the thread and every initial member atomically. This prevents a
-- failed invite from leaving a thread that exists without usable membership.
create or replace function facemash.create_thread(
  target_thread uuid,
  thread_kind text,
  thread_name text,
  thread_description text,
  thread_hue smallint,
  target_members jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := facemash.me();
  member_count integer;
  unique_member_count integer;
  owner_count integer;
  actor_owner_count integer;
  invalid_member_count integer;
begin
  if auth.uid() is null or actor is null then
    raise exception using errcode = '42501', message = 'not authenticated';
  end if;
  if target_thread is null or thread_kind is null or thread_kind not in ('dm', 'group') then
    raise exception using errcode = '22023', message = 'invalid thread';
  end if;
  if target_members is null or jsonb_typeof(target_members) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'members must be an array';
  end if;

  select
    count(*),
    count(distinct m.profile_id),
    count(*) filter (where m.role = 'owner'),
    count(*) filter (where m.profile_id = actor and m.role = 'owner'),
    count(*) filter (
      where m.profile_id is null
        or m.role is null
        or m.role not in ('owner', 'admin', 'member')
    )
  into member_count, unique_member_count, owner_count, actor_owner_count, invalid_member_count
  from jsonb_to_recordset(target_members) as m(profile_id uuid, role text);

  if member_count = 0
    or member_count <> unique_member_count
    or owner_count <> 1
    or actor_owner_count <> 1
    or invalid_member_count <> 0 then
    raise exception using errcode = '22023', message = 'invalid thread members';
  end if;
  if thread_kind = 'dm' and (
    member_count <> 2
    or exists (
      select 1
      from jsonb_to_recordset(target_members) as m(profile_id uuid, role text)
      where m.profile_id <> actor and m.role <> 'member'
    )
  ) then
    raise exception using errcode = '22023', message = 'a direct message needs two members';
  end if;

  insert into facemash.threads (id, kind, name, description, hue, created_by)
  values (
    target_thread,
    thread_kind,
    coalesce(thread_name, ''),
    coalesce(thread_description, ''),
    coalesce(thread_hue, 265),
    actor
  );

  insert into facemash.thread_members (thread_id, profile_id, role)
  select target_thread, actor, 'owner';

  insert into facemash.thread_members (thread_id, profile_id, role)
  select target_thread, m.profile_id, m.role
  from jsonb_to_recordset(target_members) as m(profile_id uuid, role text)
  where m.profile_id <> actor;
end;
$$;

revoke all on function facemash.create_thread(uuid, text, text, text, smallint, jsonb)
  from public, anon;
grant execute on function facemash.create_thread(uuid, text, text, text, smallint, jsonb)
  to authenticated;
