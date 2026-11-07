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
 * Enter sends on desktop (Shift+Enter inserts a newline); on touch devices Enter
 * inserts a newline and the Send button submits. The textarea is cleared
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
    <div className="flex h-[calc(100dvh-15rem)] min-h-[24rem] min-w-0 flex-1 flex-col gap-3 lg:h-[calc(100dvh-14rem)]">
      <div
        className="card flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain !p-3 sm:!p-4"
        role="log"
        aria-label="Discovery conversation"
      >
        {optimisticMessages.map((m) =>
          m.role === "PENDING" ? (
            <div key={m.id} role="status" aria-live="polite" className="bubble bubble-ai text-neutral-600">
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
            <div key={m.id} className={`bubble ${m.role === "AI" ? "bubble-ai" : "bubble-user"}`}>
              {m.content}
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <form
        ref={formRef}
        action={handleSubmit}
        className="flex items-end gap-2 pb-[env(safe-area-inset-bottom)]"
      >
        <input type="hidden" name="productDefinitionId" value={productDefinitionId} />
        <label htmlFor="chat-input" className="sr-only">
          Your answer
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          name="content"
          required
          rows={2}
          disabled={pending}
          enterKeyHint="send"
          placeholder="Type your answer…"
          className="field flex-1"
          onKeyDown={(e) => {
            // Enter sends on desktop; on touch keyboards Enter should add a line,
            // so the Send button is the way to submit there.
            const touch = window.matchMedia("(pointer: coarse)").matches;
            if (!touch && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (e.currentTarget.value.trim()) formRef.current?.requestSubmit();
            }
          }}
        />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
      <p className="-mt-1 hidden text-xs text-neutral-500 sm:block [@media(pointer:coarse)]:hidden">
        Enter to send, Shift+Enter for a new line.
      </p>
    </div>
  );
}
