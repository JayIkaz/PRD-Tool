import { sql } from "drizzle-orm";
import { db } from "./client";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` inside a transaction impersonating the given Supabase auth
 * user: SET LOCAL role authenticated + request.jwt.claims, mirroring
 * what PostgREST does for every request. This is what makes the RLS
 * policies applied in drizzle/0001-0005 the ACTUAL tenant boundary for
 * app queries (addendum Section 36A NFR: "the RLS policy is the actual
 * boundary, application checks are defence in depth") rather than SQL
 * the app's own Postgres connection quietly bypasses.
 *
 * DATABASE_URL connects as a privileged role (Supabase's default
 * `postgres` connection user), which is BYPASSRLS by default — every
 * query run on the plain `db` export from ./client ignores RLS
 * entirely unless wrapped in this. `SET LOCAL ROLE authenticated`
 * narrows the *effective* role for the duration of the transaction, so
 * RLS is evaluated against `authenticated`'s policies rather than the
 * superuser's bypass, and `request.jwt.claims` is what Supabase's
 * built-in `auth.uid()` (and therefore `user_organisation_id()`) reads
 * to resolve the current user.
 *
 * Use this for every per-request query that touches tenant data. Keep
 * using the plain `db` export only for deliberately service-level
 * operations — signup provisioning (see src/lib/auth/provision.ts) and
 * the seed script are the two current cases, both documented in
 * rls-migration-notes.md as service-role operations by design.
 */
export async function withRlsContext<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify({
        sub: userId,
        role: "authenticated",
      })}::text, true)`
    );
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
