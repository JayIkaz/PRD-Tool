import { eq, and, asc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-client";
import { withRlsContext } from "@/db/rls";
import { productDefinitions, discoverySessions, messages as messagesTable } from "@/db/schema";
import { ensureSessionStarted, sendDiscoveryMessage } from "./actions";

export default async function DiscoveryPage({
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

  // Lazily generates the AI's opening message on first visit — see
  // that function's own comment for why this isn't one transaction.
  await ensureSessionStarted(id);

  const data = await withRlsContext(user.id, async (tx) => {
    const definition = await tx.query.productDefinitions.findFirst({
      where: eq(productDefinitions.id, id),
    });
    if (!definition) return null;

    const session = await tx.query.discoverySessions.findFirst({
      where: and(eq(discoverySessions.productDefinitionId, id), eq(discoverySessions.status, "ACTIVE")),
    });

    const sessionMessages = session
      ? await tx.query.messages.findMany({
          where: eq(messagesTable.discoverySessionId, session.id),
          orderBy: asc(messagesTable.createdAt),
        })
      : [];

    return { definition, messages: sessionMessages };
  });

  if (!data) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Discovery</p>
        <h1 className="text-xl font-semibold">{data.definition.title}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded border p-4">
        {data.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded px-3 py-2 text-sm ${
              m.role === "AI"
                ? "self-start bg-neutral-100 text-neutral-900"
                : "self-end bg-neutral-900 text-white"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <form action={sendDiscoveryMessage} className="flex gap-2">
        <input type="hidden" name="productDefinitionId" value={id} />
        <textarea
          name="content"
          required
          rows={2}
          placeholder="Type your answer..."
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="self-end rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Send
        </button>
      </form>
    </main>
  );
}
