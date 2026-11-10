"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Fades and lifts its children in when they scroll into view.
 *
 * Server render and first paint are fully visible, so nothing is hidden if
 * JavaScript is slow or off. After hydration, only elements that start below
 * the fold are switched to the hidden state, then revealed once as they reach
 * the viewport (or are scrolled past). Under prefers-reduced-motion the transition is
 * effectively instant (see globals.css).
 *
 * `variant="scale"` is for large panels: they grow from 98.5% instead of rising.
 * `delay` (ms) staggers siblings. Extra classes can key off
 * `.reveal[data-state="shown"]` for state-driven effects.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  variant = "lift",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
  /** "lift" rises 16px (default). "scale" grows from 98.5%, for large panels. */
  variant?: "lift" | "scale";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"shown" | "hidden">("shown");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const inView = () => el.getBoundingClientRect().top < window.innerHeight * 0.92;
    if (inView()) return; // visible on arrival: leave it alone
    setState("hidden");

    // A scroll check, not an IntersectionObserver: an observer never fires for
    // sections skipped by a jump (anchor links, fast scroll), which would leave
    // them hidden. This reveals anything at or above the viewport's lower edge.
    let raf = 0;
    const check = () => {
      raf = 0;
      if (inView()) {
        setState("shown");
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-state={state}
      className={`reveal ${variant === "scale" ? "reveal-scale" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
