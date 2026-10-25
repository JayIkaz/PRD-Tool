"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import type { Tx } from "@/db/rls";
import {
  productDefinitions,
  productDefinitionParticipants,
  requirements as requirementsTable,
  requirementDimensions as requirementDimensionsTable,
  risks as risksTable,
  dependencies as dependenciesTable,
  openQuestions as openQuestionsTable,
  challengeFindings as challengeFindingsTable,
  challengeReviews as challengeReviewsTable,
} from "@/db/schema";
import { logAuditEvent } from "@/lib/audit/log";
import { DIMENSION_KEYS, DIMENSION_LABELS, deriveOverallStatus } from "@/lib/definition/dimensions";

/**
 * PM workspace actions (Section 20): the PM editing requirements and
 * adding risks, dependencies and open questions while a definition is
 * in PM review. Every action requires the ACTIVE PM and PM_REVIEW
 * status, runs under RLS, and writes an audit entry so the History tab
 * records what changed, who changed it and why (Section 33).
 *
 * Requirement edits update the row in place and bump `version` (an
 * integer, addendum #9); the previous text is preserved in the audit
 * entry rather than as a separate row. Full row-level version history
 * is a deliberate later step, because every reader of `requirements`
 * would have to learn to pick the latest version first.
 */

const MAX_TEXT = 2000;
const MAX_TITLE = 200;
const RISK_CATEGORIES = ["delivery", "customer", "data", "operational", "compliance"] as const;

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

async function requireActivePmInReview(tx: Tx, productDefinitionId: string, userId: string) {
  const pm = await tx.query.productDefinitionParticipants.findFirst({
    where: and(
      eq(productDefinitionParticipants.productDefinitionId, productDefinitionId),
      eq(productDefinitionParticipants.role, "PM"),
      eq(productDefinitionParticipants.status, "ACTIVE")
    ),
  });
  if (!pm || pm.userId !== userId) throw new Error("Only the active PM reviewer can do that.");

  const definition = await tx.query.productDefinitions.findFirst({
    where: eq(productDefinitions.id, productDefinitionId),
  });
  if (!definition || definition.status !== "PM_REVIEW") {
    throw new Error("This can only be changed while the definition is in PM review.");
  }
}

function text(formData: FormData, key: string, max = MAX_TEXT): string {
  const v = String(formData.get(key) ?? "").trim();
  if (v.length > max) throw new Error(`That is too long (limit ${max} characters).`);
  return v;
}

function reviewPath(id: string) {
  return `/product-definitions/${id}/review`;
}

// ---------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------

type DimState = "MISSING" | "PARTIAL" | "DEFINED" | "CONFIRMED";
const DIM_STATES: DimState[] = ["MISSING", "PARTIAL", "DEFINED", "CONFIRMED"];

