"use client";

import { useRef } from "react";

/**
 * Replays the hero lens animation. The animation itself is pure CSS, so this
 * only restarts it: every running animation inside the enclosing `.lens` is
 * cancelled and played again from 0, which re-runs the whole focus pull.
 * Hidden under prefers-reduced-motion (see globals.css), where there is
 * nothing to replay.
 */
export function LensReplay() {
  const ref = useRef<HTMLButtonElement | null>(null);

  const replay = () => {
    const lens = ref.current?.closest(".lens");
    if (!lens) return;
    for (const a of lens.getAnimations({ subtree: true })) {
      a.cancel();
      a.play();
    }
  };

  return (
    <button ref={ref} type="button" onClick={replay} className="lens-replay" aria-label="Replay the focus animation">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      Replay
    </button>
  );
}
