import { Audiences } from "@/components/marketing/Audiences";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Reveal } from "@/components/Reveal";
import { Words } from "@/components/Words";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Who it is for: stakeholders and product managers",
  description:
    "One definition, two people working on it. Stakeholders answer in plain language; product managers edit, challenge and approve.",
  path: "/who-its-for",
});

export default function WhoPage() {
  return (
    <div className="min-h-dvh">
      <MarketingHeader current="who" />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow wipe">Who it is for</p>
            <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-5xl">
              <Words text="One definition, two people working on it" start={120} />
            </h1>
          </Reveal>
          <Audiences />
        </section>
        <ClosingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
