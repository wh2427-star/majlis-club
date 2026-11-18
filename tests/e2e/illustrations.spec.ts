import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousA11yIssues, signIn, zoom200 } from "./helpers";

/**
 * Every illustration on screen: shown as-is via <img>, explicit 480x400 size, native ratio,
 * meaningful alt (or explicitly decorative), and no CSS that alters the art.
 */
async function checkIllustrations(page: Page, min = 1) {
  const imgs = page.locator("img[data-illustration]");
  await expect(imgs.first()).toBeAttached();
  const found = await imgs.evaluateAll((els) =>
    els.map((el) => {
      const img = el as HTMLImageElement;
      const cs = getComputedStyle(img);
      return {
        id: img.dataset.illustration,
        alt: img.getAttribute("alt"),
        decorative: img.dataset.decorative === "true",
        width: img.getAttribute("width"),
        height: img.getAttribute("height"),
        fit: cs.objectFit,
        filter: cs.filter,
        shadow: cs.boxShadow,
        border: cs.borderTopWidth,
        opacity: cs.opacity,
        inline: img.closest("svg") !== null,
      };
    }),
  );
  expect(found.length).toBeGreaterThanOrEqual(min);
  for (const f of found) {
    if (f.decorative) expect(f.alt, f.id).toBe("");
    else expect(f.alt?.trim().length, f.id).toBeGreaterThan(10);
    expect([f.width, f.height], f.id).toEqual(["480", "400"]);
    expect(f.fit, f.id).toBe("contain");
    expect([f.filter, f.shadow, f.border, f.opacity], f.id).toEqual(["none", "none", "0px", "1"]);
    expect(f.inline, f.id).toBe(false);
  }
  // Rendered box keeps the native 480:400 ratio once loaded (no crop or stretch).
  const first = imgs.first();
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => first.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  const box = await first.boundingBox();
  expect(Math.abs(box!.width / box!.height - 1.2)).toBeLessThan(0.02);
}

async function gates(page: Page) {
  await expectNoSeriousA11yIssues(page);
  await expectNoHorizontalScroll(page);
  await zoom200(page);
  await expectNoHorizontalScroll(page);
}

const publicScreens: [string, string][] = [
  ["home sport picker", "/"],
  ["sport category header", "/results?area=arabian-ranches&sport=football"],
  ["no results nearby", "/results?area=the-springs&sport=rugby&age=3"],
  ["waitlist for a coming-soon area", "/areas/umm-suqeim"],
  ["style guide (all 36)", "/styleguide"],
];

for (const [name, path] of publicScreens) {
  test(`illustrations: ${name}`, async ({ page }) => {
    await page.goto(path);
    await checkIllustrations(page, path === "/styleguide" ? 36 : 1);
    await gates(page);
  });
}

test("illustrations: sport header shows the sport and loads eagerly", async ({ page }) => {
  await page.goto("/results?area=arabian-ranches&sport=tennis");
  const img = page.getByTestId("sport-header").locator("img[data-illustration]");
  await expect(img).toHaveAttribute("data-illustration", /^tennis_[1-4]$/);
  await expect(img).toHaveAttribute("loading", "eager");
  const again = await img.getAttribute("src");
  await page.reload();
  await expect(img).toHaveAttribute("src", again!); // deterministic: same art on refresh
});

test("illustrations: the home sport picker shows nine sports, lazy-loaded, no neighbours repeating", async ({ page }) => {
  await page.goto("/");
  const imgs = page.locator("section[aria-labelledby=sports] img[data-illustration]");
  await expect(imgs).toHaveCount(9);
  const ids = await imgs.evaluateAll((els) => els.map((e) => [e.getAttribute("data-illustration"), e.getAttribute("loading")]));
  for (let k = 0; k < ids.length; k++) {
    expect(ids[k][1]).toBe("lazy");
    if (k) expect(ids[k][0]!.split("_")[1]).not.toBe(ids[k - 1][0]!.split("_")[1]);
  }
});

test("illustrations: family empty state (no saved clubs)", async ({ page }) => {
  await signIn(page, "parent2");
  await page.goto("/family");
  await expect(page.getByTestId("illustrated-message").first()).toContainText("No saved clubs yet");
  await checkIllustrations(page);
  await gates(page);
});

test("illustrations: onboarding, and the demand view at zero", async ({ page }) => {
  await signIn(page, "club");
  await page.goto("/club/new");
  await checkIllustrations(page);
  await gates(page);

  // A brand-new club has no views yet, so its demand view is at zero.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/club/new");
  await page.getByLabel("Club name", { exact: true }).fill(`E2E Zero Demand ${Date.now() % 10000}`);
  await page.getByLabel("Community club").check();
  await page.getByLabel("Area").selectOption({ label: "The Meadows" });
  await page.getByLabel("Sport").selectOption({ label: "Swimming" });
  await page.getByLabel("Price per session (AED)").fill("40");
  await page.getByRole("button", { name: "Add club" }).click();
  await expect(page.getByText(/Your club is added/)).toBeVisible();
  await page.goto("/club");
  const card = page.getByRole("listitem").filter({ hasText: "E2E Zero Demand" }).last();
  const href = await card.getByRole("link", { name: "Edit listing" }).getAttribute("href");
  await page.goto(href!.replace("/edit", "/demand"));
  await expect(page.getByTestId("illustrated-message")).toContainText("No parents have viewed your listing yet");
  await checkIllustrations(page);
  await gates(page);
});

test("club profiles never show illustrations (photos only)", async ({ page }) => {
  for (const slug of ["oryx-owls-football", "camel-cove-cricket"]) {
    await page.goto(`/clubs/${slug}`);
    await expect(page.locator("img[data-illustration]")).toHaveCount(0);
  }
});
