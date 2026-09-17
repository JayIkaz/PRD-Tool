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
  ProductDefinitionParticipant, Notification, NotificationChannel). This
  compiles and type-checks; it has not been migrated against a real
  database yet.
- `src/lib/supabase/` — browser + server clients, Auth not yet wired into
  any route.
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
   `.env.local` (copy `.env.example` first).
2. `pnpm db:generate` then `pnpm db:push` to create the schema in Supabase.
3. Enable Row Level Security on every tenant-scoped table and write the
   policies scoped to `organisation_id` — the schema defines the column,
   it does not define the policy. This is the actual tenant boundary per
   addendum Section 11 (NFRs); application-level checks are defence in
   depth, not the boundary itself.
4. Add an Anthropic API key to `.env.local`.
5. `pnpm db:seed`.

## Build order (Section 44, as amended)

Build and verify each stage end-to-end before starting the next — don't
build all three stages half-functional in parallel.

**Stage 1**
```
Auth (Supabase, email/password + magic link)
→ Create Product Definition (free-text idea input, Section 8)
→ Discovery conversation loop (always-on pathways only: Discovery,
  Problem/Value, User/Customer, Requirements/Behaviour — addendum #6)
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
