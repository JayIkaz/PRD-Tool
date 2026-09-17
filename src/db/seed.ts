/**
 * Run with: pnpm db:seed
 *
 * Seeds the pathway configuration (addendum #6), product type
 * catalogue, and a starter discovery question library (Section 10).
 * Idempotent — safe to re-run against an already-seeded database, which
 * matters now that this ran once before the questions table existed.
 *
 * The full worked example from Section 41 — "Allow customers to view
 * their training history and download certificates" — needs a real
 * organisation + user (created via Supabase Auth) to attach to, so it's
 * left as a documented next step rather than faked here with
 * placeholder IDs.
 */
import { eq } from "drizzle-orm";
import { db } from "./client";
import { productTypes, pathwayConfigs, questions } from "./schema";

async function main() {
  console.log("Seeding product types...");

  await db
    .insert(productTypes)
    .values({ key: "GENERAL", label: "General product/feature", category: "PRODUCT_TYPE", active: true })
    .onConflictDoNothing({ target: productTypes.key });

  await db
    .insert(productTypes)
    .values({ key: "AUTOMATION", label: "Automation", category: "PRODUCT_TYPE", active: true })
    .onConflictDoNothing({ target: productTypes.key });

  // onConflictDoNothing().returning() only returns a row when it actually
  // inserted one — on a re-run it returns nothing, so fetch explicitly
  // rather than relying on the insert's own result.
  const general = await db.query.productTypes.findFirst({ where: eq(productTypes.key, "GENERAL") });
  const automation = await db.query.productTypes.findFirst({ where: eq(productTypes.key, "AUTOMATION") });
  if (!general || !automation) throw new Error("Failed to seed or find GENERAL/AUTOMATION product types.");

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
    await db
      .insert(productTypes)
      .values({ key, label, category: "PRODUCT_TYPE", active: false })
      .onConflictDoNothing({ target: productTypes.key });
  }

  console.log("Seeding always-on pathways...");

  const alwaysOnPathways = [
    ["DISCOVERY", "Discovery (core questioning loop)"],
    ["PROBLEM_VALUE", "Problem/value"],
    ["USER_CUSTOMER", "User/customer"],
    ["REQUIREMENTS_BEHAVIOUR", "Requirements/behaviour"],
  ] as const;

  for (const [key, label] of alwaysOnPathways) {
    await db
      .insert(pathwayConfigs)
      .values({ key, label, category: "ALWAYS_ON", active: true })
      .onConflictDoNothing({ target: pathwayConfigs.key });
  }

  console.log("Seeding MVP product-type pathways...");

  await db
    .insert(pathwayConfigs)
    .values({ key: "GENERAL", label: "General product/feature", category: "PRODUCT_TYPE", productTypeId: general.id, active: true })
    .onConflictDoNothing({ target: pathwayConfigs.key });

  await db
    .insert(pathwayConfigs)
    .values({ key: "AUTOMATION", label: "Automation", category: "PRODUCT_TYPE", productTypeId: automation.id, active: true })
    .onConflictDoNothing({ target: pathwayConfigs.key });

  console.log("Seeding discovery question library...");

  // Starter set only, not exhaustive — Section 10's library is meant to
  // grow over time. The AI orchestrator (src/lib/ai/discovery.ts) can
  // draw on these verbatim, adapt them, or generate its own; this just
  // gives it real material for the four always-on pathways plus the two
  // active product types, rather than starting from nothing.
  const existingQuestion = await db.query.questions.findFirst();
  if (existingQuestion) {
    console.log("Question library already seeded — skipping.");
  } else {
    const questionLibrary = [
      // DISCOVERY — opening exploration
      { pathwayKey: "DISCOVERY", area: "opening", promptText: "In your own words, what problem or opportunity made you think about this?", inputType: "free_text" },
      { pathwayKey: "DISCOVERY", area: "opening", promptText: "Has anyone tried to solve this before, inside or outside the organisation?", inputType: "free_text" },

      // PROBLEM_VALUE
      { pathwayKey: "PROBLEM_VALUE", area: "problem", promptText: "What happens today, before this exists? Walk me through the current way this gets handled.", inputType: "free_text" },
      { pathwayKey: "PROBLEM_VALUE", area: "problem", promptText: "Who is affected when this problem happens, and how often?", inputType: "free_text" },
      { pathwayKey: "PROBLEM_VALUE", area: "value", promptText: "If this worked perfectly, what would change for the people affected?", inputType: "free_text" },
      { pathwayKey: "PROBLEM_VALUE", area: "value", promptText: "How will you know this has actually solved the problem, once it's live?", inputType: "free_text" },

      // USER_CUSTOMER
      { pathwayKey: "USER_CUSTOMER", area: "users", promptText: "Who specifically will use this? Describe the person or role, not just \"users\".", inputType: "free_text" },
      { pathwayKey: "USER_CUSTOMER", area: "users", promptText: "Is everyone who uses this the same, or are there different types of user with different needs?", inputType: "free_text" },
      { pathwayKey: "USER_CUSTOMER", area: "context", promptText: "Where and when would someone actually use this — what's happening around them at that moment?", inputType: "free_text" },

      // REQUIREMENTS_BEHAVIOUR — the seven-dimension contract
      { pathwayKey: "REQUIREMENTS_BEHAVIOUR", area: "behaviour", promptText: "Walk me through what should happen, step by step, from the user's point of view.", inputType: "free_text" },
      { pathwayKey: "REQUIREMENTS_BEHAVIOUR", area: "outcome", promptText: "What does success look like for this specific piece, concretely?", inputType: "free_text" },
      { pathwayKey: "REQUIREMENTS_BEHAVIOUR", area: "constraints", promptText: "Is there anything this has to work within — existing systems, timelines, budget, regulation?", inputType: "free_text" },
      { pathwayKey: "REQUIREMENTS_BEHAVIOUR", area: "constraints", promptText: "Is there anything this must NOT do, or any risk you're already worried about?", inputType: "free_text" },
      { pathwayKey: "REQUIREMENTS_BEHAVIOUR", area: "acceptance_conditions", promptText: "How would you or someone else check this was built correctly, if you were testing it?", inputType: "free_text" },

      // GENERAL product type
      { pathwayKey: "GENERAL", area: "scope", promptText: "Is this a brand-new capability, or a change to something that already exists?", inputType: "free_text" },

      // AUTOMATION product type
      { pathwayKey: "AUTOMATION", area: "trigger", promptText: "What should kick this automation off — a schedule, an event, someone doing something?", inputType: "free_text" },
      { pathwayKey: "AUTOMATION", area: "manual_process", promptText: "What does a person currently have to do manually that this would replace or reduce?", inputType: "free_text" },
      { pathwayKey: "AUTOMATION", area: "failure_handling", promptText: "If this automation fails partway through, what should happen — retry, alert someone, roll back?", inputType: "free_text" },
    ] as const;

    await db.insert(questions).values(questionLibrary.map((q) => ({ ...q })));
  }

  console.log("Done. Next: create an organisation + user via Supabase Auth, then build the Section 41 worked example against them.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
