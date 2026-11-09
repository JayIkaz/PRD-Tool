import Link from "next/link";
import { signInWithPassword, signInWithCode, resendCode, verifyEmailCode } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; codeSent?: string; type?: string; next?: string }>;
}) {
  const params = await searchParams;

  if (params.codeSent) {
    const type = params.type === "signup" ? "signup" : "email";
    const next = params.next ?? "/dashboard";
    return (
      <main className="auth-wrap">
        <div className="auth-card">
          <div>
            <p className="eyebrow">Product Discovery</p>
            <h1 className="h1 mt-1">Enter your code</h1>
            <p className="mt-1 text-sm text-neutral-600">
              We emailed a code to {params.codeSent}. It can take a minute to arrive.
            </p>
          </div>

          {params.error && (
            <p role="alert" className="alert alert-error">
              {params.error}
            </p>
          )}

          <form action={verifyEmailCode} className="grid gap-3">
            <input type="hidden" name="email" value={params.codeSent} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <div>
              <label htmlFor="code" className="label">
                Code from the email
              </label>
              <input
                id="code"
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
            <button type="submit" className="btn btn-primary btn-block">
              Log in
            </button>
          </form>

          <form action={resendCode} className="grid gap-3">
            <input type="hidden" name="email" value={params.codeSent} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="btn btn-secondary btn-block">
              Send a new code
            </button>
          </form>

          <p className="text-center text-sm text-neutral-600">
            Wrong email?{" "}
            <Link href="/login" className="font-semibold text-brand-700 underline underline-offset-2">
              Start again
            </Link>
          </p>
        </div>
      </main>
    );
  }

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

        <form action={signInWithCode} className="grid gap-3">
          <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
          <div>
            <label htmlFor="code-email" className="label">
              Email for a sign-in code
            </label>
            <input
              id="code-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-block">
            Email me a code instead
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
