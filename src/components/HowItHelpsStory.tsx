"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The "How it helps" story, played once as it scrolls into view:
 *
 * 1. A card slides in labelled "Typical request from stakeholder".
 * 2. The actual request arrives underneath.
 * 3. The questions a review would ask appear, each marked Unknown.
 * 4. The unknowns are answered.
 * 5. The definition card builds line by line, status dots moving
 *    red, amber, green. The open question stays red.
 *
 * Server render, no-JS and the finished state all show the end state, so
 * nothing is hidden if scripts fail. Under prefers-reduced-motion the end
 * state is shown straight away. Timings live in CSS via --t / --t2 (see
 * "How it helps story" in globals.css).
 */

type Status = "defined" | "partial" | "missing";

const LEFT_MS = 6400; // length of the left-hand sequence before the right card starts

const QUESTIONS = [
  { q: "Who gets chased?", a: "Account owners at customers", t: 2500, ta: 4600 },
  { q: "When?", a: "Before the due date", t: 3000, ta: 5000 },
  { q: "What counts as late?", a: "Unpaid past agreed terms", t: 3500, ta: 5400 },
];

const ROWS: { title: string; code?: string; text: string; s: Status; label: string }[] = [
  { title: "Problem", text: "Manual invoice chasing takes two days a month.", s: "defined", label: "Defined" },
  {
    title: "Send a reminder before the due date",
    code: "REQ-001",
    text: "4 of 7 dimensions defined",
    s: "partial",
    label: "Partial",
  },
  { title: "Assumption", text: "Invoices live in the CRM. Needs confirming.", s: "partial", label: "Partial" },
  { title: "Open question", text: "Who approves the reminder wording?", s: "missing", label: "Missing" },
];

const DOT: Record<Status, string> = {
  defined: "bg-emerald-500 st-dot-defined",
  partial: "bg-amber-400 st-dot-partial",
  missing: "bg-red-500",
};

type Phase = "idle" | "waiting" | "playing";

export function HowItHelpsStory() {
  const wrap = useRef<HTMLDivElement | null>(null);
  const right = useRef<HTMLDivElement | null>(null);
  const [left, setLeft] = useState<Phase>("idle");
  const [rightPhase, setRightPhase] = useState<Phase>("idle");

  useEffect(() => {
    const w = wrap.current;
    const r = right.current;
    if (!w || !r) return;

    // Reduced motion: leave the finished state in place.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Hide the end state before the next paint (microtask, not a sync setState).
    queueMicrotask(() => {
      setLeft("waiting");
      setRightPhase("waiting");
    });

    let leftStarted = false;
    let leftDone = false;
    let rightStarted = false;
    let timer: number | undefined;
    let raf = 0;

    const near = (el: HTMLElement) => el.getBoundingClientRect().top < window.innerHeight * 0.75;

    const finish = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    const check = () => {
      raf = 0;
      if (!leftStarted && near(w)) {
        leftStarted = true;
        setLeft("playing");
        timer = window.setTimeout(() => {
          leftDone = true;
          check();
        }, LEFT_MS);
      }
      // The right card waits for the left story to finish and for the person
      // to have scrolled it into view (on phones it sits below the fold).
      if (leftDone && !rightStarted && near(r)) {
        rightStarted = true;
        setRightPhase("playing");
        finish();
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    raf = requestAnimationFrame(check);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) window.clearTimeout(timer);
      finish();
    };
  }, []);

  const t = (ms: number, extra?: Record<string, string>) =>
    ({ "--t": `${ms}ms`, "--from": "translateY(12px)", ...extra }) as CSSProperties;

  return (
    <div ref={wrap} className="mt-10 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.4fr]">
      {/* ---------- left: the request and its questions ---------- */}
      <div
        data-story={left === "idle" ? undefined : left}
        className="st rounded-2xl bg-white p-5 text-neutral-900 sm:p-6"
        style={t(0, { "--from": "translateX(-28px)" })}
      >
        <p className="eyebrow !text-neutral-600 st-label" style={t(250)}>
          Typical request from stakeholder
        </p>
        <p className="st mt-3 font-display text-xl leading-snug text-neutral-900" style={t(900)}>
          &ldquo;Finance spend two days a month chasing late invoices. Can we automate it?&rdquo;
        </p>

        <p className="st mt-5 text-xs font-semibold uppercase tracking-widest text-neutral-600" style={t(2000)}>
          Questions the assistant asks
        </p>
        <ul className="mt-2 grid gap-3 text-sm">
          {QUESTIONS.map((x) => (
            <li key={x.q} className="st" style={t(x.t)}>
              <p className="font-semibold text-neutral-900">{x.q}</p>
              <div className="mt-0.5 grid">
                <span
                  aria-hidden
                  className="st st-unknown font-semibold text-red-700 [grid-area:1/1]"
                  style={t(x.t + 200, { "--t2": `${x.ta}ms` })}
                >
                  Unknown
                </span>
                <span className="st st-answer text-emerald-700 [grid-area:1/1]" style={t(x.ta + 100)}>
                  {x.a}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ---------- arrow ---------- */}
      <div aria-hidden className="grid place-items-center text-2xl text-white">
        <span
          className="st inline-block rotate-90 lg:rotate-0"
          data-story={rightPhase === "idle" ? undefined : rightPhase}
          style={t(0)}
        >
          →
        </span>
      </div>

      {/* ---------- right: the definition builds ---------- */}
      <div
        ref={right}
        data-story={rightPhase === "idle" ? undefined : rightPhase}
        className="st rounded-2xl bg-brand-50 p-5 text-neutral-900 sm:p-6"
        style={t(0, { "--from": "translateY(20px)" })}
      >
        <p className="eyebrow st" style={t(300)}>
          What the reviewer sees
        </p>
        <dl className="mt-3 grid gap-3 text-sm">
          {ROWS.map((row, i) => {
            const start = 800 + i * 700;
            return (
              <div key={row.title} className="st flex items-start justify-between gap-3" style={t(start)}>
                <div>
                  <dt className="font-semibold text-neutral-900">
                    {row.code && <span className="code mr-2">{row.code}</span>}
                    {row.title}
                  </dt>
                  <dd className="text-neutral-700">{row.text}</dd>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <span
                    aria-hidden
                    className={`size-2.5 rounded-full ${DOT[row.s]}`}
                    style={t(start + 400)}
                  />
                  <span className="st-label" style={t(start + 400 + (row.s === "missing" ? 0 : 1500))}>
                    {row.label}
                  </span>
                </span>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
