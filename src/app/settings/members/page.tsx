import Link from "next/link";
import { asc, desc, eq, isNull, and, gt } from "drizzle-orm";
import { withRlsContext } from "@/db/rls";
import { users, organisationInvites, organisationAuditEvents } from "@/db/schema";
import { AppShell } from "@/components/AppShell";
import { getCurrentMember, MEMBERSHIP_ERROR_COPY } from "@/lib/auth/current-member";
import { emailConfigured } from "@/lib/email/send";
import { SITE_URL } from "@/lib/site";
import { inviteMember, revokeInvite, setMemberPm } from "./actions";

export const metadata = { title: "Members" };

const NOTICES: Record<string, string> = {
  "invite-emailed": "Invite sent. It lasts 14 days.",
  "invite-saved": "Invite saved, but we couldn't email it. Ask them to sign up with that email address using the link below.",
  "invite-cancelled": "Invite cancelled.",
  "pm-updated": "Saved.",
  "admin-granted": "Done. They're now an admin.",
  "admin-transferred": "Done. Your admin rights have been transferred.",
  "stepped-down": "Done. You're no longer an admin.",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const isAdmin = me.profile.isAdmin;

  // RLS decides what comes back: every member can list the organisation's
  // people, only admins get rows from invites and the change log.
  const { members, invites, events } = await withRlsContext(me.userId, async (tx) => {
    const members = await tx.query.users.findMany({
      where: eq(users.organisationId, me.profile.organisationId),
      orderBy: [desc(users.isAdmin), asc(users.createdAt)],
    });
    const invites = await tx.query.organisationInvites.findMany({
      where: and(
        isNull(organisationInvites.acceptedAt),
        isNull(organisationInvites.revokedAt),
        gt(organisationInvites.expiresAt, new Date())
      ),
      orderBy: [desc(organisationInvites.createdAt)],
    });
    const events = await tx.query.organisationAuditEvents.findMany({
      orderBy: [desc(organisationAuditEvents.createdAt)],
      limit: 10,
    });
    return { members, invites, events };
  });

  const admins = members.filter((m) => m.isAdmin);
  const nameOf = (id: string | null) => {
    const m = members.find((x) => x.id === id);
    return m ? m.displayName || m.email : "Someone";
  };
  const notice = params.notice ? NOTICES[params.notice] : undefined;
  const error = params.error
    ? (MEMBERSHIP_ERROR_COPY[params.error] ?? "That didn't go through. Nothing was changed. Try again.")
    : undefined;

  return (
    <AppShell crumbs={[{ label: "Product definitions", href: "/dashboard" }, { label: "Members" }]}>
      <main className="page page-narrow">
        <header>
          <p className="eyebrow">{me.organisation.name}</p>
          <h1 className="h1">Members</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {isAdmin
              ? "Invite people, choose who can review as a product manager, and manage admins."
              : "Everyone in your organisation. Admins can invite people and change permissions."}
          </p>
        </header>

        {notice && (
          <p role="status" className="alert alert-success">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="alert alert-error">
            {error}
          </p>
        )}

        {isAdmin && admins.length === 1 && (
          <p className="alert alert-warning">
            You&apos;re the only admin. If you lose access to your email, nobody here can manage members.{" "}
            {members.length > 1 ? "Make a second person an admin." : "Invite someone, then make them an admin."}
          </p>
        )}

        <section aria-labelledby="people-heading" className="grid gap-3">
          <h2 id="people-heading" className="h2">
            People ({members.length})
          </h2>
          <ul className="card divided grid p-0 sm:p-0">
            {members.map((m) => {
              const isMe = m.id === me.userId;
              return (
                <li key={m.id} className="grid gap-3 p-4 sm:flex sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {m.displayName || m.email}
                      {isMe && <span className="font-normal text-neutral-500"> (you)</span>}
                    </p>
                    {m.displayName && <p className="truncate text-sm text-neutral-600">{m.email}</p>}
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.isAdmin && <span className="badge badge-brand">Admin</span>}
                      {m.isPm && <span className="badge">Product manager</span>}
                      {!m.isAdmin && !m.isPm && <span className="badge">Member</span>}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <form action={setMemberPm}>
                        <input type="hidden" name="userId" value={m.id} />
                        <input type="hidden" name="isPm" value={m.isPm ? "false" : "true"} />
                        <button className="btn btn-secondary btn-sm">
                          {m.isPm ? "Remove as PM" : "Make PM"}
                        </button>
                      </form>
                      {!isMe && !m.isAdmin && (
                        <>
                          <Link
                            href={`/settings/members/admin-change?change=grant&user=${m.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Make admin
                          </Link>
                          <Link
                            href={`/settings/members/admin-change?change=transfer&user=${m.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Transfer my admin rights
                          </Link>
                        </>
                      )}
                      {isMe && admins.length > 1 && (
                        <Link href="/settings/members/admin-change?change=step-down" className="btn btn-danger btn-sm">
                          Step down as admin
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {isAdmin && (
          <section aria-labelledby="invite-heading" className="grid gap-3">
            <h2 id="invite-heading" className="h2">
              Invite someone
            </h2>
            <form action={inviteMember} className="card grid gap-3">
              <div>
                <label htmlFor="invite-email" className="label">
                  Their work email
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  inputMode="email"
                  className="field"
                />
              </div>
              <label className="flex items-start gap-2.5 text-sm text-neutral-800">
                <input type="checkbox" name="isPm" className="mt-0.5 size-4 accent-brand-600" />
                <span>
                  Product manager
                  <span className="block text-neutral-600">Can review, challenge and approve other people&apos;s definitions.</span>
                </span>
              </label>
              <p className="text-sm text-neutral-600">
                They join when they sign up with this exact address.
                {!emailConfigured() && (
                  <>
                    {" "}
                    Invite emails aren&apos;t switched on yet, so send them this link yourself:{" "}
                    <span className="font-medium text-neutral-800">{SITE_URL}/signup?invited=1</span>
                  </>
                )}
              </p>
              <button className="btn btn-primary justify-self-start">Send invite</button>
            </form>

            {invites.length > 0 && (
              <ul className="card divided grid p-0 sm:p-0" aria-label="Invites waiting to be accepted">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">{inv.email}</p>
                      <p className="text-sm text-neutral-600">
                        Invited{inv.isPm ? " as a product manager" : ""}. Expires {dateFormat.format(inv.expiresAt)}.
                      </p>
                    </div>
                    <form action={revokeInvite}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <button className="btn btn-secondary btn-sm">Cancel invite</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isAdmin && events.length > 0 && (
          <section aria-labelledby="changes-heading" className="grid gap-3">
            <h2 id="changes-heading" className="h2">
              Recent changes
            </h2>
            <ul className="card divided grid p-0 text-sm sm:p-0">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <span className="min-w-0 text-neutral-800">
                    {nameOf(e.actorUserId)}: {e.summary}
                    {e.targetEmail && e.targetUserId !== e.actorUserId ? ` (${e.targetEmail})` : ""}
                  </span>
                  <time className="text-neutral-600" dateTime={e.createdAt.toISOString()}>
                    {dateFormat.format(e.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm text-neutral-600">
          {isAdmin ? "Locked out, or something looks wrong? " : "No admin able to help? "}
          <Link href="/settings/help" className="font-semibold text-brand-700 underline underline-offset-2">
            Contact the people who run this service
          </Link>
          .
        </p>
      </main>
    </AppShell>
  );
}
