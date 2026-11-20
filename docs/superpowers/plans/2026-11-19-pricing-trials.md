# Pricing and Trials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clubs price by session, term, year or 5–10 session block, and can offer free trial sessions that signed-in parents request and clubs accept or decline.

**Architecture:** Prices move from `club_sessions.price_aed` to a new `club_price_plans` table, read into `ClubSummary.pricePlans`. Pure functions in `lib/domain/pricing.ts` work out the card price ("from AED 45 a session") and the price filter. Ranking never reads them. Trials are a per-session flag plus a `trial_requests` table that mirrors enquiries: the request holds a snapshot of the child, contact and session, so the club never reads parent tables and requests survive schedule edits.

**Tech Stack:** Next.js 16.4.6 App Router, Supabase Postgres with RLS, Zod, next-intl, Tailwind 4, Vitest, Playwright and axe.

**Spec:** `docs/superpowers/specs/2026-11-19-demo-round-design.md`, section "2. Pricing and trials", plus Constraints and Anti-goals.

## Global Constraints

- Read `node_modules/next/dist/docs/` before writing routes. `params` and `searchParams` are Promises, and the root `loading.tsx` makes `notFound()` return HTTP 200.
- Every string goes in `messages/en.json`. Only brand tokens are used (ink, sand, white, emerald, berry, pink, sunshine, sky). Only logical-direction utilities (`ms-`, `pe-`, `start-` and so on). Tap targets are at least 44 px (`min-h-tap`).
- The words billing, invoice, checkout, stripe and payment_intent must not appear in app, components or lib code (enforced by `tests/unit/source-rules.test.ts`).
- Fair order is distance, then name, and nothing else. Prices never affect ranking; they only filter.
- Migrations are new files in `supabase/migrations/`, applied to the dev project with the Supabase MCP `apply_migration`. Grants are per table, and every new table gets RLS tests.
- SQL functions use `security definer`, `set search_path = ''`, `revoke ... from public, anon` and `grant ... to authenticated`.
- Node comes from nvm: `export PATH="$HOME/.nvm/versions/node/v22.23.5/bin:$PATH"`. Playwright runs with `PORT=3200`, because a stale dev server holds ports 3000 and 3100.
- No new dependencies.

## Calls made in this plan (the spec is silent; check these)

1. **"Per-session equivalent":**
   - `per_session` is its price.
   - `per_term` and `block` are price ÷ sessions.
   - `per_year` has no equivalent, because it carries no session count.
   - The card shows the lowest equivalent, rounded **up** to a whole dirham so "from" never understates.
   - A club with only yearly plans shows "AED X a year". A club with no plans shows "–".
2. **The price filter** ("max AED per session") keeps a club when any plan's equivalent is at or under the maximum. Clubs with no per-session equivalent drop out while the filter is set. The filter now applies to the club, not to individual sessions.
3. **The "Trial session" badge** is derived from sessions: it shows when any session has `trial_available`. The `trial_offer` promotion row is no longer read for the badge, because step 4's offers own promotions.
4. **Trial requests are snapshots,** like enquiries. Each stores `club_id`, the child's nickname and birth year, the contact name and email (with consent), and the session's sport, day and start time. `session_id` is `on delete set null`, because saving the schedule deletes and recreates sessions.
5. **Status rules:**
   - Only the club changes status, and only from `requested` to `accepted` or `declined`.
   - The preferred date must fall within today to 60 days ahead.
   - A parent can have only one open (`requested`) request per session.
6. **The dashboard's 4th stat** is "Trial requests" (spec call 1), counted over the last 42 days.
7. **Profile strength** gains a 7th item, `prices` (at least one plan), so owners are prompted to add one.
8. **Copy changes:** the Pro "trials" card body becomes "Waitlists, class caps and automatic cancellation fills". Accepting trials is now free, so the old copy would contradict the app.
9. **Plan limits:** at most 8 plans per club; at most 40 characters per label; per-term session counts from 1 to 100; prices from AED 0 to 100,000.

## Review Focus

1. **Requests survive schedule edits.** A club saves its schedule, which deletes and recreates sessions. Existing trial requests must still appear for the club and the parent, with their snapshot intact. *Covered by an e2e test in Task 6.*
2. **Direct API inserts that bypass the form.** These must all be refused by the database:
   - a trial on a session without `trial_available`,
   - a session belonging to another club,
   - a request for a pending club,
   - a date in the past,
   - a request on behalf of another parent.

   *Covered by RLS tests in Task 2.*
3. **Status and content tampering.** A parent setting their own request to `accepted`, a club rewriting the snapshot, and a club acting on another club's request must all be refused. *Covered by RLS tests in Task 2.*
4. **Odd plan sets.** Clubs with no plans, only yearly plans, or fractional equivalents (AED 500 for 6 sessions) must render honestly without crashing (no `Math.min()` of an empty list), and must filter correctly. *Covered by unit tests in Task 1.*
5. **Double submits.** A double-clicked or repeated request for the same session returns a friendly "You already asked for a trial of this session" error, not a generic one. *Covered by an RLS test in Task 2 (unique violation) and the service mapping in Task 5.*

---

### Task 1: Pricing maths and schemas

**Files:**
- Create: `lib/domain/pricing.ts`, `tests/unit/pricing.test.ts`
- Modify: `lib/schemas/index.ts`, `lib/domain/dashboard.ts`, `tests/unit/rules.test.ts`, `tests/unit/dashboard.test.ts`

