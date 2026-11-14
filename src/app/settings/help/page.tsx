import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { withRlsContext } from "@/db/rls";
import { users } from "@/db/schema";
import { AppShell } from "@/components/AppShell";
import { getCurrentMember } from "@/lib/auth/current-member";
import { SITE_NAME } from "@/lib/site";
import { sendSupportRequest } from "./actions";

export const metadata = { title: "Contact us" };

const ERRORS: Record<string, string> = {
  EMPTY: "Write a few words about what you need, then send.",
  FAILED: "Your message didn't send. Try again in a minute.",
};

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const admins = await withRlsContext(me.userId, (tx) =>
    tx.query.users.findMany({
      where: and(eq(users.organisationId, me.profile.organisationId), eq(users.isAdmin, true)),
    })
  );
  const otherAdmins = admins.filter((a) => a.id !== me.userId);
  const error = params.error ? ERRORS[params.error] : undefined;

  return (
    <AppShell
      crumbs={[
        { label: "Product definitions", href: "/dashboard" },
        { label: "Members", href: "/settings/members" },
        { label: "Contact us" },
      ]}
    >
      <main className="page page-narrow">
        <header>
          <p className="eyebrow">{me.organisation.name}</p>
          <h1 className="h1">Contact the people who run {SITE_NAME}</h1>
          <p className="mt-2 text-neutral-700">
            Use this when nobody in your organisation can sort it out. For example: your only admin has left, an admin
            has lost access to their email, or an admin change happened that you didn&apos;t expect.
          </p>
        </header>

        {params.notice === "sent" && (
          <p role="status" className="alert alert-success">
            Message sent. We&apos;ll reply to {me.profile.email}.
          </p>
        )}
        {error && (
          <p role="alert" className="alert alert-error">
            {error}
          </p>
        )}

        {otherAdmins.length > 0 && (
          <p className="card text-sm text-neutral-700">
            For invites and permissions, ask an admin first:{" "}
            {otherAdmins.map((a) => a.displayName || a.email).join(", ")}.
          </p>
        )}

        <form action={sendSupportRequest} className="card grid gap-3">
          <div>
            <label htmlFor="help-message" className="label">
              What do you need help with?
            </label>
            <textarea id="help-message" name="message" required rows={6} maxLength={4000} className="field" />
          </div>
          <p className="text-sm text-neutral-600">
            We&apos;ll see your name, email address and organisation with the message. Before we change who the admin
            is, we&apos;ll check with you that the request is genuine.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary">Send message</button>
            <Link href="/settings/members" className="btn btn-secondary">
              Back to members
            </Link>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
