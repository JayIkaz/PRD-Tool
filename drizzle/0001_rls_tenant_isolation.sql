-- Row Level Security: tenant isolation by organisation_id
-- Every policy below resolves to the same rule: a row is visible/writable
-- only if it belongs (directly, or via its parent chain) to the
-- organisation the current auth.uid() belongs to, per
-- build-prompt-addendum-v2.md Section 3 and Section 11 (NFRs).
--
-- product_types, pathway_configs and questions are excluded on purpose:
-- they have no organisation_id anywhere in their chain — they're global
-- reference/config data (product-type catalogue, orchestrator pathway
-- config, question library), not tenant-scoped rows.

--> statement-breakpoint

-- 1. Helper function -----------------------------------------------------
-- Placed in public (not auth): Supabase manages the auth schema itself
-- and custom objects placed there aren't guaranteed to survive an Auth
-- service upgrade. SECURITY DEFINER lets it read public.users without
-- being blocked by the RLS policy we're about to put on that same table
-- (avoids recursion), stable + a pinned search_path keep it safe to
-- inline and immune to search_path hijacking.
create or replace function public.user_organisation_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select organisation_id
  from public.users
  where id = (select auth.uid())
$$;

--> statement-breakpoint

-- 2. Indexes on every column an RLS policy below joins through -----------
-- Required for the EXISTS subqueries to stay index-scans instead of
-- per-row seq scans once RLS is enabled (Supabase's own RLS performance
-- guidance). Only the chain columns; existing PKs already cover id.
create index if not exists idx_users_organisation_id on public.users (organisation_id);
create index if not exists idx_product_definitions_organisation_id on public.product_definitions (organisation_id);
create index if not exists idx_pd_participants_product_definition_id on public.product_definition_participants (product_definition_id);
create index if not exists idx_requirements_product_definition_id on public.requirements (product_definition_id);
create index if not exists idx_requirement_dimensions_requirement_id on public.requirement_dimensions (requirement_id);
create index if not exists idx_assumptions_product_definition_id on public.assumptions (product_definition_id);
create index if not exists idx_decisions_product_definition_id on public.decisions (product_definition_id);
create index if not exists idx_open_questions_product_definition_id on public.open_questions (product_definition_id);
create index if not exists idx_evidence_product_definition_id on public.evidence (product_definition_id);
create index if not exists idx_risks_product_definition_id on public.risks (product_definition_id);
create index if not exists idx_dependencies_product_definition_id on public.dependencies (product_definition_id);
create index if not exists idx_ai_inferences_product_definition_id on public.ai_inferences (product_definition_id);
create index if not exists idx_discovery_sessions_product_definition_id on public.discovery_sessions (product_definition_id);
create index if not exists idx_messages_discovery_session_id on public.messages (discovery_session_id);
create index if not exists idx_answers_discovery_session_id on public.answers (discovery_session_id);
create index if not exists idx_baselines_product_definition_id on public.baselines (product_definition_id);
create index if not exists idx_baseline_items_baseline_id on public.baseline_items (baseline_id);
create index if not exists idx_changes_requirement_id on public.changes (requirement_id);
create index if not exists idx_prds_product_definition_id on public.prds (product_definition_id);
create index if not exists idx_epics_product_definition_id on public.epics (product_definition_id);
create index if not exists idx_user_stories_epic_id on public.user_stories (epic_id);
create index if not exists idx_acceptance_criteria_user_story_id on public.acceptance_criteria (user_story_id);
create index if not exists idx_definition_of_done_product_definition_id on public.definition_of_done (product_definition_id);
create index if not exists idx_notifications_organisation_id on public.notifications (organisation_id);
create index if not exists idx_notification_channels_organisation_id on public.notification_channels (organisation_id);

--> statement-breakpoint

-- 3. Direct organisation_id tables ----------------------------------------

alter table public.users enable row level security;
create policy tenant_isolation on public.users
  for all
  using (organisation_id = (select public.user_organisation_id()))
  with check (organisation_id = (select public.user_organisation_id()));

--> statement-breakpoint

alter table public.product_definitions enable row level security;
create policy tenant_isolation on public.product_definitions
  for all
  using (organisation_id = (select public.user_organisation_id()))
  with check (organisation_id = (select public.user_organisation_id()));

--> statement-breakpoint

alter table public.notifications enable row level security;
create policy tenant_isolation on public.notifications
  for all
  using (organisation_id = (select public.user_organisation_id()))
  with check (organisation_id = (select public.user_organisation_id()));

--> statement-breakpoint

alter table public.notification_channels enable row level security;
create policy tenant_isolation on public.notification_channels
  for all
  using (organisation_id = (select public.user_organisation_id()))
  with check (organisation_id = (select public.user_organisation_id()));

--> statement-breakpoint

-- 4. One hop from product_definitions (product_definition_id column) -----

