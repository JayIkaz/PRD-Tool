import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { productDefinitions, requirements as requirementsTable, requirementDimensions as requirementDimensionsTable } from "@/db/schema";

const STATUS_ICON: Record<string, string> = {
  MISSING: "🔴",
  PARTIAL: "🟡",
  DEFINED: "🟢",
  CONFIRMED: "✅",
};

const DIMENSION_COUNT = 7;

export default async function ProductDefinitionPage({
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

    const reqs = await tx.query.requirements.findMany({
      where: eq(requirementsTable.productDefinitionId, id),
    });
    const dims =
      reqs.length === 0
        ? []
        : await tx.query.requirementDimensions.findMany({
            where: inArray(requirementDimensionsTable.requirementId, reqs.map((r) => r.id)),
          });

    return { definition, reqs, dims };
  });

  // A definition belonging to another organisation comes back as
  // undefined here, not a 403 — RLS makes the row invisible rather than
  // forbidden. notFound() is the right response to both cases.
  if (!data) notFound();
  const { definition, reqs, dims } = data;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          {definition.status.replace(/_/g, " ")}
        </p>
        <h1 className="text-xl font-semibold">{definition.title}</h1>
      </header>
      <section>
        <h2 className="text-sm font-medium text-neutral-500">Original idea</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm">{definition.idea}</p>
      </section>

      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">Captured so far</h2>
        <FieldRow label="Problem" status={definition.problemStatus} content={definition.problem} />
        <FieldRow label="Users" status={definition.usersStatus} content={definition.users} />
        <FieldRow label="Outcomes" status={definition.outcomesStatus} content={definition.outcomes} />
      </section>

      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">Requirements ({reqs.length})</h2>
        {reqs.length === 0 ? (
          <p className="text-neutral-400">
            None extracted yet — requirements appear here as the discovery conversation covers them.
          </p>
        ) : (
          <ul className="grid gap-2">
            {reqs.map((r) => {
              const definedCount = dims.filter(
                (d) => d.requirementId === r.id && (d.state === "DEFINED" || d.state === "CONFIRMED")
              ).length;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
                  <span>
                    <span className="mr-2 text-neutral-400">{r.displayCode}</span>
                    {r.title}
                  </span>
                  <span className="whitespace-nowrap text-xs text-neutral-400">
                    {STATUS_ICON[r.overallStatus]} {definedCount}/{DIMENSION_COUNT} dimensions defined
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href={`/product-definitions/${definition.id}/discovery`}
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        {definition.status === "DISCOVERY" ? "Continue discovery" : "Open discovery"}
      </Link>
      <p className="rounded border border-dashed p-4 text-sm text-neutral-500">
        Assumptions, open questions and evidence aren&apos;t extracted as their
        own objects yet — that&apos;s the next build-order item after structured
        state.
      </p>
    </main>
  );
}

function FieldRow({
  label,
  status,
  content,
}: {
  label: string;
  status: string;
  content: string | null;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 font-medium">
        <span>{STATUS_ICON[status] ?? "🔴"}</span>
        <span>{label}</span>
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-neutral-600">
        {content ?? <span className="text-neutral-400">Not yet captured.</span>}
      </p>
    </div>
  );
}
