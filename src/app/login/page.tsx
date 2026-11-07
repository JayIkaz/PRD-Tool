import Link from "next/link";
import { signInWithPassword, signInWithMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magicLinkSent?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div>
          <p className="eyebrow">Product Discovery</p>
          <h1 className="h1 mt-1">Log in</h1>
        </div>

        {params.error && (
          <p role="alert" className="alert alert-error">
            {params.error}
          </p>
        )}
        {params.magicLinkSent && (
          <p role="status" className="alert alert-success">
            Magic link sent to {params.magicLinkSent}. Check your inbox.
          </p>
        )}

        <form action={signInWithPassword} className="grid gap-3">
          <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
          <div>
            <label htmlFor="login-email" className="label">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="label">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Log in with password
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-neutral-600">
          <div className="h-px flex-1 bg-neutral-200" />
          or
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form action={signInWithMagicLink} className="grid gap-3">
          <div>
            <label htmlFor="magic-email" className="label">
              Email for a magic link
            </label>
            <input
              id="magic-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-block">
            Send a magic link instead
          </button>
        </form>

        <p className="text-center text-sm text-neutral-600">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-brand-700 underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