**Interfaces:**
- Produces, in `lib/domain/pricing.ts`:
  - `type PlanKind = "per_session" | "per_term" | "per_year" | "block"`
  - `type PricePlan = { id?: string; kind: PlanKind; priceAed: number; sessionsCount: number | null; label: string }`
  - `perSessionEquivalent(p: PricePlan): number | null`
  - `type CardPrice = { kind: "perSession"; aed: number } | { kind: "perYear"; aed: number } | null`
  - `cardPrice(plans: PricePlan[]): CardPrice`
  - `withinMaxPrice(plans: PricePlan[], maxAed: number): boolean`
- Produces, in `lib/schemas/index.ts`:
  - `pricePlanSchema`, whose output is `PricePlan` without `id`
  - `trialRequestSchema`
  - `sessionSchema` without `priceAed` and with `trialAvailable: boolean` (default `false`)
- Produces, in `lib/domain/dashboard.ts`: `ChecklistKey` adds `"prices"`, and `profileChecklist` takes `planCount: number`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/pricing.test.ts`:

```ts
const plan = (kind: PlanKind, priceAed: number, sessionsCount: number | null = null): PricePlan => ({ kind, priceAed, sessionsCount, label: "" });
it("per-session equivalents", () => {
  expect(perSessionEquivalent(plan("per_session", 85))).toBe(85);
  expect(perSessionEquivalent(plan("per_term", 900, 12))).toBe(75);
  expect(perSessionEquivalent(plan("block", 500, 6))).toBeCloseTo(83.333, 2);
  expect(perSessionEquivalent(plan("per_year", 3000))).toBeNull();
});
it("card price is the lowest equivalent, rounded up", () => {
  expect(cardPrice([plan("per_session", 85), plan("block", 500, 6)])).toEqual({ kind: "perSession", aed: 84 });
  expect(cardPrice([plan("per_year", 3000), plan("per_year", 2500)])).toEqual({ kind: "perYear", aed: 2500 });
  expect(cardPrice([plan("per_year", 3000), plan("per_term", 600, 10)])).toEqual({ kind: "perSession", aed: 60 });
  expect(cardPrice([])).toBeNull();
});
it("price filter uses equivalents and drops clubs without one", () => {
  expect(withinMaxPrice([plan("per_session", 85), plan("per_term", 600, 10)], 60)).toBe(true);
  expect(withinMaxPrice([plan("per_session", 85)], 60)).toBe(false);
  expect(withinMaxPrice([plan("per_year", 100)], 60)).toBe(false);
  expect(withinMaxPrice([], 60)).toBe(false);
});
```

In `tests/unit/rules.test.ts`, add a `pricePlanSchema` block:
- per_term with count 0 fails with `errors.termSessions`; count 12 passes.
- block with counts 4 and 11 fails with `errors.blockSessions`; counts 5 and 10 pass.
- per_session and per_year given `sessionsCount: 7` parse to `sessionsCount: null`.
- a 41-character label fails with `errors.planLabel`.
- price −1 and 100001 fail with `errors.price`.

Add a `trialRequestSchema` block:
- a preferred date of yesterday fails with `errors.trialDate`; today passes; today + 61 days fails.
- with no `childId` and no nickname, it fails with `errors.child`.
- consent missing fails with `errors.consent`.

In `tests/unit/dashboard.test.ts`, the blank checklist now has 7 keys, ending `"schedule", "prices"`, and `planCount: 1` marks `prices` done.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run tests/unit/pricing.test.ts tests/unit/rules.test.ts tests/unit/dashboard.test.ts`
Expected: FAIL, with missing module `@/lib/domain/pricing` and missing exports.

- [ ] **Step 3: Implement**
- `pricing.ts`: pure functions with no imports. `cardPrice` uses `Math.ceil` on the minimum equivalent.
- `pricePlanSchema`: `kind` enum; `priceAed` coerced, 0–100000 (`errors.price`); `sessionsCount` coerced, optional or nullable; `label` trimmed, at most 40 characters (`errors.planLabel`), default `""`. A `superRefine` applies the term and block rules, and a `transform` nulls the count for `per_session` and `per_year`.
- `trialRequestSchema` fields:
  - `clubId`, `sessionId`: uuid.
  - `childId`: uuid or `""`.
  - `childNickname`: trimmed, at most 30 characters, optional.
  - `childBirthYear`: coerced, 2000–2100, optional.
  - `preferredDate`: `yyyy-mm-dd`; refined to fall within today to today + 60 days, comparing date strings built from `new Date()` (`errors.trialDate`).
  - `contactName`, `contactEmail`: as `enquirySchema`.
  - `consent`: `z.literal("on")`.
  - A refine requires either `childId` or both nickname and birth year (`errors.child`).
- Add the error keys `price`, `termSessions`, `blockSessions`, `planLabel`, `trialDate`, `child` and `tooManyPlans` to `messages/en.json` under `errors`, keeping `price` if it already exists.

- [ ] **Step 4: Run the tests and watch them pass**

