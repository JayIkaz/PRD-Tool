import Link from "next/link";

/*
 * First page. Modelled on the structure of the reference site: one scrolling
 * page, a slim sticky nav ending in a pill call to action, a large colour
 * field up top, then short sections.
 *
 * Content rule: only claim what the product does today. Steps that are not
 * built yet are marked "Coming next" (PRD and delivery artefact generation,
 * Sections 23-28 of the spec).
 */

type StepStatus = "covered" | "next" | "team";

const STEPS: { n: string; name: string; line: string; help?: string; status: StepStatus }[] = [
  {
    n: "01",
    name: "Idea",
    line: "Someone has a problem, a request or a hunch.",
    help: "Start with whatever you have. It does not need to be polished.",
    status: "covered",
  },
  {
    n: "02",
    name: "Discovery",
    line: "Find out what is really being asked, and for whom.",
    help: "An AI-led conversation asks the next most useful question, one at a time.",
    status: "covered",
  },
  {
    n: "03",
    name: "Definition",
    line: "Turn answers into something precise enough to build from.",
    help: "Problem, users, requirements, assumptions and open questions are kept apart and traced to what was said.",
    status: "covered",
  },
  {
    n: "04",
    name: "Review",
    line: "Someone accountable challenges it before money is spent.",
    help: "A product manager edits, challenges and approves. The AI never changes the definition on its own.",
    status: "covered",
  },
  {
    n: "05",
    name: "PRD and stories",
    line: "Write it up as a PRD, epics, stories and acceptance criteria.",
    help: "Generated from the approved definition, so every story traces back to a requirement.",
    status: "next",
  },
  { n: "06", name: "Design", line: "Shape how it looks and flows.", status: "team" },
  { n: "07", name: "Build and test", line: "Engineers deliver, QA checks it.", status: "team" },
  { n: "08", name: "Launch", line: "Release it and learn what happens.", status: "team" },
];

const PRINCIPLES = [
  {
    title: "It asks, it does not guess",
    body: "The conversation targets whichever area of the definition is thinnest, so gaps get questions instead of invented detail.",
  },
  {
    title: "Facts, assumptions and unknowns stay separate",
    body: "Each point is marked as confirmed, assumed or still open, with the evidence behind it, so nobody mistakes a guess for a decision.",
  },
  {
    title: "A person signs it off",
    body: "A product manager reviews and can run an AI challenge for gaps, conflicts and risks. Nothing is approved until they say so.",
  },
];

