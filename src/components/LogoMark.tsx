/**
 * The product mark: nine dots that start scattered and faint on the left and
 * end up large, bright and aligned on the right. It is the product's job in
 * one picture, an unclear idea becoming a clear definition.
 *
 * Draws in currentColor, so colour it with a text colour class. The same
 * geometry is in public brand files (icon.svg, the logo kit); change them
 * together.
 */
const DOTS: ReadonlyArray<readonly [number, number, number, number]> = [
  [16, 22, 4, 0.4],
  [23, 51, 4, 0.4],
  [14, 79, 4, 0.4],
  [50, 20, 6.5, 0.7],
  [48, 50, 6.5, 0.7],
  [51, 80, 6.5, 0.7],
  [84, 20, 9, 1],
  [84, 50, 9, 1],
  [84, 80, 9, 1],
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className} fill="currentColor">
      {DOTS.map(([cx, cy, r, o]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fillOpacity={o} />
      ))}
    </svg>
  );
}
