/**
 * Only allow same-site relative paths as post-login redirect targets.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), the
 * userinfo trick ("@evil.com" appended to an origin), backslash tricks
 * some browsers normalise to "/", and control characters.
 */
export function safeRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  return next;
}
