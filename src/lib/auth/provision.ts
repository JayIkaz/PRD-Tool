import { db } from "@/db/client";
import { organisations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * First-login provisioning: creates the Organisation + user row for a
 * brand-new Supabase auth user. Organisation creation is deliberately
 * a service-role operation, not something an authenticated user does
 * via RLS — see 0002_rls_organisations.sql, which gives `organisations`
 * no INSERT policy for the `authenticated` role on purpose. Runs on the
 * plain `db` client for that reason; never call this per-request for
 * anything except first-login provisioning, and never widen it into a
 * general-purpose org-write path.
 *
 * Idempotent: if the user row already exists (e.g. this fires twice —
 * once from the signup action when email confirmation is off, once
 * from the callback route if the confirmation link is also visited),
 * it's a no-op that returns the existing row rather than erroring or
 * creating a second organisation.
 */
export async function provisionOrganisationAndUser(params: {
  userId: string;
  email: string;
  organisationName?: string;
  displayName?: string;
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, params.userId),
  });
  if (existing) return existing;

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organisations)
      .values({
        name: params.organisationName?.trim() || `${params.email}'s organisation`,
      })
      .returning();

    const [user] = await tx
      .insert(users)
      .values({
        id: params.userId,
        organisationId: org.id,
        email: params.email,
        displayName: params.displayName?.trim() || null,
      })
      .returning();

    return user;
  });
}
