/**
 * PLACEHOLDER LOGO — concept only, not final artwork [CONFIRM].
 * Seven round dots of equal size form an open doorway: three up each side and one at the apex.
 * Rules: never rotate, shadow, stretch or rearrange. All seven dots are one size.
 * Clear space: one dot width on every side (built into the viewBox padding).
 */
import { appConfig } from "@/config/app";
import { colours } from "@/lib/design/tokens";

export type LogoVariant = "primary" | "reversed" | "small";

/** Dot centres in a unit grid (diameter 1). Shared with the dots-divide animation. */
export const DOORWAY_DOTS: { x: number; y: number; apex?: boolean }[] = [
  { x: 0.5, y: 5.6 },
  { x: 0.5, y: 3.9 },
  { x: 1.25, y: 2.3 },
  { x: 2.75, y: 1.5, apex: true },
  { x: 4.25, y: 2.3 },
  { x: 5.0, y: 3.9 },
  { x: 5.0, y: 5.6 },
];
const MARK_W = 5.5;
const MARK_H = 6.1;

export function LogoMark({
  variant = "primary",
  size = 40,
  title,
}: {
  variant?: LogoVariant;
  size?: number;
  title?: string;
}) {
  // Small: one colour, fatter dots, no accent (favicons, anything under 48px).
  const r = variant === "small" ? 0.62 : 0.5;
  const pad = 1; // clear space = one dot width
  const dotFill = variant === "reversed" ? colours.white : variant === "small" ? "currentColor" : colours.emerald;
  const apexFill = variant === "small" ? "currentColor" : colours.sunshine;
  const vbW = MARK_W + pad * 2;
  const vbH = MARK_H + pad * 2;
  return (
    <svg
      width={(size * vbW) / vbH}
      height={size}
      viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {DOORWAY_DOTS.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={r} fill={d.apex ? apexFill : dotFill} />
      ))}
    </svg>
  );
}

/** Mark left of the wordmark, Ink SemiBold (white when reversed on Ink). */
export function Logo({ variant = "primary", size = 36 }: { variant?: "primary" | "reversed"; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-1 ${variant === "reversed" ? "text-white" : "text-ink"}`}>
      <LogoMark variant={variant} size={size} />
      <span className="text-xl font-semibold">{appConfig.name}</span>
    </span>
  );
}
