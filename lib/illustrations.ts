/**
 * ILLUSTRATION MANIFEST: GENERATED PLACEHOLDERS (library v4).
 * These 36 files are generated stand-ins, to be replaced by final artwork from an illustrator.
 * To swap art, replace the files in public/illustrations/ (same names, same 480:400 card) and
 * update the alt text and traits below. No screen references the files directly; this module is
 * the only place that knows their paths (a unit test enforces this).
 *
 * Rules: render as-is (no filters, borders, shadows, overlays, cropping or recolouring), never
 * put text over them, and never use them in place of a club's own photos.
 *
 * Framework-free so native apps can reuse the serving rule.
 */

export const ILLUSTRATION_SPORTS = [
  "football",
  "rugby",
  "basketball",
  "cricket",
  "swimming",
  "netball",
  "tennis",
  "gymnastics",
  "martial-arts",
] as const;

/** Matches the `sports.slug` column. */
export type IllustrationSport = (typeof ILLUSTRATION_SPORTS)[number];

/** Five skin bands, lightest (1) to deepest (5). Values: illustration-only tokens in lib/design/tokens.ts. */
export type SkinBand = 1 | 2 | 3 | 4 | 5;
/** Background stripe colours, named by brand token. */
export type StripeColour = "sunshine" | "pink" | "emerald" | "sky";

export type Illustration = {
  sport: IllustrationSport;
  variant: 1 | 2 | 3 | 4;
  src: string;
  width: 480;
  height: 400;
  /** One plain sentence describing the image. Never a child's name. */
  alt: string;
  traits: { skin: SkinBand; hijab: boolean; stripes: [StripeColour, StripeColour] };
};

/** Files keep the generator's names; martial arts files are `martial_N.svg`. */
const FILE_PREFIX: Record<IllustrationSport, string> = {
  football: "football",
  rugby: "rugby",
  basketball: "basketball",
  cricket: "cricket",
  swimming: "swimming",
  netball: "netball",
  tennis: "tennis",
  gymnastics: "gymnastics",
  "martial-arts": "martial",
};

/** An alt of "" is a type error here, so every entry must describe its image. */
type NonEmpty<A extends string> = A extends "" ? never : A;

export function art<const A extends string>(
  sport: IllustrationSport,
  variant: Illustration["variant"],
  alt: NonEmpty<A>,
  skin: SkinBand,
  hijab: boolean,
  stripes: [StripeColour, StripeColour],
): Illustration {
  return {
    sport,
    variant,
    src: `/illustrations/${FILE_PREFIX[sport]}_${variant}.svg`,
    width: 480,
    height: 400,
    alt,
    traits: { skin, hijab, stripes },
  };
}

