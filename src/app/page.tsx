import Link from "next/link";

export default function Home() {
  return (
    <main className="auth-wrap">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-2xl bg-brand-600 font-display text-lg font-bold text-white shadow-card"
        >
          PD
        </span>
        <h1 className="font-display text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
          Turn a vague idea into a defined product requirement
        </h1>
        <p className="max-w-md text-base text-neutral-600">
          Guided discovery, evidence and assumptions kept apart, and a definition a product manager
          can review before anything is built.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/signup" className="btn btn-primary">
            Sign up
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
