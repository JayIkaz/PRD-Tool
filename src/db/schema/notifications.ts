import { pgTable, uuid, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { organisations, users } from "./tenancy";
import { notificationTypeEnum, notificationChannelTypeEnum } from "./enums";

/**
 * In-app notifications are always on and need no configuration — the
 * fallback that guarantees nothing gets silently missed. A single
 * NotificationDispatcher writes this row, then loops over enabled
 * channels for the organisation (addendum #5).
 */
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(), // e.g. { productDefinitionId, message, link }
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Slack/Teams use incoming webhook URLs pasted in by the org admin —
 * no OAuth flow, no app-review process (addendum #5). config holds
 * the webhook URL for SLACK/TEAMS or provider settings for EMAIL.
 */
export const notificationChannels = pgTable("notification_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  channelType: notificationChannelTypeEnum("channel_type").notNull(),
  config: jsonb("config").notNull(), // { webhookUrl } for SLACK/TEAMS, {} for EMAIL (uses org's registered address)
  enabled: boolean("enabled").notNull().default(true),
});
