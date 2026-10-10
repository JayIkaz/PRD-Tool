"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { assumptions as assumptionsTable } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit/log";

/**
 * AI inference confirmation (Section 16/17), simple variant: the
 * assumptions extraction.ts already creates live, during discovery,
 * are reviewed directly in place rather than through a separate
 * end-of-session staging batch (the ai_inferences table is reserved
 * for that fuller version later, if it's ever built).
 *
 * Three explicit reviewer actions, all starting from PENDING, all
 * requiring a signed-in user to act — nothing here is automatic:
 *  - confirm: accept the statement as the AI wrote it.
 *  - edit: accept it, but with reviewer-corrected wording.
 *  - reject: discard it. The row stays (for audit/traceability), it
 *    just never counts towards the Product Definition's structured
 *    state.
 *
 * None of these touch a CONFIRMED/DEFINED dimension or requirement —
 * assumptions are deliberately a separate object from requirements
 * (Section 15/16), so confirming one here does not promote it into
 * the seven-dimension contract. That remains a human decision made
 * elsewhere, not a side effect of this review.
 */

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

export async function confirmAssumption(assumptionId: string, productDefinitionId: string) {
  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    const assumption = await tx.query.assumptions.findFirst({
      where: eq(assumptionsTable.id, assumptionId),
    });
    await tx
      .update(assumptionsTable)
      .set({ status: "CONFIRMED", confirmedByUserId: userId })
      .where(eq(assumptionsTable.id, assumptionId));
    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "ASSUMPTION_CONFIRMED",
      summary: `Confirmed ${assumption?.displayCode ?? "an assumption"}: ${assumption?.statement ?? ""}`,
      actorUserId: userId,
    });
  });
  revalidatePath(`/product-definitions/${productDefinitionId}`);
}

export async function rejectAssumption(assumptionId: string, productDefinitionId: string) {
  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    const assumption = await tx.query.assumptions.findFirst({
      where: eq(assumptionsTable.id, assumptionId),
    });
    await tx
      .update(assumptionsTable)
      .set({ status: "REJECTED", confirmedByUserId: userId })
      .where(eq(assumptionsTable.id, assumptionId));
    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "ASSUMPTION_REJECTED",
      summary: `Rejected ${assumption?.displayCode ?? "an assumption"}: ${assumption?.statement ?? ""}`,
      actorUserId: userId,
    });
  });
  revalidatePath(`/product-definitions/${productDefinitionId}`);
}

export async function editAssumption(
  assumptionId: string,
  productDefinitionId: string,
  newStatement: string
) {
  const trimmed = newStatement.trim();
  if (!trimmed) throw new Error("An assumption can't be edited down to empty text.");

  const userId = await getCurrentUserId();
  await withRlsContext(userId, async (tx) => {
    const assumption = await tx.query.assumptions.findFirst({
      where: eq(assumptionsTable.id, assumptionId),
    });
    await tx
      .update(assumptionsTable)
      .set({ statement: trimmed, status: "EDITED", confirmedByUserId: userId })
      .where(eq(assumptionsTable.id, assumptionId));
    await logAuditEvent(tx, {
      productDefinitionId,
      eventType: "ASSUMPTION_EDITED",
      summary: `Edited and confirmed ${assumption?.displayCode ?? "an assumption"}: ${trimmed}`,
      actorUserId: userId,
    });
  });
  revalidatePath(`/product-definitions/${productDefinitionId}`);
}
