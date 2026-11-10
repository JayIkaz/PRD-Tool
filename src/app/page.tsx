import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroParticles } from "@/components/HeroParticles";
import { HowItHelpsStory } from "@/components/HowItHelpsStory";
import { LensReplay } from "@/components/LensReplay";
import { LogoMark } from "@/components/LogoMark";
import { MeasureFirst } from "@/components/MeasureFirst";
import { Reveal } from "@/components/Reveal";
import { Words } from "@/components/Words";

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

/*
 * Hero visual: a camera lens pulling focus on the idea. Plays once on load,
 * pure CSS (see "Hero lens" in globals.css). Three stages:
 *   1. Vague idea      - small, heavily blurred, nothing around it yet
 *   2. Questions asked - zooms in, dimensions appear, still soft
 *   3. Defined         - sharp, viewfinder brackets lock green
 * The finished state is the base style, so no-JS and reduced-motion visitors
 * see the sharp, defined version straight away.
 */
const LENS_STAGES = ["Vague idea", "Questions asked", "Defined"];

function DimensionRing() {
  return (
    <div
      className="lens"
      role="img"
      aria-label="A camera lens pulling focus on an idea. It starts as a blurred, vague idea, zooms in as questions are asked, and ends sharp and defined, with seven requirement dimensions around it, each moving from missing to partial to defined"
    >
      <div className="lens-frame" aria-hidden>
        <span className="lens-bracket lens-bracket-tl" />
        <span className="lens-bracket lens-bracket-tr" />
        <span className="lens-bracket lens-bracket-bl" />
        <span className="lens-bracket lens-bracket-br" />
      </div>

      <div className="dimring" aria-hidden>
        <div className="lens-scene">
          <div className="lens-track" />
          <div className="ring-orbit">
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
          <div className="ring-centre">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-neutral-600">Your idea</p>
              <p className="mt-1 font-display text-xs leading-snug text-neutral-900 sm:text-sm">
                &ldquo;Can we automate invoice chasing?&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lens-stages" aria-hidden>
        {LENS_STAGES.map((label, i) => (
          <span key={label} className={`lens-stage lens-stage-${i + 1}`}>
            {label}
          </span>
        ))}
        <span className="lens-bar" />
      </div>

      <LensReplay />
    </div>
  );
}

const PRINCIPLES = [
  {
    title: "It asks before it assumes",
    body: "It goes after whatever is least clear and asks about it, rather than filling the gap with a guess.",
  },
  {
    title: "Facts, guesses and unknowns are labelled",
    body: "Every point is marked as confirmed, assumed or still open, with the evidence behind it. Nobody mistakes a guess for a decision.",
  },
  {
    title: "A person signs it off",
    body: "A product manager reviews it and can ask the AI to look for gaps, conflicts and risks. Nothing is approved until they say so.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      {/* ---------- nav ---------- */}
      <header className="sticky top-0 z-30 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold text-neutral-900">
            <LogoMark className="size-7 shrink-0 text-brand-600" />
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
          <div className="hero-card relative isolate mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-3xl silver-well px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
            <HeroParticles base="31,41,55" tint="100,112,130" />
            <div>
              <p className="wipe text-xs font-semibold uppercase tracking-widest text-neutral-600">
                For ideas that are still fuzzy
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                <Words text="Clarity before commitment" start={250} step={90} />
              </h1>
              <p className="mt-5 max-w-xl text-base text-neutral-700 sm:text-lg">
                Turn a vague idea into a definition your team can review, challenge and approve before development
                starts.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn !rounded-full !bg-neutral-900 !text-white hover:!bg-neutral-800 sm:!px-6">
                  Start with an idea
                </Link>
                <a href="#lifecycle" className="btn !rounded-full !border-neutral-900/40 !text-neutral-900 hover:!bg-neutral-900/10 sm:!px-6">
                  See where it fits
                </a>
              </div>
            </div>
            <DimensionRing />
          </div>
        </section>

        {/* ---------- lifecycle ---------- */}
        <section id="lifecycle" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <Reveal>
              <p className="eyebrow wipe">The usual path</p>
              <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
                <Words text="Eight steps from idea to launch. Mistakes in the first three cost the most." start={120} />
              </h2>
              <p className="mt-3 max-w-2xl text-neutral-600">
                Teams often go from idea straight to design or build, then pay for it in rework. This tool covers the early steps, where a misunderstanding costs least to fix.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <MeasureFirst className="mx-auto w-full max-w-md lg:max-w-none" />
            </Reveal>
          </div>

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
        </section>

        {/* ---------- how it helps: before / after ---------- */}
        <section id="how" className="ink-well py-16 text-white sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <Reveal>
              <p className="wipe text-xs font-semibold uppercase tracking-widest text-brand-100">How it helps</p>
              <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                <Words text="From one sentence to something a PM can review" start={120} />
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
          <Reveal>
            <p className="eyebrow wipe">Who it is for</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
              <Words text="One definition, two people working on it" start={120} />
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Reveal variant="scale" className="card flex flex-col gap-3 !p-6">
              <span className="badge badge-brand self-start">Stakeholders</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You have an idea, not a spec</h3>
              <ul className="grid gap-2 text-sm text-neutral-700">
                <li>Answer in plain language, at your own pace. Come back whenever.</li>
                <li>See what has been captured and what is still missing.</li>
                <li>Add links and notes as evidence. Confirm or correct anything the AI assumed.</li>
              </ul>
            </Reveal>
            <Reveal variant="scale" delay={120} className="card flex flex-col gap-3 !p-6">
              <span className="badge badge-brand self-start">Product managers</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You decide what gets built</h3>
              <ul className="grid gap-2 text-sm text-neutral-700">
                <li>Edit requirements with a reason on record. Track risks, dependencies and open questions.</li>
                <li>Run an AI challenge to find gaps and conflicts, then choose what to act on.</li>
                <li>A full history of who said what and what changed.</li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------- closing call to action ---------- */}
        <section className="px-3 pb-6 sm:px-6">
          <Reveal variant="scale" className="mx-auto max-w-6xl rounded-3xl ink-well px-5 py-12 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
              <Words text="Got an idea that is still a bit fuzzy? Good. Start there." start={200} />
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn !rounded-full !bg-white !text-neutral-900 hover:!bg-brand-50 sm:!px-6">
                Create an account
              </Link>
              <Link href="/login" className="btn !rounded-full !border-white/30 !text-white hover:!bg-white/10 sm:!px-6">
                Log in
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-600 sm:px-8">
        Product Discovery &amp; Definition Tool
      </footer>
    </div>
  );
}
