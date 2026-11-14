"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The app's main areas. Each is a place in its own right, so none of them is
 * a breadcrumb child of another; breadcrumbs are kept for real containment
 * (a definition and its tabs).
 */
const AREAS = [
  { label: "Definitions", href: "/dashboard", match: ["/dashboard", "/product-definitions"] },
  { label: "Organisation", href: "/settings/members", match: ["/settings/members"] },
  { label: "Help", href: "/settings/help", match: ["/settings/help"] },
];

export function AppNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={className}>
      <ul className="app-nav">
        {AREAS.map((area) => {
          const active = area.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          return (
            <li key={area.href}>
              <Link href={area.href} aria-current={active ? "page" : undefined} className="app-nav-link">
                {area.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
