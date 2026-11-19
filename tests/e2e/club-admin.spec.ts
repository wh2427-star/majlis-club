import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** Club owners land on their main club; the switcher lists every club they manage, by id. */
async function clubBase(page: import("@playwright/test").Page, name: string) {
  await page.goto("/club");
  await page.waitForURL(/\/club\/[0-9a-f-]{36}$/);
  const id = await page.getByLabel("Your clubs").locator("option", { hasText: name }).getAttribute("value");
  return `/club/${id}`;
}

test("club owner lands on their own club dashboard", async ({ page }) => {
  await signIn(page, "club");
  await page.goto("/");
  // Two redirects (/ → /club → /club/<id>); allow a cold server the navigation timeout, not 5s.
  await page.waitForURL(/\/club\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Club dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard and Pro" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Your clubs")).toHaveValue(/[0-9a-f-]{36}/);
  await expect(page.getByLabel("Your clubs").locator("option:checked")).toHaveText("Oryx Owls Football");
});

test("switcher reaches the owner's second club", async ({ page }) => {
  await signIn(page, "club");
  await page.goto("/club");
  await page.waitForURL(/\/club\/[0-9a-f-]{36}$/);
  await page.getByLabel("Your clubs").selectOption({ label: "Camel Cove Cricket" });
  await expect(page.getByText(/Camel Cove Cricket\./)).toBeVisible();
});

test("a user with no clubs sees the add prompt, not a redirect", async ({ page }) => {
  await signIn(page, "admin");
  await page.goto("/club");
  await expect(page).toHaveURL(/\/club$/);
  await expect(page.getByRole("link", { name: "Add or claim a club" })).toBeVisible();
});

