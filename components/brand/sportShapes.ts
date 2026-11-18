/** PLACEHOLDER dot maps for the dots-divide motion [CONFIRM]. Shared by server and client. */
const CX = 2.75;
const CY = 3.6;

function ring(n: number, r: number, phase = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  });
}

/** 28-point sport shapes. Only football and basketball are drawn; others use the plain doorway. */
export const SPORT_SHAPES: Record<string, { x: number; y: number }[]> = {
  // ball outline (21) + panel hexagon (6) + centre (1)
  football: [...ring(21, 2.6, -Math.PI / 2), ...ring(6, 1.05, -Math.PI / 2), { x: CX, y: CY }],
  // ball outline (18) + vertical seam (5) + horizontal seam (5)
  basketball: [
    ...ring(18, 2.6),
    ...[-1.6, -0.8, 0, 0.8, 1.6].map((d) => ({ x: CX, y: CY + d })),
    ...[-1.6, -0.8, 0.0001, 0.8, 1.6].map((d) => ({ x: CX + d, y: CY })),
  ],
};

export function hasMotionShape(sport: string | null | undefined) {
  return !!sport && sport in SPORT_SHAPES;
}

