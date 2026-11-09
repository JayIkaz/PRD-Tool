import { eq, desc, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { productDefinitions, auditLogEntries, users } from "@/db/schema";
import { AppShell } from "@/components/AppShell";
import { ProductDefinitionNav } from "@/components/ProductDefinitionNav";

/**
 * History (the audit trail from src/db/schema/audit.ts, Section 3's
 * "who told us this" traceability principle extended beyond
 * participant hand-off). Read-only by design -- nothing on this page
 * writes anything, it only renders what logAuditEvent has already
 * recorded elsewhere.
 *
 * Only shows events from the point audit_log_entries was added --
 * there's no reconstructing what happened before that, the data
 * (old topic values, status-change timestamps, etc.) was never kept.
 */

const EVENT_LABEL: Record<string, string> = {
  STATUS_CHANGED: "Status",
  TOPIC_RENAMED: "Renamed",
  ASSUMPTION_CONFIRMED: "Assumption confirmed",
  ASSUMPTION_EDITED: "Assumption edited",
  ASSUMPTION_REJECTED: "Assumption rejected",
  PARTICIPANT_JOINED: "Hand-off",
  REVIEW_DECISION_RECORDED: "Review decision",
};

function formatTimestamp(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await withRlsContext(user.id, async (tx) => {
    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, id),
    });
    if (!definition) return null;

    const entries = await tx.query.auditLogEntries.findMany({
      where: eq(auditLogEntries.productDefinitionId, id),
      orderBy: [desc(auditLogEntries.createdAt)],
    });

    const actorIds = [...new Set(entries.map((e) => e.actorUserId).filter((v): v is string => !!v))];
    const actors =
      actorIds.length === 0
        ? []
        : await tx.query.users.findMany({ where: inArray(users.id, actorIds) });

    return { definition, entries, actors };
  });

  if (!data) notFound();
  const { definition, entries, actors } = data;

  const actorNameById = new Map(actors.map((a) => [a.id, a.displayName || a.email]));

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: definition.currentTopic ?? definition.title, href: `/product-definitions/${id}` },
        { label: "History" },
      ]}
    >
      <main className="page page-narrow">
        <ProductDefinitionNav productDefinitionId={id} active="history" />

        <header>
          <p className="eyebrow">History</p>
          <h1 className="h1">{definition.currentTopic ?? definition.title}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Every status change, rename and decision on this definition, newest first.
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="card-dashed text-sm">
            Nothing here yet. This fills in as the definition moves through discovery and review. Anything from before History was added won&apos;t appear.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((e) => (
              <li
                key={e.id}
                className="card text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">
                    {EVENT_LABEL[e.eventType] ?? e.eventType}
                  </span>
                  <span className="whitespace-nowrap text-xs text-neutral-600">
                    {formatTimestamp(e.createdAt)}
                  </span>
                </div>
                <p className="mt-1">{e.summary}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {e.actorUserId ? actorNameById.get(e.actorUserId) ?? "Someone" : "System"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </main>
    </AppShell>
  );
}
