"use server";

import { eq, and, asc, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import {
  productDefinitions,
  productTypes,
  discoverySessions,
  messages as messagesTable,
  requirements as requirementsTable,
  requirementDimensions as requirementDimensionsTable,
  openQuestions as openQuestionsTable,
  assumptions as assumptionsTable,
} from "@/db/schema";
import { generateNextDiscoveryMessage } from "@/lib/ai/discovery";
import {
  extractDiscoveryState,
  DIMENSION_KEYS,
  type DimensionKey,
  type ExtractionResult,
} from "@/lib/ai/extraction";
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
 * Derives a requirement's overall completeness from whatever dimension
 * rows exist for it. A dimension with no row yet counts as MISSING —
 * a requirement is never "complete" just because the dimensions it
 * happens to have rows for are DEFINED (Section 7/19).
 */
function deriveOverallStatus(dimensionStates: string[]): "MISSING" | "PARTIAL" | "DEFINED" {
  const missingCount = DIMENSION_KEYS.length - dimensionStates.length;
  const definedOrConfirmed = dimensionStates.filter((s) => s === "DEFINED" || s === "CONFIRMED").length;
  if (missingCount === 0 && definedOrConfirmed === DIMENSION_KEYS.length) return "DEFINED";
  if (definedOrConfirmed > 0 || dimensionStates.some((s) => s === "PARTIAL")) return "PARTIAL";
  return "MISSING";
}

/**
 * Applies one extracted exchange's result to the database: field
 * updates on ProductDefinition, upserts into requirements /
 * requirementDimensions, new/resolved open questions, and new
 * assumptions. Everything stays at version 1, updated in place —
 * versioning/baselining is a later build-order item (Section 33), not
 * this one. Assumptions are inserted PENDING and left untouched here —
 * confirming/editing/rejecting them is the next build-order item.
 */
async function applyExtractionResult(tx: Tx, productDefinitionId: string, result: ExtractionResult) {
  const fieldUpdates: Record<string, unknown> = {};
  if (result.problem) {
    fieldUpdates.problem = result.problem.content;
    fieldUpdates.problemStatus = result.problem.state;
  }
  if (result.users) {
    fieldUpdates.users = result.users.content;
    fieldUpdates.usersStatus = result.users.state;
  }
  if (result.outcomes) {
    fieldUpdates.outcomes = result.outcomes.content;
    fieldUpdates.outcomesStatus = result.outcomes.state;
  }
  if (result.currentTopic) {
    fieldUpdates.currentTopic = result.currentTopic;
  }
  if (Object.keys(fieldUpdates).length > 0) {
    fieldUpdates.updatedAt = new Date();
    await tx.update(productDefinitions).set(fieldUpdates).where(eq(productDefinitions.id, productDefinitionId));
  }

  for (const oq of result.openQuestions) {
    if (oq.resolvesOpenQuestionId) {
      await tx
        .update(openQuestionsTable)
        .set({
          resolvedAt: new Date(),
          resolutionAnswerText: oq.resolutionAnswerText ?? null,
        })
        .where(eq(openQuestionsTable.id, oq.resolvesOpenQuestionId));
    } else {
      await tx.insert(openQuestionsTable).values({
        productDefinitionId,
        question: oq.question,
        whyItMatters: oq.whyItMatters ?? null,
      });
    }
  }

  for (const a of result.assumptions) {
    const existingCount = await tx.query.assumptions.findMany({
      where: eq(assumptionsTable.productDefinitionId, productDefinitionId),
    });
    const displayCode = `ASSUMPTION-${String(existingCount.length + 1).padStart(3, "0")}`;
    await tx.insert(assumptionsTable).values({
      productDefinitionId,
      displayCode,
      statement: a.statement,
      generatedByAi: true,
      reasoning: a.reasoning,
      status: "PENDING",
    });
  }

  if (result.requirements.length === 0) return;

  const existingCount = await tx.query.requirements.findMany({
    where: eq(requirementsTable.productDefinitionId, productDefinitionId),
  });
  let nextCodeNumber = existingCount.length + 1;

  for (const extractedReq of result.requirements) {
    let requirementId = extractedReq.requirementId;

    if (!requirementId) {
      const displayCode = `REQ-${String(nextCodeNumber).padStart(3, "0")}`;
      nextCodeNumber += 1;
      const [created] = await tx
        .insert(requirementsTable)
        .values({
          productDefinitionId,
          displayCode,
          title: extractedReq.title,
          overallStatus: "MISSING",
        })
        .returning();
      requirementId = created.id;
    }

    const dimensionEntries = Object.entries(extractedReq.dimensions) as [
      DimensionKey,
      { content: string; state: "PARTIAL" | "DEFINED" },
    ][];

    for (const [dimensionType, update] of dimensionEntries) {
      const existingDimension = await tx.query.requirementDimensions.findFirst({
        where: and(
          eq(requirementDimensionsTable.requirementId, requirementId),
          eq(requirementDimensionsTable.dimensionType, dimensionType)
        ),
      });

      if (existingDimension) {
        // Never downgrade or overwrite a dimension a human has already
        // confirmed — that state belongs to PM/stakeholder sign-off,
        // not the extraction pass.
        if (existingDimension.state === "CONFIRMED") continue;
        await tx
          .update(requirementDimensionsTable)
          .set({ content: update.content, state: update.state, updatedAt: new Date() })
          .where(eq(requirementDimensionsTable.id, existingDimension.id));
      } else {
        await tx.insert(requirementDimensionsTable).values({
          requirementId,
          dimensionType,
          content: update.content,
          state: update.state,
        });
      }
    }

    const allDimensions = await tx.query.requirementDimensions.findMany({
      where: eq(requirementDimensionsTable.requirementId, requirementId),
    });
    const overallStatus = deriveOverallStatus(allDimensions.map((d) => d.state));
    await tx.update(requirementsTable).set({ overallStatus }).where(eq(requirementsTable.id, requirementId));
  }
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

/**
 * Manual override for currentTopic (companion to extraction.ts's
 * automatic drift tracking, rule #9): the stakeholder directly
 * renaming what the conversation is about, taken at face value — no
 * AI judgment call about whether the conversation has genuinely
 * moved on, just a direct write, the same as renaming anything else.
 */
export async function setCurrentTopic(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const topic = String(formData.get("topic") ?? "").trim();

  if (!topic) throw new Error("Topic can't be empty.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await withRlsContext(user.id, async (tx) => {
    await tx
      .update(productDefinitions)
      .set({ currentTopic: topic, updatedAt: new Date() })
      .where(eq(productDefinitions.id, productDefinitionId));
  });

  revalidatePath(`/product-definitions/${productDefinitionId}/discovery`);
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

    const priorMessagesBeforeThisOne = await tx.query.messages.findMany({
      where: eq(messagesTable.discoverySessionId, session.id),
      orderBy: asc(messagesTable.createdAt),
    });
    const lastAiMessage = [...priorMessagesBeforeThisOne].reverse().find((m) => m.role === "AI");

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

    const existingRequirements = await tx.query.requirements.findMany({
      where: eq(requirementsTable.productDefinitionId, productDefinitionId),
    });
    const existingDimensions =
      existingRequirements.length === 0
        ? []
        : await tx.query.requirementDimensions.findMany({
            where: inArray(
              requirementDimensionsTable.requirementId,
              existingRequirements.map((r) => r.id)
            ),
          });
    const requirementContexts = existingRequirements.map((r) => ({
      id: r.id,
      title: r.title,
      dimensions: Object.fromEntries(
        existingDimensions
          .filter((d) => d.requirementId === r.id)
          .map((d) => [d.dimensionType, d.state])
      ) as Partial<Record<DimensionKey, string>>,
    }));

    const existingOpenQuestions = await tx.query.openQuestions.findMany({
      where: and(eq(openQuestionsTable.productDefinitionId, productDefinitionId), isNull(openQuestionsTable.resolvedAt)),
    });
    const existingAssumptions = await tx.query.assumptions.findMany({
      where: eq(assumptionsTable.productDefinitionId, productDefinitionId),
    });

    return {
      definition,
      session,
      priorMessages,
      productType,
      library,
      requirementContexts,
      lastAiMessage,
      existingOpenQuestions,
      existingAssumptions,
    };
  });

  const [reply, extraction] = await Promise.all([
    generateNextDiscoveryMessage({
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
    }),
    extractDiscoveryState({
      idea: context.definition.idea,
      known: {
        problem: context.definition.problem,
        users: context.definition.users,
        outcomes: context.definition.outcomes,
        currentTopic: context.definition.currentTopic,
      },
      existingRequirements: context.requirementContexts,
      existingOpenQuestions: context.existingOpenQuestions.map((q) => ({ id: q.id, question: q.question })),
      existingAssumptions: context.existingAssumptions.map((a) => ({ id: a.id, statement: a.statement })),
      aiQuestion: context.lastAiMessage?.content ?? null,
      stakeholderAnswer: content,
    }),
  ]);

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

    await applyExtractionResult(tx, productDefinitionId, extraction);
  });

  redirect(`/product-definitions/${productDefinitionId}/discovery`);
}
