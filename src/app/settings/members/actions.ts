"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { getCurrentMember, membershipErrorCode } from "@/lib/auth/current-member";
import { sendEmail } from "@/lib/email/send";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Members page actions. Every permission change runs one of the SECURITY
 * DEFINER functions from drizzle/0014 inside the caller's RLS context, so the
 * database (not this file) decides whether the caller is an admin of the same
 * organisation and whether an admin would be left. The checks here only make
 * the messages friendlier.
 *
 * Notices and errors travel as short keys, never as free text, so nothing a
 * visitor puts in the URL is echoed back as a message.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEMBERS = "/settings/members";
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;

type AdminChange = "grant" | "transfer" | "step-down";
function parseChange(value: unknown): AdminChange | null {
  return value === "grant" || value === "transfer" || value === "step-down" ? value : null;
}

function changeUrl(change: AdminChange, target: string, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ change, ...(target ? { user: target } : {}), ...extra });
  return `${MEMBERS}/admin-change?${q.toString()}`;
}

async function runMembershipFunction(userId: string, call: ReturnType<typeof sql>) {
  try {
    await withRlsContext(userId, (tx) => tx.execute(call));
    return null;
  } catch (error) {
    const code = membershipErrorCode(error);
    if (!code) console.error("membership function failed", error);
    return code ?? "FAILED";
  }
}

export async function inviteMember(formData: FormData) {
  const member = await getCurrentMember();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const isPm = formData.get("isPm") === "on";

  const failed = await runMembershipFunction(
    member.userId,
    sql`select public.invite_member(${email}::text, ${isPm}::boolean)`
  );
  if (failed) redirect(`${MEMBERS}?error=${failed}`);

  const inviter = member.profile.displayName || member.profile.email;
  const sent = await sendEmail({
    to: email,
    subject: `${inviter} invited you to ${member.organisation.name} on ${SITE_NAME}`,
    paragraphs: [
      `${inviter} has invited you to join ${member.organisation.name} on ${SITE_NAME}${isPm ? " as a product manager" : ""}.`,
      `To join, sign up with this email address: ${siteUrl()}/signup?invited=1`,
      "The invite lasts 14 days. If you weren't expecting it, ignore this email.",
    ],
  });

  revalidatePath(MEMBERS);
  redirect(`${MEMBERS}?notice=${sent ? "invite-emailed" : "invite-saved"}`);
}

export async function revokeInvite(formData: FormData) {
  const member = await getCurrentMember();
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!UUID.test(inviteId)) redirect(`${MEMBERS}?error=NOT_FOUND`);

  const failed = await runMembershipFunction(member.userId, sql`select public.revoke_invite(${inviteId}::uuid)`);
  revalidatePath(MEMBERS);
  redirect(failed ? `${MEMBERS}?error=${failed}` : `${MEMBERS}?notice=invite-cancelled`);
}

export async function setMemberPm(formData: FormData) {
  const member = await getCurrentMember();
  const target = String(formData.get("userId") ?? "");
  const isPm = formData.get("isPm") === "true";
  if (!UUID.test(target)) redirect(`${MEMBERS}?error=NOT_MEMBER`);

  const failed = await runMembershipFunction(
    member.userId,
    sql`select public.set_member_pm(${target}::uuid, ${isPm}::boolean)`
  );
  revalidatePath(MEMBERS);
  redirect(failed ? `${MEMBERS}?error=${failed}` : `${MEMBERS}?notice=pm-updated`);
}

/**
 * Step 1 of any admin change: email the signed-in admin a fresh one-time
 * code. A stolen or unattended session is not enough to hand the organisation
 * to someone else; the person also has to be able to read the admin's inbox
 * right now.
 */
export async function requestAdminChangeCode(formData: FormData) {
  const member = await getCurrentMember();
  const change = parseChange(formData.get("change"));
  const target = String(formData.get("userId") ?? "");
  if (!change || (change !== "step-down" && !UUID.test(target))) redirect(MEMBERS);
  if (!member.profile.isAdmin) redirect(`${MEMBERS}?error=NOT_ADMIN`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  redirect(changeUrl(change, target, error ? { error: "CODE_NOT_SENT" } : { sent: "1" }));
}

/** Step 2: check the code, then make the change in the database. */
export async function confirmAdminChange(formData: FormData) {
  const member = await getCurrentMember();
  const change = parseChange(formData.get("change"));
  const target = String(formData.get("userId") ?? "");
  if (!change || (change !== "step-down" && !UUID.test(target))) redirect(MEMBERS);

  const back = (error: string) => redirect(changeUrl(change, target, { sent: "1", error }));

  const token = String(formData.get("token") ?? "").replace(/\s+/g, "");
  if (!/^\d{6,10}$/.test(token)) back("BAD_CODE");

  // For grant and transfer the admin types the other person's email address.
  // It is compared with the row read through RLS, so it has to be a current
  // member of this organisation.
  let targetProfile: { id: string; email: string; displayName: string | null } | null = null;
  if (change !== "step-down") {
    targetProfile =
      (await withRlsContext(member.userId, (tx) =>
        tx.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, target),
          columns: { id: true, email: true, displayName: true },
        })
      )) ?? null;
    if (!targetProfile) redirect(`${MEMBERS}?error=NOT_MEMBER`);
    const typed = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
    if (typed !== targetProfile.email.trim().toLowerCase()) back("EMAIL_MISMATCH");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data, error } = await supabase.auth.verifyOtp({ email: user.email, token, type: "email" });
  if (error || data.user?.id !== member.userId) back("BAD_CODE");

  const failed = await runMembershipFunction(
    member.userId,
    change === "grant"
      ? sql`select public.grant_admin(${target}::uuid)`
      : change === "transfer"
        ? sql`select public.transfer_admin(${target}::uuid)`
        : sql`select public.step_down_admin()`
  );
  if (failed) redirect(`${MEMBERS}?error=${failed}`);

  // Tell both people. The outgoing admin's copy is the alarm if they didn't do it.
  const actor = member.profile.displayName || member.profile.email;
  const other = targetProfile ? targetProfile.displayName || targetProfile.email : null;
  const org = member.organisation.name;
  const what =
    change === "grant"
      ? `${actor} made ${other} an admin of ${org}.`
      : change === "transfer"
        ? `${actor} transferred their admin rights for ${org} to ${other}. ${actor} is no longer an admin.`
        : `${actor} stepped down as an admin of ${org}.`;
  await sendEmail({
    to: [user.email, ...(targetProfile ? [targetProfile.email] : [])],
    subject: `Admin change for ${org} on ${SITE_NAME}`,
    paragraphs: [
      what,
      `If you didn't expect this, tell the people who run ${SITE_NAME} straight away: ${siteUrl()}/settings/help`,
    ],
  });

  revalidatePath(MEMBERS);
  redirect(
    `${MEMBERS}?notice=${change === "grant" ? "admin-granted" : change === "transfer" ? "admin-transferred" : "stepped-down"}`
  );
}