// Alt text written from looking at each image. Skin band and stripes read from the file's fills.
export const ILLUSTRATIONS: readonly Illustration[] = [
  art("football", 1, "A player in a light blue shirt and green shorts running to kick a football.", 3, false, ["sunshine", "pink"]),
  art("football", 2, "A player with curly hair in a light blue shirt and pink shorts running to kick a football.", 1, false, ["emerald", "sunshine"]),
  art("football", 3, "A player with a ponytail in a light blue shirt and yellow shorts running to kick a football.", 2, false, ["pink", "emerald"]),
  art("football", 4, "A player with hair in a bun, in a pink shirt and light blue shorts, running to kick a football.", 4, false, ["emerald", "sunshine"]),

  art("rugby", 1, "A player with a ponytail in a light blue shirt and pink shorts running with a rugby ball.", 1, false, ["sunshine", "emerald"]),
  art("rugby", 2, "A player with hair in a bun, in a light blue shirt and yellow shorts, running with a rugby ball.", 4, false, ["emerald", "pink"]),
  art("rugby", 3, "A player in a light blue hijab and a yellow kit running with a rugby ball.", 1, true, ["emerald", "pink"]),
  art("rugby", 4, "A player with short hair in a light blue shirt and green shorts running with a rugby ball.", 3, false, ["sunshine", "pink"]),

  art("basketball", 1, "A player in a yellow hijab and a light blue kit jumping to shoot a basketball at the hoop.", 4, true, ["pink", "emerald"]),
  art("basketball", 2, "A player with short hair in a yellow shirt and light blue shorts jumping to shoot a basketball at the hoop.", 1, false, ["pink", "emerald"]),
  art("basketball", 3, "A player with curly hair in a light blue shirt and green shorts jumping to shoot a basketball at the hoop.", 3, false, ["pink", "sunshine"]),
  art("basketball", 4, "A player with a ponytail in a green shirt and pink shorts jumping to shoot a basketball at the hoop.", 1, false, ["sky", "sunshine"]),

  art("cricket", 1, "A batter with curly hair in a yellow shirt and light blue shorts playing a shot in front of the stumps.", 2, false, ["pink", "emerald"]),
  art("cricket", 2, "A batter with a ponytail in a light blue shirt and green shorts playing a shot in front of the stumps.", 4, false, ["pink", "sunshine"]),
  art("cricket", 3, "A batter with hair in a bun, in a yellow shirt and pink shorts, playing a shot in front of the stumps.", 1, false, ["sky", "emerald"]),
  art("cricket", 4, "A batter in a yellow hijab and a pink kit playing a shot in front of the stumps.", 3, true, ["sky", "emerald"]),

  art("swimming", 1, "A swimmer in a pink swimsuit and a dark swim cap doing front crawl.", 5, false, ["sunshine", "emerald"]),
  art("swimming", 2, "A swimmer in a yellow swimsuit and a dark swim cap doing front crawl.", 2, false, ["pink", "emerald"]),
  art("swimming", 3, "A swimmer in a green swimsuit and a dark swim cap doing front crawl.", 4, false, ["pink", "sunshine"]),
  art("swimming", 4, "A swimmer in a pink swimsuit and a dark swim cap doing front crawl, with a splash behind.", 2, false, ["sunshine", "emerald"]),

  art("netball", 1, "A player with short hair in a green top and pink shorts holding a netball overhead to shoot at the post.", 3, false, ["sky", "sunshine"]),
  art("netball", 2, "A player with curly hair in a green top and yellow shorts holding a netball overhead to shoot at the post.", 1, false, ["pink", "sky"]),
  art("netball", 3, "A player with a ponytail in a pink top and light blue shorts holding a netball overhead to shoot at the post.", 2, false, ["sunshine", "emerald"]),
  art("netball", 4, "A player with hair in a bun, in a yellow top and green shorts, holding a netball overhead to shoot at the post.", 5, false, ["sky", "pink"]),

  art("tennis", 1, "A player with a ponytail in a light blue shirt and yellow shorts reaching to hit a tennis ball with a racket.", 2, false, ["pink", "emerald"]),
  art("tennis", 2, "A player with hair in a bun, in a pink shirt and light blue shorts, reaching to hit a tennis ball with a racket.", 3, false, ["sunshine", "emerald"]),
  art("tennis", 3, "A player in a green hijab and a pink kit reaching to hit a tennis ball with a racket.", 1, true, ["sunshine", "sky"]),
  art("tennis", 4, "A player with short hair in a yellow shirt and pink shorts reaching to hit a tennis ball with a racket.", 3, false, ["emerald", "sky"]),

  art("gymnastics", 1, "A gymnast in a light blue hijab and a pink leotard leaping into the splits with arms raised.", 5, true, ["emerald", "sunshine"]),
  art("gymnastics", 2, "A gymnast with short hair in a pink leotard leaping into the splits with arms raised.", 2, false, ["sunshine", "sky"]),
  art("gymnastics", 3, "A gymnast with curly hair in a light blue leotard leaping into the splits with arms raised.", 4, false, ["emerald", "sunshine"]),
  art("gymnastics", 4, "A gymnast with hair in a bun, in a green leotard, leaping into the splits with arms raised.", 5, false, ["sky", "pink"]),

  art("martial-arts", 1, "A martial artist with curly hair in a white uniform doing a high side kick.", 2, false, ["sky", "pink"]),
  art("martial-arts", 2, "A martial artist with a ponytail in a white uniform doing a high side kick.", 5, false, ["sunshine", "sky"]),
  art("martial-arts", 3, "A martial artist with hair in a bun, in a white uniform, doing a high side kick.", 2, false, ["emerald", "sky"]),
  art("martial-arts", 4, "A martial artist in a dark hijab and a white uniform doing a high side kick.", 4, true, ["sunshine", "pink"]),
];

