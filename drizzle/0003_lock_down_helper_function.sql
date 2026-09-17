-- Follow-up to 0001_rls_tenant_isolation: Postgres grants EXECUTE on a
-- newly created function to PUBLIC by default, so
-- public.user_organisation_id() was callable by the anon role even
-- though it's SECURITY DEFINER. Flagged by the Supabase advisor as
-- "Public Can Execute SECURITY DEFINER Function".
--
-- Not an actual data leak as written (an anon caller has no auth.uid(),
-- so the function's WHERE clause matches nothing and it returns NULL),
-- but a SECURITY DEFINER function should never be reachable by a role
-- that has no legitimate reason to call it. Restrict it to the
-- authenticated role, which is what RLS policies actually need it for.
--
-- The advisor will likely keep listing "Signed-in users can execute" —
-- that one's intentional: authenticated users are exactly who this
-- function exists to serve, via the RLS policies from 0001/0002 that
-- call it. There is no further restriction to make there.

--> statement-breakpoint

revoke execute on function public.user_organisation_id() from public;

--> statement-breakpoint

grant execute on function public.user_organisation_id() to authenticated;
