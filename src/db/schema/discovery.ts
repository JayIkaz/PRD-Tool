import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { users } from "./tenancy";
import { discoverySessionStatusEnum, messageRoleEnum, answerSourceEnum } from "./enums";

/**
 * A discovery session can be paused and resumed (Section 14).
 * resumeRecapGeneratedAt / lastActivityAt drive the deterministic
 * resume recap described in build-prompt-addendum-v2.md, Section 7 —
 * the recap is template-generated from structured state, not another
 * AI call, and only fires when a session resumes after an idle gap.
 */
export const discoverySessions = pgTable("discovery_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  stakeholderId: uuid("stakeholder_id")
    .notNull()
    .references(() => users.id),
  status: discoverySessionStatusEnum("status").notNull().default("ACTIVE"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * The conversation transcript. On resume, replay only the current
 * session's messages plus the structured recap — not full history
 * since the Product Definition was created (addendum #7). Earlier
 * sessions stay queryable for the stakeholder/PM to scroll back
 * through; they're just not resent to the model by default.
 */
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  discoverySessionId: uuid("discovery_session_id")
    .notNull()
    .references(() => discoverySessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  isResumeRecap: text("is_resume_recap").default("false"), // template-generated recap message, not AI-authored
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Reusable question library entries (Section 10). Associated with a
 * pathway (via pathwayConfigs.key) and a Product Definition area.
 * The AI chooses wording, sequence and whether to use a library
 * question verbatim or generate one — the framework determines WHAT,
 * the AI determines HOW and WHEN (Section 10).
 */
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pathwayKey: text("pathway_key").notNull(),
  area: text("area").notNull(), // e.g. "users", "requirements", "constraints"
  promptText: text("prompt_text").notNull(),
  inputType: text("input_type").notNull(), // free_text | single_choice | multi_select | yes_no | date | number
  options: jsonb("options"), // for choice-based input types
});

export const answers = pgTable("answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  discoverySessionId: uuid("discovery_session_id")
    .notNull()
    .references(() => discoverySessions.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").references(() => questions.id), // null when the question was AI-generated, not from the library
  messageId: uuid("message_id").references(() => messages.id),
  value: jsonb("value").notNull(),
  source: answerSourceEnum("source").notNull().default("STAKEHOLDER_STATEMENT"),
  supersededByAnswerId: uuid("superseded_by_answer_id"), // set when a later answer invalidates this one (Section 14)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
