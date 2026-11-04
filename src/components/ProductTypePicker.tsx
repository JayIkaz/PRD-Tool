"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NOT_SURE_DESCRIPTION, PRODUCT_TYPE_DESCRIPTIONS } from "@/lib/definition/product-type-descriptions";

type Option = { key: string; label: string };

/**
 * Listbox replacement for a native <select>, because native options
 * cannot show hover text reliably across browsers. Hovering or
 * arrowing to an option shows its definition; the chosen value is
 * submitted through a hidden input named `name`.
 */
export function ProductTypePicker({ name, types }: { name: string; types: Option[] }) {
  const options: Option[] = [{ key: "", label: "Not sure yet" }, ...types];
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const describe = (key: string) => (key === "" ? NOT_SURE_DESCRIPTION : PRODUCT_TYPE_DESCRIPTIONS[key]);
  const selected = options.find((o) => o.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(i: number) {
    setValue(options[i].key);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive(Math.max(0, options.findIndex((o) => o.key === value)));
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => {
          setActive(Math.max(0, options.findIndex((o) => o.key === value)));
          setOpen((o) => !o);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left text-sm"
      >
        <span>{selected.label}</span>
        <span aria-hidden className="text-neutral-500">▾</span>
      </button>
      <p className="mt-1 text-xs text-neutral-600">{describe(selected.key)}</p>

      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto py-1">
            {options.map((o, i) => (
              <li
                key={o.key || "none"}
                role="option"
                aria-selected={o.key === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === active ? "bg-neutral-100" : ""
                } ${o.key === value ? "font-medium" : ""}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
          <p className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
            {describe(options[active].key)}
          </p>
        </div>
      )}
    </div>
  );
}
