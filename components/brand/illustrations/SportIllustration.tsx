/**
 * PLACEHOLDER ILLUSTRATIONS — stand-ins until the real set is drawn.
 * Flat shapes in the palette, no outlines, no gradients, no mascot.
 * Figures are older, capable kids in motion (long limbs, not toddlers).
 * Never photographs of children in our own UI.
 */
import { colours } from "@/lib/design/tokens";

type Props = { sport: string; alt: string; className?: string };

const { emerald, sunshine, pink, sky, berry, ink, white } = colours;

function Kid({ x, y, shirt, lean = 0 }: { x: number; y: number; shirt: string; lean?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean})`}>
      <circle cx="0" cy="-58" r="10" fill={berry} />
      <rect x="-9" y="-46" width="18" height="34" rx="8" fill={shirt} />
      <rect x="-22" y="-44" width="14" height="6" rx="3" fill={berry} transform="rotate(-30 -15 -41)" />
      <rect x="8" y="-44" width="14" height="6" rx="3" fill={berry} transform="rotate(25 15 -41)" />
      <rect x="-9" y="-14" width="7" height="30" rx="3.5" fill={ink} transform="rotate(12 -5 -14)" />
      <rect x="2" y="-14" width="7" height="30" rx="3.5" fill={ink} transform="rotate(-20 5 -14)" />
    </g>
  );
}

const objects: Record<string, React.ReactNode> = {
  football: <circle cx="150" cy="118" r="11" fill={white} />,
  rugby: <ellipse cx="150" cy="80" rx="14" ry="9" fill={sunshine} transform="rotate(-25 150 80)" />,
  basketball: (
    <g>
      <rect x="140" y="30" width="34" height="5" fill={berry} />
      <circle cx="150" cy="62" r="11" fill={sunshine} />
    </g>
  ),
  cricket: <rect x="128" y="62" width="8" height="46" rx="3" fill={sunshine} transform="rotate(35 132 85)" />,
  swimming: (
    <g>
      <rect x="10" y="98" width="180" height="32" fill={sky} />
      <rect x="10" y="108" width="180" height="4" fill={white} />
    </g>
  ),
  netball: (
    <g>
      <rect x="160" y="26" width="5" height="100" fill={ink} />
      <rect x="140" y="30" width="22" height="4" fill={berry} />
      <circle cx="128" cy="52" r="9" fill={sunshine} />
    </g>
  ),
  tennis: (
    <g>
      <ellipse cx="138" cy="62" rx="10" ry="14" fill={sunshine} />
      <circle cx="158" cy="44" r="6" fill={sunshine} />
    </g>
  ),
  gymnastics: <rect x="30" y="118" width="140" height="8" rx="4" fill={sunshine} />,
  "martial-arts": <rect x="88" y="88" width="24" height="5" fill={ink} />,
};

export function SportIllustration({ sport, alt, className = "" }: Props) {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label={alt} className={className} data-placeholder="illustration">
      <rect width="200" height="140" fill={colours.sand} />
      <circle cx="40" cy="36" r="22" fill={pink} />
      <rect x="0" y="126" width="200" height="14" fill={emerald} />
      <Kid x={100} y={110} shirt={sport === "swimming" ? sky : emerald} lean={sport === "swimming" ? 70 : -8} />
      {objects[sport] ?? null}
    </svg>
  );
}
