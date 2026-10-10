import { addEvidence } from "@/app/product-definitions/[id]/evidence-actions";
import { AssumptionReviewRow } from "@/components/AssumptionReviewRow";

/**
 * Live summary of the structured state extracted so far for a Product
 * Definition — problem/users/outcomes with their completeness icons,
 * a requirement list with an N/7 dimensions-defined count, open
 * questions, assumptions (confirm/edit/reject when showAssumptionReview
 * is set — Section 16/17; read-only otherwise, e.g. in the discovery
 * sidebar where that's not the stakeholder's call to make), and
 * evidence. Shared between the detail page and the discovery chat's
 * sidebar so the views can't drift apart.
 */

const STATUS_ICON: Record<string, string> = {
  MISSING: "🔴",
  PARTIAL: "🟡",
  DEFINED: "🟢",
  CONFIRMED: "✅",
};

const DIMENSION_COUNT = 7;

export interface CompletenessSummaryProps {
  productDefinitionId: string;
  definition: {
    problem: string | null;
    problemStatus: string;
    users: string | null;
    usersStatus: string;
    outcomes: string | null;
    outcomesStatus: string;
  };
  requirements: { id: string; displayCode: string; title: string; overallStatus: string }[];
  dimensions: { requirementId: string; state: string }[];
  openQuestions: { id: string; question: string; whyItMatters: string | null; resolvedAt: Date | null }[];
  assumptions: { id: string; displayCode: string; statement: string; reasoning: string | null; status: string }[];
  evidence: { id: string; type: string; url: string | null; note: string | null }[];
  showAddEvidenceForm?: boolean;
  showAssumptionReview?: boolean;
}

export function CompletenessSummary({
  productDefinitionId,
  definition,
  requirements,
  dimensions,
  openQuestions,
  assumptions,
  evidence,
  showAddEvidenceForm = false,
  showAssumptionReview = false,
}: CompletenessSummaryProps) {
  const unresolvedQuestions = openQuestions.filter((q) => !q.resolvedAt);
  const resolvedQuestions = openQuestions.filter((q) => q.resolvedAt);
  const pendingAssumptions = assumptions.filter((a) => a.status === "PENDING");

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">Captured so far</h2>
        <FieldRow label="Problem" status={definition.problemStatus} content={definition.problem} />
        <FieldRow label="Users" status={definition.usersStatus} content={definition.users} />
        <FieldRow label="Outcomes" status={definition.outcomesStatus} content={definition.outcomes} />
      </section>

      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">Requirements ({requirements.length})</h2>
        {requirements.length === 0 ? (
          <p className="text-neutral-500">
            None extracted yet — requirements appear here as the discovery conversation covers them.
          </p>
        ) : (
          <ul className="grid gap-2">
            {requirements.map((r) => {
              const definedCount = dimensions.filter(
                (d) => d.requirementId === r.id && (d.state === "DEFINED" || d.state === "CONFIRMED")
              ).length;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
                  <span>
                    <span className="mr-2 text-neutral-500">{r.displayCode}</span>
                    {r.title}
                  </span>
                  <span className="whitespace-nowrap text-xs text-neutral-500">
                    {STATUS_ICON[r.overallStatus]} {definedCount}/{DIMENSION_COUNT}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">
          Open questions ({unresolvedQuestions.length})
        </h2>
        {unresolvedQuestions.length === 0 ? (
          <p className="text-neutral-500">
            None open — questions appear here when the stakeholder genuinely doesn&apos;t know something yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {unresolvedQuestions.map((q) => (
              <li key={q.id} className="border-b pb-2 last:border-b-0">
                <p>🔴 {q.question}</p>
                {q.whyItMatters && <p className="mt-0.5 text-xs text-neutral-500">{q.whyItMatters}</p>}
              </li>
            ))}
          </ul>
        )}
        {resolvedQuestions.length > 0 && (
          <p className="text-xs text-neutral-500">{resolvedQuestions.length} resolved</p>
        )}
      </section>

      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">
          Assumptions ({assumptions.length}
          {showAssumptionReview && pendingAssumptions.length > 0 ? `, ${pendingAssumptions.length} to review` : ""})
        </h2>
        {assumptions.length === 0 ? (
          <p className="text-neutral-500">
            None yet — only added when the AI is inferring something rather than being told it directly.
          </p>
        ) : (
          <ul className="grid gap-2">
            {assumptions.map((a) =>
              showAssumptionReview ? (
                <AssumptionReviewRow key={a.id} productDefinitionId={productDefinitionId} assumption={a} />
              ) : (
                <li key={a.id} className="border-b pb-2 last:border-b-0">
                  <p>
                    <span className="mr-2 text-neutral-500">{a.displayCode}</span>
                    {a.statement}
                    <span className="ml-2 whitespace-nowrap text-xs text-neutral-500">({a.status})</span>
                  </p>
                  {a.reasoning && <p className="mt-0.5 text-xs text-neutral-500">Why: {a.reasoning}</p>}
                </li>
              )
            )}
          </ul>
        )}
      </section>

      <section className="grid gap-3 rounded border p-4 text-sm">
        <h2 className="text-sm font-medium text-neutral-500">Evidence ({evidence.length})</h2>
        {evidence.length === 0 ? (
          <p className="text-neutral-500">No supporting material attached yet.</p>
        ) : (
          <ul className="grid gap-2">
            {evidence.map((e) => (
              <li key={e.id} className="border-b pb-2 text-neutral-700 last:border-b-0">
                {e.type === "URL" ? (
                  <a href={e.url ?? "#"} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">
                    {e.url}
                  </a>
                ) : (
                  <span className="whitespace-pre-wrap">{e.note}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {showAddEvidenceForm && (
          <form action={addEvidence} className="grid gap-2 border-t pt-3">
            <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
            <label className="text-xs text-neutral-500" htmlFor="evidence-type">
              Add evidence
            </label>
            <select id="evidence-type" name="type" defaultValue="FREE_TEXT_NOTE" className="rounded border px-2 py-1 text-sm">
              <option value="FREE_TEXT_NOTE">Note</option>
              <option value="URL">Link</option>
            </select>
            <textarea
              name="value"
              required
              rows={2}
              placeholder="Paste a link or write a note..."
              className="rounded border px-2 py-1 text-sm"
            />
            <button type="submit" className="self-start rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">
              Add
            </button>
          </form>
        )}
      </section>
    </div>
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
        {content ?? <span className="text-neutral-500">Not yet captured.</span>}
      </p>
    </div>
  );
}
