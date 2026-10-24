import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productTypes } from "@/db/schema";
import { AppShell } from "@/components/AppShell";
import { createProductDefinition } from "./actions";
import { NewDefinitionForm } from "./NewDefinitionForm";

export default async function NewProductDefinitionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const types = await db.query.productTypes.findMany({
    where: eq(productTypes.active, true),
  });

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "New Product Definition" }]}>
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-8 py-8">
        <div>
          <h1 className="text-xl font-semibold">New Product Definition</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Start with whatever you&apos;ve got — a rough idea, a request from
            someone else, a problem you&apos;ve noticed. Discovery is what turns
            this into something defined.
          </p>
        </div>

        {params.error && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <NewDefinitionForm
          types={types.map((t) => ({ key: t.key, label: t.label }))}
          action={createProductDefinition}
        />
      </main>
    </AppShell>
  );
}