alter table public.product_definition_participants enable row level security;
create policy tenant_isolation on public.product_definition_participants
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = product_definition_participants.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = product_definition_participants.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.requirements enable row level security;
create policy tenant_isolation on public.requirements
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = requirements.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = requirements.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.assumptions enable row level security;
create policy tenant_isolation on public.assumptions
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = assumptions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = assumptions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.decisions enable row level security;
create policy tenant_isolation on public.decisions
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = decisions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = decisions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.open_questions enable row level security;
create policy tenant_isolation on public.open_questions
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = open_questions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = open_questions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.evidence enable row level security;
create policy tenant_isolation on public.evidence
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = evidence.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = evidence.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.risks enable row level security;
create policy tenant_isolation on public.risks
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = risks.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = risks.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.dependencies enable row level security;
create policy tenant_isolation on public.dependencies
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = dependencies.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = dependencies.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.ai_inferences enable row level security;
create policy tenant_isolation on public.ai_inferences
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = ai_inferences.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = ai_inferences.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.discovery_sessions enable row level security;
create policy tenant_isolation on public.discovery_sessions
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = discovery_sessions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = discovery_sessions.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.baselines enable row level security;
create policy tenant_isolation on public.baselines
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = baselines.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = baselines.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.prds enable row level security;
create policy tenant_isolation on public.prds
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = prds.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = prds.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.epics enable row level security;
create policy tenant_isolation on public.epics
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = epics.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = epics.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.definition_of_done enable row level security;
create policy tenant_isolation on public.definition_of_done
  for all
  using (exists (
    select 1 from public.product_definitions pd
    where pd.id = definition_of_done.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.product_definitions pd
    where pd.id = definition_of_done.product_definition_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

-- 5. Two hops (via requirements or discovery_sessions) -------------------

alter table public.requirement_dimensions enable row level security;
create policy tenant_isolation on public.requirement_dimensions
  for all
  using (exists (
    select 1 from public.requirements r
    join public.product_definitions pd on pd.id = r.product_definition_id
    where r.id = requirement_dimensions.requirement_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.requirements r
    join public.product_definitions pd on pd.id = r.product_definition_id
    where r.id = requirement_dimensions.requirement_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.changes enable row level security;
create policy tenant_isolation on public.changes
  for all
  using (exists (
    select 1 from public.requirements r
    join public.product_definitions pd on pd.id = r.product_definition_id
    where r.id = changes.requirement_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.requirements r
    join public.product_definitions pd on pd.id = r.product_definition_id
    where r.id = changes.requirement_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.messages enable row level security;
create policy tenant_isolation on public.messages
  for all
  using (exists (
    select 1 from public.discovery_sessions ds
    join public.product_definitions pd on pd.id = ds.product_definition_id
    where ds.id = messages.discovery_session_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.discovery_sessions ds
    join public.product_definitions pd on pd.id = ds.product_definition_id
    where ds.id = messages.discovery_session_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.answers enable row level security;
create policy tenant_isolation on public.answers
  for all
  using (exists (
    select 1 from public.discovery_sessions ds
    join public.product_definitions pd on pd.id = ds.product_definition_id
    where ds.id = answers.discovery_session_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.discovery_sessions ds
    join public.product_definitions pd on pd.id = ds.product_definition_id
    where ds.id = answers.discovery_session_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.baseline_items enable row level security;
create policy tenant_isolation on public.baseline_items
  for all
  using (exists (
    select 1 from public.baselines b
    join public.product_definitions pd on pd.id = b.product_definition_id
    where b.id = baseline_items.baseline_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.baselines b
    join public.product_definitions pd on pd.id = b.product_definition_id
    where b.id = baseline_items.baseline_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

alter table public.user_stories enable row level security;
create policy tenant_isolation on public.user_stories
  for all
  using (exists (
    select 1 from public.epics e
    join public.product_definitions pd on pd.id = e.product_definition_id
    where e.id = user_stories.epic_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.epics e
    join public.product_definitions pd on pd.id = e.product_definition_id
    where e.id = user_stories.epic_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));

--> statement-breakpoint

-- 6. Three hops ------------------------------------------------------------

alter table public.acceptance_criteria enable row level security;
create policy tenant_isolation on public.acceptance_criteria
  for all
  using (exists (
    select 1 from public.user_stories us
    join public.epics e on e.id = us.epic_id
    join public.product_definitions pd on pd.id = e.product_definition_id
    where us.id = acceptance_criteria.user_story_id
      and pd.organisation_id = (select public.user_organisation_id())
  ))
  with check (exists (
    select 1 from public.user_stories us
    join public.epics e on e.id = us.epic_id
    join public.product_definitions pd on pd.id = e.product_definition_id
    where us.id = acceptance_criteria.user_story_id
      and pd.organisation_id = (select public.user_organisation_id())
  ));
