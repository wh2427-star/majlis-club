import type { ReactNode } from "react";
import { getIllustration, type Illustration as Art, type IllustrationSport } from "@/lib/illustrations";

const widths = { sm: "w-40", md: "w-80", lg: "w-120" } as const; // 160 / 320 / 480 px

type Common = {
  size?: keyof typeof widths;
  /** Above the fold: load eagerly. Everything else lazy-loads. */
  priority?: boolean;
  /** Purely decorative uses must say so; this renders alt="". */
  decorative?: true;
  className?: string;
};
type BySeed = Common & { sport: IllustrationSport; seed: string; art?: never };
type ByArt = Common & { art: Art; sport?: never; seed?: never };

/**
 * The one way to show an illustration. Rendered as-is via <img> (each SVG stays its own
 * document, so clip-path ids cannot collide): native 480:400 ratio, object-fit contain,
 * explicit width/height so nothing shifts. No filters, borders, shadows or overlays.
 */
export function Illustration(props: BySeed | ByArt) {
  const { size = "md", priority = false, decorative, className = "" } = props;
  const art = props.art ?? getIllustration(props.sport, props.seed);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG shown as-is; next/image would rasterise or need dangerouslyAllowSVG
    <img
      src={art.src}
      alt={decorative ? "" : art.alt}
      width={art.width}
      height={art.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      data-illustration={`${art.sport}_${art.variant}`}
      data-decorative={decorative ? "true" : undefined}
      className={`block h-auto max-w-full object-contain ${widths[size]} ${className}`}
    />
  );
}

/** Empty states and similar: illustration beside the existing copy (never over it). Stacks at narrow widths. */
export function IllustratedMessage({ art, children, size = "sm" }: { art: Art; children: ReactNode; size?: Common["size"] }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center" data-testid="illustrated-message">
      <Illustration art={art} size={size} />
      <div className="text-ink">{children}</div>
    </div>
  );
}
