-- RLS for audit_log_entries (added after 0007 created the table) --
-- Same pattern as decisions/assumptions/open_questions in
-- 0001_rls_tenant_isolation.sql: one hop from product_definitions via
-- product_definition_id, so tenant isolation is resolved through the
-- parent's organisation_id rather than duplicating organisation_id
-- onto this table.

--> statement-breakpoint

create index if not exists idx_audit_log_entries_product_definition_id
  on public.audit_log_entries (product_definition_id);

--> statement-breakpoint

alter table public.audit_log_entries enable row level security;
create policy tenant_isolation on public.audit_log_entries
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = audit_log_entries.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = audit_log_entries.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));
