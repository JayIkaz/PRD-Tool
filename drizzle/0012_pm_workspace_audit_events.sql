-- ============================================================
-- 0012_pm_workspace_audit_events.sql
-- ============================================================
-- PM workspace edits (requirements, risks, dependencies, open
-- questions) are written to the audit log, so the audit_event_type
-- enum needs the new event names. Hand-applied through the Supabase
-- SQL editor -- do NOT run db:push (see claude/rls-migration-notes.md).
-- Apply this BEFORE deploying the code that uses these values.
-- Each statement is idempotent. Run each on its own if the editor
-- complains about ALTER TYPE inside a transaction.

alter type public.audit_event_type add value if not exists 'REQUIREMENT_EDITED';
alter type public.audit_event_type add value if not exists 'RISK_ADDED';
alter type public.audit_event_type add value if not exists 'RISK_REMOVED';
alter type public.audit_event_type add value if not exists 'DEPENDENCY_ADDED';
alter type public.audit_event_type add value if not exists 'DEPENDENCY_REMOVED';
alter type public.audit_event_type add value if not exists 'OPEN_QUESTION_ADDED';
alter type public.audit_event_type add value if not exists 'OPEN_QUESTION_RESOLVED';
