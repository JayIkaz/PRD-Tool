import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { productDefinitions } from "./product-definition";
import { requirements } from "./requirements";

/**
 * Generated from the structured Product Definition, never directly
 * from the chat transcript (Section 23). Regenerating a PRD after the
 * Product Definition changes should produce a new version, not a
 * silent overwrite, so the traceability panel can show what changed.
 */
export const prds = pgTable("prds", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  content: text("content").notNull(), // rendered PRD (markdown) — sections adapt to product type, Section 23
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const epics = pgTable("epics", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  displayCode: text("display_code").notNull(), // e.g. "EPIC-002"
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Every story traces to a requirement (Section 24/26) — the delivery
 * layer does not invent major requirements. requirementId being null
 * with a flagged status is the "insufficient information" escape
 * hatch Section 24 calls for, not a silently orphaned story.
 */
export const userStories = pgTable("user_stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  epicId: uuid("epic_id")
    .notNull()
    .references(() => epics.id, { onDelete: "cascade" }),
  requirementId: uuid("requirement_id").references(() => requirements.id),
  displayCode: text("display_code").notNull(), // e.g. "US-014"
  asA: text("as_a").notNull(),
  iWant: text("i_want").notNull(),
  soThat: text("so_that").notNull(),
  isFlaggedInsufficientInfo: text("is_flagged_insufficient_info").default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Per Jay's standing preference: functional AND non-functional
 * acceptance criteria are separate sections on every story, and the
 * Definition of Done is a standing checklist at epic/story-body level
 * — not repeated per story. See DefinitionOfDone below.
 */
export const acceptanceCriteria = pgTable("acceptance_criteria", {
  id: uuid("id").defaultRandom().primaryKey(),
  userStoryId: uuid("user_story_id")
    .notNull()
    .references(() => userStories.id, { onDelete: "cascade" }),
  displayCode: text("display_code").notNull(), // e.g. "AC-014.1"
  kind: text("kind").notNull(), // "FUNCTIONAL" | "NON_FUNCTIONAL"
  givenText: text("given_text"),
  whenText: text("when_text"),
  thenText: text("then_text"),
  freeformText: text("freeform_text"), // used when Given/When/Then doesn't fit (Section 25)
});

/**
 * Standing checklist, held once per Product Definition (not per
 * story) per Jay's stated preference — distinct from per-story
 * acceptance criteria.
 */
export const definitionOfDone = pgTable("definition_of_done", {
  id: uuid("id").defaultRandom().primaryKey(),
  productDefinitionId: uuid("product_definition_id")
    .notNull()
    .references(() => productDefinitions.id, { onDelete: "cascade" }),
  itemText: text("item_text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
