import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { requirements } from "./requirements";
import { users } from "./tenancy";
import { changeImpactStatusEnum } from "./enums";

/**
 * Baseline versioning is deliberately a DIFFERENT scheme from
 * Requirement versioning (addendum #9): major.minor, not integer.
 * majorVersion increments only on an explicit "Baseline for
 * Development" action (Section 27). minorVersion increments on an
 * approved bundle of post-baseline changes (Section 28) that don't
 * warrant a full re-baseline. Display as "Baseline v{major}.{minor}".
 */
export const baselines = pgTable("baselines", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  majorVersion: integer("major_version").notNull().default(1),
  minorVersion: integer("minor_version").notNull().default(0),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Snapshot membership: which requirement VERSION (not just which
 * requirement) was part of this baseline, plus the same for PRD/
 * epic/story/AC rows via entityType + entityId + entityVersion.
 */
export const baselineItems = pgTable("baseline_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  baselineId: uuid("baseline_id")
    .notNull()
    .references(() => baselines.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // "REQUIREMENT" | "PRD" | "EPIC" | "USER_STORY" | "ACCEPTANCE_CRITERION" | "ASSUMPTION" | "DECISION"
  entityId: uuid("entity_id").notNull(),
  entityVersion: integer("entity_version"),
});

/**
 * A post-baseline requirement edit (Section 28). Recorded as a
 * pending Change until the PM reviews it; only PM approval moves the
 * changed definition into a new baseline (minor-version bump).
 */
export const changes = pgTable("changes", {
  id: uuid("id").defaultRandom().primaryKey(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirements.id, { onDelete: "cascade" }),
  baselineId: uuid("baseline_id")
    .notNull()
    .references(() => baselines.id), // the baseline this requirement was part of when changed
  description: text("description").notNull(),
  affectedPrdSections: text("affected_prd_sections"), // identified impact — Section 28
  affectedEpicIds: text("affected_epic_ids"),
  affectedUserStoryIds: text("affected_user_story_ids"),
  affectedAcceptanceCriteriaIds: text("affected_acceptance_criteria_ids"),
  status: changeImpactStatusEnum("status").notNull().default("PENDING_PM_REVIEW"),
  changedByUserId: uuid("changed_by_user_id").references(() => users.id),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
