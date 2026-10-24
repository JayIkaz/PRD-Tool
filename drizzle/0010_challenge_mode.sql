-- ============================================================
-- 0010_challenge_mode.sql
-- ============================================================
-- AI Challenge mode (Section 21/22). Hand-applied -- do NOT run
-- db:push, see claude/rls-migration-notes.md.

ALTER TYPE "public"."audit_event_type" ADD VALUE IF NOT EXISTS 'AI_CHALLENGE_RUN';

CREATE TYPE "public"."challenge_finding_category" AS ENUM (
  'GAP',
  'CONTRADICTION',
  'AMBIGUITY',
  'WEAK_OUTCOME',
  'WEAK_ACCEPTANCE_CONDITIONS',
  'UNCONFIRMED_ASSUMPTION',
  'DEPENDENCY',
  'RISK',
  'SCOPE_PROBLEM',
  'QUESTION',
  'SUGGESTION'
);

CREATE TYPE "public"."challenge_finding_status" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TABLE "challenge_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_definition_id" uuid NOT NULL,
  "triggered_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "challenge_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_review_id" uuid NOT NULL,
  "category" "public"."challenge_finding_category" NOT NULL,
  "statement" text NOT NULL,
  "related_to" text,
  "status" "public"."challenge_finding_status" DEFAULT 'PENDING' NOT NULL,
  "pm_note" text,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "challenge_reviews" ADD CONSTRAINT "challenge_reviews_product_definition_id_product_definitions_id_fk"
  FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "challenge_reviews" ADD CONSTRAINT "challenge_reviews_triggered_by_user_id_users_id_fk"
  FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "challenge_findings" ADD CONSTRAINT "challenge_findings_challenge_review_id_challenge_reviews_id_fk"
  FOREIGN KEY ("challenge_review_id") REFERENCES "public"."challenge_reviews"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "challenge_findings" ADD CONSTRAINT "challenge_findings_reviewed_by_user_id_users_id_fk"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX IF NOT EXISTS idx_challenge_reviews_product_definition_id
  ON public.challenge_reviews (product_definition_id);
CREATE INDEX IF NOT EXISTS idx_challenge_reviews_triggered_by_user_id
  ON public.challenge_reviews (triggered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_findings_challenge_review_id
  ON public.challenge_findings (challenge_review_id);
CREATE INDEX IF NOT EXISTS idx_challenge_findings_reviewed_by_user_id
  ON public.challenge_findings (reviewed_by_user_id);
