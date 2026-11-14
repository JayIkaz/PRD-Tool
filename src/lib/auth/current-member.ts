import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { users, organisations } from "@/db/schema";

/**
 * The signed-in person, their row and their organisation, read through RLS on
 * every call. Permissions are never cached in the session or a token, so a
 * removed admin loses the Members controls on their next request.
 */
export async function getCurrentMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const found = await withRlsContext(user.id, async (tx) => {
    const profile = await tx.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!profile) return null;
    const organisation = await tx.query.organisations.findFirst({
      where: eq(organisations.id, profile.organisationId),
    });
    return organisation ? { profile, organisation } : null;
  });
  if (!found) redirect("/dashboard");

  return { userId: user.id, ...found };
}

/** Pulls one of the short codes raised by the 0014 functions out of a database error. */
export function membershipErrorCode(error: unknown): string | null {
  const codes = ["NOT_ADMIN", "NOT_MEMBER", "LAST_ADMIN", "ALREADY_MEMBER", "BAD_EMAIL", "SELF_TARGET", "NOT_FOUND"];
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    const hit = codes.find((c) => message.includes(c));
    if (hit) return hit;
    current = current instanceof Error ? current.cause : null;
  }
  return null;
}

export const MEMBERSHIP_ERROR_COPY: Record<string, string> = {
  NOT_ADMIN: "Only an admin can do that. Your permissions may have changed.",
  NOT_MEMBER: "That person isn't in your organisation any more.",
  LAST_ADMIN: "You're the only admin. Make someone else an admin first, or transfer your admin rights.",
  ALREADY_MEMBER: "That person is already in your organisation.",
  BAD_EMAIL: "That doesn't look like an email address. Check it and try again.",
  SELF_TARGET: "Pick someone other than yourself.",
  NOT_FOUND: "That invite has already been used or cancelled.",
};
