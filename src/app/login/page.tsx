import Link from "next/link";
import { signInWithPassword, signInWithMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magicLinkSent?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-semibold">Log in</h1>

        {params.error && (
          <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {params.error}
          </p>
        )}
        {params.magicLinkSent && (
          <p className="rounded border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-700">
            Magic link sent to {params.magicLinkSent} — check your inbox.
          </p>
        )}

        <form action={signInWithPassword} className="space-y-3">
          <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
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
            placeholder="Password"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Log in with password
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          or
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form action={signInWithMagicLink} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded border px-3 py-2 text-sm font-medium"
          >
            Send a magic link instead
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          No account? <Link href="/signup" className="underline">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
