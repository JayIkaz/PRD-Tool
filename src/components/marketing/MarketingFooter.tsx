import Link from "next/link";
import { MARKETING_LINKS } from "./MarketingHeader";

/** Footer for the public pages. Repeats the section links so small screens, where the nav is hidden, can still reach them. */
export function MarketingFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <span>Product Discovery &amp; Definition Tool</span>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
        {MARKETING_LINKS.map((l) => (
          <Link key={l.key} href={l.href} className="hover:text-neutral-900">
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
