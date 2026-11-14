"use client";

import { useRef, useState, useTransition } from "react";
import { suggestTitleAction } from "./suggest-title-action";
import { ProductTypePicker } from "@/components/ProductTypePicker";
import { SubmitButton } from "@/components/SubmitButton";

type ProductType = { key: string; label: string };

export function NewDefinitionForm({
  types,
  action,
}: {
  types: ProductType[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false); // user has typed their own title
  const [suggesting, startSuggesting] = useTransition();
  const lastSuggestedFor = useRef("");

  function onIdeaBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const idea = e.target.value.trim();
    if (touched || idea.length < 15 || idea === lastSuggestedFor.current) return;
    lastSuggestedFor.current = idea;
    startSuggesting(async () => {
      const suggestion = await suggestTitleAction(idea);
      // Never overwrite something the user typed while we were waiting.
      if (suggestion && titleRef.current && !titleRef.current.dataset.touched) {
        titleRef.current.value = suggestion;
      }
    });
  }

  return (
    <form action={action} className="card grid gap-5">
      <div>
        <label htmlFor="nd-title" className="label">
          Title{" "}
          <span className="font-normal text-neutral-500">
            {suggesting ? "(suggesting a title…)" : "(optional, suggested from your idea)"}
          </span>
        </label>
        <input
          id="nd-title"
          ref={titleRef}
          name="title"
          type="text"
          placeholder="A short working name"
          onInput={(e) => {
            e.currentTarget.dataset.touched = "1";
            setTouched(true);
          }}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="nd-idea" className="label">
          What&apos;s the idea?
        </label>
        <textarea
          id="nd-idea"
          name="idea"
          required
          rows={6}
          onBlur={onIdeaBlur}
          placeholder="Describe it however it exists in your head. Rough is fine."
          className="field"
        />
      </div>
      <div>
        <span id="nd-type-label" className="label">
          Product type <span className="font-normal text-neutral-500">(tap or hover an option for what it covers)</span>
        </span>
        <ProductTypePicker name="productTypeKey" types={types} />
      </div>
      <SubmitButton className="btn btn-primary w-full sm:w-auto sm:self-start" pendingLabel="Starting…">
        Start discovery
      </SubmitButton>
    </form>
  );
}
