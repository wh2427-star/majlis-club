import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = execSync("git ls-files --cached --others --exclude-standard app components lib", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(tsx|ts|css)$/.test(f));

describe("source rules", () => {
  it("uses logical CSS properties only (RTL-ready)", () => {
    // Physical direction utilities/properties are banned; use ms-/me-/ps-/pe-/start-/end-/text-start.
    const banned =
      /(?<![\w-])(-?(ml|mr|pl|pr|left|right)-[\w[\]./]+|(text|float)-(left|right)|(rounded|border)-(l|r|tl|tr|bl|br)(-[\w[\]]+)?)(?=\s)/;
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const classStrings = [...src.matchAll(/className=\{?[`"]([^`"]+)[`"]/g)].map((m) => m[1] + " ");
      for (const cls of classStrings) expect(banned.test(cls), `${f}: "${cls.trim()}"`).toBe(false);
      if (f.endsWith(".css")) expect(/margin-(left|right)|padding-(left|right)/.test(src), f).toBe(false);
    }
  });

  it("contains no billing or payment code", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8").toLowerCase();
      expect(/stripe|invoice|checkout|billing/.test(src), f).toBe(false);
    }
  });
});
