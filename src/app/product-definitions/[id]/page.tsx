import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { productDefinitions } from "@/db/schema";

export default async function ProductDefinitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const definition = await withRlsContext(user.id, async (tx) => {
    return tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, id),
    });
  });

  // A definition belonging to another organisation comes back as
  // undefined here, not a 403 — RLS makes the row invisible rather than
  // forbidden. notFound() is the right response to both cases.
  if (!definition) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          {definition.status.replace(/_/g, " ")}
        </p>
        <h1 className="text-xl font-semibold">{definition.title}</h1>
      </header>
      <section>
        <h2 className="text-sm font-medium text-neutral-500">Original idea</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm">{definition.idea}</p>
      </section>
      <Link
        href={`/product-definitions/${definition.id}/discovery`}
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        {definition.status === "DISCOVERY" ? "Continue discovery" : "Open discovery"}
      </Link>
      <p className="rounded border border-dashed p-4 text-sm text-neutral-500">
        Requirements, assumptions and open questions aren&apos;t extracted from
        the conversation yet — that&apos;s the next build-order item after the
        discovery loop itself.
      </p>
    </main>
  );
}
