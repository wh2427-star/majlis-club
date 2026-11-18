import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ILLUSTRATIONS,
  ILLUSTRATION_SPORTS,
  art,
  createIllustrationPicker,
  getAnyIllustration,
  getIllustration,
  getIllustrationSet,
  variantsFor,
} from "@/lib/illustrations";
import { Illustration } from "@/components/brand/Illustration";
import { allowedText, illustrationOnly } from "@/lib/design/tokens";

const seeds = Array.from({ length: 200 }, (_, i) => `seed-${i}-${(i * 7919).toString(36)}`);
const SKIN_HEX = ["#F3D2B3", "#E3AE7C", "#C98B52", "#8F5A2E", "#5E3B22"];
const STRIPE_HEX: Record<string, string> = { sunshine: "#F6B93B", pink: "#F0668A", emerald: "#0A7550", sky: "#8CC6EE" };
/** Sports whose four variants include no hijab. Known gap, [CONFIRM] in DECISIONS.md: ask the illustrator for one each. */
const NO_HIJAB_YET = ["football", "netball", "swimming"];

describe("illustration manifest", () => {
  it("has four variants for each of the nine sports, with existing 480x400 files", () => {
    expect(ILLUSTRATIONS).toHaveLength(36);
    for (const sport of ILLUSTRATION_SPORTS) expect(variantsFor(sport).map((i) => i.variant)).toEqual([1, 2, 3, 4]);
    for (const a of ILLUSTRATIONS) {
      const file = `public${a.src}`;
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, "utf8"), file).toContain('viewBox="0 0 480 400"');
      expect([a.width, a.height]).toEqual([480, 400]);
    }
  });

  it("every entry has a plain one-sentence alt, never empty", () => {
    for (const a of ILLUSTRATIONS) {
      expect(a.alt.trim().length, a.src).toBeGreaterThan(10);
      expect(a.alt, a.src).toMatch(/^A [^.]+\.$/);
      expect(a.alt.length, a.src).toBeLessThanOrEqual(130);
    }
    // @ts-expect-error an empty alt is a type error, so the build fails
    art("football", 1, "", 1, false, ["sky", "pink"]);
  });

  it("traits match the files: skin band and stripe colours appear in each SVG", () => {
    for (const a of ILLUSTRATIONS) {
      const svg = readFileSync(`public${a.src}`, "utf8").toUpperCase();
      expect(svg, a.src).toContain(`FILL="${SKIN_HEX[a.traits.skin - 1]}"`);
      // The skin band is the most-used skin tone in the file.
      const counts = SKIN_HEX.map((h) => svg.split(`FILL="${h}"`).length - 1);
      expect(counts.indexOf(Math.max(...counts)) + 1, a.src).toBe(a.traits.skin);
      for (const s of a.traits.stripes) expect(svg, a.src).toContain(`FILL="${STRIPE_HEX[s]}"`);
    }
  });

  it("is the only file that references the illustration paths", () => {
    const files = execSync("git ls-files --cached --others --exclude-standard app components lib", { encoding: "utf8" })
      .split("\n")
      .filter((f) => /\.(tsx?|css)$/.test(f) && f !== "lib/illustrations.ts");
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/\/illustrations\/|_\d\.svg/);
  });

  it("illustration-only colours are not text colours and are not used in UI code", () => {
    const values = Object.values(illustrationOnly).map((v) => v.toUpperCase());
    expect(Object.keys(allowedText)).not.toContain("illo");
    const files = execSync("git ls-files --cached --others --exclude-standard app components", { encoding: "utf8" })
      .split("\n")
      .filter((f) => /\.tsx?$/.test(f));
    for (const f of files) {
      const src = readFileSync(f, "utf8").toUpperCase();
      for (const v of values) expect(src.includes(v), `${f} uses ${v}`).toBe(false);
      expect(/illo-/i.test(src), f).toBe(false);
    }
  });
});

describe("serving rule", () => {
  it("is deterministic for a seed", () => {
    for (const sport of ILLUSTRATION_SPORTS)
      for (const s of seeds.slice(0, 40)) expect(getIllustration(sport, s)).toBe(getIllustration(sport, s));
    expect(getAnyIllustration("waitlist:abc")).toBe(getAnyIllustration("waitlist:abc"));
  });

  it("spreads seeds across all four variants", () => {
    for (const sport of ILLUSTRATION_SPORTS) {
      const used = new Set(seeds.map((s) => getIllustration(sport, s).variant));
      expect(used.size, sport).toBe(4);
    }
  });

  it("never returns the same variant twice in a row within one view", () => {
    for (const view of seeds.slice(0, 50)) {
      const pick = createIllustrationPicker(view);
      let last: number | undefined;
      for (let k = 0; k < 40; k++) {
        const sport = ILLUSTRATION_SPORTS[(k * 5) % ILLUSTRATION_SPORTS.length];
        const a = pick(k % 3 === 0 ? "football" : sport);
        expect(a.variant).not.toBe(last);
        last = a.variant;
      }
    }
  });

  it("a picker gives the same sequence on every render of the view", () => {
    const run = () => {
      const p = createIllustrationPicker("home-sports");
      return ILLUSTRATION_SPORTS.map((s) => p(s).src);
    };
    expect(run()).toEqual(run());
  });

  it("a set of four has at least three skin bands and a hijab variant", () => {
    for (const sport of ILLUSTRATION_SPORTS)
      for (const s of seeds.slice(0, 30)) {
        const set = getIllustrationSet(sport, 4, s);
        expect(set).toHaveLength(4);
        expect(new Set(set.map((a) => a.src)).size, sport).toBe(4);
        expect(new Set(set.map((a) => a.traits.skin)).size, sport).toBeGreaterThanOrEqual(3);
        const hasHijab = set.some((a) => a.traits.hijab);
        expect(hasHijab, sport).toBe(!NO_HIJAB_YET.includes(sport));
        expect(getIllustrationSet(sport, 4, s)).toEqual(set);
      }
  });

  it("sets longer than four cycle without neighbours repeating", () => {
    const set = getIllustrationSet("tennis", 9, "x");
    for (let k = 1; k < set.length; k++) expect(set[k].src).not.toBe(set[k - 1].src);
  });
});

describe("<Illustration>", () => {
  const html = (props: Parameters<typeof Illustration>[0]) => renderToStaticMarkup(createElement(Illustration, props));

  it("renders an <img> with the manifest alt, explicit size and lazy loading", () => {
    const a = getIllustration("cricket", "club-1");
    const out = html({ sport: "cricket", seed: "club-1", size: "sm" });
    expect(out).toMatch(/^<img /);
    expect(out).toContain(`alt="${a.alt}"`);
    expect(out).toContain('width="480"');
    expect(out).toContain('height="400"');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain("w-40");
    expect(out).not.toMatch(/filter|shadow|border|rounded|opacity/);
  });

  it("decorative use renders alt=\"\" only when asked", () => {
    expect(html({ sport: "rugby", seed: "s", decorative: true })).toContain('alt=""');
    expect(html({ sport: "rugby", seed: "s" })).not.toContain('alt=""');
  });

  it("priority loads eagerly; sizes are 160, 320 and 480 px", () => {
    expect(html({ sport: "tennis", seed: "s", priority: true })).toContain('loading="eager"');
    expect(html({ sport: "tennis", seed: "s", size: "md" })).toContain("w-80");
    expect(html({ sport: "tennis", seed: "s", size: "lg" })).toContain("w-120");
  });
});
