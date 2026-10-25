import { DIMENSION_KEYS, DIMENSION_LABELS, type DimensionKey } from "@/lib/definition/dimensions";
import {
  editRequirement,
  addRisk,
  removeRisk,
  addDependency,
  removeDependency,
  addOpenQuestion,
  resolveOpenQuestion,
} from "@/app/product-definitions/[id]/pm-workspace-actions";

/**
 * PM workspace (Section 20): requirements the PM can edit, plus risks,
 * dependencies and open questions the PM can add. Editing controls only
 * render when `canEdit` is true (active PM, definition in PM review);
 * otherwise this is a read-only view. The server actions re-check both
 * conditions, so hiding the forms is a convenience, not the guard.
 */

const STATUS_ICON: Record<string, string> = {
  MISSING: "🔴",
  PARTIAL: "🟡",
  DEFINED: "🟢",
  CONFIRMED: "✅",
};

const RISK_CATEGORIES = ["delivery", "customer", "data", "operational", "compliance"];

const inputCls = "rounded-lg border border-neutral-300 px-2 py-1 text-sm";
const smallBtn = "self-start rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white";
const ghostBtn = "rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-600";

export interface PmWorkspaceProps {
  productDefinitionId: string;
  canEdit: boolean;
  requirements: {
    id: string;
    displayCode: string;
    version: number;
    title: string;
    overallStatus: string;
    changeReason: string | null;
  }[];
  dimensions: {
    requirementId: string;
    dimensionType: string;
    state: string;
    content: string | null;
  }[];
  risks: { id: string; statement: string; category: string | null }[];
  dependencies: { id: string; statement: string }[];
  openQuestions: {
    id: string;
    question: string;
    whyItMatters: string | null;
    resolvedAt: Date | null;
    resolutionAnswerText: string | null;
  }[];
}

