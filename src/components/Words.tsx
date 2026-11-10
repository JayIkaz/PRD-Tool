import type { CSSProperties } from "react";

/**
 * Splits a heading into words that rise and fade in one after another (see
 * "Motion language" in globals.css). Server component, no JavaScript.
 *
 * Words are inline-block so they can move; the spaces between them stay real
 * text nodes, so the heading still reads, copies and wraps as normal. Outside
 * a <Reveal> the words play on load. Inside one they play when it scrolls
 * into view.
 *
 * `start` is the delay before the first word (ms), `step` the gap between
 * words.
 */
export function Words({ text, start = 0, step = 55 }: { text: string; start?: number; step?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="word" style={{ "--w": `${start + i * step}ms` } as CSSProperties}>
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}
