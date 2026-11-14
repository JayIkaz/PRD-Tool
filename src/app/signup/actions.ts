"use server";

import { createClient } from "@/lib/supabase/server-client";
import { provisionOrganisationAndUser } from "@/lib/auth/provision";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const organisationName = String(formData.get("organisationName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  // Someone following an invite joins an existing organisation, so they are
  // not asked to name one. Whether an invite really exists is decided at
  // provisioning, against the verified email, never from this flag.
  const invited = formData.get("invited") === "1";

  if (!organisationName && !invited) {
    redirect(`/signup?error=${encodeURIComponent("Add your organisation's name to continue.")}`);
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
    redirect(`/signup?error=${encodeURIComponent(error.message)}${invited ? "&invited=1" : ""}`);
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
      // With confirmation off nobody has proved they own this address, so an
      // invite must not be honoured here.
      emailVerified: Boolean(data.user.email_confirmed_at),
      organisationName,
      displayName,
    });
    redirect("/dashboard");
  }

  redirect(`/login?codeSent=${encodeURIComponent(email)}&type=signup`);
}
