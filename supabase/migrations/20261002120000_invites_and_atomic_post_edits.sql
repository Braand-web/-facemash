-- Shareable invitations are opaque capabilities, not profile identifiers.
create table facemash.invite_codes (
  profile_id uuid primary key references facemash.profiles (id) on delete cascade,
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

insert into facemash.invite_codes (profile_id)
select id from facemash.profiles
on conflict (profile_id) do nothing;

create table facemash.referrals (
  invitee_id uuid primary key references facemash.profiles (id) on delete cascade,
  inviter_id uuid not null references facemash.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referrals_no_self_invite check (invitee_id <> inviter_id)
);

create index referrals_inviter_idx on facemash.referrals (inviter_id, created_at desc);

alter table facemash.invite_codes enable row level security;
alter table facemash.referrals enable row level security;
revoke all on facemash.invite_codes, facemash.referrals from public, anon, authenticated, service_role;

create or replace function facemash.create_invite_code_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into facemash.invite_codes (profile_id) values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

revoke all on function facemash.create_invite_code_for_profile() from public, anon, authenticated, service_role;
create trigger profile_invite_code_created
after insert on facemash.profiles
for each row execute function facemash.create_invite_code_for_profile();

create or replace function facemash.resolve_invite_code(invite_code text)
returns table (name text, username text, is_public boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.is_private then null else p.name end,
         case when p.is_private then null else p.username end,
         not p.is_private
  from facemash.invite_codes c
  join facemash.profiles p on p.id = c.profile_id
  where c.code = invite_code
  limit 1;
$$;

revoke all on function facemash.resolve_invite_code(text) from public, anon, authenticated, service_role;
grant execute on function facemash.resolve_invite_code(text) to anon, authenticated;

create or replace function facemash.claim_referral(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_profile uuid;
  profile_created_at timestamptz;
  auth_created_at timestamptz;
  inviter_profile uuid;
  inserted_count integer;
begin
  caller_profile := facemash.me();
  if caller_profile is null then
    return false;
  end if;

  select p.created_at, u.created_at
    into profile_created_at, auth_created_at
  from facemash.profiles p
  join auth.users u on u.id = p.auth_id
  where p.id = caller_profile;

  -- Profile rows created by the auth signup trigger share a transaction timestamp
  -- with auth.users. This excludes old accounts while allowing email confirmation
  -- to happen later than a short fixed time window.
  if profile_created_at is null or auth_created_at is null
    or profile_created_at < auth_created_at - interval '1 minute'
    or profile_created_at > auth_created_at + interval '1 minute' then
    return false;
  end if;

  select c.profile_id into inviter_profile
  from facemash.invite_codes c
  where c.code = invite_code;

  if inviter_profile is null or inviter_profile = caller_profile then
    return false;
  end if;

  insert into facemash.referrals (invitee_id, inviter_id)
  values (caller_profile, inviter_profile)
  on conflict (invitee_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function facemash.claim_referral(text) from public, anon, authenticated, service_role;
grant execute on function facemash.claim_referral(text) to authenticated;

create or replace function facemash.my_invite_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.code
  from facemash.invite_codes c
  where c.profile_id = facemash.me()
  limit 1;
$$;

revoke all on function facemash.my_invite_code() from public, anon, authenticated, service_role;
grant execute on function facemash.my_invite_code() to authenticated;

create or replace function facemash.my_referral_source()
returns table (name text, username text, is_public boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.is_private then null else p.name end,
         case when p.is_private then null else p.username end,
         not p.is_private
  from facemash.referrals r
  join facemash.profiles p on p.id = r.inviter_id
  where r.invitee_id = facemash.me()
  limit 1;
$$;

revoke all on function facemash.my_referral_source() from public, anon, authenticated, service_role;
grant execute on function facemash.my_referral_source() to authenticated;

create or replace function facemash.my_referral_counts()
returns table (registered_count bigint, onboarded_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint,
         count(*) filter (where coalesce(s.onboarded, false))::bigint
  from facemash.referrals r
  left join facemash.user_settings s on s.profile_id = r.invitee_id
  where r.inviter_id = facemash.me();
$$;

revoke all on function facemash.my_referral_counts() from public, anon, authenticated, service_role;
grant execute on function facemash.my_referral_counts() to authenticated;

-- The client cannot update post media in a transaction. This RPC keeps the post
-- fields and the replacement media rows atomic, avoiding partial edits on a drop.
create or replace function facemash.update_post_with_media(
  target_post uuid,
  post_text text,
  post_tags text[],
  post_visibility text,
  post_location text,
  media_items jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_profile uuid;
begin
  caller_profile := facemash.me();
  if caller_profile is null or jsonb_typeof(coalesce(media_items, '[]'::jsonb)) <> 'array' then
    return false;
  end if;

  perform 1 from facemash.posts p
  where p.id = target_post and p.author_id = caller_profile
  for update;
  if not found then
    return false;
  end if;

  update facemash.posts
  set text = post_text,
      tags = coalesce(post_tags, '{}'),
      visibility = post_visibility,
      location = post_location
  where id = target_post and author_id = caller_profile;

  delete from facemash.post_media where post_id = target_post;

  insert into facemash.post_media (post_id, position, label, ratio, url, video)
  select target_post,
         (item.ordinality - 1)::smallint,
         item.value ->> 'label',
         coalesce(item.value ->> 'ratio', '4/5'),
         nullif(item.value ->> 'url', ''),
         coalesce((item.value ->> 'video')::boolean, false)
  from jsonb_array_elements(coalesce(media_items, '[]'::jsonb)) with ordinality as item(value, ordinality);

  return true;
end;
$$;

revoke all on function facemash.update_post_with_media(uuid, text, text[], text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function facemash.update_post_with_media(uuid, text, text[], text, text, jsonb) to authenticated;
