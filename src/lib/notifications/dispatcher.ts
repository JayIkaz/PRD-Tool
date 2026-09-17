import { db } from "@/db/client";
import { notifications, notificationChannels } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { notificationTypeEnum } from "@/db/schema/enums";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

/**
 * Single responsibility per channel adapter (addendum #5): format the
 * message, call the webhook or provider API. Adding a fourth channel
 * later should mean writing one more of these, not touching dispatch().
 */
interface ChannelAdapter {
  send(params: { payload: Record<string, unknown>; config: Record<string, unknown> }): Promise<void>;
}

const channelAdapters: Record<string, ChannelAdapter> = {
  // EMAIL: resendEmailAdapter,
  // SLACK: slackWebhookAdapter,
  // TEAMS: teamsWebhookAdapter,
};

export async function dispatch(params: {
  organisationId: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
}) {
  // In-app notification is always written — this is the guaranteed fallback.
  await db.insert(notifications).values({
    organisationId: params.organisationId,
    userId: params.userId,
    type: params.type,
    payload: params.payload,
  });

  const enabledChannels = await db.query.notificationChannels.findMany({
    where: eq(notificationChannels.organisationId, params.organisationId),
  });

  for (const channel of enabledChannels) {
    if (!channel.enabled) continue;
    const adapter = channelAdapters[channel.channelType];
    if (!adapter) continue; // not yet implemented — safe no-op, in-app notification already covers it
    await adapter.send({ payload: params.payload, config: channel.config as Record<string, unknown> });
  }
}
