import { eq, and, inArray, desc, asc } from "drizzle-orm";
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
  risks as risksTable,
  dependencies as dependenciesTable,
  challengeReviews as challengeReviewsTable,
  challengeFindings as challengeFindingsTable,
} from "@/db/schema";
import { CompletenessSummary } from "@/components/CompletenessSummary";
import { AppShell } from "@/components/AppShell";
import { ProductDefinitionNav } from "@/components/ProductDefinitionNav";
import { startReview, addDecision, approveDefinition, sendBackToDiscovery } from "../review-actions";
import { runChallenge, reviewFinding } from "../challenge-actions";
import { recordFindingAs } from "../pm-workspace-actions";
import { PmWorkspace } from "@/components/PmWorkspace";
import { CHALLENGE_DISPLAY_GROUPS, type ChallengeFindingCategory } from "@/lib/ai/challenge";

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
      orderBy: [asc(requirementsTable.displayCode)],
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

    const risksList = await tx.query.risks.findMany({
      where: eq(risksTable.productDefinitionId, id),
      orderBy: [asc(risksTable.createdAt)],
    });
    const dependenciesList = await tx.query.dependencies.findMany({
      where: eq(dependenciesTable.productDefinitionId, id),
      orderBy: [asc(dependenciesTable.createdAt)],
    });

    const challengeReviewsList = await tx.query.challengeReviews.findMany({
      where: eq(challengeReviewsTable.productDefinitionId, id),
      orderBy: [desc(challengeReviewsTable.createdAt)],
    });
    const challengeFindingsList =
      challengeReviewsList.length === 0
        ? []
        : await tx.query.challengeFindings.findMany({
            where: inArray(
              challengeFindingsTable.challengeReviewId,
              challengeReviewsList.map((r) => r.id)
            ),
            orderBy: [desc(challengeFindingsTable.createdAt)],
          });

    return {
      definition,
      participants,
      decisionsList,
      reqs,
      dims,
      openQs,
      assumptionsList,
      evidenceList,
      risksList,
      dependenciesList,
      challengeReviewsList,
      challengeFindingsList,
    };
  });

  if (!data) notFound();
  const {
    definition,
    participants,
    decisionsList,
    reqs,
    dims,
    openQs,
    assumptionsList,
    evidenceList,
    risksList,
    dependenciesList,
    challengeReviewsList,
    challengeFindingsList,
  } = data;

  const activeStakeholder = participants.find((p) => p.role === "STAKEHOLDER");
  const activePm = participants.find((p) => p.role === "PM");
  const isStakeholder = activeStakeholder?.userId === user.id;
  const isActivePm = activePm?.userId === user.id;
  const canActAsReviewer = !isStakeholder;

  const latestChallengeReview = challengeReviewsList[0] ?? null;
  const latestFindings = latestChallengeReview
    ? challengeFindingsList.filter((f) => f.challengeReviewId === latestChallengeReview.id)
    : [];
  const findingsByCategory = new Map<ChallengeFindingCategory, typeof latestFindings>();
  for (const f of latestFindings) {
    const list = findingsByCategory.get(f.category as ChallengeFindingCategory) ?? [];
    list.push(f);
    findingsByCategory.set(f.category as ChallengeFindingCategory, list);
  }

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: definition.currentTopic ?? definition.title, href: `/product-definitions/${id}` },
        { label: "Review" },
      ]}
    >
      <main className="page page-narrow">
        <ProductDefinitionNav productDefinitionId={id} active="review" />

        <header>
          <p className="eyebrow">
            PM review · {definition.status.replace(/_/g, " ")}
          </p>
          <h1 className="h1">{definition.currentTopic ?? definition.title}</h1>
        </header>

      {definition.status === "DISCOVERY" && (
        <p className="card-dashed text-sm">
          This hasn&apos;t been submitted for PM review yet.{" "}
          <Link href={`/product-definitions/${id}`} className="underline underline-offset-2 decoration-neutral-400 hover:decoration-neutral-900">
            Go back to the definition
          </Link>{" "}
          to submit it once discovery is far enough along.
        </p>
      )}

      {isStakeholder && definition.status !== "DISCOVERY" && (
        <p className="alert alert-warning">
          You&apos;re the stakeholder on this definition, so you can&apos;t review it too. Someone else in your organisation needs to.
        </p>
      )}

      {canActAsReviewer && definition.status === "AWAITING_PM_REVIEW" && (
        <form action={startReview}>
          <input type="hidden" name="productDefinitionId" value={id} />
          <button className="btn btn-primary self-start">
            Start reviewing
          </button>
        </form>
      )}

      {canActAsReviewer && definition.status === "PM_REVIEW" && !isActivePm && activePm && (
        <p className="card-dashed text-sm">
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
        <PmWorkspace
          productDefinitionId={id}
          canEdit={isActivePm && definition.status === "PM_REVIEW"}
          requirements={reqs}
          dimensions={dims}
          risks={risksList}
          dependencies={dependenciesList}
          openQuestions={openQs}
        />
      )}

      {definition.status !== "DISCOVERY" && (
        <section className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="h2">
              AI Challenge
              {challengeReviewsList.length > 0 &&
                ` (${challengeReviewsList.length} run${challengeReviewsList.length === 1 ? "" : "s"})`}
            </h2>
            {isActivePm && definition.status === "PM_REVIEW" && (
              <form action={runChallenge}>
                <input type="hidden" name="productDefinitionId" value={id} />
                <button className="btn btn-secondary btn-sm">
                  Challenge this definition
                </button>
              </form>
            )}
          </div>

          {!latestChallengeReview ? (
            <p className="text-sm text-neutral-600">
              Not run yet. The AI will go through the whole definition looking for gaps, contradictions, weak outcomes, unconfirmed assumptions and risks. It is blunter here than it is in discovery.
            </p>
          ) : (
            <>
              <p className="text-xs text-neutral-600">
                Latest run: {new Date(latestChallengeReview.createdAt).toLocaleString("en-GB")}
                {latestFindings.length === 0 && " — no substantive findings."}
              </p>
              <div className="grid gap-4">
                {CHALLENGE_DISPLAY_GROUPS.map((group) => {
                  const items = group.categories.flatMap((c) => findingsByCategory.get(c) ?? []);
                  if (items.length === 0) return null;
                  return (
                    <div key={group.heading}>
                      <h3 className="eyebrow">
                        {group.heading}
                      </h3>
                      <ul className="mt-1 grid gap-2">
                        {items.map((f) => (
                          <li key={f.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
                            <p>
                              {f.relatedTo && (
                                <span className="font-medium">{f.relatedTo}: </span>
                              )}
                              {f.statement}
                            </p>
                            {f.status === "PENDING" ? (
                              isActivePm ? (
                                <div className="mt-2 flex gap-2">
                                  <form action={reviewFinding}>
                                    <input type="hidden" name="findingId" value={f.id} />
                                    <input type="hidden" name="productDefinitionId" value={id} />
                                    <input type="hidden" name="decision" value="ACCEPTED" />
                                    <button className="btn btn-primary btn-sm">
                                      Accept
                                    </button>
                                  </form>
                                  {(f.category === "RISK" || f.category === "DEPENDENCY" || f.category === "QUESTION") && (
                                    <form action={recordFindingAs}>
                                      <input type="hidden" name="findingId" value={f.id} />
                                      <input type="hidden" name="productDefinitionId" value={id} />
                                      <input
                                        type="hidden"
                                        name="target"
                                        value={f.category === "QUESTION" ? "QUESTION" : f.category}
                                      />
                                      <button className="btn btn-secondary btn-sm">
                                        {f.category === "RISK"
                                          ? "Record as risk"
                                          : f.category === "DEPENDENCY"
                                            ? "Record as dependency"
                                            : "Record as open question"}
                                      </button>
                                    </form>
                                  )}
                                  <form action={reviewFinding}>
                                    <input type="hidden" name="findingId" value={f.id} />
                                    <input type="hidden" name="productDefinitionId" value={id} />
                                    <input type="hidden" name="decision" value="REJECTED" />
                                    <button className="btn btn-secondary btn-sm">
                                      Reject
                                    </button>
                                  </form>
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-neutral-600">Pending PM review</p>
                              )
                            ) : (
                              <p className="mt-1 text-xs text-neutral-600">
                                {f.status === "ACCEPTED" ? "Accepted" : "Rejected"}
                                {f.pmNote && ` — ${f.pmNote}`}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {definition.status !== "DISCOVERY" && (
        <section className="card grid gap-3 text-sm">
          <h2 className="h2">
            Review decisions ({decisionsList.length})
          </h2>
          {decisionsList.length === 0 ? (
            <p className="text-neutral-600">
              Nothing yet. Anything the PM confirms, challenges or flags during review will appear here.
            </p>
          ) : (
            <ul className="grid gap-2">
              {decisionsList.map((d) => (
                <li key={d.id} className="list-row">
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
                className="field field-sm"
              />
              <textarea
                name="rationale"
                rows={2}
                placeholder="Why (optional)"
                className="field field-sm"
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm self-start"
              >
                Add
              </button>
            </form>
          )}
        </section>
      )}

      {isActivePm && definition.status === "PM_REVIEW" && (
        <section className="card flex flex-col gap-3">
          <h2 className="h2">Decide</h2>
          <form action={approveDefinition}>
            <input type="hidden" name="productDefinitionId" value={id} />
            <button className="btn btn-primary">
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
              className="field field-sm"
            />
            <button
              type="submit"
              className="btn btn-danger self-start"
            >
              Send back to discovery
            </button>
          </form>
        </section>
      )}

      {definition.status === "APPROVED" && (
        <p className="alert alert-success">
          Approved. This definition is now the source of truth for PRD generation.
        </p>
      )}

        <Link href={`/product-definitions/${id}`} className="text-sm text-neutral-600 underline">
          Back to definition
        </Link>
      </main>
    </AppShell>
  );
}
