import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { users } from "./tenancy";
import { completenessStateEnum, requirementDimensionTypeEnum } from "./enums";

/**
 * Requirement versioning (addendum #9): integer versions, incrementing
 * on every substantive edit. This is deliberately a different scheme
 * from Baseline versioning (major.minor) — see baseline.ts. Each row
 * here is one version; displayCode + version together give "REQ-001 v2".
 */
export const requirements = pgTable("requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  displayCode: text("display_code").notNull(), // e.g. "REQ-001" — stable across versions
  version: integer("version").notNull().default(1),
  previousVersionId: uuid("previous_version_id"), // self-referential, points at the prior version row
  title: text("title").notNull(),
  changeReason: text("change_reason"), // why this version was created (Section 33: what changed, who, when, why)
  changedByUserId: uuid("changed_by_user_id").references(() => users.id),
  isPartOfBaseline: boolean("is_part_of_baseline").notNull().default(false), // drives the Section 28 change-impact warning
  overallStatus: completenessStateEnum("overall_status").notNull().default("MISSING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * The seven-dimension contract (Section 7). One row per dimension per
 * requirement version — a requirement is never "complete" just
 * because a sentence was written; each dimension is tracked and
 * evaluated independently, and AI can flag gaps but the application
 * retains structured state as the source of truth (Section 19).
 */
export const requirementDimensions = pgTable("requirement_dimensions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirements.id, { onDelete: "cascade" }),
  dimensionType: requirementDimensionTypeEnum("dimension_type").notNull(),
  state: completenessStateEnum("state").notNull().default("MISSING"),
  content: text("content"), // what's known for this dimension, if anything
  confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id), // set when state = CONFIRMED
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
