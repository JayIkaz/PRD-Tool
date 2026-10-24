"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { db } from "@/db/client";
import { suggestTitle } from "@/lib/ai/title";
import {
  productDefinitions,
  productDefinitionParticipants,
  productTypes,
  users,
} from "@/db/schema";

export async function createProductDefinition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let title = String(formData.get("title") ?? "").trim();
  const idea = String(formData.get("idea") ?? "").trim();
  const productTypeKey = String(formData.get("productTypeKey") ?? "");

  if (!idea) {
    redirect(
      `/product-definitions/new?error=${encodeURIComponent("Please describe the idea.")}`
    );
  }

  // Title is optional: if the stakeholder left it blank (or the form's
  // suggestion never arrived), generate one here so it is never empty.
  if (!title) title = await suggestTitle(idea);

  // product_types is global reference data with no RLS (addendum #6) —
  // reading it doesn't need user impersonation, the plain db client is
  // the right tool here, same as the seed script.
  const productType = productTypeKey
    ? await db.query.productTypes.findFirst({ where: eq(productTypes.key, productTypeKey) })
    : undefined;

  const created = await withRlsContext(user.id, async (tx) => {
    const profile = await tx.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!profile) {
      throw new Error("No organisation provisioned for this account yet — confirm your email first.");
    }

    const [definition] = await tx
      .insert(productDefinitions)
      .values({
        organisationId: profile.organisationId,
        productTypeId: productType?.id,
        title,
        idea,
      })
      .returning();

    // The person describing the idea is the stakeholder (Section 30) —
    // addendum #3's join entity, not a fixed FK, so hand-off later is
    // just inserting a new participant row and marking this one FORMER.
    await tx.insert(productDefinitionParticipants).values({
      productDefinitionId: definition.id,
      userId: user.id,
      role: "STAKEHOLDER",
    });

    return definition;
  });

  redirect(`/product-definitions/${created.id}`);
}
