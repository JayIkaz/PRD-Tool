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
  decisions as decisionsTable,
} from "@/db/schema";

/**
 * PM review workspace (Section 20): the human review loop between a
 * stakeholder finishing discovery and a Product Definition being
 * approved. Deliberately NOT "AI Challenge mode" (Section 21/22,
 * next on the build order) — nothing here has the AI critique the
 * definition, this is just the human confirm/send-back mechanism.
 *
 * Self-review is blocked on purpose: the active STAKEHOLDER on a
 * Product Definition cannot become its PM reviewer here, even though
 * nothing stops the same person holding both participant roles in
 * principle (addendum #3). "Reviews and challenges" only means
 * something as a second pair of eyes.
 *
 * Status flow used here (productDefinitionStatusEnum):
 *   DISCOVERY --submitForReview--> AWAITING_PM_REVIEW
 *   AWAITING_PM_REVIEW --startReview--> PM_REVIEW (claims the PM slot)
 *   PM_REVIEW --approveDefinition--> APPROVED
 *   PM_REVIEW --sendBackToDiscovery--> DISCOVERY (with a reason, logged
 *     as a Decision so it's not just a silent status flip)
 */

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

async function getActiveParticipantRole(tx: Tx, productDefinitionId: string, userId: string) {
  const row = await tx.query.productDefinitionParticipants.findFirst({
    where: and(
      eq(productDefinitionParticipants.productDefinitionId, productDefinitionId),
      eq(productDefinitionParticipants.userId, userId),
      eq(productDefinitionParticipants.status, "ACTIVE")
    ),
  });
  return row?.role ?? null;
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

export async function submitForReview(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const userId = await getCurrentUserId();

  await withRlsContext(userId, async (tx) => {
    const role = await getActiveParticipantRole(tx, productDefinitionId, userId);
    if (role !== "STAKEHOLDER") {
      throw new Error("Only the active stakeholder can submit this for review.");
    }

    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition) throw new Error("Product definition not found.");
    if (definition.status !== "DISCOVERY") {
      throw new Error("Only a definition still in discovery can be submitted for review.");
    }

    await tx
      .update(productDefinitions)
      .set({ status: "AWAITING_PM_REVIEW", updatedAt: new Date() })
      .where(eq(productDefinitions.id, productDefinitionId));
  });

  revalidatePath(`/product-definitions/${productDefinitionId}`);
  redirect(`/product-definitions/${productDefinitionId}/review`);
}

export async function startReview(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const userId = await getCurrentUserId();

  await withRlsContext(userId, async (tx) => {
    const role = await getActiveParticipantRole(tx, productDefinitionId, userId);
    if (role === "STAKEHOLDER") {
      throw new Error("The active stakeholder on this definition can't also review it.");
    }

    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition) throw new Error("Product definition not found.");
    if (definition.status !== "AWAITING_PM_REVIEW" && definition.status !== "PM_REVIEW") {
      throw new Error("This definition isn't awaiting PM review.");
    }

    const existingPm = await tx.query.productDefinitionParticipants.findFirst({
      where: and(
        eq(productDefinitionParticipants.productDefinitionId, productDefinitionId),
        eq(productDefinitionParticipants.role, "PM"),
        eq(productDefinitionParticipants.status, "ACTIVE")
      ),
    });

    if (!existingPm) {
      await tx.insert(productDefinitionParticipants).values({
        productDefinitionId,
        userId,
        role: "PM",
      });
    } else if (existingPm.userId !== userId) {
      throw new Error("Someone else is already reviewing this definition.");
    }

    if (definition.status === "AWAITING_PM_REVIEW") {
      await tx
        .update(productDefinitions)
        .set({ status: "PM_REVIEW", updatedAt: new Date() })
        .where(eq(productDefinitions.id, productDefinitionId));
    }
  });

  revalidatePath(`/product-definitions/${productDefinitionId}/review`);
}

export async function addDecision(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const statement = String(formData.get("statement") ?? "").trim();
  const rationale = String(formData.get("rationale") ?? "").trim();

  if (!statement) throw new Error("A decision needs a statement.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePm(tx, productDefinitionId, userId);
    await tx.insert(decisionsTable).values({
      productDefinitionId,
      statement,
      rationale: rationale || null,
      decidedByUserId: userId,
    });
  });

  revalidatePath(`/product-definitions/${productDefinitionId}/review`);
}

export async function approveDefinition(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const userId = await getCurrentUserId();

  await withRlsContext(userId, async (tx) => {
    await requireActivePm(tx, productDefinitionId, userId);

    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition || definition.status !== "PM_REVIEW") {
      throw new Error("Only a definition currently in PM review can be approved.");
    }

    await tx
      .update(productDefinitions)
      .set({ status: "APPROVED", updatedAt: new Date() })
      .where(eq(productDefinitions.id, productDefinitionId));

    await tx.insert(decisionsTable).values({
      productDefinitionId,
      statement: "Approved",
      decidedByUserId: userId,
    });
  });

  revalidatePath(`/product-definitions/${productDefinitionId}`);
  revalidatePath(`/product-definitions/${productDefinitionId}/review`);
}

export async function sendBackToDiscovery(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) throw new Error("Say why this is going back to discovery.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    await requireActivePm(tx, productDefinitionId, userId);

    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, productDefinitionId),
    });
    if (!definition || definition.status !== "PM_REVIEW") {
      throw new Error("Only a definition currently in PM review can be sent back.");
    }

    await tx
      .update(productDefinitions)
      .set({ status: "DISCOVERY", updatedAt: new Date() })
      .where(eq(productDefinitions.id, productDefinitionId));

    await tx.insert(decisionsTable).values({
      productDefinitionId,
      statement: "Sent back to discovery",
      rationale: reason,
      decidedByUserId: userId,
    });
  });

  revalidatePath(`/product-definitions/${productDefinitionId}`);
  revalidatePath(`/product-definitions/${productDefinitionId}/review`);
}
