import Link from "next/link";

/**
 * Tab strip shared by the three views of one Product Definition
 * (overview, discovery, review) so moving between them reads as
 * switching tabs within one record, not navigating to a different
 * mini-app each time.
 */

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "discovery", label: "Discovery" },
  { key: "review", label: "Review" },
] as const;

export function ProductDefinitionNav({
  productDefinitionId,
  active,
}: {
  productDefinitionId: string;
  active: (typeof TABS)[number]["key"];
}) {
  return (
    <nav className="flex gap-1 border-b border-neutral-200">
      {TABS.map((tab) => {
        const href =
          tab.key === "overview"
            ? `/product-definitions/${productDefinitionId}`
            : `/product-definitions/${productDefinitionId}/${tab.key}`;
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-600 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
