import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { users } from "./tenancy";
import { challengeFindingCategoryEnum, challengeFindingStatusEnum } from "./enums";

/**
 * AI Challenge mode (Section 21/22) -- a PM action ("Challenge this
 * definition"), not a continuous background process. Every run
 * creates a new row here rather than overwriting the last one, so
 * past challenges stay visible alongside what was raised and whether
 * it was addressed before baseline -- the same append-only
 * philosophy as the audit log and requirement/assumption history.
 */
export const challengeReviews = pgTable("challenge_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Individual findings from one challenge review. category is the
 * full Section 21 taxonomy (ten lenses the AI looks through); the
 * review UI groups these into Section 22's six display headings, but
 * the finer category stays on the row so findings remain filterable
 * and the display mapping can change without a migration.
 *
 * Section 22 is explicit: the AI never modifies the Product
 * Definition directly. Accepting a finding here only records that
 * the PM agrees it's worth acting on -- it does not itself create a
 * Decision, Assumption or Risk, or edit a Requirement. The PM does
 * that separately, through the existing review tools, with this
 * finding as the reason.
 */
export const challengeFindings = pgTable("challenge_findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  challengeReviewId: uuid("challenge_review_id")
    .notNull()
    .references(() => challengeReviews.id, { onDelete: "cascade" }),
  category: challengeFindingCategoryEnum("category").notNull(),
  statement: text("statement").notNull(),
  relatedTo: text("related_to"), // free-text pointer, e.g. "REQ-004" or "ASSUMPTION-002" -- not an FK, the AI names it in prose
  status: challengeFindingStatusEnum("status").notNull().default("PENDING"),
  pmNote: text("pm_note"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
