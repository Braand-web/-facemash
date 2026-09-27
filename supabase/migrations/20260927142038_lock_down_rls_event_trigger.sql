-- This event-trigger function is invoked by PostgreSQL on DDL; app roles must
-- not be able to invoke it as a PostgREST RPC.
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;
