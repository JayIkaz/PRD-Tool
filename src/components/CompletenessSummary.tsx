/**
 * Live summary of the structured state extracted so far for a Product
 * Definition — problem/users/outcomes with their completeness icons,
 * plus a requirement list with an N/7 dimensions-defined count. Shared
 * between the detail page and the discovery chat's sidebar so the two
 * views can't drift apart.
 */

const STATUS_ICON: Record<string, string> = {
  MISSING: "🔴",
  PARTIAL: "🟡",
  DEFINED: "🟢",
  CONFIRMED: "✅",
};

const DIMENSION_COUNT = 7;

export interface CompletenessSummaryProps {
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
}

export function CompletenessSummary({ definition, requirements, dimensions }: CompletenessSummaryProps) {
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
          <p className="text-neutral-400">
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
                    <span className="mr-2 text-neutral-400">{r.displayCode}</span>
                    {r.title}
                  </span>
                  <span className="whitespace-nowrap text-xs text-neutral-400">
                    {STATUS_ICON[r.overallStatus]} {definedCount}/{DIMENSION_COUNT}
                  </span>
                </li>
              );
            })}
          </ul>
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
        {content ?? <span className="text-neutral-400">Not yet captured.</span>}
      </p>
    </div>
  );
}
