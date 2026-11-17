import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  allowedText,
  colours,
  contrastRatio,
  forbiddenPairs,
  type ColourName,
} from "@/lib/design/tokens";

const AA_BODY = 4.5;

describe("brand colour contrast (brief section 6)", () => {
  it("every allowed text/ground pair meets WCAG AA for body text", () => {
    for (const [ground, texts] of Object.entries(allowedText) as [ColourName, ColourName[]][]) {
      for (const text of texts) {
        const ratio = contrastRatio(colours[text], colours[ground]);
        expect(ratio, `${text} on ${ground} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_BODY);
      }
    }
  });

  it("no forbidden pair appears in the allowed list", () => {
    for (const [text, ground] of forbiddenPairs) {
      expect(allowedText[ground]).not.toContain(text);
    }
  });

  it("white text is only allowed on emerald, berry or ink", () => {
    const groundsWithWhite = (Object.keys(allowedText) as ColourName[]).filter((g) =>
      allowedText[g].includes("white"),
    );
    expect(groundsWithWhite.sort()).toEqual(["berry", "emerald", "ink"]);
  });

  it("matches the brand book's published ratios", () => {
    expect(contrastRatio(colours.ink, colours.sand)).toBeCloseTo(12.7, 0);
    expect(contrastRatio(colours.white, colours.emerald)).toBeCloseTo(5.7, 0);
    expect(contrastRatio(colours.white, colours.berry)).toBeCloseTo(5.9, 0);
    expect(contrastRatio(colours.ink, colours.sunshine)).toBeCloseTo(8.3, 0);
    expect(contrastRatio(colours.white, colours.pink)).toBeLessThan(AA_BODY);
  });

  it("globals.css mirrors the token values", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const [name, hex] of Object.entries(colours)) {
      expect(css).toContain(`--color-${name}: ${hex};`);
    }
  });

  it("no component source uses a forbidden text/background class pair", () => {
    // Static guard: a class list with e.g. "text-white bg-pink" is a violation.
    const files = execSync("git ls-files --cached --others --exclude-standard components app", {
      encoding: "utf8",
    })
      .split("\n")
      .filter((f) => /\.(tsx|ts)$/.test(f));
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/className=\{?[`"]([^`"]+)[`"]/g)) {
        const cls = m[1].split(/\s+/);
        for (const [text, ground] of forbiddenPairs) {
          const bad = cls.includes(`text-${text}`) && cls.includes(`bg-${ground}`);
          expect(bad, `${f}: text-${text} on bg-${ground}`).toBe(false);
        }
      }
    }
  });
});