Run: same command. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git commit -m "Add price-plan maths and schemas for plans, trial requests and sessions"`.

---

## Revision 1 (2026-11-19, after Task 1): venues and per-group prices

The user added a requirement mid-run: "a single club with multiple geographical locations for the same / different age groups / timings & costs per group". They chose to add venues now, with prices per group that fall back to club-wide prices. Tasks 2 and onward below replace the original Tasks 2–6. Task 1 stands as built.

**Model:**
- **Club** has many **venues**: name, area, lat/lng.
- **Venue** has many **groups**: an optional name, plus an age range.
- **Group** has many **sessions** (day, start, end, `trial_available`) and its own **price plans**.
- **Club-wide plans** have `group_id` null.

**Calls added:**
10. **Which plans apply to a group:** its own plans when it has any; otherwise the club-wide plans.
11. **Card distance** is to the nearest venue. While a sport, age or day filter is on, it uses only the venues of matching sessions. Order stays distance, then name.
12. **The card's area fact** shows the nearest venue's area. The profile lists each venue with its groups, times and prices.
13. **Session ages are copied from their group.** Sessions keep `age_min` and `age_max`, written only by `save_club_schedule` from the group's values, so the existing session-based search, week view and SQL keep working.
14. **The schedule is saved atomically.** A security-invoker SQL function `save_club_schedule(p_club, p_payload jsonb)` replaces venues, groups, sessions and plans in one transaction, under RLS.
15. **Migration backfill:**
    - Each club gets one venue, named after its area, at the club's lat/lng.
    - Each distinct (club, age range) gets one unnamed group.
    - When a group has no name, it is displayed as "Ages 6 to 12".
16. **Trial snapshots** also store the venue name, because venue ids change on every save.
17. **Limits:**
    - 5 venues per club, each name 1–80 characters.
    - 10 groups per venue, each name up to 60 characters.
    - 8 plans per group and 8 club-wide.

**Review Focus additions:**
6. **A club with a venue in another area** ranks by its nearest venue. With an age filter on, a club whose only matching group is at a far venue ranks by that far venue. *Covered by unit tests in Task 3.*
7. **A schedule save that fails half-way** (for example, a bad plan in the last group) leaves the previous schedule intact. *Covered by an RLS test in Task 2: the RPC raises, and the old rows remain.*

---

### Task 2: Database, seed and RLS

**Files:**
- Create: `supabase/migrations/20261119000003_venues_pricing_trials.sql`
- Modify: `scripts/seed.ts`, `scripts/seed-data.ts`, `tests/rls/rls.test.ts`

**Interfaces:**
- Tables:
  - `club_venues(id, club_id, name, area_id, lat, lng, sort, created_at)`
  - `club_groups(id, club_id, venue_id, name default '', age_min, age_max, sort)`
  - `club_sessions` gains `group_id not null` (after the backfill) and `trial_available bool default false`; `price_aed` becomes nullable.
  - `club_price_plans(id, club_id, group_id null, kind, price_aed, sessions_count, label, sort)`
  - `trial_requests(...)` as in the original Task 2, plus `venue_name text not null`.
- RPC: `save_club_schedule(p_club uuid, p_payload jsonb) returns void`. The payload is `{ venues: [{ name, areaId, lat, lng, groups: [{ name, ageMin, ageMax, sessions: [{ sportId, day, start, end, trialAvailable }], plans: [PlanRow] }] }], plans: [PlanRow] }`, where `PlanRow = { kind, priceAed, sessionsCount, label }`.
- Seed facts:
  - Oryx Owls has 2 venues: "Ranches Community Pitch" (Arabian Ranches) and "Springs Park Field" (The Springs).
  - The Ranches venue has group "Under 9s" (6–8, Mon 16:30, trial available) with plans `per_session 85` and `block 600 × 8`, and group "Under 13s" (9–12, Wed 16:30) with no own plans.
  - The Springs venue has group "Juniors" (6–12, Sat 09:00) with plan `per_term 900 × 12`.
  - Oryx's club-wide plan is `per_session 95`.
  - Other clubs get one venue and one group per distinct age range. `trial: true` clubs have every session trial-available.
  - The trial requests are as in the original plan.

- [ ] **Step 1: Write the failing RLS tests.** Include all the original Task 2 tests, using Oryx's Monday trial session. Add:
  - **"anyone reads venues and groups of approved clubs only".**
  - **"owner saves a schedule through the RPC; another club's schedule is refused".** The RPC on Ghaf Tree errors.
  - **"a bad plan aborts the whole save".** The payload's last group has a block of 12. The RPC errors, and Oryx's venue count and session count are unchanged.
- [ ] **Step 2: Run them and watch them fail.**

  Run: `npm run test:rls`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
  - Write the original Task 2 SQL, plus the venue and group tables with RLS: read when public, member or admin; write when member or admin.
  - Add the grants as for plans.
  - Backfill as described in call 15.
  - Add `save_club_schedule`: plpgsql, `security invoker`, `search_path = ''`. It deletes the club's plans, sessions, groups and venues in that order, then inserts from the payload, and errors if the caller is not `is_club_member(p_club) or is_admin()`.
  - Apply it with MCP.
- [ ] **Step 4: Update the seed** with the facts above. Run `npm run seed`.
- [ ] **Step 5: Run the tests and watch them pass.**

  Run: `npm run test:rls`. Expected: PASS.
- [ ] **Step 6: Commit.**

---

### Task 3: Domain and data layer: venues, groups, prices, nearest-venue distance

**Files:**
- Modify:
  - `lib/domain/types.ts`, `lib/domain/search.ts`, `lib/domain/pricing.ts` (`plansForGroup`), `lib/domain/facts.ts`, `lib/data/queries.ts`
  - Unit fixtures in `tests/unit/fair-order.test.ts` and `tests/unit/rules.test.ts`
- Test: `tests/unit/fair-order.test.ts`, `tests/unit/pricing.test.ts`

**Interfaces:**
- `Venue = { id; name; areaId; areaName; lat; lng }`
- `Group = { id; venueId; name; ageMin; ageMax; plans: PricePlan[] }`
- `Session` drops `priceAed` and gains `venueId`, `groupId`, `trialAvailable`.
- `ClubSummary` gains `venues: Venue[]`, `groups: Group[]` and `pricePlans: PricePlan[]` (club-wide).
- `plansForGroup(club: Pick<ClubSummary, "groups" | "pricePlans">, groupId: string): PricePlan[]`
- `RankedClub` gains `nearestVenue: Venue | null`.

- [ ] **Step 1: Write the failing tests.**
  - **"distance is to the nearest venue"** and **"with a filter, only matching groups' venues count"** (Review Focus 6).
  - **"price filter uses each matching group's plans, falling back to club-wide"**.
  - **"price filter never reorders"**.
  - **`plansForGroup` fallback**.
  - Update the fixtures.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement.**
  - `rankClubs`: distance is the minimum haversine over the candidate venues, falling back to the club's lat/lng when there are no venues. The price filter checks `withinMaxPrice(plansForGroup(club, s.groupId), max)` over the matching sessions (all sessions when no filter is on). `summariseSessions` stops reading prices.
  - `queries.ts` selects `club_venues(...)`, `club_groups(...)` and `club_price_plans(...)`, with sessions carrying `group_id` and `trial_available`. `trialOffer` is derived from `sessions.some(s => s.trialAvailable)`.
- [ ] **Step 4: Run them and watch them pass.**

  Run: `npx vitest run`. Expected: PASS, with `npm run typecheck` errors limited to the UI files that Task 4 updates.
- [ ] **Step 5: Commit.**

---

### Task 4: Cards and profile show venues, groups, prices and trial buttons

As the original Task 3's UI half:
- **Card:**
  - the price fact uses `cardPrice` over the matching groups' plans (`plansForGroup`);
  - the area fact uses `nearestVenue.areaName`.
- **Profile:**
  - A `data-section="venues"` lists each venue (an `h2` with its name and area).
  - Under each venue are its groups: the group name or "Ages {min} to {max}", the session rows each with `trialAction`, and a prices line from `plansForGroup` using `planText`.
  - `data-section="prices"` shows the club-wide plans, titled "Prices at every venue", and is hidden when there are none.
- **e2e tests:**
  - **"Oryx card shows from AED 75 a session"**: the minimum is the Springs term at 900/12 = 75.
  - **"the profile lists both venues, their groups and prices"**.
  - **"Book a free trial only on the Under 9s Monday session"**.
- **Commit message:** "Cards and profile: venues, groups, prices, trial buttons".

### Task 5: Listing step 2 edits venues, groups, times, prices and trials

As the original Task 4, with a nested editor:
- The editor nests venues → groups → times and prices, plus a club-wide prices fieldset.
- A venue's area select sets its lat/lng to the area centre; step 3 adds a map pin.
- It posts one JSON field, `schedule`. A Zod `scheduleSchema` composes the venue, group, session and plan schemas with the limits from call 17; errors are keyed by path, e.g. `v0-g1-plan2-sessionsCount`.
- `updateSchedule` validates and then calls `rpc("save_club_schedule")`.
- **e2e tests:**
  - **"add a second venue with a group and a term plan; preview shows it"**
  - **"block of 12 refused with its message"**
  - **"trial tick shows the button in preview"**
  - **"profile strength asks for prices"** (counting club-wide and group plans)
- **Commit message:** "Listing step 2: venues, groups, times, prices and free trials".

### Task 6: Parents request a trial and see its status

As the original Task 5. The snapshot also stores `venue_name`. The radio rows read "{group} at {venue} · {day} {time}".

### Task 7: Clubs see, accept and decline trial requests

As the original Task 6. Rows show the venue name. Run the full gate, record the decisions in `DECISIONS.md`, then commit.

---

## Appendix: original Tasks 2–6 (referenced by the revised tasks above as "original Task N")

### Original Task 2: Database, seed and RLS

**Files:**
- Create: `supabase/migrations/20261119000003_pricing_trials.sql`
- Modify: `scripts/seed.ts`, `scripts/seed-data.ts`, `tests/rls/rls.test.ts`

**Interfaces:**
- Produces these tables and columns, which Tasks 3–6 read:
  - `club_price_plans(id uuid pk, club_id, kind price_plan_kind, price_aed numeric(8,2), sessions_count smallint null, label text not null default '', sort smallint default 0, created_at)`
  - `club_sessions.trial_available boolean not null default false`; `club_sessions.price_aed` becomes nullable.
  - `trial_requests(id, club_id, session_id null, parent_id, child_nickname, child_birth_year, contact_name, contact_email, contact_consent_at, sport_id, session_day, session_start, preferred_date date, status trial_status, created_at, updated_at)`
- Produces seed facts:
  - Oryx Owls has plans `per_session 85`, `block 600 × 8` and `per_term 900 × 12`, and its Monday session has `trial_available`.
  - Every `trial: true` seed club has `trial_available` on all of its sessions.
  - Every other club has one `per_session` plan at its first session price.
  - Oryx Owls has 3 trial requests (2 `requested`, 1 `accepted`). One of them is from `demoAccounts.parent`, dated 7 days ahead.

- [ ] **Step 1: Write the failing RLS tests** in `tests/rls/rls.test.ts`.

Add a `describe("price plans and trials")` block with these tests:
- **"anyone reads plans of approved clubs; nobody sees a pending club's plans".** Anon reads more than 0 rows from `club_price_plans`, and 0 rows for `mirage-martial-arts`.
- **"club owner writes own plans only".** A plan insert on Oryx succeeds and is deleted again. An insert on `ghaf-tree-swim-squad` errors.
- **"database rejects a block of 4 and a term without sessions".** The owner inserts `{kind:"block", sessions_count:4}`, then `{kind:"per_term", sessions_count:null}`. Both error.
- **"parent requests a trial on a trial session".** `parentB` inserts a request for Oryx's trial session, with tomorrow's date and the snapshot fields. It succeeds with status `requested`. A second identical insert errors with code `23505`. At the end of the test, the owner declines the request, so the partial unique index is free again for the next run.
- **"parent cannot request a non-trial session, another parent's request, a past date or a pending club".** Four inserts, each erroring:
  - a session with `trial_available = false`;
  - `parent_id` set to `parentB.id` while signed in as `parentA`;
  - yesterday's date;
  - a session of `mirage-martial-arts`.
- **"parent cannot accept their own request; club cannot rewrite it".** `parentA` updates own request status to `accepted`, then re-reads it: still `requested`, or the update errored. The owner updates `child_nickname` and gets an error. The owner updates status to `accepted` and succeeds.
- **"club reads only its own requests and never the children table".** Every `trial_requests.club_id` the owner sees is one of the owner's clubs. Reading `children` for parentA still returns 0 rows.
- **"anon reads no trial requests".** Add `"trial_requests"` to the unauthenticated `it.each` list.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test:rls`
Expected: FAIL, with relation `club_price_plans` does not exist.

