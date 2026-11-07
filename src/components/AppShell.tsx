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

  const orgName = identity?.org?.name;
  const personName = identity?.profile ? identity.profile.displayName || identity.profile.email : null;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-neutral-900"
          >
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white"
            >
              PD
            </span>
            <span className="hidden min-[380px]:inline">Product Discovery</span>
          </Link>

          <div className="flex min-w-0 items-center gap-3 text-sm text-neutral-600">
            <div className="hidden min-w-0 text-right leading-tight sm:block">
              {personName && <p className="truncate font-medium text-neutral-800">{personName}</p>}
              {orgName && <p className="truncate text-xs">{orgName}</p>}
            </div>
            <form action={signOut}>
              <button className="btn btn-secondary btn-sm">Sign out</button>
            </form>
          </div>
        </div>

        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mx-auto max-w-5xl overflow-x-auto px-4 pb-2 text-xs text-neutral-600 [scrollbar-width:none] sm:px-8"
          >
            <ol className="flex items-center whitespace-nowrap">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={i} className="flex items-center">
                    {i > 0 && (
                      <span aria-hidden className="mx-1.5 text-neutral-400">
                        /
                      </span>
                    )}
                    {c.href && !last ? (
                      <Link href={c.href} className="py-1 hover:text-neutral-900 hover:underline">
                        {c.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={last ? "page" : undefined}
                        className={`block max-w-[16rem] truncate py-1 ${last ? "font-medium text-neutral-900" : ""}`}
                      >
                        {c.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </header>

      {children}
    </div>
  );
}
