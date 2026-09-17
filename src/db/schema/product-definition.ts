import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { organisations, users } from "./tenancy";
import {
  participantRoleEnum,
  participantStatusEnum,
  productDefinitionStatusEnum,
  pathwayCategoryEnum,
  completenessStateEnum,
} from "./enums";

/**
 * The MVP product-type catalogue (Section 11 / addendum #6).
 * Seed exactly two active rows for MVP: General, Automation.
 * The remaining Section 11 types (CRM, Data/reporting, UX, Technical,
 * Integration, Security, Compliance, Risk, QA, Delivery) exist as rows
 * with active = false and no question library content — this is what
 * keeps a new pathway a config addition rather than a re-architecture.
 */
export const productTypes = pgTable("product_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // e.g. "GENERAL", "AUTOMATION", "CRM"
  label: text("label").notNull(),
  category: pathwayCategoryEnum("category").notNull().default("PRODUCT_TYPE"),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productDefinitions = pgTable("product_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  productTypeId: uuid("product_type_id").references(() => productTypes.id),
  title: text("title").notNull(),
  idea: text("idea").notNull(), // the original free-text idea (Section 8)
  status: productDefinitionStatusEnum("status").notNull().default("DISCOVERY"),

  // Section 6 fields not modelled as their own entities
  problem: text("problem"),
  users: text("users"),
  needs: text("needs"),
  context: text("context"),
  outcomes: text("outcomes"),

  // Section 18 dashboard states — 🔴 Missing / 🟡 Partial / 🟢 Defined / ✅ Confirmed
  problemStatus: completenessStateEnum("problem_status").notNull().default("MISSING"),
  usersStatus: completenessStateEnum("users_status").notNull().default("MISSING"),
  outcomesStatus: completenessStateEnum("outcomes_status").notNull().default("MISSING"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Join entity for hand-off and multi-party visibility (addendum #3).
 * Do NOT put stakeholder_id / pm_id as fixed FKs on ProductDefinition —
 * query "current active stakeholder" / "current active PM" as a
 * filtered view over this table instead (role + status = ACTIVE).
 *
 * Hand-off = insert a new row, set the outgoing participant's status
 * to FORMER. Never delete a participant row — history answers
 * "who told us this" even after someone leaves.
 */
export const productDefinitionParticipants = pgTable("product_definition_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: participantRoleEnum("role").notNull(),
  status: participantStatusEnum("status").notNull().default("ACTIVE"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp("left_at", { withTimezone: true }),
});

/**
 * Orchestrator pathway configuration (Section 9 / addendum #6).
 * always_on rows (Discovery, Problem/Value, User/Customer,
 * Requirements/Behaviour) apply regardless of product type.
 * product_type rows are looked up by productTypeId and gate which
 * question library content the orchestrator can draw on.
 * Written generically from day one even though only two product-type
 * pathways have content behind them for MVP.
 */
export const pathwayConfigs = pgTable("pathway_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // e.g. "DISCOVERY", "PROBLEM_VALUE", "GENERAL", "CRM"
  label: text("label").notNull(),
  category: pathwayCategoryEnum("category").notNull(),
  productTypeId: uuid("product_type_id").references(() => productTypes.id), // null for always-on pathways
  active: boolean("active").notNull().default(false),
  config: jsonb("config"), // reserved for pathway-specific settings as they're built out
});
