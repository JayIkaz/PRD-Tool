"use client";

import { useRef } from "react";

/**
 * Enter sends the composed message; Shift+Enter inserts a newline
 * (standard chat-input convention). Needs to be a client component
 * since the parent form/page stay server-rendered around a server
 * action — this is just the one interactive bit.
 */
export function MessageInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <textarea
      ref={textareaRef}
      name="content"
      required
      rows={2}
      placeholder="Type your answer... (Enter to send, Shift+Enter for a new line)"
      className="flex-1 rounded border px-3 py-2 text-sm"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const form = textareaRef.current?.form;
          if (form && textareaRef.current?.value.trim()) {
            form.requestSubmit();
          }
        }
      }}
    />
  );
}
