-- Follow-up to 0001_rls_tenant_isolation: RLS was enabled on every table
-- that REFERENCES organisations via organisation_id, but not on
-- organisations itself — the tenancy root doesn't reference itself, so
-- it fell outside that sweep. Caught by the Supabase advisor:
-- "RLS Disabled in Public: public.organisations".
--
-- Deliberately SELECT + UPDATE only, no INSERT/DELETE policy:
-- - INSERT: a brand-new signup has no organisation_id yet (that's the
--   whole point of signing up), so a WITH CHECK against
--   user_organisation_id() could never pass for the row that creates
--   it. Organisation creation belongs in a privileged, service-role
--   path (e.g. a signup transaction that creates the org and the
--   first user row together) — RLS doesn't apply to service_role, so
--   no policy is needed there, and none should be added for the
--   authenticated role.
-- - DELETE: same reasoning — decommissioning a tenant is an admin
--   operation, not an authenticated-user one.
-- Add explicit INSERT/DELETE policies later only if a genuine
-- user-facing "create/delete my own organisation" flow is built.

--> statement-breakpoint

alter table public.organisations enable row level security;

--> statement-breakpoint

create policy tenant_isolation_select on public.organisations
  for select
  using (id = (select public.user_organisation_id()));

--> statement-breakpoint

create policy tenant_isolation_update on public.organisations
  for update
  using (id = (select public.user_organisation_id()))
  with check (id = (select public.user_organisation_id()));
