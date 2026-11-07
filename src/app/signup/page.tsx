import Link from "next/link";
import { signUp } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div>
          <p className="eyebrow">Product Discovery</p>
          <h1 className="h1 mt-1">Sign up</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Creates a new organisation with you as its first member.
          </p>
        </div>

        {params.error && (
          <p role="alert" className="alert alert-error">
            {params.error}
          </p>
        )}

        <form action={signUp} className="grid gap-3">
          <div>
            <label htmlFor="su-org" className="label">
              Organisation name
            </label>
            <input
              id="su-org"
              name="organisationName"
              type="text"
              required
              autoComplete="organization"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="su-name" className="label">
              Your name <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input id="su-name" name="displayName" type="text" autoComplete="name" className="field" />
          </div>
          <div>
            <label htmlFor="su-email" className="label">
              Email
            </label>
            <input
              id="su-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="su-password" className="label">
              Password <span className="font-normal text-neutral-500">(8+ characters)</span>
            </label>
            <input
              id="su-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
