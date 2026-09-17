-- Performance follow-up, not RLS-related: every remaining foreign-key
-- constraint in the schema that wasn't already indexed by 0001 (0001
-- only covered the columns RLS policies join through). Flagged by the
-- Supabase advisor as "Unindexed foreign keys" — a missing FK index
-- means every UPDATE/DELETE on the referenced row has to sequential-
-- scan the referencing table to check for orphans, and any query
-- joining or filtering on the FK does the same.
--
-- Columns that are typed uuid but declared WITHOUT an actual
-- .references() constraint in the Drizzle schema (requirements.
-- previous_version_id, ai_inferences.discovery_session_id,
-- answers.superseded_by_answer_id, baseline_items.entity_id) are left
-- out deliberately — there's no FK constraint for the advisor to flag,
-- and indexing them is a separate judgement call about query patterns,
-- not a correctness fix.

create index if not exists idx_product_definitions_product_type_id on public.product_definitions (product_type_id);
create index if not exists idx_pathway_configs_product_type_id on public.pathway_configs (product_type_id);
create index if not exists idx_pd_participants_user_id on public.product_definition_participants (user_id);
create index if not exists idx_requirements_changed_by_user_id on public.requirements (changed_by_user_id);
create index if not exists idx_requirement_dimensions_confirmed_by_user_id on public.requirement_dimensions (confirmed_by_user_id);
create index if not exists idx_assumptions_confirmed_by_user_id on public.assumptions (confirmed_by_user_id);
create index if not exists idx_decisions_decided_by_user_id on public.decisions (decided_by_user_id);
create index if not exists idx_evidence_uploaded_by_user_id on public.evidence (uploaded_by_user_id);
create index if not exists idx_ai_inferences_resulting_assumption_id on public.ai_inferences (resulting_assumption_id);
create index if not exists idx_ai_inferences_resulting_requirement_id on public.ai_inferences (resulting_requirement_id);
create index if not exists idx_ai_inferences_reviewed_by_user_id on public.ai_inferences (reviewed_by_user_id);
create index if not exists idx_discovery_sessions_stakeholder_id on public.discovery_sessions (stakeholder_id);
create index if not exists idx_answers_question_id on public.answers (question_id);
create index if not exists idx_answers_message_id on public.answers (message_id);
create index if not exists idx_baselines_created_by_user_id on public.baselines (created_by_user_id);
create index if not exists idx_changes_baseline_id on public.changes (baseline_id);
create index if not exists idx_changes_changed_by_user_id on public.changes (changed_by_user_id);
create index if not exists idx_changes_reviewed_by_user_id on public.changes (reviewed_by_user_id);
create index if not exists idx_user_stories_requirement_id on public.user_stories (requirement_id);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
