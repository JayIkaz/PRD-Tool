import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-client";
import { provisionOrganisationAndUser } from "@/lib/auth/provision";

/**
 * Handles both flows that land here: an email-confirmation link from
 * signup, and a magic-link sign-in from /login. Both use Supabase's
 * PKCE `code` exchange. provisionOrganisationAndUser is a no-op for an
 * existing user, so it's safe to call unconditionally rather than
 * branching on which flow this was.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const metadata = data.user.user_metadata as {
        organisation_name?: string;
        display_name?: string;
      };

      await provisionOrganisationAndUser({
        userId: data.user.id,
        email: data.user.email ?? "",
        // A magic-link sign-in (as opposed to signup) carries no
        // organisation_name metadata — provisionOrganisationAndUser
        // falls back to a per-user default name in that case.
        organisationName: metadata.organisation_name,
        displayName: metadata.display_name,
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not authenticate. Try again.")}`
  );
}
