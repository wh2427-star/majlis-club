/**
 * Brand design tokens. Single source of truth for colour values; app/globals.css
 * mirrors them as CSS custom properties (a unit test keeps the two in sync).
 */
export const colours = {
  ink: "#1F2A37", // all reading text
  sand: "#F6EFE4", // page ground (~45%)
  white: "#FFFFFF", // cards and forms (~15%)
  emerald: "#0A7550", // the one action colour
  berry: "#B5305C", // secondary highlight
  pink: "#F0668A", // illustration accent
  sunshine: "#F6B93B", // badges
  sky: "#8CC6EE", // panels ("Light sky")
} as const;

export type ColourName = keyof typeof colours;

/**
 * Illustration-only colours: the five skin bands and the hair colour used inside the
 * illustration files. Outside the brand palette; never for text, controls or UI surfaces.
 * Mirrored in app/globals.css as --illo-* (not in @theme, so no utilities exist).
 * [CONFIRM] values need brand-owner sign-off.
 */
export const illustrationOnly = {
  "skin-1": "#F3D2B3",
  "skin-2": "#E3AE7C",
  "skin-3": "#C98B52",
  "skin-4": "#8F5A2E",
  "skin-5": "#5E3B22",
  "hair-brown": "#3A2418",
} as const;

/** Font family is one token so Noto Sans can replace IBM Plex Sans in one place [CONFIRM]. */
export const fontFamilyToken = "--font-brand";

/**
 * Text-on-ground rules from brief section 6.
 * `allowedText` lists, for each ground, the only colours text may use on it.
 */
export const allowedText: Record<ColourName, ColourName[]> = {
  sand: ["ink", "emerald", "berry"],
  white: ["ink", "emerald", "berry"],
  emerald: ["white"],
  berry: ["white"],
  ink: ["white"],
  sunshine: ["ink"],
  pink: ["ink"],
  sky: ["ink"],
};

/** Pairs that must never be used, as [text, ground]. */
export const forbiddenPairs: [ColourName, ColourName][] = [
  ["white", "pink"],
  ["white", "sunshine"],
  ["white", "sky"],
  ["white", "sand"],
  ["emerald", "pink"],
  ["emerald", "sunshine"],
  ["emerald", "sky"],
  ["berry", "pink"],
  ["berry", "sunshine"],
  ["berry", "sky"],
  ["emerald", "berry"],
  ["berry", "emerald"],
];

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
