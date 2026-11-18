import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

async function clubBase(page: import("@playwright/test").Page, name: string) {
  await page.goto("/club");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });
  const href = await card.getByRole("link", { name: "Edit listing" }).getAttribute("href");
  return href!.replace("/edit", "");
}

test("demand view: big plain numbers and the upgrade prompt when demand crosses the threshold", async ({ page }) => {
  await signIn(page, "club");
  const busy = await clubBase(page, "Oryx Owls Football");
  await page.goto(`${busy}/demand`);
  const numbers = page.getByTestId("demand-numbers");
  // 128 seeded views (plus any from other tests) and 11 seeded enquiries in the last 30 days.
  const text = (await numbers.innerText()).replace(/\s+/g, " ");
  const [views, enquiries] = text.match(/\d+/g)!.map(Number);
  expect(views).toBeGreaterThanOrEqual(128);
  expect(enquiries).toBe(11);
  await expect(page.getByTestId("upgrade-prompt")).toBeVisible();
  await page.getByRole("link", { name: "See the paid tools" }).click();
  await expect(page.getByText("Paid tools are not available yet.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/AED \d+ a (month|year)/);
});

test("quiet club sees small numbers honestly, including zero, and no upgrade prompt", async ({ page }) => {
  await signIn(page, "club");
  const quiet = await clubBase(page, "Camel Cove Cricket");
  await page.goto(`${quiet}/demand`);
  const text = (await page.getByTestId("demand-numbers").innerText()).replace(/\s+/g, " ");
  const [views, enquiries] = text.match(/\d+/g)!.map(Number);
  expect(views).toBeGreaterThanOrEqual(3);
  expect(views).toBeLessThan(10);
  expect(enquiries).toBe(0);
  await expect(page.getByTestId("demand-numbers")).toContainText("enquiries");
  await expect(page.getByTestId("upgrade-prompt")).toHaveCount(0);
});

test("listing editor shows a live preview in the parent's order", async ({ page }) => {
  await signIn(page, "club");
  const base = await clubBase(page, "Camel Cove Cricket");
  await page.goto(`${base}/edit`);
  const preview = page.getByTestId("live-preview");
  await page.getByLabel("Club name", { exact: true }).fill("Camel Cove Cricket Club");
  await expect(preview.getByRole("heading", { name: "Camel Cove Cricket Club" })).toBeVisible();
  const sections = await preview.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(["facts", "photos", "description", "actions"]);
  await page.getByRole("button", { name: "Add session" }).click();
  await expect(page.getByTestId("session-editor")).toHaveCount(3);
});

test("photo upload requires consent and alt text and warns about names in captions", async ({ page }) => {
  await signIn(page, "club");
  const base = await clubBase(page, "Camel Cove Cricket");
  await page.goto(`${base}/photos`);
  await page.getByLabel("Caption").fill("Great catch by Layla");
  await expect(page.getByText(/may name a child: Layla/)).toBeVisible();
  await page.getByLabel("Caption").fill("Saturday nets");
  await page.getByLabel("Photo", { exact: true }).setInputFiles({
    name: "nets.png",
    mimeType: "image/png",
    // 1x1 PNG: no people in it
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
  });
  await page.getByLabel("Describe the photo").fill("Practice nets on the club ground");
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByText("Confirm you hold parental consent before uploading.")).toBeVisible();
  await page.getByLabel(/holds parental consent/).check();
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByText("Photo added.")).toBeVisible();
});

test("a new club can be added in one short form and waits for approval", async ({ page }) => {
  await signIn(page, "club");
  await page.goto("/club/new");
  await expect(page.getByRole("heading", { name: "Add your club" })).toBeVisible();
  await page.getByLabel("Club name", { exact: true }).fill(`E2E Demo Netball ${Date.now() % 10000}`);
  await page.getByLabel("Community club").check();
  await page.getByLabel("Area").selectOption({ label: "The Meadows" });
  await page.getByLabel("Sport").selectOption({ label: "Netball" });
  await page.getByLabel("Price per session (AED)").fill("25");
  await page.getByRole("button", { name: "Add club" }).click();
  await expect(page.getByText(/Your club is added. We approve new listings by hand/)).toBeVisible();
});

test("admin approves a licence and the badge appears for parents; it is absent on expiry", async ({ page, browser }) => {
  // Before: Dune Hoppers has a pending licence, so no badge.
  const anon = await browser.newPage();
  await anon.goto("/clubs/dune-hoppers-gymnastics");
  await expect(anon.getByText("Licence verified")).toHaveCount(0);
  // Expired licence (Coral Reef) shows no badge either.
  await anon.goto("/clubs/coral-reef-swim");
  await expect(anon.getByText("Licence verified")).toHaveCount(0);

  await signIn(page, "admin");
  await page.goto("/admin/licences");
  const item = page.getByRole("listitem").filter({ hasText: "Dune Hoppers Gymnastics" });
  await item.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Dune Hoppers Gymnastics" })).toHaveCount(0);

  await anon.goto("/clubs/dune-hoppers-gymnastics");
  await expect(anon.getByText("Licence verified")).toBeVisible();
  await anon.close();
});

test("admin queues: reported photos, approvals and coverage", async ({ page }) => {
  await signIn(page, "admin");
  await page.goto("/admin/photos");
  await expect(page.getByText(/Lakeside Lions Football, reported because: The caption names a child/)).toBeVisible();
  await page.goto("/admin/approvals");
  await expect(page.getByText("Mirage Martial Arts")).toBeVisible();
  await page.goto("/admin/coverage");
  await expect(page.getByTestId("coverage-rule")).toContainText("That is 28 clubs");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "28");
  await expect(page.getByText("3 on the waitlist").first()).toBeVisible();
});

test("non-admins cannot open admin screens", async ({ page }) => {
  await signIn(page, "parent");
  await page.goto("/admin/licences");
  await expect(page.getByRole("heading", { name: "We could not find that page." })).toBeVisible();
  await expect(page.getByText("Licence checks")).toHaveCount(0);
});
