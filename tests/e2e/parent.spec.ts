import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("home shows live areas and coming-soon areas with a waitlist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("radio", { name: "Arabian Ranches" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "The Meadows" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "The Springs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join the Umm Suqeim waitlist" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Umm Suqeim" })).toHaveCount(0);
});

test("coming-soon area never shows an empty list, and the waitlist works", async ({ page }) => {
  await page.goto("/results?area=jumeirah");
  await expect(page).toHaveURL(/\/areas\/jumeirah/);
  await expect(page.getByRole("heading", { name: "Jumeirah is coming soon" })).toBeVisible();
  await expect(page.getByTestId("organic-list")).toHaveCount(0);
  await page.getByLabel("Your email").fill(`e2e-${Date.now()}.demo@example.com`);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByText("You are on the waitlist for Jumeirah.")).toBeVisible();
});

test("club cards show the facts first, in the agreed order", async ({ page }) => {
  await page.goto("/results?area=arabian-ranches");
  const card = page.getByTestId("club-card").first();
  const facts = await card.locator("[data-fact]").evaluateAll((els) => els.map((e) => e.getAttribute("data-fact")));
  expect(facts).toEqual(["sport", "ages", "days", "area", "price", "distance"]);
  // Marketing copy comes after the facts in the DOM.
  const order = await card.evaluate((el) => {
    const facts = el.querySelector("[data-testid=club-facts]")!;
    const copy = el.querySelector("[data-testid=club-copy]");
    return copy ? facts.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING : 4;
  });
  expect(order).toBeTruthy();
});

test("Featured is a separate, labelled slot and does not change the organic order", async ({ page }) => {
  await page.goto("/results?area=arabian-ranches");
  const slot = page.getByTestId("featured-slot");
  await expect(slot).toBeVisible();
  await expect(slot.getByText("Featured", { exact: true })).toBeVisible();
  await expect(slot.getByText("Paid placement. It does not change the order of the list below.")).toBeVisible();
  const featuredId = await slot.getByTestId("featured-card").getAttribute("data-club-id");
  // Organic list: sorted by distance then name, featured club at its organic position.
  const rows = await page.getByTestId("organic-list").getByTestId("club-card").evaluateAll((cards) =>
    cards.map((c) => ({
      id: c.getAttribute("data-club-id"),
      name: c.querySelector("h3")!.textContent!.trim(),
      km: Number(c.querySelector("[data-fact=distance] dd")!.textContent!.replace(/[^\d.]/g, "")),
    })),
  );
  expect(rows.map((r) => r.id)).toContain(featuredId);
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1], rows[i]];
    expect(a.km < b.km || (a.km === b.km && a.name.localeCompare(b.name) <= 0)).toBe(true);
  }
});

test("empty result shows what is listed nearby and invites a suggestion", async ({ page }) => {
  await page.goto("/results?area=the-springs&sport=rugby&age=3");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Listed nearby" })).toBeVisible();
  await page.getByLabel("Club name").fill("Imaginary Demo Club");
  await page.getByRole("button", { name: "Suggest this club" }).click();
  await expect(page.getByText("Thanks. We will get in touch with the club.")).toBeVisible();
});

test("club profile: facts, then photos, then description, then the enquiry button", async ({ page }) => {
  await page.goto("/clubs/oryx-owls-football?area=arabian-ranches");
  const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(["facts", "photos", "description", "actions"]);
  await expect(page.getByText("Licence verified")).toBeVisible();
  await expect(page.getByRole("button", { name: "Report this photo" }).first()).toBeVisible();
  for (const img of await page.locator("[data-section=photos] img").all()) {
    expect((await img.getAttribute("alt"))?.length).toBeGreaterThan(3);
  }
});

test("a parent can send an enquiry and sees what the club received", async ({ page }) => {
  await signIn(page, "parent");
  await page.goto("/clubs/palm-shade-tennis");
  await page.getByRole("link", { name: "Send enquiry" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("Demo Parent");
  await page.getByLabel("Your question").fill("Do you have space on Mondays?");
  // Consent is required.
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Tick the box to agree before sending.")).toBeVisible();
  await page.getByLabel(/will see my name, email/).check();
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByRole("heading", { name: "Enquiry sent" })).toBeVisible();
  const received = page.getByTestId("enquiry-received");
  await expect(received).toContainText("Demo Parent");
  await expect(received).toContainText("Do you have space on Mondays?");
  await expect(page.getByText(/usually replies within 2 days/)).toBeVisible();
  await page.getByRole("link", { name: "Go to your family page" }).click();
  await expect(page.getByText(/Palm Shade Tennis, sent/)).toBeVisible();
});

test("family screen: children, saved clubs, enquiry status and the week", async ({ page }) => {
  await signIn(page, "parent");
  await page.goto("/family");
  await expect(page.getByText(/^Bean, age \d+$/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Oryx Owls Football" })).toBeVisible();
  await expect(page.getByTestId("week")).toContainText("Monday");
  await expect(page.getByTestId("week")).toContainText("Oryx Owls Football");
  await expect(page.getByText("Fixtures")).toHaveCount(0);
  await page.getByLabel("Nickname").fill("Pip");
  await page.getByLabel("Birth year").fill(String(new Date().getFullYear() - 6));
  await page.getByRole("button", { name: "Add child" }).click();
  await expect(page.getByText(/^Pip, age 6$/)).toBeVisible();
});

test("reporting a photo hides it straight away", async ({ page }) => {
  await signIn(page, "parent2");
  await page.goto("/clubs/meadow-lark-swimming");
  const photos = page.locator("[data-section=photos] img");
  const before = await photos.count();
  await page.getByRole("button", { name: "Report this photo" }).first().click();
  await page.getByLabel("Reason").first().selectOption("child_named_in_caption");
  await page.getByRole("button", { name: "Report photo" }).click();
  await expect(page.getByText("Thanks. The photo is hidden while we review it.")).toBeVisible();
  await page.reload();
  await expect(photos).toHaveCount(before - 1);
});

test("signed-out visitors can browse but must sign in to enquire", async ({ page }) => {
  await page.goto("/enquire/oryx-owls-football");
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);
});