export function PmWorkspace({
  productDefinitionId,
  canEdit,
  requirements,
  dimensions,
  risks,
  dependencies,
  openQuestions,
}: PmWorkspaceProps) {
  const unresolved = openQuestions.filter((q) => !q.resolvedAt);
  const resolved = openQuestions.filter((q) => q.resolvedAt);

  return (
    <>
      <section className="flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-600">Requirements ({requirements.length})</h2>
        {requirements.length === 0 ? (
          <p className="text-sm text-neutral-600">No requirements have been captured yet.</p>
        ) : (
          <ul className="grid gap-2">
            {requirements.map((r) => {
              const dimsFor = new Map(
                dimensions.filter((d) => d.requirementId === r.id).map((d) => [d.dimensionType, d])
              );
              return (
                <li key={r.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                  <details>
                    <summary className="cursor-pointer list-none">
                      <span className="mr-1">{STATUS_ICON[r.overallStatus] ?? ""}</span>
                      <span className="font-medium">{r.displayCode}</span>{" "}
                      <span className="text-xs text-neutral-500">v{r.version}</span>: {r.title}
                      <span className="ml-2 text-xs text-neutral-600 underline">
                        {canEdit ? "Edit" : "View"}
                      </span>
                    </summary>

                    {canEdit ? (
                      <form action={editRequirement} className="mt-3 grid gap-3">
                        <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
                        <input type="hidden" name="requirementId" value={r.id} />
                        <label className="grid gap-1 text-xs text-neutral-600">
                          Title
                          <input name="title" required maxLength={200} defaultValue={r.title} className={inputCls} />
                        </label>
                        {DIMENSION_KEYS.map((key: DimensionKey) => {
                          const d = dimsFor.get(key);
                          return (
                            <div key={key} className="grid gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-medium text-neutral-700" htmlFor={`${r.id}-${key}`}>
                                  {DIMENSION_LABELS[key]}
                                </label>
                                <select
                                  name={`dim_${key}_state`}
                                  defaultValue={d?.state ?? "MISSING"}
                                  className="rounded-lg border border-neutral-300 px-1 py-0.5 text-xs"
                                  aria-label={`${DIMENSION_LABELS[key]} status`}
                                >
                                  <option value="MISSING">Missing</option>
                                  <option value="PARTIAL">Partial</option>
                                  <option value="DEFINED">Defined</option>
                                  <option value="CONFIRMED">Confirmed by PM</option>
                                </select>
                              </div>
                              <textarea
                                id={`${r.id}-${key}`}
                                name={`dim_${key}_content`}
                                rows={2}
                                maxLength={2000}
                                defaultValue={d?.content ?? ""}
                                className={inputCls}
                              />
                            </div>
                          );
                        })}
                        <label className="grid gap-1 text-xs text-neutral-600">
                          Why are you changing this? (recorded in History)
                          <input name="changeReason" required maxLength={2000} className={inputCls} />
                        </label>
                        <p className="text-xs text-neutral-500">
                          Leaving a box empty marks that dimension as missing. Confirmed dimensions are
                          never overwritten by later AI discovery.
                        </p>
                        <button type="submit" className={smallBtn}>
                          Save changes
                        </button>
                      </form>
                    ) : (
                      <dl className="mt-3 grid gap-2 text-xs">
                        {DIMENSION_KEYS.map((key: DimensionKey) => {
                          const d = dimsFor.get(key);
                          return (
                            <div key={key}>
                              <dt className="font-medium text-neutral-700">
                                {STATUS_ICON[d?.state ?? "MISSING"]} {DIMENSION_LABELS[key]}
                              </dt>
                              <dd className="text-neutral-600">{d?.content || "Not defined yet"}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}
                    {r.changeReason && r.version > 1 && (
                      <p className="mt-2 text-xs text-neutral-500">Last change: {r.changeReason}</p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-600">Risks ({risks.length})</h2>
        {risks.length === 0 && <p className="text-sm text-neutral-600">No risks recorded yet.</p>}
        <ul className="grid gap-2">
          {risks.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
              <p>
                {r.category && (
                  <span className="mr-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs uppercase text-neutral-600">
                    {r.category}
                  </span>
                )}
                {r.statement}
              </p>
              {canEdit && (
                <form action={removeRisk}>
                  <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
                  <input type="hidden" name="riskId" value={r.id} />
                  <button className={ghostBtn}>Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addRisk} className="grid gap-2 border-t pt-3">
            <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
            <label className="text-xs text-neutral-600" htmlFor="risk-statement">
              Add a risk
            </label>
            <textarea id="risk-statement" name="statement" required rows={2} maxLength={2000} className={inputCls} />
            <select name="category" className={inputCls} aria-label="Risk category" defaultValue="">
              <option value="">No category</option>
              {RISK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <button type="submit" className={smallBtn}>
              Add risk
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-600">Dependencies ({dependencies.length})</h2>
        {dependencies.length === 0 && <p className="text-sm text-neutral-600">No dependencies recorded yet.</p>}
        <ul className="grid gap-2">
          {dependencies.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
              <p>{d.statement}</p>
              {canEdit && (
                <form action={removeDependency}>
                  <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
                  <input type="hidden" name="dependencyId" value={d.id} />
                  <button className={ghostBtn}>Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addDependency} className="grid gap-2 border-t pt-3">
            <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
            <label className="text-xs text-neutral-600" htmlFor="dep-statement">
              Add a dependency (external system, team, data or process)
            </label>
            <textarea id="dep-statement" name="statement" required rows={2} maxLength={2000} className={inputCls} />
            <button type="submit" className={smallBtn}>
              Add dependency
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-600">
          Open questions ({unresolved.length} open, {resolved.length} resolved)
        </h2>
        {openQuestions.length === 0 && <p className="text-sm text-neutral-600">No open questions.</p>}
        <ul className="grid gap-2">
          {unresolved.map((q) => (
            <li key={q.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
              <p>{q.question}</p>
              {q.whyItMatters && <p className="mt-0.5 text-xs text-neutral-600">Why it matters: {q.whyItMatters}</p>}
              {canEdit && (
                <form action={resolveOpenQuestion} className="mt-2 flex gap-2">
                  <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
                  <input type="hidden" name="questionId" value={q.id} />
                  <input
                    name="answer"
                    required
                    maxLength={2000}
                    placeholder="Answer that resolves this"
                    aria-label="Resolving answer"
                    className={`${inputCls} flex-1`}
                  />
                  <button className={smallBtn}>Resolve</button>
                </form>
              )}
            </li>
          ))}
          {resolved.map((q) => (
            <li key={q.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm text-neutral-600">
              <p className="line-through">{q.question}</p>
              {q.resolutionAnswerText && <p className="mt-0.5 text-xs">Answer: {q.resolutionAnswerText}</p>}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addOpenQuestion} className="grid gap-2 border-t pt-3">
            <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
            <label className="text-xs text-neutral-600" htmlFor="oq-question">
              Add an open question
            </label>
            <textarea id="oq-question" name="question" required rows={2} maxLength={2000} className={inputCls} />
            <input name="whyItMatters" maxLength={2000} placeholder="Why it matters (optional)" className={inputCls} />
            <button type="submit" className={smallBtn}>
              Add question
            </button>
          </form>
        )}
      </section>
    </>
  );
}
