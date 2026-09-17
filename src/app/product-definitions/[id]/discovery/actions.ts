"use server";

import { eq, and, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import {
  productDefinitions,
  productTypes,
  discoverySessions,
  messages as messagesTable,
} from "@/db/schema";
import { generateNextDiscoveryMessage } from "@/lib/ai/discovery";
import type { Tx } from "@/db/rls";

/**
 * Known limitation: no locking against two concurrent calls for the
 * same product definition racing to create the first session — fine at
 * MVP single-user-testing scale, worth an advisory lock if this ever
 * needs to be concurrency-safe.
 */

async function getOrCreateActiveSession(tx: Tx, productDefinitionId: string, userId: string) {
  const existing = await tx.query.discoverySessions.findFirst({
    where: and(eq(discoverySessions.productDefinitionId, productDefinitionId), eq(discoverySessions.status, "ACTIVE")),
  });
  if (existing) return existing;

  const [created] = await tx
    .insert(discoverySessions)
    .values({ productDefinitionId, stakeholderId: userId })
    .returning();
  return created;
}

/**
 * Called on every page load. If the session has no messages yet (a
 * brand-new session), generates the AI's opening message so the
 * stakeholder isn't staring at a blank chat. No-op otherwise.
 *
 * Deliberately split into DB work / AI call / DB work rather than one
 * transaction spanning the network call — holding a Postgres
 * transaction open across an external HTTP request is the wrong shape
 * even though the RLS impersonation would technically still work.
 */
export async function ensureSessionStarted(productDefinitionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const context = await withRlsContext(user.id, async (tx) => {
    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition) throw new Error("Product definition not found.");

    const session = await getOrCreateActiveSession(tx, productDefinitionId, user.id);

    const existingMessages = await tx.query.messages.findMany({
      where: eq(messagesTable.discoverySessionId, session.id),
    });
    if (existingMessages.length > 0) return null;

    const productType = definition.productTypeId
      ? await tx.query.productTypes.findFirst({ where: eq(productTypes.id, definition.productTypeId) })
      : undefined;
    const library = await tx.query.questions.findMany();

    return { definition, session, productType, library };
  });

  if (!context) return;

  const opening = await generateNextDiscoveryMessage({
    idea: context.definition.idea,
    productTypeKey: context.productType?.key,
    known: {
      problem: context.definition.problem,
      users: context.definition.users,
      outcomes: context.definition.outcomes,
    },
    library: context.library.map((q) => ({ pathwayKey: q.pathwayKey, area: q.area, promptText: q.promptText })),
    transcript: [],
  });

  await withRlsContext(user.id, async (tx) => {
    await tx.insert(messagesTable).values({
      discoverySessionId: context.session.id,
      role: "AI",
      content: opening,
    });
  });
}

export async function sendDiscoveryMessage(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    redirect(`/product-definitions/${productDefinitionId}/discovery`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const context = await withRlsContext(user.id, async (tx) => {
    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition) throw new Error("Product definition not found.");

    const session = await getOrCreateActiveSession(tx, productDefinitionId, user.id);

    await tx.insert(messagesTable).values({
      discoverySessionId: session.id,
      role: "STAKEHOLDER",
      content,
    });

    const priorMessages = await tx.query.messages.findMany({
      where: eq(messagesTable.discoverySessionId, session.id),
      orderBy: asc(messagesTable.createdAt),
    });

    const productType = definition.productTypeId
      ? await tx.query.productTypes.findFirst({ where: eq(productTypes.id, definition.productTypeId) })
      : undefined;
    const library = await tx.query.questions.findMany();

    return { definition, session, priorMessages, productType, library };
  });

  const reply = await generateNextDiscoveryMessage({
    idea: context.definition.idea,
    productTypeKey: context.productType?.key,
    known: {
      problem: context.definition.problem,
      users: context.definition.users,
      outcomes: context.definition.outcomes,
    },
    library: context.library.map((q) => ({ pathwayKey: q.pathwayKey, area: q.area, promptText: q.promptText })),
    transcript: context.priorMessages.map((m) => ({
      role: m.role as "AI" | "STAKEHOLDER",
      content: m.content,
    })),
  });

  await withRlsContext(user.id, async (tx) => {
    await tx.insert(messagesTable).values({
      discoverySessionId: context.session.id,
      role: "AI",
      content: reply,
    });
    await tx
      .update(discoverySessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(discoverySessions.id, context.session.id));
  });

  redirect(`/product-definitions/${productDefinitionId}/discovery`);
}
