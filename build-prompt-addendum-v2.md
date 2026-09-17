# AI Product Discovery & Definition Tool — MVP: build prompt addendum v2

This amends the original build prompt. Read the two together. Each section below names which original section it amends or where it inserts.

---

## 1. Technology stack (amends Section 36)

Same pattern as the Aukizan build: free at MVP scale, no infrastructure to self-manage, easy to move off later if usage grows past the free tiers.

- **Frontend/API**: Next.js (App Router, TypeScript), deployed on Vercel's free tier.
- **Database**: Postgres via Supabase free tier. Supabase also gives you row-level security, which is the natural mechanism for multi-tenant isolation (see Section 3 below) rather than building tenant checks into every query by hand.
- **ORM**: Drizzle — matches the existing Aukizan setup, so there's no new tooling to learn.
- **Auth**: Supabase Auth (see Section 4).
- **File storage**: Supabase Storage by default, behind an adapter interface (see Section 10).
- **AI**: Claude via the Anthropic API (see Section 2).
- **Package manager**: pnpm, matching the existing Windows workaround already on file for this environment (invoke binaries directly via `node_modules\.bin\` rather than `pnpm --filter`).

This is a genuine recommendation, not a formality — if there's a reason to diverge from the Aukizan stack for this project specifically, say so and I'll adjust.

---

## 2. AI model (touches Sections 9, 37, 38)

Claude via the Anthropic Messages API. Use structured JSON output mode for anything the completeness engine needs to parse deterministically — requirement dimension extraction, inference generation, PM challenge output — rather than parsing free text. Reserve unstructured generation for the PRD and story prose, where format flexibility is the point.

---

## 3. Tenancy, roles and hand-off (amends Section 32 — data model)

Multi-tenant SaaS. Default UI experience stays one stakeholder, one PM per Product Definition — that's still the common case and the UI shouldn't get more complicated than it needs to. But the data model should not hard-code that as a constraint, because hand-off and multi-party visibility are named requirements, not hypothetical future ones.

**My view**: don't put `stakeholder_id` and `pm_id` as fixed foreign keys on `ProductDefinition`. Use a join entity instead:

```
Organisation
   id, name, plan

ProductDefinitionParticipant
   id, product_definition_id, user_id, role, status, joined_at, left_at
   role: STAKEHOLDER | PM | COLLABORATOR | OBSERVER
   status: ACTIVE | FORMER
```

Hand-off becomes: add a new participant row, set the outgoing one to `FORMER`. History is preserved — you can always answer "who told us this" even after someone leaves the project, which matters for the traceability principle the whole document is built around. The UI queries "current active stakeholder" and "current active PM" as a filtered view over this table; it doesn't need to expose the join structure to either user.

Add `Organisation` as the tenancy boundary and scope Supabase row-level security policies to it.

---

## 4. Authentication (amends Section 36, Section 44 build order)

Supabase Auth, email/password and magic link. Both are native to Supabase Auth — no custom implementation needed, which keeps this off the critical path in the first build stage.

---

## 5. Notifications (new section — insert after Section 20, "PM Review workspace")

### Section 20A. Notifications

Every hand-off, question sent back to a stakeholder, or PM review request should generate a `Notification` record, fanned out to whichever channels the organisation has configured.

```
Notification
   id, organisation_id, user_id, type, payload, created_at, read_at

NotificationChannel
   id, organisation_id, channel_type, config, enabled
   channel_type: EMAIL | SLACK | TEAMS
```

- **In-app**: always on, no configuration needed. This is the fallback that guarantees nothing gets silently missed.
- **Email**: use a transactional email provider with a workable free tier (Resend's free tier is generous enough for MVP volumes) rather than building SMTP handling yourself.
- **Slack and Teams**: use incoming webhook URLs, pasted in by the organisation admin during setup, rather than building and shipping Slack/Teams apps through their respective app review processes. This is zero-cost, requires no OAuth flow, and gets you working notifications in both tools without the review overhead — the trade-off is it's one-way (you can post into a channel, you can't read replies), which is fine for MVP since nothing in the spec requires two-way Slack interaction.

A single `NotificationDispatcher` writes the `Notification` row, then loops over enabled channels for that organisation and calls the matching adapter. Keep each adapter to a single responsibility (format the message, call the webhook or provider API) so adding a fourth channel later doesn't touch the dispatcher.

---

## 6. Orchestrator pathway scope for MVP (amends Sections 9 and 11)

The original list of thirteen specialist pathways is the right long-term shape but too much to build and prompt-engineer for a first release. Splitting it two ways:

**Always-on discovery capabilities** (needed regardless of product type, build all of these):
- Discovery (core questioning loop)
- Problem/value
- User/customer
- Requirements/behaviour (the seven-dimension contract itself)

**Product-type pathways for MVP** — build exactly two, per your steer:
- General product/feature
- Automation

**Defined but not activated** — keep these as named entries in the pathway configuration schema, with no question library content behind them yet: CRM, Data/reporting, UX, Technical, Integration, Security, Compliance, Risk, QA, Delivery. This is what makes Section 11's "extensible without rewriting the core engine" claim actually true — a new pathway is a config addition, not a re-architecture — without spending MVP time writing question libraries you don't need yet.

The orchestrator's pathway-selection logic should be written generically against this config from day one, even though only two pathways have content. That's cheaper than writing it against exactly two and refactoring later.

---

## 7. Conversation memory strategy (rewrites Section 35)

Your decision: rely on conversation history rather than reconstructed structured state as the primary context for the orchestrator's next-question logic.

Worth being direct about the trade-off this makes, since the original spec (Section 35) explicitly argued for the opposite and gave three reasons: repeated questions, forgotten answers, context-window dependency. Those risks don't disappear — you're accepting them in exchange for simplicity.

Where this bites hardest is Section 14's requirement that a stakeholder can leave and resume a session later, possibly much later. A pure conversation-history approach means every resume re-sends the full transcript, which gets expensive and slower as a Product Definition matures, and gives the model more opportunity to lose track of an answer buried on page one.

**Recommendation**: keep conversation history as the primary mechanism within a live session, as decided. But at session resume specifically, prepend a short structured recap — not the full Product Definition JSON the original spec proposed, just a compact summary ("established: problem, users, 4 requirements; open: 2 questions") — as the first system message before the transcript resumes. This is a small addition, not a reversal of your decision, and it directly targets the one place the pure-transcript approach is weakest.

If you'd rather take the risk as-is and skip the resume recap too, say so and I'll drop it — but I'd rather you make that call knowingly than have it turn up as a bug report three months in.

---

## 8. Completeness states (amends Sections 18 and 19)

Add 🔴 for Missing alongside the existing 🟢 Defined and 🟡 Partial. Section 19 already defines four states (Missing, Partial, Defined, Confirmed) — the dashboard in Section 18 should show all four consistently rather than only two of them. Suggested mapping:

- 🔴 Missing
- 🟡 Partial
- 🟢 Defined
- ✅ Confirmed (reserve a distinct mark from Defined — "defined" means the AI or PM has written something, "confirmed" means the stakeholder or PM has explicitly signed off on it, and conflating the two undermines the whole point of Section 16's confirm/edit/reject mechanic for assumptions)

---

## 9. Requirement and baseline versioning (amends Section 33)

Proposal: keep these as two deliberately different schemes, not one unified format, because they version different things.

- **Requirements**: integer versions — `REQ-001 v1`, `REQ-001 v2`. A requirement version increments on every substantive edit. This is a granular, frequent-change object.
- **Baselines**: major.minor — `Baseline v1.0`, `v1.1`. Major increments only on an explicit "Baseline for Development" action (Section 27). Minor increments on an approved bundle of post-baseline changes (Section 28) that don't warrant a full re-baseline.

The point isn't uniformity, it's that each scheme should mean something specific and be documented as such — the failure mode to avoid is the two schemes looking similar by accident and someone assuming `REQ-001 v2` and `Baseline v1.0` follow the same rule when they don't.

---

## 10. Evidence storage (amends Section 15, Section 36)

Storage provider is a per-deployment setting, not a hard-coded choice: the org admin picks Supabase Storage (default, works out of the box on the recommended stack) or a local filesystem path, at setup time. Build this behind a single `StorageAdapter` interface (`upload`, `getUrl`, `delete`) so the rest of the app never knows which backend is active. This is a few hours of extra abstraction now against a much worse afternoon later if someone needs to self-host without Supabase.

---

## 11. Non-functional requirements for the tool itself (new section — insert after Section 36)

### Section 36A. Non-functional requirements

The original spec asks every generated requirement to carry non-functional acceptance criteria but never states any for the tool itself. Baseline for MVP:

- **Performance**: discovery conversation responses (question generation) return within 3 seconds under normal load. PRD and delivery artefact generation, which involve larger context and more model output, may run up to 30 seconds — show a generation state rather than a blocking spinner.
- **Availability**: no formal SLA for MVP. It's an internal tool proving a workflow, not a production service with paying customers yet.
- **Concurrency**: MVP scale is single-digit organisations, low tens of concurrent users. Don't design for more than that — it would be over-engineering against Section 40's own non-goals.
- **Security baseline**: all data encrypted in transit (TLS) and at rest (Supabase default). Tenant isolation enforced at the database layer via row-level security, not only in application code — the RLS policy is the actual boundary, application checks are defence in depth.
- **Browser support**: current versions of Chrome, Edge, Safari. No requirement to support Internet Explorer or legacy browsers.
- **Accessibility**: aim for WCAG 2.1 AA on core discovery and review flows where practical. Not a blocking MVP gate, but don't actively build against it either — retrofitting accessibility is far more expensive than building with it in mind from the start.
- **Backup**: rely on Supabase's automatic Postgres backups for MVP. No custom backup tooling.

---

## 12. MVP acceptance criteria additions (amends Section 42)

Section 42 tests discovery, structured definition, inference, PM review, PRD and delivery, but never tests the two UI elements the spec spends whole sections describing. Add:

### Dashboard
- The Product Definition dashboard shows a status (🔴/🟡/🟢/✅) for every tracked area, not a single aggregate score.
- Dashboard counts (Requirements, Assumptions, Decisions, Open Questions, Evidence, Risks) match the actual stored entity counts.
- Dashboard updates immediately when the underlying Product Definition changes — no stale counts after an edit.

### Traceability panel
- Selecting a requirement shows its full downstream chain (PRD section → Epic → Story → Acceptance Criteria) where those artefacts exist.
- A requirement with no downstream artefacts yet (pre-PRD-generation) shows that plainly rather than an empty or broken panel.
- Selecting a Story or Acceptance Criterion shows its originating requirement, not just the reverse direction.
