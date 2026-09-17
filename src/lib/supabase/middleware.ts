import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/product-definitions"];
const AUTH_ONLY_PATHS = ["/login", "/signup"];

/**
 * Refreshes the Supabase session cookie on every request that passes
 * through the middleware matcher (see src/middleware.ts). Required for
 * Supabase SSR auth to work at all in the App Router — without this,
 * server components silently see a stale or missing session.
 *
 * Also enforces the actual route protection: unauthenticated access to
 * a protected prefix redirects to /login, and an authenticated user
 * hitting /login or /signup redirects to /dashboard. This is app-level
 * convenience, not the tenant security boundary — that's Postgres RLS
 * (see src/db/rls.ts and drizzle/0001-0005).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add logic between createServerClient and getUser — this call
  // is what actually refreshes the token; anything before it can read a
  // stale session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
