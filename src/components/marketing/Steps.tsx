import { Reveal } from "@/components/Reveal";

type StepStatus = "covered" | "next" | "team";

// Start time (ms) for each covered step's sheen and progress rail, so 01 to 04
// light up one after another. Literal strings so Tailwind can see them.
const STEP_START = ["[--sd:400ms]", "[--sd:640ms]", "[--sd:880ms]", "[--sd:1120ms]"];

const STEPS: { n: string; name: string; line: string; help?: string; status: StepStatus }[] = [
  {
    n: "01",
    name: "Idea",
    line: "Someone has a problem, a request or a hunch.",
    help: "Start with whatever you have. Rough is fine.",
    status: "covered",
  },
  {
    n: "02",
    name: "Discovery",
    line: "Find out what is really being asked, and for whom.",
    help: "The assistant asks one question at a time, starting with whatever is least clear.",
    status: "covered",
  },
  {
    n: "03",
    name: "Definition",
    line: "Turn answers into something precise enough to build from.",
    help: "What you know, what you are assuming and what you still need to find out are kept apart, each linked to what was said.",
    status: "covered",
  },
  {
    n: "04",
    name: "Review",
    line: "A person who is accountable challenges it before money is spent.",
    help: "A product manager edits, challenges and approves. The AI cannot change the definition by itself.",
    status: "covered",
  },
  {
    n: "05",
    name: "PRD and stories",
    line: "Write it up as a PRD, epics, stories and acceptance criteria.",
    help: "Drafted from the approved definition, so every story links back to a requirement.",
    status: "next",
  },
  { n: "06", name: "Design", line: "Shape how it looks and flows.", status: "team" },
  { n: "07", name: "Build and test", line: "Engineers deliver, QA checks it.", status: "team" },
  { n: "08", name: "Launch", line: "Release it and learn what happens.", status: "team" },
];

/** The eight-step grid. Steps 01 to 04 light up in turn; 05 is marked as coming next. */
export function StepsGrid() {
  return (
    <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, idx) => {
        const covered = s.status === "covered";
        const next = s.status === "next";
        return (
          <Reveal
            as="li"
            key={s.n}
            delay={(idx % 4) * 110}
            className={`relative flex flex-col gap-2 overflow-hidden rounded-2xl border p-4 sm:p-5 ${
              covered
                ? `step-covered step-live ${STEP_START[idx] ?? ""}`
                : next
                  ? "step-next border-dashed border-brand-500 bg-white"
                  : "border-neutral-200 bg-white/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="code">{s.n}</span>
              {covered && <span className="badge badge-brand">Covered here</span>}
              {next && <span className="badge">Coming next</span>}
              {s.status === "team" && <span className="badge">Your team</span>}
            </div>
            <h3 className="font-display text-lg font-semibold text-neutral-900">{s.name}</h3>
            <p className="text-sm text-neutral-600">{s.line}</p>
            {s.help && (
              <p className="mt-auto border-t border-neutral-200/80 pt-3 text-sm text-neutral-800">{s.help}</p>
            )}
          </Reveal>
        );
      })}
    </ol>
  );
}
