-- Organisation membership: permissions, invites, admin transfer, audit, support.
-- Hand-applied (Supabase SQL editor), per the standing rule: never db:push.
-- Safe to run twice. Run the whole file in one go.
--
-- What changes:
--   1. users gets is_admin / is_pm. The earliest user in each organisation
--      becomes its admin and PM.
--   2. users is locked down. Until now any member could UPDATE any row in their
--      organisation, which would let anyone tick their own is_admin. Members can
--      now read their organisation's users and change only their own
--      display_name. The permission columns can be written only by the functions
--      below (or the service role).
--   3. organisations can be updated by admins only (it was: any member).
--   4. organisation_invites, organisation_audit_events, support_requests.
--   5. SECURITY DEFINER functions that are the ONLY way an authenticated user
--      can change permissions or invites. Each one checks the caller is an admin
--      of the same organisation, keeps at least one admin, and writes an audit
--      event in the same transaction.
--
-- Deploy order: run this BEFORE deploying the code that uses it. The old code
-- keeps working against the new schema.

--> statement-breakpoint

alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists is_pm boolean not null default false;

--> statement-breakpoint

-- Backfill: earliest user per organisation, only where there is no admin yet.
update public.users u
set is_admin = true, is_pm = true
where u.id = (
    select u2.id from public.users u2
    where u2.organisation_id = u.organisation_id
    order by u2.created_at, u2.id
    limit 1
  )
  and not exists (
    select 1 from public.users a
    where a.organisation_id = u.organisation_id and a.is_admin
  );

--> statement-breakpoint

create or replace function public.user_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select is_admin from public.users where id = (select auth.uid())),
    false
  )
$$;

revoke execute on function public.user_is_admin() from public, anon;
grant execute on function public.user_is_admin() to authenticated;

--> statement-breakpoint

-- 2. Lock down users ----------------------------------------------------------

drop policy if exists tenant_isolation on public.users;
drop policy if exists users_select_same_organisation on public.users;
drop policy if exists users_update_self on public.users;

create policy users_select_same_organisation on public.users
  for select
  using (organisation_id = (select public.user_organisation_id()));

create policy users_update_self on public.users
  for update
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and organisation_id = (select public.user_organisation_id())
  );

-- Column privileges are the real guard on is_admin / is_pm / organisation_id:
-- a policy cannot restrict which columns an UPDATE touches.
revoke insert, update, delete on public.users from authenticated, anon;
grant update (display_name) on public.users to authenticated;

--> statement-breakpoint

-- 3. Organisations: admins only for UPDATE -------------------------------------

drop policy if exists tenant_isolation_update on public.organisations;
create policy tenant_isolation_update on public.organisations
  for update
  using (id = (select public.user_organisation_id()) and (select public.user_is_admin()))
  with check (id = (select public.user_organisation_id()) and (select public.user_is_admin()));

--> statement-breakpoint

-- 4. New tables ---------------------------------------------------------------

create table if not exists public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  is_pm boolean not null default false,
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.users(id) on delete set null,
  revoked_at timestamptz,
  constraint organisation_invites_email_lowercase check (email = lower(email))
);

create unique index if not exists uq_organisation_invites_pending
  on public.organisation_invites (organisation_id, email)
  where accepted_at is null and revoked_at is null;
create index if not exists idx_organisation_invites_email on public.organisation_invites (email);
create index if not exists idx_organisation_invites_invited_by on public.organisation_invites (invited_by);
create index if not exists idx_organisation_invites_accepted_by on public.organisation_invites (accepted_by);

alter table public.organisation_invites enable row level security;
drop policy if exists invites_select_admin on public.organisation_invites;
create policy invites_select_admin on public.organisation_invites
  for select
  using (
    organisation_id = (select public.user_organisation_id())
    and (select public.user_is_admin())
  );
-- No INSERT/UPDATE/DELETE policy: writes go through the functions below.
revoke insert, update, delete on public.organisation_invites from authenticated, anon;

--> statement-breakpoint

