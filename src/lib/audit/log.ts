import type { Tx } from "@/db/rls";
import { auditLogEntries } from "@/db/schema";

export type AuditEventType =
  | "STATUS_CHANGED"
  | "TOPIC_RENAMED"
  | "ASSUMPTION_CONFIRMED"
  | "ASSUMPTION_EDITED"
  | "ASSUMPTION_REJECTED"
  | "PARTICIPANT_JOINED"
  | "REVIEW_DECISION_RECORDED";

/**
 * Single write path for the audit trail (src/db/schema/audit.ts) --
 * every mutating action that should show up on the History page goes
 * through this rather than inserting into auditLogEntries directly,
 * so the shape stays consistent and it's one place to extend if a
 * richer event ever needs structured metadata instead of just a
 * summary string.
 */
export async function logAuditEvent(
  tx: Tx,
  params: {
    productDefinitionId: string;
    eventType: AuditEventType;
    summary: string;
    actorUserId?: string | null;
  }
) {
  await tx.insert(auditLogEntries).values({
    productDefinitionId: params.productDefinitionId,
    eventType: params.eventType,
    summary: params.summary,
    actorUserId: params.actorUserId ?? null,
  });
}
