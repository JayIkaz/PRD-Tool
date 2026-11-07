import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { users } from "@/db/schema";
import { AppShell } from "@/components/AppShell";

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
    const definitions = await tx.query.productDefinitions.findMany({
      orderBy: (pd, { desc }) => [desc(pd.updatedAt)],
    });
    return { profile, definitions };
  });

  if (!data) {
    return (
      <main className="auth-wrap text-center">
        <p className="alert alert-warning max-w-sm">
          Signed in, but no organisation is provisioned for this account yet.
          If you just signed up, confirm your email first — provisioning
          happens on that click.
        </p>
      </main>
    );
  }

  return (
    <AppShell>
      <main className="page page-wide">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="h1">Product Definitions</h1>
          <Link href="/product-definitions/new" className="btn btn-primary">
            New Product Definition
          </Link>
        </div>

        {data.definitions.length === 0 ? (
          <p className="card-dashed text-sm">
            No Product Definitions yet. Start with whatever idea you&apos;ve got.
          </p>
        ) : (
          <ul className="grid gap-3">
            {data.definitions.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/product-definitions/${d.id}`}
                  className="card flex flex-col gap-2 transition-shadow hover:shadow-pop sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="font-display text-base font-semibold text-neutral-900">
                    {d.currentTopic ?? d.title}
                  </span>
                  <span className="badge badge-brand self-start sm:self-auto">
                    {d.status.replace(/_/g, " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
