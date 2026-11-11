import { ClosingCta } from "@/components/marketing/ClosingCta";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { StepsGrid } from "@/components/marketing/Steps";
import { MeasureFirst } from "@/components/MeasureFirst";
import { Reveal } from "@/components/Reveal";
import { Words } from "@/components/Words";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "The eight steps from idea to launch",
  description:
    "Mistakes in the first three steps cost the most. This tool covers the early ones, idea, discovery, definition and review, where a misunderstanding costs least to fix.",
  path: "/the-steps",
});

export default function StepsPage() {
  return (
    <div className="min-h-dvh">
      <MarketingHeader current="steps" />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <Reveal>
              <p className="eyebrow wipe">The usual path</p>
              <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-5xl">
                <Words text="Eight steps from idea to launch. Mistakes in the first three cost the most." start={120} />
              </h1>
              <p className="mt-3 max-w-2xl text-neutral-600">
                Teams often go from idea straight to design or build, then pay for it in rework. This tool covers the early steps, where a misunderstanding costs least to fix.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <MeasureFirst className="mx-auto w-full max-w-md lg:max-w-none" />
            </Reveal>
          </div>
          <StepsGrid />
        </section>
        <ClosingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
