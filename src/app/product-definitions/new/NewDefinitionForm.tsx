"use client";

import { useRef, useState, useTransition } from "react";
import { suggestTitleAction } from "./suggest-title-action";
import { ProductTypePicker } from "@/components/ProductTypePicker";

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
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">
          Title{" "}
          <span className="font-normal text-neutral-500">
            {suggesting ? "(suggesting a title...)" : "(optional, suggested from your idea)"}
          </span>
        </label>
        <input
          ref={titleRef}
          name="title"
          type="text"
          placeholder="A short working name"
          onInput={(e) => {
            e.currentTarget.dataset.touched = "1";
            setTouched(true);
          }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">What&apos;s the idea?</label>
        <textarea
          name="idea"
          required
          rows={6}
          onBlur={onIdeaBlur}
          placeholder="Describe it however it currently exists in your head — it doesn't need to be polished."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Product type <span className="font-normal text-neutral-500">(hover an option for what it covers)</span></label>
        <ProductTypePicker name="productTypeKey" types={types} />
      </div>
      <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
        Start discovery
      </button>
    </form>
  );
}
