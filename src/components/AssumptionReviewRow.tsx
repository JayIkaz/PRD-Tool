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
      <li className="list-row">
        <p>
          <span className="code mr-2">{assumption.displayCode}</span>
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
    <li className="list-row">
      <p>
        <span className="code mr-2">{assumption.displayCode}</span>
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
            className="field field-sm"
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
              className="btn btn-primary btn-sm"
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
              className="btn btn-secondary btn-sm"
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
            className="btn btn-primary btn-sm"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setEditing(true)}
            className="btn btn-secondary btn-sm"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => rejectAssumption(assumption.id, productDefinitionId))}
            className="btn btn-danger btn-sm"
          >
            Reject
          </button>
        </div>
      )}
    </li>
  );
}
