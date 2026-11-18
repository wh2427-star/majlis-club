import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { demoAccounts } from "../../scripts/seed-data";

/** Fails on any serious or critical axe violation (WCAG 2.2 AA tags). */
export async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

/** No horizontal scroll at the current viewport. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * 200% zoom: a 1280px-wide desktop at 200% has a 640 CSS px viewport; we also double the root
 * font size to cover the device text-size setting. Content must still fit without sideways scroll.
 */
export async function zoom200(page: Page) {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
}

export type Role = keyof typeof demoAccounts;

export async function signIn(page: Page, role: Role) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email", { exact: true }).first().fill(demoAccounts[role].email);
  await page.getByLabel("Password").fill(process.env.DEMO_ACCOUNT_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));
}
