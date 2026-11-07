import Link from "next/link";
import type { CSSProperties } from "react";
import { HowItHelpsStory } from "@/components/HowItHelpsStory";
import { Reveal } from "@/components/Reveal";

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

// The seven requirement dimensions the tool tracks. The end state of each
// badge is illustrative: most get defined, one stays partial, one stays open,
// because a real definition is rarely complete after one conversation.
const DIMENSIONS: { label: string; end: "defined" | "partial" | "missing" }[] = [
  { label: "User", end: "defined" },
  { label: "Need", end: "defined" },
  { label: "Context", end: "partial" },
  { label: "Behaviour", end: "defined" },
  { label: "Outcome", end: "defined" },
  { label: "Constraints", end: "missing" },
  { label: "Acceptance", end: "partial" },
];

function DimensionRing() {
  return (
    <div
      className="dimring"
      role="img"
      aria-label="Seven requirement dimensions around an idea, each moving from missing to partial to defined as the conversation goes on"
    >
      <div className="ring-orbit" aria-hidden>
        {DIMENSIONS.map((d, i) => (
          <div
            key={d.label}
            className="ring-slot"
            style={{ "--a": `${(360 / DIMENSIONS.length) * i}deg`, "--i": i } as CSSProperties}
          >
            <div className="ring-upright">
              <span className="ring-badge">
                <span className={`ring-dot ${d.end === "partial" ? "is-partial" : d.end === "missing" ? "is-missing" : ""}`} />
                {d.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="ring-centre" aria-hidden>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-brand-100">Your idea</p>
          <p className="mt-1 font-display text-xs leading-snug text-white sm:text-sm">
            &ldquo;Can we automate invoice chasing?&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

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
        {/* ---------- hero: large colour field with the dimension ring ---------- */}
        <section className="px-3 sm:px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-3xl bg-brand-600 px-5 py-14 text-white sm:px-12 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-100">
                From vague idea to buildable requirement
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Clarity before commitment
              </h1>
              <p className="mt-5 max-w-xl text-base text-brand-50 sm:text-lg">
                Turn a vague idea into a definition your team can review, challenge and approve before development
                starts.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn !rounded-full !bg-white !text-brand-800 hover:!bg-brand-50 sm:!px-6">
                  Start with an idea
                </Link>
                <a href="#lifecycle" className="btn !rounded-full !border-white/40 !text-white hover:!bg-white/10 sm:!px-6">
                  See where it fits
                </a>
              </div>
            </div>
            <DimensionRing />
          </div>
        </section>

        {/* ---------- lifecycle ---------- */}
        <section id="lifecycle" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <Reveal>
          <p className="eyebrow">The usual path</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
            Eight steps from idea to launch. The first few decide whether the rest goes well.
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Teams usually jump from idea straight to design or build, and pay for it later in rework. This tool covers
            the early steps, where a misunderstanding is cheapest to fix.
          </p>
          </Reveal>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, idx) => {
              const covered = s.status === "covered";
              const next = s.status === "next";
              return (
                <Reveal
                  as="li"
                  key={s.n}
                  delay={(idx % 4) * 110}
                  className={`flex flex-col gap-2 rounded-2xl border p-4 sm:p-5 ${
                    covered
                      ? "step-covered"
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
                </Reveal>
              );
            })}
          </ol>
        </section>

        {/* ---------- how it helps: before / after ---------- */}
        <section id="how" className="bg-brand-600 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-100">How it helps</p>
              <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                A sentence in, a reviewable definition out
              </h2>
              <p className="mt-3 text-sm text-brand-100">Illustrative example.</p>
            </Reveal>

            <HowItHelpsStory />

            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {PRINCIPLES.map((p, i) => (
                <Reveal as="li" key={p.title} delay={i * 120} className="rounded-2xl bg-white p-5 text-neutral-900">
                  <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{p.body}</p>
                </Reveal>
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
            <Reveal className="card flex flex-col gap-3 !p-6">
              <span className="badge badge-brand self-start">Stakeholders</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You have an idea, not a spec</h3>
              <ul className="grid gap-2 text-sm text-neutral-700">
                <li>Answer plain-language questions at your own pace and come back later.</li>
                <li>See what has been captured and what is still missing, at a glance.</li>
                <li>Add evidence such as links and notes, and confirm or correct what the AI assumed.</li>
              </ul>
            </Reveal>
            <Reveal delay={120} className="card flex flex-col gap-3 !p-6">
              <span className="badge badge-brand self-start">Product managers</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You are accountable for what gets built</h3>
              <ul className="grid gap-2 text-sm text-neutral-700">
                <li>Edit requirements with a recorded reason, and track risks, dependencies and open questions.</li>
                <li>Run an AI challenge to surface gaps and conflicts, then decide what to act on.</li>
                <li>Full history of who said what and what changed, for every definition.</li>
              </ul>
            </Reveal>
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
