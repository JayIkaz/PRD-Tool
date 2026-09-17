CREATE TYPE "public"."answer_source" AS ENUM('STAKEHOLDER_STATEMENT', 'EVIDENCE', 'AI_INFERENCE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."change_impact_status" AS ENUM('PENDING_PM_REVIEW', 'ACCEPTED_INTO_BASELINE', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."completeness_state" AS ENUM('MISSING', 'PARTIAL', 'DEFINED', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."discovery_session_status" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('PDF', 'WORD_DOC', 'SPREADSHEET', 'IMAGE', 'URL', 'FREE_TEXT_NOTE');--> statement-breakpoint
CREATE TYPE "public"."inference_status" AS ENUM('PENDING', 'CONFIRMED', 'EDITED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('AI', 'STAKEHOLDER', 'PM');--> statement-breakpoint
CREATE TYPE "public"."notification_channel_type" AS ENUM('EMAIL', 'SLACK', 'TEAMS');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('HAND_OFF', 'QUESTION_SENT_TO_STAKEHOLDER', 'PM_REVIEW_REQUESTED', 'INFERENCE_READY_FOR_REVIEW', 'BASELINE_CREATED', 'POST_BASELINE_CHANGE_FLAGGED');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('STAKEHOLDER', 'PM', 'COLLABORATOR', 'OBSERVER');--> statement-breakpoint
CREATE TYPE "public"."participant_status" AS ENUM('ACTIVE', 'FORMER');--> statement-breakpoint
CREATE TYPE "public"."pathway_category" AS ENUM('ALWAYS_ON', 'PRODUCT_TYPE');--> statement-breakpoint
CREATE TYPE "public"."product_definition_status" AS ENUM('DISCOVERY', 'AWAITING_PM_REVIEW', 'PM_REVIEW', 'APPROVED', 'BASELINED');--> statement-breakpoint
CREATE TYPE "public"."requirement_dimension_type" AS ENUM('USER', 'NEED', 'CONTEXT', 'BEHAVIOUR', 'OUTCOME', 'CONSTRAINTS', 'ACCEPTANCE_CONDITIONS');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('SUPABASE', 'LOCAL_FILESYSTEM');--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"storage_provider" text DEFAULT 'SUPABASE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathway_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"category" "pathway_category" NOT NULL,
	"product_type_id" uuid,
	"active" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	CONSTRAINT "pathway_configs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "product_definition_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "participant_role" NOT NULL,
	"status" "participant_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"product_type_id" uuid,
	"title" text NOT NULL,
	"idea" text NOT NULL,
	"status" "product_definition_status" DEFAULT 'DISCOVERY' NOT NULL,
	"problem" text,
	"users" text,
	"needs" text,
	"context" text,
	"outcomes" text,
	"problem_status" "completeness_state" DEFAULT 'MISSING' NOT NULL,
	"users_status" "completeness_state" DEFAULT 'MISSING' NOT NULL,
	"outcomes_status" "completeness_state" DEFAULT 'MISSING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"category" "pathway_category" DEFAULT 'PRODUCT_TYPE' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discovery_session_id" uuid NOT NULL,
	"question_id" uuid,
	"message_id" uuid,
	"value" jsonb NOT NULL,
	"source" "answer_source" DEFAULT 'STAKEHOLDER_STATEMENT' NOT NULL,
	"superseded_by_answer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"stakeholder_id" uuid NOT NULL,
	"status" "discovery_session_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discovery_session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"is_resume_recap" text DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pathway_key" text NOT NULL,
	"area" text NOT NULL,
	"prompt_text" text NOT NULL,
	"input_type" text NOT NULL,
	"options" jsonb
);
--> statement-breakpoint
CREATE TABLE "requirement_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"dimension_type" "requirement_dimension_type" NOT NULL,
	"state" "completeness_state" DEFAULT 'MISSING' NOT NULL,
	"content" text,
	"confirmed_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"display_code" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" uuid,
	"title" text NOT NULL,
	"change_reason" text,
	"changed_by_user_id" uuid,
	"is_part_of_baseline" boolean DEFAULT false NOT NULL,
	"overall_status" "completeness_state" DEFAULT 'MISSING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_inferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"discovery_session_id" uuid,
	"target_area" text NOT NULL,
	"statement" text NOT NULL,
	"reasoning" text NOT NULL,
	"status" "inference_status" DEFAULT 'PENDING' NOT NULL,
	"resulting_assumption_id" uuid,
	"resulting_requirement_id" uuid,
	"reviewed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"display_code" text NOT NULL,
	"statement" text NOT NULL,
	"generated_by_ai" boolean DEFAULT false NOT NULL,
	"reasoning" text,
	"status" "inference_status" DEFAULT 'PENDING' NOT NULL,
	"confirmed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"rationale" text,
	"decided_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"type" "evidence_type" NOT NULL,
	"storage_path" text,
	"url" text,
	"note" text,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"question" text NOT NULL,
	"why_it_matters" text,
	"resolved_at" timestamp with time zone,
	"resolution_answer_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acceptance_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_story_id" uuid NOT NULL,
	"display_code" text NOT NULL,
	"kind" text NOT NULL,
	"given_text" text,
	"when_text" text,
	"then_text" text,
	"freeform_text" text
);
--> statement-breakpoint
CREATE TABLE "definition_of_done" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"item_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"display_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"epic_id" uuid NOT NULL,
	"requirement_id" uuid,
	"display_code" text NOT NULL,
	"as_a" text NOT NULL,
	"i_want" text NOT NULL,
	"so_that" text NOT NULL,
	"is_flagged_insufficient_info" text DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baseline_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baseline_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_version" integer
);
--> statement-breakpoint
CREATE TABLE "baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"major_version" integer DEFAULT 1 NOT NULL,
	"minor_version" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"baseline_id" uuid NOT NULL,
	"description" text NOT NULL,
	"affected_prd_sections" text,
	"affected_epic_ids" text,
	"affected_user_story_ids" text,
	"affected_acceptance_criteria_ids" text,
	"status" "change_impact_status" DEFAULT 'PENDING_PM_REVIEW' NOT NULL,
	"changed_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"channel_type" "notification_channel_type" NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathway_configs" ADD CONSTRAINT "pathway_configs_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_definition_participants" ADD CONSTRAINT "product_definition_participants_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_definition_participants" ADD CONSTRAINT "product_definition_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_definitions" ADD CONSTRAINT "product_definitions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_definitions" ADD CONSTRAINT "product_definitions_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_discovery_session_id_discovery_sessions_id_fk" FOREIGN KEY ("discovery_session_id") REFERENCES "public"."discovery_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_stakeholder_id_users_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_discovery_session_id_discovery_sessions_id_fk" FOREIGN KEY ("discovery_session_id") REFERENCES "public"."discovery_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_dimensions" ADD CONSTRAINT "requirement_dimensions_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_dimensions" ADD CONSTRAINT "requirement_dimensions_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_inferences" ADD CONSTRAINT "ai_inferences_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_inferences" ADD CONSTRAINT "ai_inferences_resulting_assumption_id_assumptions_id_fk" FOREIGN KEY ("resulting_assumption_id") REFERENCES "public"."assumptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_inferences" ADD CONSTRAINT "ai_inferences_resulting_requirement_id_requirements_id_fk" FOREIGN KEY ("resulting_requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_inferences" ADD CONSTRAINT "ai_inferences_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_user_story_id_user_stories_id_fk" FOREIGN KEY ("user_story_id") REFERENCES "public"."user_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "definition_of_done" ADD CONSTRAINT "definition_of_done_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epics" ADD CONSTRAINT "epics_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prds" ADD CONSTRAINT "prds_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_epic_id_epics_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."epics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_items" ADD CONSTRAINT "baseline_items_baseline_id_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."baselines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_baseline_id_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."baselines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;