- [ ] **Step 3: Write the migration** `20261119000003_pricing_trials.sql`:
- `create type public.price_plan_kind as enum ('per_session','per_term','per_year','block')` and `create type public.trial_status as enum ('requested','accepted','declined')`.
- `club_price_plans` with these checks:
  - `price_aed between 0 and 100000`
  - `char_length(label) <= 40`
  - `(kind in ('per_session','per_year') and sessions_count is null) or (kind = 'per_term' and sessions_count between 1 and 100) or (kind = 'block' and sessions_count between 5 and 10)`
  - an index on `club_id`
- Copy existing prices: `insert into public.club_price_plans (club_id, kind, price_aed) select distinct club_id, 'per_session', price_aed from public.club_sessions where price_aed is not null;`
- `alter table public.club_sessions alter column price_aed drop not null, add column trial_available boolean not null default false;`
- `trial_requests`:
  - `club_id` references clubs, cascade on delete. `session_id` references club_sessions, `on delete set null`. `parent_id` references `auth.users`, cascade on delete.
  - `child_nickname` 1–30 characters and `child_birth_year` 2000–2100. Contact name and email lengths as in enquiries. `contact_consent_at timestamptz not null`.
  - `sport_id` references sports. `session_day smallint` 0–6. `session_start time`.
  - `preferred_date date not null`. `status trial_status default 'requested'`.
  - Indexes on `(club_id, created_at)` and `parent_id`.
  - `create unique index trial_requests_one_open on public.trial_requests (parent_id, session_id) where status = 'requested';`
