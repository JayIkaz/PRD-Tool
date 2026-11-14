import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { withRlsContext } from "@/db/rls";
import { users } from "@/db/schema";
import { AppShell } from "@/components/AppShell";
import { getCurrentMember } from "@/lib/auth/current-member";
import { requestAdminChangeCode, confirmAdminChange } from "../actions";

export const metadata = { title: "Confirm admin change" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERRORS: Record<string, string> = {
  BAD_CODE: "That code didn't work. It may have expired, so ask for a new one. Nothing has changed.",
  EMAIL_MISMATCH: "That email doesn't match the person you picked. Check it and try again. Nothing has changed.",
  CODE_NOT_SENT: "We couldn't send a code just now. Wait a minute, then try again.",
};

export default async function AdminChangePage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string; user?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const change =
    params.change === "grant" || params.change === "transfer" || params.change === "step-down" ? params.change : null;
  const me = await getCurrentMember();
  if (!change || !me.profile.isAdmin) redirect("/settings/members");

  const targetId = change === "step-down" ? "" : (params.user ?? "");
  if (change !== "step-down" && !UUID.test(targetId)) redirect("/settings/members");

  const target = targetId
    ? await withRlsContext(me.userId, (tx) => tx.query.users.findFirst({ where: eq(users.id, targetId) }))
    : null;
  if (change !== "step-down" && (!target || target.id === me.userId)) redirect("/settings/members?error=NOT_MEMBER");

  const targetName = target ? target.displayName || target.email : "";
  const copy = {
    grant: {
      title: `Make ${targetName} an admin`,
      body: `${targetName} will be able to invite people, choose who is a product manager, and make or transfer admins. You stay an admin.`,
      button: "Make admin",
    },
    transfer: {
      title: `Transfer your admin rights to ${targetName}`,
      body: `${targetName} becomes an admin and you stop being one straight away. You can't undo this yourself: only an admin can make you one again. Your product manager permission doesn't change.`,
      button: "Transfer admin rights",
    },
    "step-down": {
      title: "Step down as admin",
      body: "You stop being an admin straight away. The other admins stay. Only an admin can make you one again.",
      button: "Step down",
    },
  }[change];

  const sent = params.sent === "1";
  const error = params.error ? ERRORS[params.error] : undefined;

  return (
    <AppShell
      crumbs={[
        { label: "Product definitions", href: "/dashboard" },
        { label: "Members", href: "/settings/members" },
        { label: "Confirm" },
      ]}
    >
      <main className="page page-narrow">
        <header>
          <p className="eyebrow">{me.organisation.name}</p>
          <h1 className="h1">{copy.title}</h1>
          <p className="mt-2 text-neutral-700">{copy.body}</p>
        </header>

        {error && (
          <p role="alert" className="alert alert-error">
            {error}
          </p>
        )}

        {!sent ? (
          <form action={requestAdminChangeCode} className="card grid gap-3">
            <input type="hidden" name="change" value={change} />
            <input type="hidden" name="userId" value={targetId} />
            <p className="text-sm text-neutral-700">
              To make sure it&apos;s you, we&apos;ll email a code to {me.profile.email}. Nothing changes until you enter it.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary">Email me a code</button>
              <Link href="/settings/members" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <>
            <form action={confirmAdminChange} className="card grid gap-3">
              <input type="hidden" name="change" value={change} />
              <input type="hidden" name="userId" value={targetId} />
              <div>
                <label htmlFor="change-code" className="label">
                  Code from the email we sent to {me.profile.email}
                </label>
                <input
                  id="change-code"
                  name="token"
                  type="text"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={12}
                  className="field text-center text-lg tracking-[0.35em]"
                />
              </div>
              {target && (
                <div>
                  <label htmlFor="change-confirm" className="label">
                    Type {targetName}&apos;s email address to confirm
                  </label>
                  <input
                    id="change-confirm"
                    name="confirmEmail"
                    type="email"
                    required
                    autoComplete="off"
                    inputMode="email"
                    className="field"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button className={`btn ${change === "grant" ? "btn-primary" : "btn-danger"}`}>{copy.button}</button>
                <Link href="/settings/members" className="btn btn-secondary">
                  Cancel
                </Link>
              </div>
            </form>

            <form action={requestAdminChangeCode}>
              <input type="hidden" name="change" value={change} />
              <input type="hidden" name="userId" value={targetId} />
              <button className="btn btn-ghost btn-sm">Send a new code</button>
            </form>
          </>
        )}
      </main>
    </AppShell>
  );
}
