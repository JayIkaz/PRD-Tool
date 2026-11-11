import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Words } from "@/components/Words";

export function ClosingCta() {
  return (
    <section className="px-3 pb-6 sm:px-6">
      <Reveal variant="scale" className="mx-auto max-w-6xl rounded-3xl ink-well px-5 py-12 text-center text-white sm:px-12 sm:py-16">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
          <Words text="Got an idea that is still a bit fuzzy? Good. Start there." start={200} />
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn !rounded-full !bg-white !text-neutral-900 hover:!bg-brand-50 sm:!px-6">
            Create an account
          </Link>
          <Link href="/login" className="btn !rounded-full !border-white/30 !text-white hover:!bg-white/10 sm:!px-6">
            Log in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