- RLS and policies:
  - Plans: read when `club_is_public(club_id) or is_club_member(club_id) or is_admin()`. Members and admins write everything.
  - Requests, select: `parent_id = auth.uid() or is_club_member(club_id) or is_admin()`.
  - Requests, insert: `parent_id = auth.uid() and club_is_public(club_id) and contact_consent_at is not null and preferred_date between current_date and current_date + 60 and exists (select 1 from public.club_sessions s where s.id = session_id and s.club_id = trial_requests.club_id and s.trial_available)`.
  - Requests, update: `is_club_member(club_id)` in both using and check.
- Add a trigger function `public.guard_trial_requests()` (plpgsql, `search_path = ''`):
  - On INSERT, force `status = 'requested'` and `parent_id = auth.uid()`.
  - On UPDATE, raise `42501` unless the only changed column is `status`, the old status is `requested`, and the new status is `accepted` or `declined`.
  - Also attach the existing `public.touch_updated_at()` trigger.
  - Revoke execute on the guard function from `public, anon, authenticated`, as `handle_new_enquiry` does.
- Grants:
  - `grant select on public.club_price_plans to anon, authenticated;`
  - `grant insert, update, delete on public.club_price_plans to authenticated;`
  - `grant select, insert, update on public.trial_requests to authenticated;`
- Apply with MCP `apply_migration` (name `pricing_trials`) to project `lswoeynajwtbosfvwduy`.

- [ ] **Step 4: Update the seed**
- `seed-data.ts`: add an optional `plans?: { kind; price; sessions?; label? }[]` to `SeedClub`, and give Oryx Owls the three plans listed under Interfaces.
- `seed.ts`:
  - Sessions insert `trial_available: !!c.trial || (c.slug === "oryx-owls-football" && day === 0)` and no `price_aed`.
  - Insert `c.plans`, or else one `per_session` plan at `c.sessions[0][6]`.
  - Stop inserting `trial_offer` promotions.
  - After parents exist, insert the 3 Oryx requests using the service client, with `parent_id` set explicitly. The service role bypasses RLS but not triggers, so the guard must allow the service role: skip the guard when `auth.uid() is null`. This is safe because `anon` has no insert or update grant on `trial_requests`.
  - The pending club's session keeps no price.
