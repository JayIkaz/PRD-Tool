import { eq, and, inArray, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import {
  productDefinitions,
  productDefinitionParticipants,
  decisions as decisionsTable,
  requirements as requirementsTable,
  requirementDimensions as requirementDimensionsTable,
  openQuestions as openQuestionsTable,
  assumptions as assumptionsTable,
  evidence as evidenceTable,
} from "@/db/schema";
import { CompletenessSummary } from "@/components/CompletenessSummary";
import { AppShell } from "@/components/AppShell";
import { ProductDefinitionNav } from "@/components/ProductDefinitionNav";
import { startReview, addDecision, approveDefinition, sendBackToDiscovery } from "../review-actions";

export default async function ReviewPage({
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

    const decisionsList = await tx.query.decisions.findMany({
      where: eq(decisionsTable.productDefinitionId, id),
      orderBy: [desc(decisionsTable.createdAt)],
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

    return { definition, participants, decisionsList, reqs, dims, openQs, assumptionsList, evidenceList };
  });

  if (!data) notFound();
  const { definition, participants, decisionsList, reqs, dims, openQs, assumptionsList, evidenceList } = data;

  const activeStakeholder = participants.find((p) => p.role === "STAKEHOLDER");
  const activePm = participants.find((p) => p.role === "PM");
  const isStakeholder = activeStakeholder?.userId === user.id;
  const isActivePm = activePm?.userId === user.id;
  const canActAsReviewer = !isStakeholder;

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: definition.currentTopic ?? definition.title, href: `/product-definitions/${id}` },
        { label: "Review" },
      ]}
    >
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-8 py-8">
        <ProductDefinitionNav productDefinitionId={id} active="review" />

        <header>
          <p className="text-xs uppercase tracking-wide text-neutral-600">
            PM review · {definition.status.replace(/_/g, " ")}
          </p>
          <h1 className="text-xl font-semibold">{definition.currentTopic ?? definition.title}</h1>
        </header>

      {definition.status === "DISCOVERY" && (
        <p className="rounded border border-neutral-300 border-dashed p-4 text-sm text-neutral-600">
          This hasn&apos;t been submitted for PM review yet.{" "}
          <Link href={`/product-definitions/${id}`} className="underline">
            Go back to the definition
          </Link>{" "}
          to submit it once discovery is far enough along.
        </p>
      )}

      {isStakeholder && definition.status !== "DISCOVERY" && (
        <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You&apos;re the active stakeholder on this definition, so you can&apos;t also review
          it — someone else on your organisation needs to take this one.
        </p>
      )}

      {canActAsReviewer && definition.status === "AWAITING_PM_REVIEW" && (
        <form action={startReview}>
          <input type="hidden" name="productDefinitionId" value={id} />
          <button className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Start reviewing
          </button>
        </form>
      )}

      {canActAsReviewer && definition.status === "PM_REVIEW" && !isActivePm && activePm && (
        <p className="rounded border border-neutral-300 border-dashed p-4 text-sm text-neutral-600">
          Someone else is already reviewing this one.
        </p>
      )}

      {definition.status !== "DISCOVERY" && (
        <CompletenessSummary
          productDefinitionId={id}
          definition={definition}
          requirements={reqs}
          dimensions={dims}
          openQuestions={openQs}
          assumptions={assumptionsList}
          evidence={evidenceList}
          showAssumptionReview={isActivePm}
        />
      )}

      {definition.status !== "DISCOVERY" && (
        <section className="grid gap-3 rounded border border-neutral-300 bg-white shadow-sm p-4 text-sm">
          <h2 className="text-sm font-medium text-neutral-600">
            Review decisions ({decisionsList.length})
          </h2>
          {decisionsList.length === 0 ? (
            <p className="text-neutral-600">
              Nothing recorded yet — anything the PM confirms, challenges or flags while
              reviewing goes here.
            </p>
          ) : (
            <ul className="grid gap-2">
              {decisionsList.map((d) => (
                <li key={d.id} className="border-b pb-2 last:border-b-0">
                  <p>{d.statement}</p>
                  {d.rationale && <p className="mt-0.5 text-xs text-neutral-600">{d.rationale}</p>}
                </li>
              ))}
            </ul>
          )}

          {isActivePm && definition.status === "PM_REVIEW" && (
            <form action={addDecision} className="grid gap-2 border-t pt-3">
              <input type="hidden" name="productDefinitionId" value={id} />
              <label className="text-xs text-neutral-600" htmlFor="decision-statement">
                Record a decision or challenge
              </label>
              <input
                id="decision-statement"
                name="statement"
                required
                placeholder="e.g. Acceptance conditions for REQ-002 are too vague"
                className="rounded border border-neutral-300 px-2 py-1 text-sm"
              />
              <textarea
                name="rationale"
                rows={2}
                placeholder="Why (optional)"
                className="rounded border border-neutral-300 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="self-start rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Add
              </button>
            </form>
          )}
        </section>
      )}

      {isActivePm && definition.status === "PM_REVIEW" && (
        <section className="flex flex-col gap-3 rounded border border-neutral-300 bg-white shadow-sm p-4">
          <h2 className="text-sm font-medium text-neutral-600">Decide</h2>
          <form action={approveDefinition}>
            <input type="hidden" name="productDefinitionId" value={id} />
            <button className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              Approve
            </button>
          </form>
          <form action={sendBackToDiscovery} className="grid gap-2">
            <input type="hidden" name="productDefinitionId" value={id} />
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="Why is this going back to discovery?"
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
            >
              Send back to discovery
            </button>
          </form>
        </section>
      )}

      {definition.status === "APPROVED" && (
        <p className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Approved — this Product Definition is now the source of truth for PRD generation.
        </p>
      )}

        <Link href={`/product-definitions/${id}`} className="text-sm text-neutral-600 underline">
          Back to definition
        </Link>
      </main>
    </AppShell>
  );
}
