import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productTypes } from "@/db/schema";
import { createProductDefinition } from "./actions";

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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold">New Product Definition</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Start with whatever you&apos;ve got — a rough idea, a request from
          someone else, a problem you&apos;ve noticed. Discovery is what turns
          this into something defined.
        </p>
      </div>

      {params.error && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={createProductDefinition} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            name="title"
            type="text"
            required
            placeholder="A short working name"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">What&apos;s the idea?</label>
          <textarea
            name="idea"
            required
            rows={6}
            placeholder="Describe it however it currently exists in your head — it doesn't need to be polished."
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Product type</label>
          <select name="productTypeKey" className="w-full rounded border px-3 py-2 text-sm">
            <option value="">Not sure yet</option>
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Start discovery
        </button>
      </form>
    </main>
  );
}
