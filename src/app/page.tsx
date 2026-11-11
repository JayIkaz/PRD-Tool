import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroParticles } from "@/components/HeroParticles";
import { LensReplay } from "@/components/LensReplay";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { HowItHelps } from "@/components/marketing/HowItHelps";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MeasureFirst } from "@/components/MeasureFirst";
import { Reveal } from "@/components/Reveal";
import { Words } from "@/components/Words";
import { SITE_NAME } from "@/lib/site";

/*
 * First page. Modelled on the structure of the reference site: one scrolling
 * page, a slim sticky nav ending in a pill call to action, a large colour
 * field up top, then short sections.
 *
 * Content rule: only claim what the product does today. Steps that are not
 * built yet are marked "Coming next" (PRD and delivery artefact generation,
 * Sections 23-28 of the spec).
 */

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

const TITLE = "Product Discovery & Definition Tool";
const DESCRIPTION =
  "Turn a vague idea into a definition your team can review, challenge and approve before development starts.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: SITE_NAME, type: "website" },
};

export default function Home() {
  return (
    <div className="min-h-dvh">
      <MarketingHeader />

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

          <p className="mt-10">
            <Link href="/the-steps" className="btn btn-secondary btn-sm !rounded-full">
              See all eight steps
            </Link>
          </p>
        </section>

        {/* ---------- how it helps: before / after (principles live on /how-it-helps) ---------- */}
        <HowItHelps level="h2" principles={false}>
          <p className="mt-10">
            <Link href="/how-it-helps" className="btn !rounded-full !border-white/30 !text-white hover:!bg-white/10">
              Why you can trust what it produces
            </Link>
          </p>
        </HowItHelps>

        {/* ---------- who it is for ---------- */}
        <section id="who" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow wipe">Who it is for</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
              <Words text="One definition, two people working on it" start={120} />
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Reveal variant="scale" className="card flex flex-col gap-2 !p-6">
              <span className="badge badge-brand self-start">Stakeholders</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You have an idea, not a spec</h3>
              <p className="text-sm text-neutral-700">Answer in plain language, at your own pace, and see what is still missing.</p>
            </Reveal>
            <Reveal variant="scale" delay={120} className="card flex flex-col gap-2 !p-6">
              <span className="badge badge-brand self-start">Product managers</span>
              <h3 className="font-display text-xl font-semibold text-neutral-900">You decide what gets built</h3>
              <p className="text-sm text-neutral-700">Edit, challenge and approve, with a full history of what changed.</p>
            </Reveal>
          </div>
          <p className="mt-6">
            <Link href="/who-its-for" className="btn btn-secondary btn-sm !rounded-full">
              What each role does
            </Link>
          </p>
        </section>

        <ClosingCta />
      </main>

      <MarketingFooter />
    </div>
  );
}
