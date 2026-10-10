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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-sm text-sm text-neutral-600">
          Signed in, but no organisation is provisioned for this account yet.
          If you just signed up, confirm your email first — provisioning
          happens on that click.
        </p>
      </main>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Product Definitions</h1>
          <Link
            href="/product-definitions/new"
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            New Product Definition
          </Link>
        </div>

        {data.definitions.length === 0 ? (
          <p className="rounded border border-neutral-300 border-dashed p-6 text-center text-sm text-neutral-600">
            No Product Definitions yet — start with whatever idea you&apos;ve got.
          </p>
        ) : (
          <ul className="divide-y rounded border border-neutral-300 bg-white shadow-sm">
            {data.definitions.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/product-definitions/${d.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-100"
                >
                  <span className="font-medium">{d.currentTopic ?? d.title}</span>
                  <span className="text-xs uppercase tracking-wide text-neutral-600">
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
