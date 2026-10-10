import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { users, organisations } from "@/db/schema";
import { signOut } from "@/app/dashboard/actions";

/**
 * Shared chrome for every signed-in page: a top bar (app name, org,
 * who's signed in, sign out) plus an optional breadcrumb trail. Not a
 * page pattern itself (page-patterns skill: "app chrome is not a
 * page") — every route still owns its own content and layout inside
 * this, just without re-deriving "who am I, what org" and redrawing a
 * slightly different header each time.
 *
 * Re-checks auth independently of whatever the page itself does —
 * same defense-in-depth posture as the RLS boundary (every query is
 * also scoped at the Postgres layer, not just here).
 */

export interface Crumb {
  label: string;
  href?: string;
}

export async function AppShell({
  children,
  crumbs,
}: {
  children: React.ReactNode;
  crumbs?: Crumb[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const identity = await withRlsContext(user.id, async (tx) => {
    const profile = await tx.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!profile) return null;
    const org = await tx.query.organisations.findFirst({
      where: eq(organisations.id, profile.organisationId),
    });
    return { profile, org };
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-neutral-900">
            Product Discovery
          </Link>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            {identity?.org && <span>{identity.org.name}</span>}
            {identity?.profile && (
              <>
                <span className="text-neutral-300">·</span>
                <span>{identity.profile.displayName || identity.profile.email}</span>
              </>
            )}
            <form action={signOut}>
              <button className="rounded border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {crumbs && crumbs.length > 0 && (
          <div className="mx-auto max-w-5xl px-8 pb-2.5 text-xs text-neutral-500">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5">/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-neutral-600 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-neutral-600">{c.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      {children}
    </div>
  );
}
