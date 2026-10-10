CREATE TYPE "public"."audit_event_type" AS ENUM('STATUS_CHANGED', 'TOPIC_RENAMED', 'ASSUMPTION_CONFIRMED', 'ASSUMPTION_EDITED', 'ASSUMPTION_REJECTED', 'PARTICIPANT_JOINED', 'REVIEW_DECISION_RECORDED');--> statement-breakpoint
CREATE TABLE "audit_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_definition_id" uuid NOT NULL,
	"event_type" "audit_event_type" NOT NULL,
	"summary" text NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_product_definition_id_product_definitions_id_fk" FOREIGN KEY ("product_definition_id") REFERENCES "public"."product_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;