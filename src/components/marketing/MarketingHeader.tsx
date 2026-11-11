import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { SITE_NAME } from "@/lib/site";

export type MarketingPage = "steps" | "how" | "who";

export const MARKETING_LINKS: { key: MarketingPage; href: string; label: string }[] = [
  { key: "steps", href: "/the-steps", label: "The steps" },
  { key: "how", href: "/how-it-helps", label: "How it helps" },
  { key: "who", href: "/who-its-for", label: "Who it is for" },
];

/** Sticky nav shared by the landing page and the three section pages. */
export function MarketingHeader({ current }: { current?: MarketingPage }) {
  return (
    <header className="sticky top-0 z-30 bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold text-neutral-900">
          <LogoMark className="size-7 shrink-0 text-brand-600" />
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-neutral-700 md:flex">
          {MARKETING_LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={current === l.key ? "page" : undefined}
              className={current === l.key ? "text-neutral-900 underline underline-offset-4" : "hover:text-neutral-900"}
            >
              {l.label}
            </Link>
          ))}
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
  );
}
