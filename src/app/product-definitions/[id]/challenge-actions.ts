"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import type { Tx } from "@/db/rls";
import {
  productDefinitions,
  productDefinitionParticipants,
  requirements as requirementsTable,
  requirementDimensions as requirementDimensionsTable,
  assumptions as assumptionsTable,
  decisions as decisionsTable,
  openQuestions as openQuestionsTable,
  evidence as evidenceTable,
  risks as risksTable,
  dependencies as dependenciesTable,
  challengeReviews,
  challengeFindings,
} from "@/db/schema";
import { logAuditEvent } from "@/lib/audit/log";
import { generateChallengeFindings } from "@/lib/ai/challenge";

/**
 * AI Challenge mode actions (Section 21/22). Two things only:
 * running a new challenge review (PM-only, PM_REVIEW status only),
 * and the PM accepting/rejecting an individual finding afterwards.
 * Neither action ever writes into the Product Definition itself --
 * accepting a finding is bookkeeping, not an edit. If the PM decides
 * a finding is worth acting on, they do that through the existing
 * review tools (addDecision, editing a requirement, etc.), same as
 * before this file existed.
 */

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

async function requireActivePm(tx: Tx, productDefinitionId: string, userId: string) {
  const pm = await tx.query.productDefinitionParticipants.findFirst({
    where: and(
      eq(productDefinitionParticipants.productDefinitionId, productDefinitionId),
      eq(productDefinitionParticipants.role, "PM"),
      eq(productDefinitionParticipants.status, "ACTIVE")
    ),
  });
  if (!pm || pm.userId !== userId) {
    throw new Error("Only the active PM reviewer can do that.");
  }
}

export async function runChallenge(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const userId = await getCurrentUserId();

  await withRlsContext(userId, async (tx) => {
    await requireActivePm(tx, productDefinitionId, userId);

    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition || definition.status !== "PM_REVIEW") {
      throw new Error("Challenge mode is only available while a definition is in PM review.");
    }

    const reqs = await tx.query.requirements.findMany({
      where: eq(requirementsTable.productDefinitionId, productDefinitionId),
    });
    const dims =
      reqs.length === 0
        ? []
        : await tx.query.requirementDimensions.findMany({
            where: inArray(
              requirementDimensionsTable.requirementId,
              reqs.map((r) => r.id)
            ),
          });
    const assumptionsList = await tx.query.assumptions.findMany({
      where: eq(assumptionsTable.productDefinitionId, productDefinitionId),
    });
    const decisionsList = await tx.query.decisions.findMany({
      where: eq(decisionsTable.productDefinitionId, productDefinitionId),
    });
    const openQs = await tx.query.openQuestions.findMany({
      where: eq(openQuestionsTable.productDefinitionId, productDefinitionId),
    });
    const evidenceList = await tx.query.evidence.findMany({
      where: eq(evidenceTable.productDefinitionId, productDefinitionId),
    });
    const risksList = await tx.query.risks.findMany({
      where: eq(risksTable.productDefinitionId, productDefinitionId),
    });
    const dependenciesList = await tx.query.dependencies.findMany({
      where: eq(dependenciesTable.productDefinitionId, productDefinitionId),
    });

    const findings = await generateChallengeFindings({
      idea: definition.idea,
      problem: definition.problem,
      users: definition.users,
      needs: definition.needs,
      context: definition.context,
      outcomes: definition.outcomes,
      requirements: reqs.map((r) => ({
        displayCode: r.displayCode,
        title: r.title,
        dimensions: Object.fromEntries(
          dims
            .filter((d) => d.requirementId === r.id)
            .map((d) => [d.dimensionType, { content: d.content, state: d.state }])
        ),
      })),
      assumptions: assumptionsList.map((a) => ({
        displayCode: a.displayCode,
        statement: a.statement,
        status: a.status,
        generatedByAi: a.generatedByAi,
      })),
      decisions: decisionsList.map((d) => ({ statement: d.statement, rationale: d.rationale })),
      openQuestions: openQs.map((q) => ({ question: q.question, resolvedAt: q.resolvedAt })),
      evidence: evidenceList.map((e) => ({ type: e.type, note: e.note, url: e.url })),
      risks: risksList.map((r) => ({ statement: r.statement, category: r.category })),
      dependencies: dependenciesList.map((d) => ({ statement: d.statement })),
    });

    const [review] = await tx
      .insert(challengeReviews)
      .values({ productDefinitionId, triggeredByUserId: userId })
      .returning();

    if (findings.length > 0) {
      await tx.insert(challengeFindings).values(
        findings.map((f) => ({
          challengeReviewId: review.id,
          category: f.category,
          statement: f.statement,
          relatedTo: f.relatedTo ?? null,
        }))
      );
    }

    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "AI_CHALLENGE_RUN",
      summary: `AI Challenge ran -- ${findings.length} finding${findings.length === 1 ? "" : "s"}`,
      actorUserId: userId,
    });
  });

  revalidatePath(`/product-definitions/${productDefinitionId}/review`);
}

export async function reviewFinding(formData: FormData) {
  const findingId = String(formData.get("findingId") ?? "");
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const pmNote = String(formData.get("pmNote") ?? "").trim();

  if (decision !== "ACCEPTED" && decision !== "REJECTED") {
    throw new Error("Invalid decision.");
  }

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePm(tx, productDefinitionId, userId);

    await tx
      .update(challengeFindings)
      .set({
        status: decision as "ACCEPTED" | "REJECTED", // narrowed above, but string -> literal union needs an explicit cast
        pmNote: pmNote || null,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      })
      .where(eq(challengeFindings.id, findingId));
  });

  revalidatePath(`/product-definitions/${productDefinitionId}/review`);
}
