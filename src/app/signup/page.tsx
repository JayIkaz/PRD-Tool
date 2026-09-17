import Link from "next/link";
import { signUp } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Sign up</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Creates a new organisation with you as its first member.
          </p>
        </div>

        {params.error && (
          <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form action={signUp} className="space-y-3">
          <input
            name="organisationName"
            type="text"
            required
            placeholder="Organisation name"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            name="displayName"
            type="text"
            placeholder="Your name"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
