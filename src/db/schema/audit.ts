import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { users } from "./tenancy";
import { auditEventTypeEnum } from "./enums";

/**
 * The audit trail — Section 3's "who told us this" traceability
 * principle (originally scoped to participant hand-off), extended to
 * every consequential thing that happens to a Product Definition:
 * status changes, topic renames, assumption decisions, review
 * decisions, hand-offs.
 *
 * Append-only log, one row per event, a human-readable summary plus
 * a type to group/filter by -- not a generic before/after diff table.
 * The History page's job is "tell me what happened and who did it",
 * not provide a change-replay mechanism.
 *
 * Starts recording from the point this table was added. Nothing
 * before that is backfilled or reconstructed, since the data to do
 * so (timestamps on status transitions, old topic values, etc.)
 * doesn't exist anywhere in the schema prior to this.
 *
 * actorUserId is nullable for a system/AI-driven event with no human
 * actor (none exist yet, but the shape allows for one later rather
 * than requiring a schema change).
 */
export const auditLogEntries = pgTable("audit_log_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  eventType: auditEventTypeEnum("event_type").notNull(),
  summary: text("summary").notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
