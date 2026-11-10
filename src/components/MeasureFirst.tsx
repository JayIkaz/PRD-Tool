import type { CSSProperties } from "react";

/*
 * "Measure before you cut": a tape measure laid along a plank, marked with the
 * dimensions the tool tracks, and a saw resting beside it, unused. Used where
 * the page makes the point that the early steps are cheap and the build step
 * is the cut.
 *
 * Transparent background so it sits on the page. Server component, no state.
 * Motion is CSS only (see "Measure first" in globals.css): inside a
 * <Reveal> the tape runs out from its case and the chips drop onto it. The
 * saw never moves. The finished state is the base style.
 */

const MARKS = [
  { label: "Need", x: 118, w: 64 },
  { label: "User", x: 200, w: 64 },
  { label: "Outcome", x: 282, w: 84 },
  { label: "Constraints", x: 384, w: 110 },
];

export function MeasureFirst({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 200"
      role="img"
      aria-label="A tape measure laid along a plank, with a saw resting unused beside it. Measure first, cut later."
      className={`font-sans ${className}`}
    >
      {/* plank */}
      <rect x="10" y="56" width="500" height="56" rx="3" fill="#d8b07e" />
      <path d="M14 66 Q150 62 290 67 T506 65" fill="none" stroke="#bf9560" strokeWidth="0.5" />
      <path d="M14 102 Q170 106 310 101 T506 103" fill="none" stroke="#bf9560" strokeWidth="0.5" />
      <path d="M14 96 Q130 98 250 95 T450 97" fill="none" stroke="#bf9560" strokeWidth="0.5" />
      <ellipse cx="480" cy="86" rx="10" ry="5" fill="none" stroke="#bf9560" strokeWidth="0.5" />

      {/* tape: runs out from the case */}
      <g className="measure-tape">
        <rect x="90" y="76" width="360" height="16" fill="#f7e6a1" stroke="#d6b94e" strokeWidth="0.5" />
        <line x1="100" y1="78" x2="450" y2="78" stroke="#8a6d1f" strokeWidth="4" strokeDasharray="1 9" />
        <line x1="100" y1="80" x2="450" y2="80" stroke="#8a6d1f" strokeWidth="8" strokeDasharray="1.5 48.5" />
        <rect x="450" y="72" width="6" height="24" rx="1" fill="#7b8b91" />
      </g>

      {/* case */}
      <rect x="30" y="62" width="62" height="44" rx="10" fill="#f2b73b" stroke="#c98f16" strokeWidth="0.5" />
      <circle cx="61" cy="84" r="10" fill="#d99a1e" />
      <rect x="74" y="96" width="12" height="6" rx="2" fill="#8a6d1f" />

      {/* pencil mark where the cut will go */}
      <line x1="380" y1="50" x2="380" y2="118" stroke="#4a3418" strokeWidth="1.2" />

      {/* the dimensions, dropped onto the tape */}
      {MARKS.map((m, i) => (
        <g key={m.label} className="measure-chip" style={{ "--i": i } as CSSProperties}>
          <line
            x1={m.x + m.w / 2}
            y1="34"
            x2={m.x + m.w / 2}
            y2="76"
            stroke="#77756b"
            strokeWidth="0.75"
            strokeDasharray="3 3"
          />
          <rect x={m.x} y="10" width={m.w} height="24" rx="12" fill="#fff" stroke="#d3cfc3" strokeWidth="0.75" />
          <circle cx={m.x + 14} cy="22" r="4" fill="#22c55e" />
          <text x={m.x + 26} y="26.5" fontSize="12.5" fontWeight="600" fill="#171a22">
            {m.label}
          </text>
        </g>
      ))}

      {/* the saw: clean blade, untouched */}
      <polygon points="106,136 452,151 452,158 106,168" fill="#c9d1d4" stroke="#8e999e" strokeWidth="0.5" />
      <line x1="106" y1="171" x2="452" y2="161" stroke="#6e7a80" strokeWidth="5" strokeDasharray="5 5" />
      <circle cx="136" cy="152" r="2" fill="#8e999e" />
      <path
        fillRule="evenodd"
        fill="#15181d"
        d="M42 128 H100 a12 12 0 0 1 12 12 V164 a12 12 0 0 1 -12 12 H42 a12 12 0 0 1 -12 -12 V140 a12 12 0 0 1 12 -12 Z M52 152 a19 9 0 1 0 38 0 a19 9 0 1 0 -38 0 Z"
      />
    </svg>
  );
}
