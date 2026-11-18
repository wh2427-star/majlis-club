"use client";
/**
 * The dots-divide animation (PLACEHOLDER shapes, see DECISIONS.md [CONFIRM]).
 * Each of the seven doorway dots splits into four (28 dots), the 28 form a sport shape,
 * then gather back into the doorway. It only ever runs forwards, once per use, never loops.
 * Under prefers-reduced-motion it does not run at all: the plain doorway is shown.
 * Use only on app launch, loading and sport category headers.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { colours } from "@/lib/design/tokens";
import { DOORWAY_DOTS } from "./Logo";
import { SPORT_SHAPES } from "./sportShapes";

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true, // server render: no motion
  );
}

export function DotsDivide({
  sport,
  size = 72,
  label,
  onceKey,
}: {
  sport?: string | null;
  size?: number;
  label: string;
  /** If set, the animation runs only once per browser session for this key (app launch). */
  onceKey?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (reduced) return;
    if (onceKey) {
      try {
        if (sessionStorage.getItem(onceKey)) return;
        sessionStorage.setItem(onceKey, "1");
      } catch {
        /* storage unavailable: still run once */
      }
    }
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, [reduced, onceKey]);

  const shape = sport ? SPORT_SHAPES[sport] : undefined;
  const pad = 1;
  const animate = play && !reduced;

  const dots = DOORWAY_DOTS.flatMap((d, i) =>
    [0, 1, 2, 3].map((k) => {
      const idx = i * 4 + k;
      const angle = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const split = { x: d.x + 0.45 * Math.cos(angle), y: d.y + 0.45 * Math.sin(angle) };
      const target = shape ? shape[idx] : split;
      return { home: d, split, target, apex: !!d.apex, idx };
    }),
  );

  return (
    <svg
      width={(size * 7.5) / 8.1}
      height={size}
      viewBox={`${-pad} ${-pad} 7.5 8.1`}
      role="img"
      aria-label={label}
      data-testid="dots-divide"
      data-motion={animate ? "on" : "off"}
      className={animate ? "dots-divide is-playing" : "dots-divide"}
    >
      {dots.map(({ home, split, target, apex, idx }) => (
        <circle
          key={idx}
          cx={0}
          cy={0}
          r={0.5}
          fill={apex ? colours.sunshine : colours.emerald}
          style={
            {
              transform: `translate(${home.x}px, ${home.y}px)`,
              "--x0": `${home.x}px`,
              "--y0": `${home.y}px`,
              "--x1": `${split.x}px`,
              "--y1": `${split.y}px`,
              "--x2": `${target.x}px`,
              "--y2": `${target.y}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}
