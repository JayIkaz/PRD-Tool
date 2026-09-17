# AI Product Discovery & Definition Tool — MVP

Scaffold only. The product spec lives in two files that should travel with
this repo wherever it's built:

- `build-prompt.md` — the original spec (45 sections, add this file yourself).
- `build-prompt-addendum-v2.md` — decisions that amend it: stack, tenancy,
  auth, notifications, orchestrator scope, versioning, NFRs. Included in
  this repo.

Read both before writing application code. The addendum overrides the
original wherever they conflict.

## What's here

- Next.js 16 (App Router, TypeScript, Tailwind) — `pnpm create next-app` output.
- Full Drizzle schema under `src/db/schema/` covering every entity in
  Section 32 plus the addendum's additions (Organisation,
  ProductDefinitionParticipant, Notification, NotificationChannel).
  Migrated against a real Supabase project — see `drizzle/0000` (initial
  schema) through `drizzle/0005` and `claude/rls-migration-notes.md` for
  the RLS work applied on top of it.
- `src/lib/supabase/` — browser + server clients, plus `src/proxy.ts`
  (session refresh + route protection for `/dashboard`). Auth is wired up
  end to end: `/signup` and `/login` (password + magic link),
  `/auth/callback` (PKCE code exchange for both flows),
  `src/lib/auth/provision.ts` (first-login Organisation + user
  provisioning — deliberately service-role, see that file's comment and
  addendum #3), and `/dashboard` as the first protected route.
- `src/db/rls.ts` — `withRlsContext(userId, fn)`, which runs a query
  inside a transaction impersonating the given user (`SET LOCAL ROLE
  authenticated` + `request.jwt.claims`). This is what makes the RLS
  policies in `drizzle/0001-0005` the actual tenant boundary for app
  queries per addendum Section 36A ("the RLS policy is the actual
  boundary, application checks are defence in depth") — the plain `db`
  export from `src/db/client.ts` connects as a privileged role and
  bypasses RLS entirely, so it must stay reserved for deliberately
  service-level operations (signup provisioning, the seed script), never
  per-request tenant queries. `/dashboard` is the first real example of
  the RLS-scoped path in use.
- `src/lib/ai/client.ts` — Anthropic client with a `generateStructured()`
  helper for the completeness engine's deterministic JSON needs.
- `src/lib/storage/adapter.ts` — `StorageAdapter` interface per addendum
  #10. Both implementations (Supabase Storage, local filesystem) are
  unwritten — `getStorageAdapter()` currently throws.
- `src/lib/notifications/dispatcher.ts` — writes the in-app `Notification`
  row and loops over enabled channels. All three channel adapters (email,
  Slack, Teams) are unwritten stubs.
- `src/db/seed.ts` — seeds product types and pathway config (the two MVP
  product types, General and Automation, plus the ten dormant ones from
  Section 11). Does **not** seed the Section 41 worked example yet — that
  needs a real organisation + user, which needs Auth wired up first.

Nothing here calls a real Supabase project or Anthropic account. `pnpm build`
passes; there's no `.env.local` yet.

## Before writing any application code

1. Create the Supabase project. Copy the four DB/API values into
   `.env.local` (copy `.env.example` first) — **done**, plus
   `NEXT_PUBLIC_SITE_URL`, added for the auth email-redirect URLs.
2. `pnpm db:generate` then `pnpm db:push` to create the schema in Supabase
   — **done** (`drizzle/0000`).
3. Enable Row Level Security on every tenant-scoped table and write the
   policies scoped to `organisation_id` — **done** (`drizzle/0001-0005`,
   see `claude/rls-migration-notes.md`). Enforced for app queries via
   `src/db/rls.ts`, not just declared in SQL — see above.
4. Add an Anthropic API key to `.env.local` — **done**.
5. `pnpm db:seed` — seeds product types and pathway configs. Still needs
   running against this project if it hasn't been yet.
6. In the Supabase dashboard, Auth → URL Configuration → Redirect URLs,
   add `<NEXT_PUBLIC_SITE_URL>/auth/callback` (e.g.
   `http://localhost:3000/auth/callback` for local dev) — magic links and
   signup confirmation emails will fail without this.

## Build order (Section 44, as amended)

Build and verify each stage end-to-end before starting the next — don't
build all three stages half-functional in parallel.

**Stage 1**
```
Auth (Supabase, email/password + magic link) — done: /signup, /login,
  /auth/callback, src/proxy.ts, first-login provisioning
→ Create Product Definition (free-text idea input, Section 8) — done:
  /product-definitions/new, org-scoped list on /dashboard
→ Discovery conversation loop (always-on pathways only: Discovery,
  Problem/Value, User/Customer, Requirements/Behaviour — addendum #6) — next
→ Structured state (persist Requirement + RequirementDimension rows as
  the conversation progresses, not just messages)
→ Assumptions, Open Questions, Evidence (first-class objects, Section
  15/16 — evidence upload can stay stubbed against StorageAdapter until
  a real adapter is written)
→ AI inference confirmation (end-of-session batch, Section 17 — confirm/
  edit/reject, nothing silently promoted)
```

At the end of Stage 1 you should be able to: log in, describe an idea,
have a real adaptive conversation limited to General or Automation, see
requirements accumulate with dimension-level completeness, and confirm
or reject AI inferences. That's the whole stakeholder journey (Section 30).

**Stage 2**
```
PM review workspace (Section 20)
→ AI Challenge mode (Section 21/22)
→ Requirement refinement
→ Notifications (hand-off, question-sent-to-stakeholder, review-requested
  — in-app first, then whichever of email/Slack/Teams you want live)
```

**Stage 3**
```
PRD generation (Section 23 — from structured state, never the transcript)
→ Delivery Definition: Epics → Stories → Acceptance Criteria (Section 24/25)
→ Baseline for Development (Section 27 — major.minor versioning per
  addendum #9)
→ Post-baseline change impact (Section 28)
```

Dashboard (Section 18) and the traceability panel (Section 26) aren't a
separate stage — build them alongside Stage 1 and Stage 3 respectively,
since they've got nothing to show until those stages produce data. Test
them against the acceptance criteria in addendum #12 specifically, since
the original Section 42 doesn't cover either.

## Known environment quirks (carried over from the Aukizan build)

- Windows: `pnpm --filter` fails on a Unix-only preinstall guard script —
  invoke binaries directly via `node_modules\.bin\drizzle-kit` etc.
- Git commits on Windows: use `Out-File -Encoding utf8` + `git commit -F`
  to avoid PowerShell smart-quote corruption.
- First `pnpm add` in a fresh clone may warn `ERR_PNPM_IGNORED_BUILDS` for
  `esbuild` — run `pnpm approve-builds` once, it's cosmetic.