export function isIllustrationSport(s: string): s is IllustrationSport {
  return (ILLUSTRATION_SPORTS as readonly string[]).includes(s);
}

export function variantsFor(sport: IllustrationSport): Illustration[] {
  return ILLUSTRATIONS.filter((i) => i.sport === sport);
}

export function findIllustration(sport: IllustrationSport, variant: Illustration["variant"]): Illustration {
  const hit = ILLUSTRATIONS.find((i) => i.sport === sport && i.variant === variant);
  if (!hit) throw new Error(`No illustration ${sport} ${variant}`);
  return hit;
}

/** FNV-1a: small, stable string hash so a seed always picks the same variant. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic for a seed (use a club, area or screen id) so art does not change on refresh.
 * Pass `avoidVariant` (the previous variant in the same view) to prevent an immediate repeat.
 */
export function getIllustration(sport: IllustrationSport, seed: string, avoidVariant?: number): Illustration {
  const list = variantsFor(sport);
  let i = hashSeed(`${sport}:${seed}`) % list.length;
  if (list[i].variant === avoidVariant) i = (i + 1) % list.length;
  return list[i];
}

/**
 * One picker per view: consecutive calls never return the same variant twice in a row,
 * and the sequence is the same every time the view renders with the same seed.
 */
export function createIllustrationPicker(viewSeed: string) {
  let last: number | undefined;
  let n = 0;
  return (sport: IllustrationSport, itemSeed?: string): Illustration => {
    const pick = getIllustration(sport, `${viewSeed}:${itemSeed ?? n}`, last);
    n += 1;
    last = pick.variant;
    return pick;
  };
}

/**
 * A spread of variants for one sport: includes a hijab variant when the sport has one,
 * then as many different skin bands as possible. Order is seeded; no two neighbours repeat.
 */
export function getIllustrationSet(sport: IllustrationSport, count: number, seed: string): Illustration[] {
  const list = variantsFor(sport);
  const start = hashSeed(`${sport}:set:${seed}`) % list.length;
  const rotated = list.map((_, k) => list[(start + k) % list.length]);

  const chosen: Illustration[] = [];
  const hijab = rotated.find((i) => i.traits.hijab);
  if (hijab && count > 0) chosen.push(hijab);
  while (chosen.length < Math.min(count, list.length)) {
    const bands = new Set(chosen.map((c) => c.traits.skin));
    const rest = rotated.filter((i) => !chosen.includes(i));
    chosen.push(rest.find((i) => !bands.has(i.traits.skin)) ?? rest[0]);
  }
  // Seeded order, then cycle if more are asked for than exist (never the same twice in a row).
  const ordered = rotated.filter((i) => chosen.includes(i));
  const out: Illustration[] = [];
  for (let k = 0; k < count; k++) out.push(ordered[k % ordered.length]);
  return out;
}

/** For screens not tied to one sport (waitlist, onboarding, empty states): the seed picks the sport too. */
export function getAnyIllustration(seed: string, avoidVariant?: number): Illustration {
  const sport = ILLUSTRATION_SPORTS[hashSeed(`sport:${seed}`) % ILLUSTRATION_SPORTS.length];
  return getIllustration(sport, seed, avoidVariant);
}
