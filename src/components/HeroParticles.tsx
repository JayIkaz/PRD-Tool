"use client";

import { useEffect, useRef } from "react";

/**
 * Particle field behind the hero. It tells the same story as the lens:
 * scattered, soft points (a vague idea) swirl in and settle into rings around
 * the idea as focus is pulled, ending crisp and ordered (defined).
 *
 * It does not keep its own clock. Every frame it reads the `lens-focus` CSS
 * animation's currentTime, so it stays in step with the blur and zoom, and
 * with the Replay button, which restarts that animation. The key-frame tables
 * below mirror the percentages in "Hero lens" in globals.css; change one,
 * change the other.
 *
 * Once settled it idles (rings turn slowly, points breathe, the pointer
 * nudges nearby points) at half frame rate, and it stops entirely when the
 * hero is off screen or the tab is hidden. Scrolling pushes points up at
 * different rates and fades them, so the hero eases away instead of cutting.
 * Under prefers-reduced-motion it draws one settled frame and never animates.
 * Purely decorative: aria-hidden, no pointer events.
 */

const DUR = 7000; // keep in step with --lens-dur

type KF = [number, number][];
// [progress 0-1, value]
const SCALE: KF = [[0, 0.7], [0.13, 0.72], [0.31, 0.72], [0.44, 0.86], [0.69, 0.86], [0.77, 0.96], [0.83, 1], [1, 1]];
const BLUR: KF = [[0, 16], [0.13, 14], [0.31, 14], [0.44, 4], [0.49, 7.5], [0.69, 6], [0.77, 1], [0.83, 3.5], [0.91, 0], [1, 0]];
const ORDER: KF = [[0, 0], [0.31, 0], [0.49, 0.55], [0.69, 0.55], [0.91, 1], [1, 1]];
const FADE: KF = [[0, 0], [0.13, 1], [1, 1]];

