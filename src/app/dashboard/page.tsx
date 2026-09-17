import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { users, organisations } from "@/db/schema";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Deliberately RLS-scoped, not the plain db export — this is the
  // proof that tenant isolation is actually enforced at the Postgres
  // layer for a real per-request query, not just declared in SQL that
  // nothing calls (see src/db/rls.ts).
  const data = await withRlsContext(user.id, async (tx) => {
    const profile = await tx.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!profile) return null;
    const org = await tx.query.organisations.findFirst({
      where: eq(organisations.id, profile.organisationId),
    });
    return { profile, org };
  });

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-sm text-sm text-neutral-500">
          Signed in, but no organisation is provisioned for this account yet.
          If you just signed up, confirm your email first — provisioning
          happens on that click.
        </p>
        <form action={signOut}>
          <button className="rounded border px-3 py-2 text-sm">Sign out</button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{data.org?.name}</h1>
          <p className="text-sm text-neutral-500">
            Signed in as {data.profile.displayName || data.profile.email}
          </p>
        </div>
        <form action={signOut}>
          <button className="rounded border px-3 py-2 text-sm">Sign out</button>
        </form>
      </header>
      <p className="text-sm text-neutral-500">
        No Product Definitions yet — the discovery conversation loop is next
        on the build order (README, Stage 1).
      </p>
    </main>
  );
}
