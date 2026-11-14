"use server";

import { redirect } from "next/navigation";
import { withRlsContext } from "@/db/rls";
import { supportRequests } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth/current-member";
import { sendEmail } from "@/lib/email/send";
import { SITE_NAME } from "@/lib/site";

/**
 * A member's message to whoever runs the service. Stored first (through RLS,
 * as the member), then emailed to SUPPORT_EMAIL if that is configured. The
 * stored row is the record; the email is the nudge.
 */
export async function sendSupportRequest(formData: FormData) {
  const member = await getCurrentMember();
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  if (!message) redirect("/settings/help?error=EMPTY");

  try {
    await withRlsContext(member.userId, (tx) =>
      tx.insert(supportRequests).values({
        organisationId: member.profile.organisationId,
        userId: member.userId,
        message,
      })
    );
  } catch (error) {
    console.error("support request failed", error);
    redirect("/settings/help?error=FAILED");
  }

  const to = process.env.SUPPORT_EMAIL;
  if (to) {
    await sendEmail({
      to,
      replyTo: member.profile.email,
      subject: `${SITE_NAME} help request from ${member.organisation.name}`,
      paragraphs: [
        `From: ${member.profile.displayName || member.profile.email} <${member.profile.email}>`,
        `Organisation: ${member.organisation.name} (${member.profile.organisationId})`,
        `Admin: ${member.profile.isAdmin ? "yes" : "no"}. Product manager: ${member.profile.isPm ? "yes" : "no"}.`,
        message,
      ],
    });
  }

  redirect("/settings/help?notice=sent");
}
