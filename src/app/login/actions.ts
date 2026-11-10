"use server";

import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { provisionOrganisationAndUser } from "@/lib/auth/provision";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next);
}

function codeStep(email: string, type: "email" | "signup", next?: string, error?: string) {
  const q = new URLSearchParams({ codeSent: email, type });
  if (next) q.set("next", next);
  if (error) q.set("error", error);
  return `/login?${q.toString()}`;
}

/**
 * Emails a one-time sign-in code. Whether the email contains a 6-digit code
 * or a clickable link is decided by the Supabase email template (`{{ .Token }}`
 * vs `{{ .ConfirmationURL }}`), not by this call. emailRedirectTo is kept so a
 * template that still has the link keeps working.
 */
export async function signInWithCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeRedirectPath(formData.get("next"));
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(codeStep(email, "email", next));
}

/** Sends a fresh code for either a sign-in or an unconfirmed signup. */
export async function resendCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const type = formData.get("type") === "signup" ? "signup" : "email";
  const next = safeRedirectPath(formData.get("next"));
  const supabase = await createClient();

  const { error } =
    type === "signup"
      ? await supabase.auth.resend({ type: "signup", email })
      : await supabase.auth.signInWithOtp({ email });

  redirect(
    codeStep(
      email,
      type,
      next,
      error ? error.message : undefined
    )
  );
}

export async function verifyEmailCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const type = formData.get("type") === "signup" ? "signup" : "email";
  const next = safeRedirectPath(formData.get("next"));
  const token = String(formData.get("token") ?? "").replace(/\s+/g, "");

  if (!/^\d{6,10}$/.test(token)) {
    redirect(codeStep(email, type, next, "Enter the digits from the email."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type });

  if (error || !data.user) {
    redirect(
      codeStep(
        email,
        type,
        next,
        "That code didn't work. It may have expired, so ask for a new one."
      )
    );
  }

  const metadata = (data.user.user_metadata ?? {}) as {
    organisation_name?: string;
    display_name?: string;
  };
  await provisionOrganisationAndUser({
    userId: data.user.id,
    email: data.user.email ?? email,
    organisationName: metadata.organisation_name,
    displayName: metadata.display_name,
  });

  redirect(next);
}
