"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { evidence as evidenceTable } from "@/db/schema";

/**
 * Evidence is stakeholder-attached supporting material, not something
 * the AI infers from a conversational answer — hence its own manual
 * action rather than living in extraction.ts (Section 15/34).
 *
 * Only URL and FREE_TEXT_NOTE are usable for now — real file upload
 * needs the StorageAdapter interface (addendum #10), not built yet.
 * The type column already supports PDF/WORD_DOC/SPREADSHEET/IMAGE for
 * when that lands; this form deliberately doesn't offer them yet
 * rather than accepting a file it can't actually store anywhere.
 */
export async function addEvidence(formData: FormData) {
  const productDefinitionId = String(formData.get("productDefinitionId") ?? "");
  const type = String(formData.get("type") ?? "");
  const value = String(formData.get("value") ?? "").trim();

  if (!productDefinitionId || !value) {
    redirect(`/product-definitions/${productDefinitionId}`);
  }

  if (type !== "URL" && type !== "FREE_TEXT_NOTE") {
    throw new Error(`Unsupported evidence type: ${type}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await withRlsContext(user.id, async (tx) => {
    await tx.insert(evidenceTable).values({
      productDefinitionId,
      type,
      url: type === "URL" ? value : null,
      note: type === "FREE_TEXT_NOTE" ? value : null,
      uploadedByUserId: user.id,
    });
  });

  redirect(`/product-definitions/${productDefinitionId}`);
}
