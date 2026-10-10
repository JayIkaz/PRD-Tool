import { eq, and, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import {
  productDefinitions,
  productDefinitionParticipants,
  requirements as requirementsTable,
  requirementDimensions as requirementDimensionsTable,
  openQuestions as openQuestionsTable,
  assumptions as assumptionsTable,
  evidence as evidenceTable,
} from "@/db/schema";
import { CompletenessSummary } from "@/components/CompletenessSummary";
import { AppShell } from "@/components/AppShell";
import { ProductDefinitionNav } from "@/components/ProductDefinitionNav";
import { submitForReview } from "./review-actions";

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

    const participants = await tx.query.productDefinitionParticipants.findMany({
      where: and(
        eq(productDefinitionParticipants.productDefinitionId, id),
        eq(productDefinitionParticipants.status, "ACTIVE")
      ),
    });

    const reqs = await tx.query.requirements.findMany({
      where: eq(requirementsTable.productDefinitionId, id),
    });
    const dims =
      reqs.length === 0
        ? []
        : await tx.query.requirementDimensions.findMany({
            where: inArray(requirementDimensionsTable.requirementId, reqs.map((r) => r.id)),
          });
    const openQs = await tx.query.openQuestions.findMany({
      where: eq(openQuestionsTable.productDefinitionId, id),
    });
    const assumptionsList = await tx.query.assumptions.findMany({
      where: eq(assumptionsTable.productDefinitionId, id),
    });
    const evidenceList = await tx.query.evidence.findMany({
      where: eq(evidenceTable.productDefinitionId, id),
    });

    return { definition, participants, reqs, dims, openQs, assumptionsList, evidenceList };
  });

  // A definition belonging to another organisation comes back as
  // undefined here, not a 403 — RLS makes the row invisible rather than
  // forbidden. notFound() is the right response to both cases.
  if (!data) notFound();
  const { definition, participants, reqs, dims, openQs, assumptionsList, evidenceList } = data;

  const isActiveStakeholder = participants.some(
    (p) => p.role === "STAKEHOLDER" && p.userId === user.id
  );

  return (
    <AppShell
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: definition.currentTopic ?? definition.title }]}
    >
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-8 py-8">
        <ProductDefinitionNav productDefinitionId={definition.id} active="overview" />

        <header>
          <p className="text-xs uppercase tracking-wide text-neutral-600">
            {definition.status.replace(/_/g, " ")}
          </p>
          <h1 className="text-xl font-semibold">{definition.currentTopic ?? definition.title}</h1>
        </header>
        <section>
          <h2 className="text-sm font-medium text-neutral-600">Original idea</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{definition.idea}</p>
        </section>

        <CompletenessSummary
          productDefinitionId={definition.id}
          definition={definition}
          requirements={reqs}
          dimensions={dims}
          openQuestions={openQs}
          assumptions={assumptionsList}
          evidence={evidenceList}
          showAddEvidenceForm
          showAssumptionReview
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/product-definitions/${definition.id}/discovery`}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {definition.status === "DISCOVERY" ? "Continue discovery" : "Open discovery"}
          </Link>

          {definition.status === "DISCOVERY" && isActiveStakeholder && (
            <form action={submitForReview}>
              <input type="hidden" name="productDefinitionId" value={definition.id} />
              <button className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium">
                Submit for PM review
              </button>
            </form>
          )}

          {definition.status !== "DISCOVERY" && (
            <Link
              href={`/product-definitions/${definition.id}/review`}
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
            >
              View PM review
            </Link>
          )}
        </div>

        {assumptionsList.some((a) => a.status === "PENDING") && (
          <p className="rounded border border-neutral-300 border-dashed p-4 text-sm text-neutral-600">
            Some assumptions above are AI-generated and still need review —
            confirm, edit or reject each one.
          </p>
        )}
      </main>
    </AppShell>
  );
}