- Run `npm run seed`.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm run test:rls`
Expected: PASS, with the 30 existing tests plus the new ones.

- [ ] **Step 6: Commit**

Run `git commit -m "Add price plans, trial sessions and trial requests with RLS; seed them"`.

---

### Original Task 3: Prices and trials in the data layer, search and facts

**Files:**
- Modify:
  - `lib/domain/types.ts`, `lib/data/queries.ts`, `lib/domain/search.ts`, `lib/domain/facts.ts`, `lib/i18n/facts.ts`
  - `components/club/ClubFacts.tsx`, `components/club/ClubCard.tsx`, `components/club/ClubProfile.tsx`
  - `app/clubs/[slug]/page.tsx`, `app/club/[id]/preview/page.tsx`, `messages/en.json`
- Test:
  - `tests/unit/fair-order.test.ts`, `tests/unit/rules.test.ts` (fixtures)
  - `tests/e2e/parent.spec.ts`

**Interfaces:**
- Consumes the Task 1 pricing functions and the Task 2 columns.
- Produces:
  - `Session` loses `priceAed` and gains `trialAvailable: boolean`.
  - `ClubSummary` gains `pricePlans: PricePlan[]`. `trialOffer` is now `sessions.some(s => s.trialAvailable)`.
  - `ClubFacts` takes `plans: PricePlan[]`.
  - `ClubProfile` gains a prop `trialAction?: (s: Session) => ReactNode`.
  - `planText(t, p: PricePlan): string` lives in `lib/i18n/facts.ts`.

- [ ] **Step 1: Write the failing tests**
- In `fair-order.test.ts`, fixtures gain `pricePlans: [{ kind: "per_session", priceAed: 50 + i * 5, sessionsCount: null, label: "" }]` and drop session `priceAed`. The filter assertion becomes `expect(cheap.every((c) => withinMaxPrice(c.pricePlans, 60))).toBe(true)` and `expect(cheap.length).toBeGreaterThan(0)`.
- Add the test **"price filter never reorders"**: the organic ids for `{ maxPriceAed: 80 }` equal the unfiltered organic ids with the dropped clubs removed.
- In `rules.test.ts`, the buildWeek fixtures swap `priceAed` for `trialAvailable: false`.
- In `parent.spec.ts`, add the test **"card shows the lowest per-session price; profile lists every plan"**. On the results for Arabian Ranches, Oryx's card `[data-fact=price] dd` reads "from AED 75 a session". On `/clubs/oryx-owls-football`, `[data-section=prices]` lists "AED 85 a session", "AED 600 for 8 sessions" and "AED 900 a term (12 sessions)".
- Add the test **"Book a free trial sits only on trial sessions"**: the Oryx profile has exactly one "Book a free trial" link, inside the Monday row.

- [ ] **Step 2: Run them and watch them fail**

Run `npx vitest run` (expect type and assertion failures). Then run `PORT=3200 npx playwright test tests/e2e/parent.spec.ts -g "per-session|free trial"` (expect FAIL).

- [ ] **Step 3: Implement**
- `queries.ts`:
  - `CLUB_SELECT` adds `trial_available` to `club_sessions(...)`, drops `price_aed`, and adds `club_price_plans(id, kind, price_aed, sessions_count, label, sort)`.
  - `toSummary` maps plans sorted by `sort`, then by per-session equivalent ascending, with yearly plans last.
- `search.ts`: remove price from `sessionMatches` and from `sessionFilterActive`. After the distance check, `if (filters.maxPriceAed != null && !withinMaxPrice(club.pricePlans, filters.maxPriceAed)) continue;`
- `facts.ts`: `ClubFacts` drops `priceMinAed` and `priceMaxAed`, and `summariseSessions` stops reading prices.
- `i18n/facts.ts`:
  - `priceText(t, plans)` returns `facts.priceFrom` `"from AED {price} a session"`, `facts.pricePerYear` `"AED {price} a year"`, or `""`.
  - `planText` uses `facts.plan.per_session` "AED {price} a session", `per_term` "AED {price} a term ({count} sessions)", `per_year` "AED {price} a year" and `block` "AED {price} for {count} sessions". A label is prefixed as "{label}: …".
  - Delete the unused `facts.price` and `facts.priceRange` keys.
- `ClubProfile`:
  - Session rows drop the price and render `trialAction?.(s)` at the end when `s.trialAvailable`.
  - A new `<section data-section="prices">` with heading `club.pricesTitle` "Prices" comes after the facts section and before photos. It is hidden when there are no plans.
  - `ProfileData` gains `pricePlans`.
- Public page `trialAction`:
  - Signed in: `<ButtonLink variant="secondary" href={`/trial/${slug}?session=${s.id}`}>{t("trial.book")}</ButtonLink>`, where `trial.book` is "Book a free trial".
  - Signed out: the same link pointing at `/auth/sign-in?next=` plus the encoded trial URL.
  - Pending or rejected clubs: none.
- Preview page and ScheduleForm preview: `trialAction` renders a disabled `Button` with the same label.

- [ ] **Step 4: Run them and watch them pass**

Run `npm run check`, then `PORT=3200 npx playwright test tests/e2e/parent.spec.ts`.
Expected: PASS. Fix any existing parent test that asserted the old "AED 85 a session" card text so it expects the new text; the fact order is unchanged.

- [ ] **Step 5: Commit**

Run `git commit -m "Read prices from plans: lowest per-session price on cards, every plan on the profile, trial buttons"`.

---

### Original Task 4: Listing step 2 edits plans and trial sessions

**Files:**
- Modify:
  - `components/forms/ScheduleForm.tsx`, `lib/services/club.ts` (`updateSchedule`), `app/club/[id]/edit/schedule/page.tsx`
  - `app/club/[id]/page.tsx` (checklist input), `components/club/ProfileStrength.tsx` (7th item copy), `messages/en.json`
- Test: `tests/e2e/club-admin.spec.ts`

**Interfaces:**
- Consumes `pricePlanSchema`, `sessionSchema` (Task 1) and `ClubProfile.trialAction` (Task 3).
- Produces: the form posts hidden JSON fields `sessions` (each with `trialAvailable`) and `plans`, and `updateSchedule` replaces both lists.

- [ ] **Step 1: Write the failing e2e tests** in `club-admin.spec.ts`. Both run on a fresh club made through the wizard, as the existing four-step test does.
- **"step 2 adds a term plan and a block, and the preview shows them".** Add a plan, choose "Per term", leave sessions empty, and save. The error "Enter how many sessions the term has." shows next to the field. Enter 10 sessions and price 700. Add a plan, choose "Block of sessions", price 450, sessions 5. The live preview's `[data-section=prices]` contains "AED 700 a term (10 sessions)" and "AED 450 for 5 sessions". Continue to photos, then the preview step, which shows the same lines.
- **"a block outside 5–10 is refused".** A block of 12 shows "A block is 5 to 10 sessions." and the step does not advance.
- **"ticking 'Offer a free trial' adds the trial button to the preview".**
- **"profile strength asks for prices until a plan exists".** A new club's dashboard lists "Add your prices"; after saving one plan, that item is done.

- [ ] **Step 2: Run them and watch them fail**

Run: `PORT=3200 npx playwright test tests/e2e/club-admin.spec.ts -g "plan|block|free trial|prices"`
Expected: FAIL.

- [ ] **Step 3: Implement**
- `ScheduleForm`:
  - Remove the session price field. Add a `CheckboxField` "Offer a free trial session" per session.
  - Add a fieldset "Prices" (`editor.prices`) with rows. Each row has a kind select (`editor.planKind.*`); a "Sessions" number field shown only for term and block; a price field; an optional label (hint: "e.g. Sibling rate"); and Remove.
  - "Add a price" appends `{kind:"per_session", priceAed: 50, sessionsCount: null, label: ""}`. The button is hidden once there are 8 plans.
  - Field errors are keyed `plan-${i}-${field}`.
  - Initial plans come from `club.pricePlans`.
  - The live preview passes `pricePlans`.
- `updateSchedule`:
  - Parse `plans` JSON with `pricePlanSchema` per row. Return errors as `{ [`plan-${i}-${field}`]: key, plans: key }`.
  - Return `errors.tooManyPlans` when there are more than 8 plans.
  - After the sessions are replaced, `delete` the club's plans, then `insert` them with `sort: i`. Check both errors.
  - Sessions insert `trial_available`.
- Dashboard: `profileChecklist({... planCount: club.pricePlans.length })`, with `strength.prices` "Add your prices" linking to `/club/${id}/edit/schedule`.
- Messages:
  - `errors.termSessions` "Enter how many sessions the term has."
  - `errors.blockSessions` "A block is 5 to 10 sessions."
  - `errors.planLabel` "Keep the label under 40 characters."
  - `errors.tooManyPlans` "Up to 8 prices."

- [ ] **Step 4: Run them and watch them pass**

Run `npm run check`, then `PORT=3200 npx playwright test tests/e2e/club-admin.spec.ts`.
Expected: PASS, including the existing "four steps" and "live preview" tests, updated where they typed a session price.

- [ ] **Step 5: Commit**

Run `git commit -m "Listing step 2: price plans (session, term, year, block) and free-trial sessions"`.

---

### Original Task 5: Parents request a trial and see its status

**Files:**
- Create: `app/trial/[slug]/page.tsx`
- Modify:
  - `lib/services/family.ts` (`requestTrial`, `getFamily`), `app/actions/family.ts` (`requestTrialAction`)
  - `components/forms/FamilyForms.tsx` (`TrialForm`), `app/family/page.tsx`, `messages/en.json`
- Test: `tests/e2e/parent.spec.ts`, `tests/e2e/a11y.spec.ts`

**Interfaces:**
- Consumes `trialRequestSchema` (Task 1), the `trial_requests` table (Task 2) and the trial link `/trial/[slug]?session=<id>` (Task 3).
- Produces:
  - `requestTrial(form: FormData): Promise<ActionState>`
  - `getFamily()` also returns `trials: { id; clubName; clubSlug; sportSlug; preferredDate; status }[]`, newest first.

- [ ] **Step 1: Write the failing tests**

In `parent.spec.ts`:
- **"parent books a free trial and sees it requested"**:
  1. Sign in as `parent2`, open the Oryx profile, and click "Book a free trial".
  2. The page heading is "Book a free trial at Oryx Owls Football". The session radio for Monday is checked.
  3. Choose the first child, set the date to 3 days ahead, tick consent, and submit.
  4. The URL ends in `/family#trials`. The `#trials` section contains "Oryx Owls Football" and the badge "Requested".
  5. Book the same session again: the form shows "You already asked for a trial of this session." The Playwright global setup reseeds before each run, so parent2 starts with no open request.
