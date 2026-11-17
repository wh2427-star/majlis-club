import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousA11yIssues, zoom200 } from "./helpers";

test("design system page is accessible at 360px", async ({ page }) => {
  await page.goto("/styleguide");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await expectNoHorizontalScroll(page);
});

test("design system page works with 200% text", async ({ page }) => {
  await page.goto("/styleguide");
  await zoom200(page);
  await expectNoHorizontalScroll(page);
});

test("root element carries lang and dir", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
