-- ============================================================
-- 0009_audit_log_entries_actor_user_id_index.sql
-- ============================================================
-- audit_log_entries has two FKs: product_definition_id (indexed
-- in 0008) and actor_user_id (never indexed). Supabase advisor
-- flagged this as an unindexed foreign key after 0008 landed.

create index if not exists idx_audit_log_entries_actor_user_id
  on public.audit_log_entries (actor_user_id);
