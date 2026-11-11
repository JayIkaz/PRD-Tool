import { ClosingCta } from "@/components/marketing/ClosingCta";
import { HowItHelps } from "@/components/marketing/HowItHelps";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "How it turns one sentence into a definition",
  description:
    "It asks before it assumes, labels facts, guesses and unknowns, and a product manager signs it off. Nothing is approved until they say so.",
  path: "/how-it-helps",
});

export default function HowItHelpsPage() {
  return (
    <div className="min-h-dvh">
      <MarketingHeader current="how" />
      <main>
        <HowItHelps level="h1" principles />
        <div className="pt-6 sm:pt-10">
          <ClosingCta />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
