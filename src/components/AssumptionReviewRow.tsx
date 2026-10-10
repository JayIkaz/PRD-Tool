"use client";

import { useState, useTransition } from "react";
import {
  confirmAssumption,
  editAssumption,
  rejectAssumption,
} from "@/app/product-definitions/[id]/assumption-review-actions";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  EDITED: "Confirmed (edited)",
  REJECTED: "Rejected",
};

export interface AssumptionReviewRowProps {
  productDefinitionId: string;
  assumption: {
    id: string;
    displayCode: string;
    statement: string;
    reasoning: string | null;
    status: string;
  };
}

export function AssumptionReviewRow({ productDefinitionId, assumption }: AssumptionReviewRowProps) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(assumption.statement);
  const [error, setError] = useState<string | null>(null);

  if (assumption.status !== "PENDING" && !editing) {
    return (
      <li className="border-b pb-2 last:border-b-0">
        <p>
          <span className="mr-2 text-neutral-600">{assumption.displayCode}</span>
          {assumption.statement}
          <span className="ml-2 whitespace-nowrap text-xs text-neutral-600">
            ({STATUS_LABEL[assumption.status] ?? assumption.status})
          </span>
        </p>
        {assumption.reasoning && (
          <p className="mt-0.5 text-xs text-neutral-600">Why: {assumption.reasoning}</p>
        )}
      </li>
    );
  }

  return (
    <li className="border-b pb-2 last:border-b-0">
      <p>
        <span className="mr-2 text-neutral-600">{assumption.displayCode}</span>
        {editing ? null : assumption.statement}
      </p>
      {assumption.reasoning && !editing && (
        <p className="mt-0.5 text-xs text-neutral-600">Why: {assumption.reasoning}</p>
      )}

      {editing ? (
        <div className="mt-1 grid gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await editAssumption(assumption.id, productDefinitionId, draft);
                    setEditing(false);
                  } catch {
                    setError("Couldn't save that edit — try again.");
                  }
                });
              }}
              className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Save and confirm
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setDraft(assumption.statement);
                setEditing(false);
                setError(null);
              }}
              className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => confirmAssumption(assumption.id, productDefinitionId))}
            className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setEditing(true)}
            className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => rejectAssumption(assumption.id, productDefinitionId))}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </li>
  );
}