- **"signed-out parent is sent to sign in and back"**: `/trial/oryx-owls-football?session=…` redirects to `/auth/sign-in?next=…`.
- **"a session without trials cannot be booked"**: `/trial/oryx-owls-football?session=<wednesday id>` shows the not-found heading "We could not find that page."

In `a11y.spec.ts`, add `/trial/oryx-owls-football` to the parent pages, so it gets the axe check at 360 px and at 200 % zoom. With no `session` parameter, the page preselects the first trial session.

- [ ] **Step 2: Run them and watch them fail**

Run: `PORT=3200 npx playwright test tests/e2e/parent.spec.ts -g "trial"`
Expected: FAIL (404 route).

- [ ] **Step 3: Implement**
- Page:
  - `requireUser`, then load the club by slug. Call `notFound()` unless the club is approved and has at least one trial session.
  - If `?session` names a non-trial session, `notFound()`.
  - Render `PageTitle` with `trial.title` "Book a free trial at {club}" and `trial.intro` "No payment. The club will accept or suggest another time."
  - Then `TrialForm`, which shows:
    - a radio group of trial sessions ("Swimming · Saturday 9:00am to 10:00am");
    - a child `SelectField` when the parent has children, otherwise nickname and birth year fields;
    - a date input with `min` today and `max` today + 60;
    - contact name and email, prefilled from `getParentContact`;
    - a consent checkbox reusing `enquiry.consent`.
