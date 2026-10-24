"use server";

import { createClient } from "@/lib/supabase/server-client";
import { suggestTitle } from "@/lib/ai/title";

/**
 * Called from the new-definition form once the idea field loses focus.
 * Requires a signed-in user so the endpoint cannot be used anonymously
 * to spend AI credit.
 */
export async function suggestTitleAction(idea: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";
  if (typeof idea !== "string" || idea.trim().length < 15) return "";
  return suggestTitle(idea);
}
