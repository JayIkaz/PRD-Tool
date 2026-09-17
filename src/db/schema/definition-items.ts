import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { requirements } from "./requirements";
import { users } from "./tenancy";
import { inferenceStatusEnum, evidenceTypeEnum } from "./enums";

/**
 * Assumptions are first-class objects (Section 16). An AI-generated
 * assumption is never silently promoted into the approved Product
 * Definition — it stays PENDING until a stakeholder or PM confirms,
 * edits or rejects it (see inferenceStatusEnum).
 */
export const assumptions = pgTable("assumptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  displayCode: text("display_code").notNull(), // e.g. "ASSUMPTION-001"
  statement: text("statement").notNull(),
  generatedByAi: boolean("generated_by_ai").notNull().default(false),
  reasoning: text("reasoning"), // required when generatedByAi — why it was inferred, what led to it
  status: inferenceStatusEnum("status").notNull().default("PENDING"),
  confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisions = pgTable("decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  statement: text("statement").notNull(),
  rationale: text("rationale"),
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * "I don't know yet" is a first-class response (Section 13) — it
 * records an Open Question rather than inventing an answer, and does
 * not block discovery from continuing unless the missing information
 * genuinely blocks it.
 */
export const openQuestions = pgTable("open_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  whyItMatters: text("why_it_matters"), // the AI's explanation for the stakeholder
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionAnswerText: text("resolution_answer_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Supporting material, distinct from a stakeholder statement or an
 * AI inference (Section 15/34). storageProvider + storagePath are
 * resolved through the StorageAdapter interface (addendum #10) —
 * nothing else in the app should know which backend is active.
 */
export const evidence = pgTable("evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  type: evidenceTypeEnum("type").notNull(),
  storagePath: text("storage_path"), // null when type = URL or FREE_TEXT_NOTE
  url: text("url"),
  note: text("note"),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const risks = pgTable("risks", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  statement: text("statement").notNull(),
  category: text("category"), // delivery | customer | data | operational | compliance (Section 21)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dependencies = pgTable("dependencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  statement: text("statement").notNull(), // external system, team, data or process
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * AI inference stage (Section 17): occurs primarily at the end of a
 * discovery session, not continuously. Only CONFIRMED inferences can
 * become part of the formal Product Definition — this table is the
 * staging area, distinct from assumptions/requirements themselves.
 */
export const aiInferences = pgTable("ai_inferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  discoverySessionId: uuid("discovery_session_id"), // the session this inference batch was generated at the end of
  targetArea: text("target_area").notNull(), // which Product Definition area this would populate
  statement: text("statement").notNull(),
  reasoning: text("reasoning").notNull(), // what information led to the inference — never optional (Section 16)
  status: inferenceStatusEnum("status").notNull().default("PENDING"),
  resultingAssumptionId: uuid("resulting_assumption_id").references(() => assumptions.id),
  resultingRequirementId: uuid("resulting_requirement_id").references(() => requirements.id),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