- `requestTrial`:
  - Parse the form and check the user.
  - Load the club with `getClubById` and confirm the session is in `club.sessions` with `trialAvailable`.
  - Read the child snapshot as `sendEnquiry` does.
  - Insert with the snapshot `sport_id`, `session_day` and `session_start`. Map error code `23505` to `trial.alreadyRequested`, and any other error to `errors.generic`.
- `requestTrialAction`: on success, `redirect("/family#trials")`.
- Family page:
  - Add a section `family.trialsTitle` "Trial requests", `id="trials"`, after enquiries.
  - Each line reads `family.trialLine` "{sport} trial at {club}, {date}", with a `Badge` of `family.trialStatus.requested|accepted|declined` ("Requested" / "Accepted" / "Declined") and the icons clock, check and x.
  - When empty, show `family.noTrials`.

- [ ] **Step 4: Run them and watch them pass**

Run `PORT=3200 npx playwright test tests/e2e/parent.spec.ts tests/e2e/a11y.spec.ts`, then `npm run check`.
Expected: PASS.

- [ ] **Step 5: Commit**

Run `git commit -m "Parents request a free trial and follow its status in the family view"`.

---

### Original Task 6: Clubs see, accept and decline trial requests

**Files:**
- Modify:
  - `lib/services/club.ts` (`getDashboard`, `setTrialStatus`), `app/actions/club.ts` (`setTrialStatusAction`)
  - `app/club/[id]/page.tsx`, `messages/en.json` (`dashboard.trials*` and the `pro.tools.trials.body` copy)
- Test: `tests/e2e/club-admin.spec.ts`

**Interfaces:**
- Consumes `trial_requests` (Task 2) and the seeded Oryx requests.
- Produces:
  - `getDashboard()` returns `trials42: number` and `trialList: TrialRow[]`, with `TrialRow = { id; child_nickname; child_birth_year; contact_name; contact_email; sport_id; session_day; session_start; preferred_date; status; created_at }`, ordered with `requested` first, then newest.
  - `setTrialStatus(clubId: string, id: string, status: "accepted" | "declined"): Promise<void>`

- [ ] **Step 1: Write the failing e2e tests** in `club-admin.spec.ts`:
- **"dashboard counts trial requests and lists them".** On the Oryx dashboard, `stat-trials` shows a `stat-value` of 3 or more. `#trials` lists the seeded requests. Each requested item has "Accept" and "Decline" buttons; the accepted one has neither and shows "Accepted".
- **"club accepts a request and the parent sees it".** The club clicks "Accept" on parent2's request from Task 5's test, or on a request the test creates first through the form. The badge becomes "Accepted". Then, signed in as that parent, the `/family` `#trials` section shows "Accepted".
- **"requests survive a schedule save"** (Review Focus 1). Open `/club/<oryx>/edit/schedule` and save without changes. The dashboard's `#trials` count and the parent's request line are unchanged.
- **"Pro trials card no longer claims approval is locked".** `[data-testid=club-pro]` does not contain "Approve trial requests".

- [ ] **Step 2: Run them and watch them fail**

Run: `PORT=3200 npx playwright test tests/e2e/club-admin.spec.ts -g "trial"`
Expected: FAIL.

- [ ] **Step 3: Implement**
- `getDashboard`:
  - Count with `select("id", { count: "exact", head: true }).eq("club_id", id).gte("created_at", since42)`.
  - Fetch the list, limited to 50.
- Dashboard page:
  - The 4th `StatCard` has `testId="stat-trials"`, label `dashboard.trials` "Trial requests" and note `dashboard.trialsNote` "Last 6 weeks". The grid becomes `sm:grid-cols-2 lg:grid-cols-4`.
  - A new section `dashboard.trialsTitle` "Trial requests", `id="trials"`, placed after enquiries.
  - Each item shows:
    - the child line, reusing `demand.childLine`;
    - the session as "{sport}, {day} {time}" using the snapshot fields;
    - "Preferred date: {date}";
    - the contact email;
    - the status badge;
    - for `requested` items only, two forms: Accept (primary) and Decline (secondary).
  - When empty, show `dashboard.noTrials`.
- `setTrialStatusAction`: calls `requireClubAccess`, then `update({status}).eq("id").eq("club_id")`, then revalidates `/club/<id>`.
- Pro copy: `pro.tools.trials.body` becomes "Waitlists, class caps and automatic cancellation fills."

- [ ] **Step 4: Run them and watch them pass**

Run the full gate:
- `npm run check`
- `npm run test:rls`
- `npm run seed && PORT=3200 npx playwright test`

Expected: everything passes.

- [ ] **Step 5: Record the decisions and commit**
- Add the "Calls made in this plan" items to `DECISIONS.md`.
- Add a line to `README.md` about plans and trials.

Then run `git commit -m "Club dashboard: trial requests stat, list, accept and decline"`.