function sample(kf: KF, p: number) {
  if (p <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    if (p <= kf[i][0]) {
      const [p0, v0] = kf[i - 1];
      const [p1, v1] = kf[i];
      return v0 + ((v1 - v0) * (p - p0)) / (p1 - p0);
    }
  }
  return kf[kf.length - 1][1];
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

// Small seeded generator so the layout is the same on every load.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rings sit just outside the badge orbit (1.0) and inside it, so they frame
// the badges rather than hiding behind them.
const RINGS = [
  { rf: 0.56, n: 26, dir: 1 },
  { rf: 1.24, n: 60, dir: -1 },
  { rf: 1.52, n: 72, dir: 1 },
];
const DUST = 120;

type P = {
  ring: number; // -1 = dust
  sx: number; // scatter position, as a fraction of the canvas
  sy: number;
  ang: number;
  rf: number;
  depth: number;
  size: number;
  tint: 0 | 1;
  phase: number;
  d: number; // settle delay, 0-1
};

function build(mobile: boolean): P[] {
  const rand = rng(20261110);
  const k = mobile ? 0.55 : 1;
  const out: P[] = [];
  const mk = (ring: number, ang: number, rf: number): P => ({
    ring,
    sx: rand(),
    sy: rand(),
    ang,
    rf,
    depth: rand(),
    size: 0.8 + rand() * 1.5,
    tint: rand() < 0.4 ? 1 : 0,
    phase: rand() * Math.PI * 2,
    d: rand(),
  });
  RINGS.forEach((r, ri) => {
    const n = Math.round(r.n * k);
    for (let i = 0; i < n; i++) {
      out.push(mk(ri, (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.05, r.rf + (rand() - 0.5) * 0.035));
    }
  });
  const dust = Math.round(DUST * k);
  for (let i = 0; i < dust; i++) out.push(mk(-1, 0, 0));
  return out;
}

function sprite(rgb: string, hard: boolean) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  if (hard) {
    g.fillStyle = `rgb(${rgb})`;
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
  } else {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.35, `rgba(${rgb},0.32)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return c;
}

export function HeroParticles({
  className = "",
  base = "255,255,255",
  tint,
}: {
  className?: string;
  /** RGB triplet for the main particles. Default white, for dark backgrounds. */
  base?: string;
  /** RGB triplet for the second particle colour. Default: the canvas text colour. */
  tint?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // White, plus the tint the page puts on this element (text-brand-100).
    const computed = getComputedStyle(canvas).color;
    const tintRgb = tint ?? (computed.startsWith("rgb") ? (computed.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).join(",") || "207,236,230" : "207,236,230");
    const sprites = [
      { soft: sprite(base, false), hard: sprite(base, true) },
      { soft: sprite(tintRgb, false), hard: sprite(tintRgb, true) },
    ];

    let parts = build(host.clientWidth < 640);
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let raf = 0;
    let visible = true;
    let frame = 0;
    let idle = false;
    let anim: Animation | null = null;
    const pointer = { x: -9999, y: -9999 };
    const t0 = performance.now(); // fallback clock if the CSS animation is not found

    const layout = () => {
      const r = host.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const ring = host.querySelector(".dimring");
      if (ring) {
        const rr = ring.getBoundingClientRect();
        cx = rr.left - r.left + rr.width / 2;
        cy = rr.top - r.top + rr.height / 2;
        R = rr.width * 0.4;
      } else {
        cx = W * 0.72;
        cy = H / 2;
        R = Math.min(W, H) * 0.3;
      }
      parts = build(W < 640);
    };

    const findAnim = () => {
      const el = host.querySelector(".lens-scene");
      return el?.getAnimations().find((a) => (a as CSSAnimation).animationName === "lens-focus") ?? null;
    };

    const draw = (staticFrame: boolean) => {
      const now = performance.now();
      let t = DUR;
      if (!staticFrame) {
        if (!anim) anim = findAnim();
        const ct = anim?.currentTime;
        t = ct == null ? (anim ? 0 : now - t0) : Number(ct);
        t = clamp(t, 0, DUR);
      }
      const p = t / DUR;
      const S = sample(SCALE, p);
      const soft = clamp(sample(BLUR, p) / 16);
      const order = sample(ORDER, p);
      const settled = staticFrame ? 1 : smooth((p - 0.9) / 0.1);
      const fade = sample(FADE, p);

      const rect = canvas.getBoundingClientRect();
      const sy = staticFrame ? 0 : window.scrollY;
      const heroFade = staticFrame ? 1 : 1 - clamp(sy / Math.max(1, rect.height * 0.9));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const px = pointer.x - rect.left;
      const py = pointer.y - rect.top;

      for (const q of parts) {
        let x: number;
        let y: number;
        let alpha: number;
        if (q.ring >= 0) {
          const local = smooth((order - q.d * 0.45) / 0.55);
          const dir = RINGS[q.ring].dir;
          const a = q.ang + settled * now * 0.00002 * dir;
          const hx = cx + Math.cos(a) * q.rf * R * (1 + settled * 0.012 * Math.sin(now * 0.0008 + q.phase));
          const hy = cy + Math.sin(a) * q.rf * R * (1 + settled * 0.012 * Math.sin(now * 0.0008 + q.phase));
          // swirl in along an arc, in polar coordinates around the idea
          const dx = q.sx * W - cx;
          const dy = q.sy * H - cy;
          const rs = Math.hypot(dx, dy);
          const ths = Math.atan2(dy, dx);
          const rh = Math.hypot(hx - cx, hy - cy);
          const thh = Math.atan2(hy - cy, hx - cx);
          let diff = thh - ths;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const rr = rs + (rh - rs) * local;
          const th = ths + diff * local + Math.sin(local * Math.PI) * 0.7;
          x = cx + Math.cos(th) * rr;
          y = cy + Math.sin(th) * rr;
          alpha = 0.4 + 0.5 * local;
        } else {
          x = q.sx * W + Math.sin(now * 0.00015 + q.phase) * 16 * q.depth;
          y = q.sy * H + Math.cos(now * 0.00012 + q.phase) * 12 * q.depth;
          alpha = (0.25 + 0.35 * q.depth) * (1 - 0.45 * settled);
        }
        // zoom about the idea, like the lens
        x = cx + (x - cx) * S;
        y = cy + (y - cy) * S;
        // scroll: points drift up at different rates
        y -= sy * (0.05 + 0.22 * q.depth);
        // pointer nudge, once settled
        if (settled > 0.5) {
          const ddx = x - px;
          const ddy = y - py;
          const dist = Math.hypot(ddx, ddy);
          if (dist < 110 && dist > 0.1) {
            const f = (1 - dist / 110) ** 2 * 16;
            x += (ddx / dist) * f;
            y += (ddy / dist) * f;
          }
        }
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;

        const r = q.size * (0.7 + 0.6 * q.depth);
        const sp = sprites[q.tint];
        const a = alpha * fade * heroFade;
        // soft halo grows and the crisp core fades as blur rises
        const glowR = r * (2.2 + 7 * soft);
        ctx.globalAlpha = a * (0.3 + 0.3 * soft);
        ctx.drawImage(sp.soft, x - glowR, y - glowR, glowR * 2, glowR * 2);
        const core = (1 - soft) ** 1.4;
        if (core > 0.02) {
          const cr = r * (1 - 0.5 * soft);
          ctx.globalAlpha = a * core;
          ctx.drawImage(sp.hard, x - cr, y - cr, cr * 2, cr * 2);
        }
      }
      ctx.globalAlpha = 1;
      idle = p >= 0.92 && pointer.x === -9999;
    };

    layout();

    if (reduced) {
      draw(true);
      const ro = new ResizeObserver(() => {
        layout();
        draw(true);
      });
      ro.observe(host);
      return () => ro.disconnect();
    }

    const loop = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      frame++;
      raf = requestAnimationFrame(loop);
      // settled and untouched: half frame rate is plenty
      if (idle && frame % 2) return;
      draw(false);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) start();
      },
      { threshold: 0 },
    );
    const ro = new ResizeObserver(() => layout());
    const onVis = () => start();

    io.observe(canvas);
    ro.observe(host);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    document.fonts?.ready.then(layout);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [base, tint]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 size-full text-brand-100 ${className}`} />;
}