function StatusDot({ s }: { s: "defined" | "partial" | "missing" }) {
  const c = s === "defined" ? "bg-emerald-500" : s === "partial" ? "bg-amber-400" : "bg-red-500";
  const label = s === "defined" ? "Defined" : s === "partial" ? "Partial" : "Missing";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
      <span aria-hidden className={`size-2.5 rounded-full ${c}`} />
      {label}
    </span>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh">
      {/* ---------- nav ---------- */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold text-neutral-900">
            <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              PD
            </span>
            Product Discovery
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-neutral-700 md:flex">
            <a href="#lifecycle" className="hover:text-neutral-900">
              The steps
            </a>
            <a href="#how" className="hover:text-neutral-900">
              How it helps
            </a>
            <a href="#who" className="hover:text-neutral-900">
              Who it is for
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm !rounded-full">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- hero: large colour field ---------- */}
        <section className="px-3 sm:px-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-600 px-5 py-14 text-white sm:px-12 sm:py-20 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-100">
              From vague idea to buildable requirement
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Know what you are building before anyone builds it
            </h1>
            <p className="mt-5 max-w-xl text-base text-brand-50 sm:text-lg">
              Most delivery problems start as unclear requests. This tool talks an idea through with you, keeps track
              of what is known and what is not, and hands a product manager something they can review and approve.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn !rounded-full !bg-white !text-brand-800 hover:!bg-brand-50 sm:!px-6">
                Start with an idea
              </Link>
              <a
                href="#lifecycle"
                className="btn !rounded-full !border-white/40 !text-white hover:!bg-white/10 sm:!px-6"
              >
                See where it fits
              </a>
            </div>
          </div>
        </section>

        {/* ---------- lifecycle ---------- */}
        <section id="lifecycle" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <p className="eyebrow">The usual path</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
            Eight steps from idea to launch. The first few decide whether the rest goes well.
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Teams usually jump from idea straight to design or build, and pay for it later in rework. This tool covers
            the early steps, where a misunderstanding is cheapest to fix.
          </p>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => {
              const covered = s.status === "covered";
              const next = s.status === "next";
              return (
                <li
                  key={s.n}
                  className={`flex flex-col gap-2 rounded-2xl border p-4 sm:p-5 ${
                    covered
                      ? "border-brand-200 bg-brand-50"
                      : next
                        ? "border-dashed border-brand-500 bg-white"
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
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------- how it helps: before / after ---------- */}
        <section id="how" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <p className="eyebrow">How it helps</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
              A sentence in, a reviewable definition out
            </h2>
            <p className="mt-3 text-sm text-neutral-600">Illustrative example.</p>

            <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.4fr]">
              <div className="rounded-2xl border border-neutral-200 bg-background p-5 sm:p-6">
                <p className="eyebrow !text-neutral-600">What arrives</p>
                <p className="mt-3 font-display text-xl leading-snug text-neutral-900">
                  &ldquo;Finance spend two days a month chasing late invoices. Can we automate it?&rdquo;
                </p>
                <p className="mt-4 text-sm text-neutral-600">Who gets chased? When? What counts as late? Unknown.</p>
              </div>

              <div aria-hidden className="grid place-items-center text-2xl text-brand-600 lg:rotate-0">
                <span className="rotate-90 lg:rotate-0">→</span>
              </div>

              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
                <p className="eyebrow">What a review gets</p>
                <dl className="mt-3 grid gap-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <dt className="font-semibold text-neutral-900">Problem</dt>
                      <dd className="text-neutral-700">Manual invoice chasing takes two days a month.</dd>
                    </div>
                    <StatusDot s="defined" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <dt className="font-semibold text-neutral-900">
                        <span className="code mr-2">REQ-001</span>Send a reminder before the due date
                      </dt>
                      <dd className="text-neutral-700">4 of 7 dimensions defined</dd>
                    </div>
                    <StatusDot s="partial" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <dt className="font-semibold text-neutral-900">Assumption</dt>
                      <dd className="text-neutral-700">Invoices live in the CRM. Needs confirming.</dd>
                    </div>
                    <StatusDot s="partial" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <dt className="font-semibold text-neutral-900">Open question</dt>
                      <dd className="text-neutral-700">Who approves the reminder wording?</dd>
                    </div>
                    <StatusDot s="missing" />
                  </div>
                </dl>
              </div>
            </div>

            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <li key={p.title} className="rounded-2xl border border-neutral-200 p-5">
                  <h3 className="font-display text-lg font-semibold text-neutral-900">{p.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- who it is for ---------- */}
        <section id="who" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <p className="eyebrow">Who it is for</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
            One definition, two people working on it
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="card flex flex-col gap-3 !p-6">
              <span className="badge badge-brand self-start">Stakeholders</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You have an idea, not a spec</h3>
              <ul className="grid gap-2 text-sm text-neutral-700">
                <li>Answer plain-language questions at your own pace and come back later.</li>
                <li>See what has been captured and what is still missing, at a glance.</li>
                <li>Add evidence such as links and notes, and confirm or correct what the AI assumed.</li>
              </ul>
            </div>
            <div className="card flex flex-col gap-3 !p-6">
              <span className="badge badge-brand self-start">Product managers</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You are accountable for what gets built</h3>
              <ul className="grid gap-2 text-sm text-neutral-700">
                <li>Edit requirements with a recorded reason, and track risks, dependencies and open questions.</li>
                <li>Run an AI challenge to surface gaps and conflicts, then decide what to act on.</li>
                <li>Full history of who said what and what changed, for every definition.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- closing call to action ---------- */}
        <section className="px-3 pb-6 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-3xl bg-neutral-900 px-5 py-12 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Got an idea that is still a bit fuzzy? Good. Start there.
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn !rounded-full !bg-white !text-neutral-900 hover:!bg-brand-50 sm:!px-6">
                Create an account
              </Link>
              <Link href="/login" className="btn !rounded-full !border-white/30 !text-white hover:!bg-white/10 sm:!px-6">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-600 sm:px-8">
        Product Discovery &amp; Definition Tool
      </footer>
    </div>
  );
}
