"use client";

import { useEffect, useOptimistic, useRef } from "react";

type ChatMessage = { id: string; role: string; content: string };

/**
 * The chat transcript plus the composer, as one client component so a
 * sent message can appear immediately (optimistic) and a "thinking"
 * indicator can show while the server works. The AI round trip takes a
 * while (reply + extraction + DB writes), and without this the page
 * looks frozen after pressing Enter.
 *
 * Enter sends, Shift+Enter inserts a newline. The textarea is cleared
 * and disabled as soon as a message is sent, so it is obvious the send
 * registered and it cannot be double-submitted.
 */
export function DiscoveryChat({
  productDefinitionId,
  messages,
  action,
}: {
  productDefinitionId: string;
  messages: ChatMessage[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Both the sent message and the "thinking" placeholder are optimistic
  // state, not useState: a form action runs inside a React transition,
  // and ordinary setState calls made there are held back until the whole
  // (slow) server action finishes -- which is exactly when we no longer
  // need them. Optimistic state renders immediately and reverts on its
  // own once the real messages arrive.
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (current: ChatMessage[], content: string) => [
      ...current,
      { id: `pending-user-${current.length}`, role: "STAKEHOLDER", content },
      { id: "pending-ai", role: "PENDING", content: "" },
    ]
  );
  const pending = optimisticMessages[optimisticMessages.length - 1]?.role === "PENDING";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [optimisticMessages.length, pending]);

  // Real messages arriving means the round trip finished.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [messages.length]);

  async function handleSubmit(formData: FormData) {
    const content = String(formData.get("content") ?? "").trim();
    if (!content || pending) return;
    addOptimistic(content);
    formRef.current?.reset();
    // On success the page re-renders with the real messages; on failure
    // the server redirects back with a banner. Either way the optimistic
    // entries are discarded automatically when this action settles.
    await action(formData);
  }

  return (
    <div className="flex min-h-[65vh] flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
        {optimisticMessages.map((m) =>
          m.role === "PENDING" ? (
            <div
              key={m.id}
              role="status"
              aria-live="polite"
              className="self-start rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600"
            >
              Thinking about your answer
              <span className="ml-1 inline-flex gap-0.5" aria-hidden="true">
                <span className="animate-pulse">.</span>
                <span className="animate-pulse [animation-delay:150ms]">.</span>
                <span className="animate-pulse [animation-delay:300ms]">.</span>
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                This can take up to half a minute.
              </span>
            </div>
          ) : (
            <div
              key={m.id}
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "AI"
                  ? "self-start bg-neutral-100 text-neutral-900"
                  : "self-end bg-neutral-900 text-white"
              }`}
            >
              {m.content}
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <form ref={formRef} action={handleSubmit} className="flex gap-2">
        <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
        <textarea
          ref={textareaRef}
          name="content"
          required
          rows={2}
          disabled={pending}
          placeholder="Type your answer... (Enter to send, Shift+Enter for a new line)"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (e.currentTarget.value.trim()) formRef.current?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={pending}
          className="self-end rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
