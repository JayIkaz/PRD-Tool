/**
 * Run with: pnpm db:seed
 *
 * Seeds the pathway configuration (addendum #6) and product type
 * catalogue. The full worked example from Section 41 — "Allow
 * customers to view their training history and download certificates"
 * — needs a real organisation + user (created via Supabase Auth) to
 * attach to, so it's left as a documented next step rather than faked
 * here with placeholder IDs.
 */
import { db } from "./client";
import { productTypes, pathwayConfigs } from "./schema";

async function main() {
  console.log("Seeding product types...");

  const [general] = await db
    .insert(productTypes)
    .values({ key: "GENERAL", label: "General product/feature", category: "PRODUCT_TYPE", active: true })
    .returning();

  const [automation] = await db
    .insert(productTypes)
    .values({ key: "AUTOMATION", label: "Automation", category: "PRODUCT_TYPE", active: true })
    .returning();

  // Defined but not activated (addendum #6) — named entries, no question
  // library content behind them yet. Extending later is a config
  // addition, not a re-architecture.
  const dormantTypes = [
    ["CRM", "CRM"],
    ["DATA_REPORTING", "Data/reporting"],
    ["UX", "UX"],
    ["TECHNICAL", "Technical"],
    ["INTEGRATION", "Integration"],
    ["SECURITY", "Security"],
    ["COMPLIANCE", "Compliance"],
    ["RISK", "Risk"],
    ["QA", "QA"],
    ["DELIVERY", "Delivery"],
  ] as const;

  for (const [key, label] of dormantTypes) {
    await db.insert(productTypes).values({ key, label, category: "PRODUCT_TYPE", active: false });
  }

  console.log("Seeding always-on pathways...");

  const alwaysOnPathways = [
    ["DISCOVERY", "Discovery (core questioning loop)"],
    ["PROBLEM_VALUE", "Problem/value"],
    ["USER_CUSTOMER", "User/customer"],
    ["REQUIREMENTS_BEHAVIOUR", "Requirements/behaviour"],
  ] as const;

  for (const [key, label] of alwaysOnPathways) {
    await db.insert(pathwayConfigs).values({ key, label, category: "ALWAYS_ON", active: true });
  }

  console.log("Seeding MVP product-type pathways...");

  await db.insert(pathwayConfigs).values([
    { key: "GENERAL", label: "General product/feature", category: "PRODUCT_TYPE", productTypeId: general.id, active: true },
    { key: "AUTOMATION", label: "Automation", category: "PRODUCT_TYPE", productTypeId: automation.id, active: true },
  ]);

  console.log("Done. Next: create an organisation + user via Supabase Auth, then build the Section 41 worked example against them.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
