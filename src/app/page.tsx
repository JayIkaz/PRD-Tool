import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Product Discovery &amp; Definition Tool</h1>
      <p className="max-w-xl text-center text-sm text-neutral-500">
        Turn a vague idea into a defined, traceable product requirement.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded border px-4 py-2 text-sm font-medium">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