create table if not exists public.organisation_audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  target_user_id uuid references public.users(id) on delete set null,
  target_email text,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_organisation_audit_events_org_created
  on public.organisation_audit_events (organisation_id, created_at desc);
create index if not exists idx_organisation_audit_events_actor on public.organisation_audit_events (actor_user_id);
create index if not exists idx_organisation_audit_events_target on public.organisation_audit_events (target_user_id);

alter table public.organisation_audit_events enable row level security;
drop policy if exists audit_select_admin on public.organisation_audit_events;
create policy audit_select_admin on public.organisation_audit_events
  for select
  using (
    organisation_id = (select public.user_organisation_id())
    and (select public.user_is_admin())
  );
-- Append-only, and only by the functions below or the service role.
revoke insert, update, delete on public.organisation_audit_events from authenticated, anon;

--> statement-breakpoint

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_requests_organisation_id on public.support_requests (organisation_id);
create index if not exists idx_support_requests_user_id on public.support_requests (user_id);

alter table public.support_requests enable row level security;
drop policy if exists support_requests_insert_own on public.support_requests;
drop policy if exists support_requests_select_own on public.support_requests;
create policy support_requests_insert_own on public.support_requests
  for insert
  with check (
    user_id = (select auth.uid())
    and organisation_id = (select public.user_organisation_id())
  );
create policy support_requests_select_own on public.support_requests
  for select
  using (user_id = (select auth.uid()));
revoke update, delete on public.support_requests from authenticated, anon;

--> statement-breakpoint

-- 5. Functions ----------------------------------------------------------------
-- Error messages are short codes the app maps to plain copy:
--   NOT_ADMIN, NOT_MEMBER, LAST_ADMIN, ALREADY_MEMBER, BAD_EMAIL, SELF_TARGET,
--   NOT_FOUND.

-- Shared guard: returns the caller's organisation if they are an admin, and
-- locks that organisation's admin rows so concurrent permission changes queue
-- up instead of racing past the last-admin check.
create or replace function public.require_admin_organisation()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_is_admin boolean;
begin
  select organisation_id, is_admin into v_org, v_is_admin
  from public.users where id = v_uid;

  if v_org is null or not coalesce(v_is_admin, false) then
    raise exception 'NOT_ADMIN';
  end if;

  perform 1 from public.organisations where id = v_org for update;
  return v_org;
end;
$$;

revoke execute on function public.require_admin_organisation() from public, anon, authenticated;

--> statement-breakpoint

