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
  { key: "history", label: "History" },
] as const;

export function ProductDefinitionNav({
  productDefinitionId,
  active,
}: {
  productDefinitionId: string;
  active: (typeof TABS)[number]["key"];
}) {
  return (
    <nav aria-label="Product definition sections" className="tabs">
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
            aria-current={isActive ? "page" : undefined}
            className="tab"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
