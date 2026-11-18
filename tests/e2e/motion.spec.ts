import { expect, test } from "@playwright/test";

test("dots-divide runs once on a sport header when motion is allowed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/results?area=arabian-ranches&sport=football");
  const anim = page.getByTestId("sport-header").getByTestId("dots-divide");
  await expect(anim).toHaveAttribute("data-motion", "on");
  const iterations = await anim.locator("circle").first().evaluate((c) => getComputedStyle(c).animationIterationCount);
  expect(iterations).toBe("1");
});

test("reduced motion disables the animation entirely", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/results?area=arabian-ranches&sport=football"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const states = await page.$$eval("[data-testid=dots-divide]", (els) =>
      els.map((e) => [e.getAttribute("data-motion"), getComputedStyle(e.querySelector("circle")!).animationName]),
    );
    expect(states.length).toBeGreaterThan(0);
    for (const [motion, name] of states) {
      expect(motion).toBe("off");
      expect(name).toBe("none");
    }
  }
});

test("sports without a drawn shape fall back to the plain doorway", async ({ page }) => {
  await page.goto("/results?area=arabian-ranches&sport=tennis");
  await expect(page.getByTestId("sport-header").getByTestId("dots-divide")).toHaveCount(0);
});

test("launch animation runs only once per session", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.getByTestId("dots-divide").first()).toHaveAttribute("data-motion", "on");
  await page.goto("/");
  await expect(page.getByTestId("dots-divide").first()).toHaveAttribute("data-motion", "off");
});
