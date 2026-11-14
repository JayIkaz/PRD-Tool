import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

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
  /**
   * Organisation permissions (drizzle/0014). Not writable by the
   * `authenticated` role: only the SECURITY DEFINER functions in 0014
   * (grant_admin, transfer_admin, step_down_admin, set_member_pm) or the
   * service role can change them.
   */
  isAdmin: boolean("is_admin").notNull().default(false),
  isPm: boolean("is_pm").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


/**
 * An admin's invitation for an email address to join their organisation.
 * Matched against the VERIFIED email at first-login provisioning
 * (src/lib/auth/provision.ts). Never carries admin rights. Written only by
 * invite_member / revoke_invite (0014) or the service role.
 */
export const organisationInvites = pgTable("organisation_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  email: text("email").notNull(), // always lower-case
  isPm: boolean("is_pm").notNull().default(false),
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/** Append-only record of membership and permission changes. Admins can read it. */
export const organisationAuditEvents = pgTable("organisation_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
  targetEmail: text("target_email"),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A member's message to the platform owner (for example: our only admin has left). */
export const supportRequests = pgTable("support_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
