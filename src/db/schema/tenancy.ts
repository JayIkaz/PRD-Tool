import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Tenancy boundary. Every row that belongs to a tenant carries
 * organisation_id, and Supabase row-level security policies are scoped
 * to it — see build-prompt-addendum-v2.md, Section 3.
 */
export const organisations = pgTable("organisations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"),
  storageProvider: text("storage_provider").notNull().default("SUPABASE"), // see storageProviderEnum
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Mirrors Supabase's auth.users — keep this table for profile fields
 * and joins; do not duplicate password/auth state here.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

