"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/**
 * A form's submit button that shows the form is working. While the server
 * action runs it spins, dims, optionally swaps its label, and ignores further
 * clicks, so a press never looks ignored and a double-click can't submit
 * twice. It uses aria-disabled rather than `disabled` so keyboard focus stays
 * on the button while it waits.
 *
 * Must sit inside the <form>; useFormStatus reads the nearest one.
 */
export function SubmitButton({
  children,
  pendingLabel,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...rest}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {pending && <span className="btn-spinner" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