export async function editRequirement(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const requirementId = text(formData, "requirementId", 64);
  const title = text(formData, "title", MAX_TITLE);
  const changeReason = text(formData, "changeReason");

  if (!title) throw new Error("A requirement needs a title.");
  if (!changeReason) throw new Error("Say why you are changing this requirement.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);

    const req = await tx.query.requirements.findFirst({ where: eq(requirementsTable.id, requirementId) });
    if (!req || req.productDefinitionId !== productDefinitionId) {
      throw new Error("Requirement not found on this definition.");
    }

    const existing = await tx.query.requirementDimensions.findMany({
      where: eq(requirementDimensionsTable.requirementId, requirementId),
    });
    const existingByKey = new Map(existing.map((d) => [d.dimensionType, d]));

    const changes: string[] = [];
    if (title !== req.title) changes.push(`title ("${req.title}" -> "${title}")`);

    const finalStates: string[] = [];

    for (const key of DIMENSION_KEYS) {
      const content = text(formData, `dim_${key}_content`);
      const submittedState = String(formData.get(`dim_${key}_state`) ?? "") as DimState;
      const prior = existingByKey.get(key);

      // Empty content is always MISSING; text with a "missing" state is
      // treated as a draft. A dimension is never DEFINED/CONFIRMED with
      // nothing in it (Section 7).
      let state: DimState = DIM_STATES.includes(submittedState) ? submittedState : "PARTIAL";
      if (!content) state = "MISSING";
      else if (state === "MISSING") state = "PARTIAL";

      finalStates.push(state);

      const priorContent = prior?.content ?? "";
      const priorState = prior?.state ?? "MISSING";
      if (content === priorContent && state === priorState) continue;

      changes.push(
        `${DIMENSION_LABELS[key]} (${priorState} -> ${state}${
          content !== priorContent ? `; was: "${priorContent.slice(0, 120)}"` : ""
        })`
      );

      if (prior) {
        await tx
          .update(requirementDimensionsTable)
          .set({
            content: content || null,
            state,
            confirmedByUserId: state === "CONFIRMED" ? userId : null,
            updatedAt: new Date(),
          })
          .where(eq(requirementDimensionsTable.id, prior.id));
      } else if (content) {
        await tx.insert(requirementDimensionsTable).values({
          requirementId,
          dimensionType: key,
          content,
          state,
          confirmedByUserId: state === "CONFIRMED" ? userId : null,
        });
      }
    }

    if (changes.length === 0) return;

    const newVersion = req.version + 1;
    await tx
      .update(requirementsTable)
      .set({
        title,
        version: newVersion,
        changeReason,
        changedByUserId: userId,
        overallStatus: deriveOverallStatus(finalStates),
      })
      .where(eq(requirementsTable.id, requirementId));

    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "REQUIREMENT_EDITED",
      summary: `${req.displayCode} edited (now v${newVersion}) -- ${changeReason}. Changed: ${changes.join("; ")}`,
      actorUserId: userId,
    });
  });

  revalidatePath(reviewPath(productDefinitionId));
}

// ---------------------------------------------------------------
// Risks
// ---------------------------------------------------------------

async function insertRisk(
  tx: Tx,
  productDefinitionId: string,
  userId: string,
  statement: string,
  category: string | null
) {
  await tx.insert(risksTable).values({ productDefinitionId, statement, category });
  await logAuditEvent(tx, {
    productDefinitionId,
    eventType: "RISK_ADDED",
    summary: `${category ? `[${category}] ` : ""}${statement}`,
    actorUserId: userId,
  });
}

export async function addRisk(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const statement = text(formData, "statement");
  const rawCategory = text(formData, "category", 32);
  if (!statement) throw new Error("A risk needs a statement.");
  const category = (RISK_CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : null;

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);
    await insertRisk(tx, productDefinitionId, userId, statement, category);
  });
  revalidatePath(reviewPath(productDefinitionId));
}

export async function removeRisk(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const riskId = text(formData, "riskId", 64);
  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);
    const risk = await tx.query.risks.findFirst({ where: eq(risksTable.id, riskId) });
    if (!risk || risk.productDefinitionId !== productDefinitionId) throw new Error("Risk not found.");
    await tx.delete(risksTable).where(eq(risksTable.id, riskId));
    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "RISK_REMOVED",
      summary: risk.statement,
      actorUserId: userId,
    });
  });
  revalidatePath(reviewPath(productDefinitionId));
}

// ---------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------

async function insertDependency(tx: Tx, productDefinitionId: string, userId: string, statement: string) {
  await tx.insert(dependenciesTable).values({ productDefinitionId, statement });
  await logAuditEvent(tx, {
    productDefinitionId,
    eventType: "DEPENDENCY_ADDED",
    summary: statement,
    actorUserId: userId,
  });
}

export async function addDependency(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const statement = text(formData, "statement");
  if (!statement) throw new Error("A dependency needs a statement.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);
    await insertDependency(tx, productDefinitionId, userId, statement);
  });
  revalidatePath(reviewPath(productDefinitionId));
}

