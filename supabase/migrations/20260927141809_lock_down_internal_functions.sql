-- Trigger functions need elevated rights when invoked by a row trigger, not as
-- callable PostgREST RPC endpoints. Remove the default PUBLIC EXECUTE grants.
revoke all on function facemash.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function facemash.bump_post_likes() from public, anon, authenticated, service_role;
revoke all on function facemash.bump_post_reposts() from public, anon, authenticated, service_role;
revoke all on function facemash.bump_follow_counts() from public, anon, authenticated, service_role;
revoke all on function facemash.bump_channel_subscribers() from public, anon, authenticated, service_role;
revoke all on function facemash.notify_follow_request() from public, anon, authenticated, service_role;
revoke all on function facemash.notify_follow() from public, anon, authenticated, service_role;
revoke all on function facemash.notify_like() from public, anon, authenticated, service_role;
revoke all on function facemash.notify_comment() from public, anon, authenticated, service_role;

-- All object references in these SECURITY DEFINER functions are schema-qualified.
-- An empty search_path prevents caller-controlled object shadowing.
alter function facemash.me() set search_path = '';
alter function facemash.handle_new_user() set search_path = '';
alter function facemash.bump_post_likes() set search_path = '';
alter function facemash.bump_post_reposts() set search_path = '';
alter function facemash.bump_follow_counts() set search_path = '';
alter function facemash.is_member(uuid) set search_path = '';
alter function facemash.set_thread_member_role(uuid, uuid, text) set search_path = '';
alter function facemash.remove_thread_member(uuid, uuid) set search_path = '';
alter function facemash.bump_channel_subscribers() set search_path = '';
alter function facemash.accept_follow_request(uuid) set search_path = '';
alter function facemash.notify_follow_request() set search_path = '';
alter function facemash.notify_follow() set search_path = '';
alter function facemash.notify_like() set search_path = '';
alter function facemash.notify_comment() set search_path = '';
