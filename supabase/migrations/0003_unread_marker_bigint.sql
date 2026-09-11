-- unread_at stores the timestamp (epoch ms) of the first unread message, so the
-- "new messages" divider stays anchored as the conversation grows.
alter table facemash.thread_members
  alter column unread_at type bigint using unread_at::bigint;