test("another club's dashboard is a 404", async ({ page }) => {
  await signIn(page, "club");
  const base = await clubBase(page, "Oryx Owls Football");
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "parent");
  // Streaming (root loading.tsx) sends 200 before notFound() runs, so check the not-found page itself.
  await page.goto(base);
  await expect(page.getByRole("heading", { level: 1, name: "We could not find that page." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Club dashboard" })).toHaveCount(0);
});

/** The number shown on a stat card. */
async function stat(page: import("@playwright/test").Page, testId: string) {
  return Number((await page.getByTestId(testId).getByTestId("stat-value").innerText()).replace(/\D/g, ""));
}

test("dashboard: real numbers, a 6-week chart and the upgrade prompt when demand crosses the threshold", async ({ page }) => {
  await signIn(page, "club");
  const busy = await clubBase(page, "Oryx Owls Football");
  await page.goto(busy);
  // 418 seeded views over six weeks (plus any from other tests), 64 seeded savers plus the demo parent, 11 enquiries.
  expect(await stat(page, "stat-views")).toBeGreaterThanOrEqual(418);
  expect(await stat(page, "stat-saves")).toBeGreaterThanOrEqual(64);
  expect(await stat(page, "stat-enquiries")).toBe(11);
  await expect(page.getByTestId("stat-views")).toContainText(/[+-]?\d+% this week|No change this week/);
  const cells = await page.getByTestId("views-chart").locator("table td").allInnerTexts();
  expect(cells.map(Number)).toHaveLength(6);
  [48, 62, 58, 74, 82, 94].forEach((seeded, i) => expect(Number(cells[i])).toBeGreaterThanOrEqual(seeded));
  await expect(page.getByTestId("upgrade-prompt")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/AED \d+/);
  await page.getByRole("link", { name: "See the paid tools" }).click();
  await expect(page.getByText("Paid tools are not available yet.")).toBeVisible();
});

test("quiet club sees small numbers honestly, including zero, and no upgrade prompt", async ({ page }) => {
  await signIn(page, "club");
  const quiet = await clubBase(page, "Camel Cove Cricket");
  await page.goto(quiet);
  const views = await stat(page, "stat-views");
  expect(views).toBeGreaterThanOrEqual(3);
  expect(views).toBeLessThan(10);
  expect(await stat(page, "stat-enquiries")).toBe(0);
  await expect(page.getByTestId("stat-views")).not.toContainText(/NaN|Infinity/);
  await expect(page.getByTestId("upgrade-prompt")).toHaveCount(0);
  await expect(page.getByTestId("profile-strength")).toContainText("Add a description");
});

test("old demand link redirects to the dashboard enquiries", async ({ page }) => {
  await signIn(page, "club");
  const base = await clubBase(page, "Oryx Owls Football");
  await page.goto(`${base}/demand`);
  await page.waitForURL((u) => u.pathname === base);
  await expect(page.getByRole("heading", { name: "Enquiries", exact: true })).toBeVisible();
});

test("Pro tools are locked and never priced", async ({ page }) => {
  await signIn(page, "club");
  await page.goto(await clubBase(page, "Oryx Owls Football"));
  const pro = page.getByTestId("club-pro");
  await expect(pro.getByText("Locked · Pro")).toHaveCount(7);
  await expect(pro.getByText("Coming soon")).toHaveCount(1);
  await expect(pro).toContainText("Never alters search order.");
  // The payments card mentions "AED fees" (screenshot copy); no amounts or prices anywhere.
  await expect(pro).not.toContainText(/AED\s*\d|\d+\s*AED|\$\s*\d|per month|a month/i);
});

test("listing editor shows a live preview in the parent's order", async ({ page }) => {
  await signIn(page, "club");
  const base = await clubBase(page, "Camel Cove Cricket");
  await page.goto(`${base}/edit/schedule`);
  const preview = page.getByTestId("live-preview");
  await expect(preview.getByRole("heading", { name: "Camel Cove Cricket" })).toBeVisible();
  await page.getByLabel("Youngest age").first().fill("8");
  await expect(preview).toContainText("Ages 8");
  // Same order as the public page; empty sections are left out, as parents would see them (Camel Cove has no description).
  const sections = await preview.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections[0]).toBe("facts");
  expect(sections.at(-1)).toBe("actions");
  expect(sections).not.toContain("description");
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

test("club adds a listing through the four steps", async ({ page }) => {
  await signIn(page, "club");
  await page.goto("/club/new");
  await expect(page.getByRole("heading", { name: "Add your club" })).toBeVisible();
  const stepper = page.getByRole("list", { name: "Listing steps" });
  await expect(stepper.locator('[aria-current="step"]')).toHaveText("1. Basics");
  const name = `E2E Demo Netball ${Date.now() % 10000}`;
  await page.getByLabel("Club name", { exact: true }).fill(name);
  await page.getByLabel("Sport", { exact: true }).selectOption({ label: "Netball" });
  await page.getByLabel("Community", { exact: true }).selectOption({ label: "The Meadows" });
  await page.getByLabel("Club type").selectOption({ label: "Community club" });
  // Chips are labelled checkboxes; tap the visible pill as a parent would.
  await page.getByText("6-8 yrs", { exact: true }).click();
  await page.getByText("9-12 yrs", { exact: true }).click();
  await expect(page.getByLabel("6-8 yrs")).toBeChecked();
  await expect(page.getByLabel("3-5 yrs")).not.toBeChecked();
  await page.getByLabel("Coach credentials").fill("Level 1 netball coach");
  await page.getByRole("button", { name: "Continue to schedule and pricing" }).click();

  await page.waitForURL(/\/club\/[0-9a-f-]{36}\/edit\/schedule\?created=1$/);
  await expect(page.getByText(/Your club is added. We approve new listings by hand/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Listing steps" }).getByRole("link", { name: "2. Schedule & fee" })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Add session" }).click();
  await page.getByLabel("Price per session (AED)").fill("25");
  await page.getByRole("button", { name: "Continue to photos" }).click();

  await page.waitForURL(/\/photos$/);
  await expect(page.getByRole("link", { name: "3. Photos" })).toHaveAttribute("aria-current", "step");
  await page.getByRole("link", { name: "Continue to preview" }).click();

  await page.waitForURL(/\/preview$/);
  await expect(page.getByTestId("club-profile").getByRole("heading", { name })).toBeVisible();
  await expect(page.getByTestId("club-profile")).toContainText("Netball");
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Club dashboard" })).toBeVisible();
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

test("a large licence document uploads straight to storage, not through the app server", async ({ page }) => {
  // 7 MB is above the server's 1 MB action limit and hosts' request caps, so this only works via direct upload.
  await signIn(page, "club");
  const base = await clubBase(page, "Oryx Owls Football");
  await page.goto(`${base}/licence`);
  await page.getByLabel("Licence number").fill("E2E-12345");
  await page.getByLabel("Issuing authority").fill("Demo authority");
  await page.getByLabel("Expiry date").fill("2030-01-31");
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(7 * 1024 * 1024, 0x20)]);
  await page.getByLabel("Licence document").setInputFiles({ name: "licence.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: "Send licence" }).click();
  await expect(page.getByText("Licence sent. We will check it and email you.")).toBeVisible({ timeout: 30_000 });
});