export async function removeDependency(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const dependencyId = text(formData, "dependencyId", 64);
  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);
    const dep = await tx.query.dependencies.findFirst({ where: eq(dependenciesTable.id, dependencyId) });
    if (!dep || dep.productDefinitionId !== productDefinitionId) throw new Error("Dependency not found.");
    await tx.delete(dependenciesTable).where(eq(dependenciesTable.id, dependencyId));
    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "DEPENDENCY_REMOVED",
      summary: dep.statement,
      actorUserId: userId,
    });
  });
  revalidatePath(reviewPath(productDefinitionId));
}

// ---------------------------------------------------------------
// Open questions
// ---------------------------------------------------------------

async function insertOpenQuestion(
  tx: Tx,
  productDefinitionId: string,
  userId: string,
  question: string,
  whyItMatters: string | null
) {
  await tx.insert(openQuestionsTable).values({ productDefinitionId, question, whyItMatters });
  await logAuditEvent(tx, {
    productDefinitionId,
    eventType: "OPEN_QUESTION_ADDED",
    summary: question,
    actorUserId: userId,
  });
}

export async function addOpenQuestion(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const question = text(formData, "question");
  const whyItMatters = text(formData, "whyItMatters");
  if (!question) throw new Error("An open question needs the question itself.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);
    await insertOpenQuestion(tx, productDefinitionId, userId, question, whyItMatters || null);
  });
  revalidatePath(reviewPath(productDefinitionId));
}

export async function resolveOpenQuestion(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const questionId = text(formData, "questionId", 64);
  const answer = text(formData, "answer");
  if (!answer) throw new Error("Record the answer that resolves this question.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);
    const q = await tx.query.openQuestions.findFirst({ where: eq(openQuestionsTable.id, questionId) });
    if (!q || q.productDefinitionId !== productDefinitionId) throw new Error("Question not found.");
    await tx
      .update(openQuestionsTable)
      .set({ resolvedAt: new Date(), resolutionAnswerText: answer })
      .where(eq(openQuestionsTable.id, questionId));
    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "OPEN_QUESTION_RESOLVED",
      summary: `${q.question} -- ${answer}`,
      actorUserId: userId,
    });
  });
  revalidatePath(reviewPath(productDefinitionId));
}

// ---------------------------------------------------------------
// Challenge finding -> tracked item (PM's explicit click, Section 22)
// ---------------------------------------------------------------

export async function recordFindingAs(formData: FormData) {
  const productDefinitionId = text(formData, "productDefinitionId", 64);
  const findingId = text(formData, "findingId", 64);
  const target = text(formData, "target", 16);
  if (target !== "RISK" && target !== "DEPENDENCY" && target !== "QUESTION") {
    throw new Error("Unknown target.");
  }

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePmInReview(tx, productDefinitionId, userId);

    const finding = await tx.query.challengeFindings.findFirst({
      where: eq(challengeFindingsTable.id, findingId),
    });
    if (!finding) throw new Error("Finding not found.");
    const review = await tx.query.challengeReviews.findFirst({
      where: eq(challengeReviewsTable.id, finding.challengeReviewId),
    });
    if (!review || review.productDefinitionId !== productDefinitionId) {
      throw new Error("Finding does not belong to this definition.");
    }
    if (finding.status !== "PENDING") throw new Error("This finding has already been reviewed.");

    const statement = (finding.relatedTo ? `${finding.relatedTo}: ` : "") + finding.statement;
    let label: string;
    if (target === "RISK") {
      await insertRisk(tx, productDefinitionId, userId, statement.slice(0, MAX_TEXT), null);
      label = "risk";
    } else if (target === "DEPENDENCY") {
      await insertDependency(tx, productDefinitionId, userId, statement.slice(0, MAX_TEXT));
      label = "dependency";
    } else {
      await insertOpenQuestion(tx, productDefinitionId, userId, statement.slice(0, MAX_TEXT), null);
      label = "open question";
    }

    await tx
      .update(challengeFindingsTable)
      .set({
        status: "ACCEPTED",
        pmNote: `Recorded as ${label}`,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      })
      .where(eq(challengeFindingsTable.id, findingId));
  });
  revalidatePath(reviewPath(productDefinitionId));
}
