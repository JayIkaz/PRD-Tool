-- Follow-up to 0003_lock_down_helper_function: that migration revoked
-- EXECUTE from PUBLIC, on the assumption anon inherited it from there.
-- It didn't — Supabase's own default-privileges setup grants EXECUTE
-- on every new function in the public schema to anon, authenticated
-- and service_role as separate, explicit per-role grants, independent
-- of PUBLIC. Confirmed via:
--
--   select grantee, privilege_type from information_schema.routine_privileges
--   where routine_schema = 'public' and routine_name = 'user_organisation_id';
--
-- which showed postgres, anon, authenticated and service_role all with
-- an explicit EXECUTE grant even after 0003 ran. This revokes anon's
-- grant specifically. authenticated and service_role are left alone —
-- authenticated is who the function exists for (via RLS), and
-- service_role bypasses RLS entirely so its grant is moot either way.

revoke execute on function public.user_organisation_id() from anon;
