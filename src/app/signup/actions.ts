"use server";

import { createClient } from "@/lib/supabase/server-client";
import { provisionOrganisationAndUser } from "@/lib/auth/provision";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const organisationName = String(formData.get("organisationName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!organisationName) {
    redirect(`/signup?error=${encodeURIComponent("Organisation name is required.")}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { organisation_name: organisationName, display_name: displayName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Email confirmation is Supabase's default — normally there's no
  // session yet and provisioning happens in /auth/callback once the
  // confirmation link is clicked. If confirmation is switched off for
  // this project, a session comes back immediately and the callback
  // route never fires, so provision right here instead.
  if (data.session && data.user) {
    await provisionOrganisationAndUser({
      userId: data.user.id,
      email: data.user.email ?? email,
      organisationName,
      displayName,
    });
    redirect("/dashboard");
  }

  redirect(`/login?magicLinkSent=${encodeURIComponent(email)}`);
}
