import { SITE_NAME } from "@/lib/site";

/**
 * Transactional email through Resend's HTTP API. Optional by design: without
 * RESEND_API_KEY nothing is sent and callers get `false`, so they can tell the
 * person what to do instead. Never throws; an email failing must not undo the
 * change it describes.
 *
 * Env:
 *   RESEND_API_KEY  a sending-only key for the verified domain
 *   EMAIL_FROM      optional, defaults to the sign-in sender
 *   SUPPORT_EMAIL   where "contact the platform owner" messages go
 */
const FROM = process.env.EMAIL_FROM ?? `${SITE_NAME} <login@bpmngenie.com>`;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  /** Paragraphs of plain text. Escaped here; do not pass HTML. */
  paragraphs: string[];
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const html = params.paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: params.to,
        subject: params.subject,
        html,
        text: params.paragraphs.join("\n\n"),
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("sendEmail failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("sendEmail failed", error);
    return false;
  }
}
