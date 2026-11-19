import { test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousA11yIssues, signIn, zoom200, type Role } from "./helpers";

const publicPages = [
  "/",
  "/results?area=arabian-ranches",
  "/results?area=arabian-ranches&sport=football",
  "/results?area=the-springs&sport=rugby&age=3",
  "/clubs/oryx-owls-football?area=arabian-ranches",
  "/clubs/camel-cove-cricket",
  "/areas/umm-suqeim",
  "/auth/sign-in",
  "/auth/sign-up",
  "/club",
  "/styleguide",
];

const signedInPages: [Role, string[]][] = [
  ["parent", ["/family", "/enquire/ghaf-tree-swim-squad"]],
  // "/club" redirects club owners to their dashboard, which the club management test covers.
  ["club", ["/club/new", "/club/upgrade"]],
  ["admin", ["/admin/licences", "/admin/photos", "/admin/approvals", "/admin/coverage"]],
];

for (const path of publicPages) {
  test(`axe, 360px and 200% zoom: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoSeriousA11yIssues(page);
    await expectNoHorizontalScroll(page);
    await zoom200(page);
    await expectNoHorizontalScroll(page);
  });
}

for (const [role, paths] of signedInPages) {
  test(`axe, 360px and 200% zoom as ${role}`, async ({ page }) => {
    await signIn(page, role);
    for (const path of paths) {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(path);
      await expectNoSeriousA11yIssues(page);
      await expectNoHorizontalScroll(page);
      await zoom200(page);
      await expectNoHorizontalScroll(page);
    }
  });
}

test("axe on club management screens", async ({ page }) => {
  // Four screens, each scanned at 360px and 200% zoom.
  test.setTimeout(120_000);
  await signIn(page, "club");
  await page.goto("/club");
  await page.waitForURL(/\/club\/[0-9a-f-]{36}$/);
  const base = new URL(page.url()).pathname;
  for (const sub of ["", "/edit", "/photos", "/licence"]) {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(base + sub);
    await expectNoSeriousA11yIssues(page);
    await expectNoHorizontalScroll(page);
    await zoom200(page);
    await expectNoHorizontalScroll(page);
  }
});