create or replace function public.set_member_pm(p_user_id uuid, p_is_pm boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.require_admin_organisation();
  v_email text;
begin
  update public.users set is_pm = p_is_pm
  where id = p_user_id and organisation_id = v_org
  returning email into v_email;

  if not found then raise exception 'NOT_MEMBER'; end if;

  insert into public.organisation_audit_events
    (organisation_id, actor_user_id, event_type, target_user_id, target_email, summary)
  values
    (v_org, (select auth.uid()), case when p_is_pm then 'PM_GRANTED' else 'PM_REMOVED' end,
     p_user_id, v_email,
     case when p_is_pm then 'Made a product manager' else 'Removed as a product manager' end);
end;
$$;

--> statement-breakpoint

create or replace function public.grant_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.require_admin_organisation();
  v_email text;
begin
  if p_user_id = (select auth.uid()) then raise exception 'SELF_TARGET'; end if;

  update public.users set is_admin = true
  where id = p_user_id and organisation_id = v_org
  returning email into v_email;

  if not found then raise exception 'NOT_MEMBER'; end if;

  insert into public.organisation_audit_events
    (organisation_id, actor_user_id, event_type, target_user_id, target_email, summary)
  values
    (v_org, (select auth.uid()), 'ADMIN_GRANTED', p_user_id, v_email, 'Made an admin');
end;
$$;

--> statement-breakpoint

create or replace function public.step_down_admin()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.require_admin_organisation();
  v_uid uuid := (select auth.uid());
  v_email text;
begin
  if not exists (
    select 1 from public.users
    where organisation_id = v_org and is_admin and id <> v_uid
  ) then
    raise exception 'LAST_ADMIN';
  end if;

  update public.users set is_admin = false where id = v_uid returning email into v_email;

  insert into public.organisation_audit_events
    (organisation_id, actor_user_id, event_type, target_user_id, target_email, summary)
  values
    (v_org, v_uid, 'ADMIN_STEPPED_DOWN', v_uid, v_email, 'Stepped down as admin');
end;
$$;

--> statement-breakpoint

-- Grant and removal in one statement, so the organisation is never without an
-- admin and never left with the transfer half done.
create or replace function public.transfer_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.require_admin_organisation();
  v_uid uuid := (select auth.uid());
  v_email text;
begin
  if p_user_id = v_uid then raise exception 'SELF_TARGET'; end if;

  select email into v_email from public.users
  where id = p_user_id and organisation_id = v_org;
  if not found then raise exception 'NOT_MEMBER'; end if;

  update public.users
  set is_admin = (id = p_user_id)
  where id in (p_user_id, v_uid) and organisation_id = v_org;

  insert into public.organisation_audit_events
    (organisation_id, actor_user_id, event_type, target_user_id, target_email, summary)
  values
    (v_org, v_uid, 'ADMIN_TRANSFERRED', p_user_id, v_email, 'Transferred admin rights');
end;
$$;

--> statement-breakpoint

-- Invites never carry admin rights: admin is granted only to someone already in
-- the organisation, so a hijacked session cannot invite an outside address
-- straight into control.
create or replace function public.invite_member(p_email text, p_is_pm boolean)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.require_admin_organisation();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'BAD_EMAIL';
  end if;

  if exists (
    select 1 from public.users
    where organisation_id = v_org and lower(email) = v_email
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  select id into v_id from public.organisation_invites
  where organisation_id = v_org and email = v_email
    and accepted_at is null and revoked_at is null;

  if found then
    update public.organisation_invites
    set is_pm = p_is_pm,
        invited_by = (select auth.uid()),
        expires_at = now() + interval '14 days'
    where id = v_id;
  else
    insert into public.organisation_invites (organisation_id, email, is_pm, invited_by)
    values (v_org, v_email, p_is_pm, (select auth.uid()))
    returning id into v_id;
  end if;

  insert into public.organisation_audit_events
    (organisation_id, actor_user_id, event_type, target_email, summary)
  values
    (v_org, (select auth.uid()), 'MEMBER_INVITED', v_email,
     case when p_is_pm then 'Invited as a product manager' else 'Invited as a member' end);

  return v_id;
end;
$$;

--> statement-breakpoint

create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.require_admin_organisation();
  v_email text;
begin
  update public.organisation_invites
  set revoked_at = now()
  where id = p_invite_id and organisation_id = v_org
    and accepted_at is null and revoked_at is null
  returning email into v_email;

  if not found then raise exception 'NOT_FOUND'; end if;

  insert into public.organisation_audit_events
    (organisation_id, actor_user_id, event_type, target_email, summary)
  values
    (v_org, (select auth.uid()), 'INVITE_REVOKED', v_email, 'Cancelled an invite');
end;
$$;

--> statement-breakpoint

revoke execute on function public.set_member_pm(uuid, boolean) from public, anon;
revoke execute on function public.grant_admin(uuid) from public, anon;
revoke execute on function public.step_down_admin() from public, anon;
revoke execute on function public.transfer_admin(uuid) from public, anon;
revoke execute on function public.invite_member(text, boolean) from public, anon;
revoke execute on function public.revoke_invite(uuid) from public, anon;

grant execute on function public.set_member_pm(uuid, boolean) to authenticated;
grant execute on function public.grant_admin(uuid) to authenticated;
grant execute on function public.step_down_admin() to authenticated;
grant execute on function public.transfer_admin(uuid) to authenticated;
grant execute on function public.invite_member(text, boolean) to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
