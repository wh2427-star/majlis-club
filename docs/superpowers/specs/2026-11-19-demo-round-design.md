# Demo round: club home, pricing, map, family tools, announcements

Date: 2026-11-19. Status: draft for approval.

## Intent

The next round makes Majlis Club convincing to show investors and clubs. Every screen someone might click into has to work for real on the existing stack (Next.js, Supabase, row-level security), but the backend stays light. Push notifications, email delivery and billing are out of scope.

## Goals

- Club owners land on **their own club**, on a dashboard that shows demand at a glance (screenshots 1 and 2).
- Clubs can price **per session, per term (with the number of sessions), per year, or as a 5–10 session block**.
- Clubs can offer a **free trial session**, and parents can request one.
- Parents start from **their own location on a map**, not from choosing an area.
- In the family view, parents can **add sessions to Apple, Google or Outlook calendars** and see **promoted offers**.
- Clubs can **send announcements** to all their parents or to one age group. Parents read them in a **Notifications** section.
- Empty sections are hidden, and owners are prompted to fill them in.

## Non-goals

- Payments, invoices and term billing. The Pro cards are shown locked, and no billing code is written.
- Email or push delivery of announcements. They appear in the app only.
- A kit store. It appears as a "Coming soon" card only.
- Arabic and RTL content. RTL-safe utilities stay mandatory.

## Anti-goals (a failure even if it works)

- Paid promotion changes the search order. **Fair order stays**: distance, then name. Offers are a separate slot labelled "Promoted".
- Dashboard numbers are invented or inflated. The numbers come from real events, and small or zero numbers are shown honestly. Demo data is seeded so the chart looks lived-in.
- A parent's precise location is stored on the server, or sent anywhere other than the search request.
- Children's data spreads. Announcements target age bands worked out from birth year. Clubs never see which children a parent has.

## Approaches considered

- **A. Real app, light backend (picked).** New columns and tables where needed, real map tiles, Pro tools locked. Slower than mocking, but nothing breaks when someone clicks off-script and nothing gets rebuilt later.
- B. Mocked demo screens next to the real app. Fast and pixel-perfect, but brittle, and two versions of the app to maintain.
- C. A separate clickable prototype. Rejected because it throws away the real foundation.

## Build order (each step is demo-ready before the next starts)

### 1. Club home

- **Landing.** After sign-in, a `club` role user goes to `/club`. With one club, `/club` redirects to the new dashboard at `/club/[id]`. With several, it lists them. `/` also sends a signed-in club user to `/club`.
- **Two tabs**, as in the screenshot: "Dashboard and Pro" (`/club/[id]`) and "List your club" (`/club/[id]/edit`, the listing wizard).
- **Dashboard** (screenshot 1):
  - Four stat cards: profile views (with the week-on-week change), parent saves, enquiries and trial requests.
  - A 6-week profile-views line chart, drawn as inline SVG with no chart library. It uses brand tokens and has an accessible table fallback.
  - The "Free listing live" badge.
  - The enquiry list and status buttons from today's demand page move here. `/club/[id]/demand` redirects to the dashboard.
- **Club Pro** (screenshot 2): seven cards labelled "Locked · Pro" (Enquiry inbox, Trial and waitlist manager, Term registration and attendance, Payments and term billing, Parent messaging, Campaigns and offers, Analytics), plus a "Club store — coming soon" card. Each card links to `/club/upgrade`. No prices are shown. The intro reads "Never alters search order." The existing upgrade-threshold prompt stays.
- **Profile strength.** A checklist on the dashboard (description, coach credentials, photos, licence, schedule, pricing, trial), with a nudge such as "Clubs with photos get more saves." On the public profile, any section with no data is hidden rather than shown empty.
- **Listing wizard** (screenshot 3): `/club/new` and `/club/[id]/edit` become a 4-step flow: 1. Basics (name, sport, community, club type, age-group chips 3–5/6–8/9–12/13+, description, coach credentials); 2. Schedule & fee; 3. Photos; 4. Preview. Each step saves on its own. There is a new `clubs.coach_credentials` text column.

### 2. Pricing and trials

- **New table `club_price_plans`**: `club_id`, `kind` (`per_session | per_term | per_year | block`), `price_aed`, `sessions_count` and an optional `label`. Rules are enforced by checks in the database and by Zod:
  - `per_term` requires a session count of at least 1.
  - `block` requires a session count between 5 and 10.
  - `per_session` and `per_year` take no count.
- **`club_sessions.price_aed`** becomes nullable and is no longer edited. The migration copies each club's existing per-session prices into `per_session` plans.
- **Price on cards and the profile** (answers-first order unchanged): the card shows the lowest per-session equivalent, e.g. "from AED 45 a session", and the profile lists every plan. Ranking never reads prices.
- **Trials:**
  - New column `club_sessions.trial_available` (boolean).
  - New table `trial_requests`: `session_id`, `parent_id`, child nickname and birth year as a snapshot, preferred date, and `status` (`requested | accepted | declined`).
  - On the profile, a "Book a free trial" button sits next to sessions that allow trials. Parents must be signed in to use it.
  - On the dashboard, the club sees the requests and can accept or decline them.
  - In the family view, the parent sees each request's status.
  - RLS mirrors enquiries: the club reads the snapshot only, never the parent or child tables.

### 3. Parent map and location

- **Home starts with "Use my location"** through the browser's geolocation API. If the parent declines, or the browser has no location, they pick an area as they do today.
- **Coordinates travel only in the search request** (`/results?lat=..&lng=..`, rounded to 3 decimal places, about 100 m). They are never written to the database. Distance is measured from that point, with the same Haversine maths.
- **Map** (Leaflet with OpenStreetMap tiles, a new client component): a "You are here" dot, one pin per club with the sport initial (as in screenshot 4), and a tapped pin opens a summary card with "Open club page". The list below the map keeps fair order. A short line explains the order: "Ordered by distance from you…".
- **Outside the live areas**: the map shows the nearest live area's clubs and the waitlist for the parent's area. No false coverage.
- **Offers strip**: "Offers near you", labelled "Promoted. Never changes the order.", below the map. It uses `promotions` with new `title`, `body` and `terms` text columns.

### 4. Family view

- **Add to calendar** on each weekly session:
  - Apple, and Outlook desktop: an `.ics` file download (a route handler that returns a weekly `RRULE` with Asia/Dubai times).
  - Google: a `calendar.google.com/calendar/render?action=TEMPLATE` link.
  - Outlook.com: an `outlook.live.com/calendar/deeplink/compose` link.
  - A single "Add whole week" `.ics` file is also offered.
- **Offers**: a "Promoted" section showing active offers in the parent's saved area, or the area of their saved clubs. It is clearly labelled and dismissible.
- **Enquiries stay where they are.** Trial request statuses sit next to them.

### 5. Announcements

- **New table `club_announcements`**: `club_id`, `title`, `body`, `age_min` and `age_max` (both optional; leaving them empty means the whole club), and `created_at`.
- **Club side**: a "Send announcement" form on the dashboard (audience: whole club, or one of the age-group chips), plus a list of sent announcements. This is labelled as a preview of Pro parent messaging but works now.
- **Parent side**: a new "Notifications" section in the family view, plus an unread count in the header. A parent sees an announcement if they have saved the club, enquired with it or requested a trial there, and, for an age-targeted one, if one of their children's ages falls in the band. A security-definer function does the matching, so clubs never read the children table.
- **Read state**: a `announcement_reads` table (parent, announcement).

### 6. Kit store

- A "Club store — coming soon" card on the dashboard. Nothing else.

## Constraints

- Next 16 in this repo differs from older versions. Read `node_modules/next/dist/docs/` before writing routes or handlers.
- Every string goes in `messages/en.json`. Only brand colours. Logical-direction utilities only. Tap targets ≥ 44 px. Must pass axe at 360 px and at 200 % zoom.
- Migrations are new files in `supabase/migrations/`. Grants are added per table. RLS tests are added for every new table.
- Run the existing unit tests (fair order, parity, no billing code) as each step lands. New dependencies are limited to `leaflet` and `react-leaflet`.
- The seed adds plans, trial sessions, 6 weeks of views, saves, trial requests, offers and announcements, so every screen in the demo has data.

## Calls I made (check these)

1. The dashboard's 4th stat is **trial requests** rather than "trial bookings": nothing is paid or confirmed.
2. The card price is the **lowest per-session equivalent** across plans.
3. Announcements reach parents who **saved, enquired or requested a trial**. There is no "follow" button.
4. The map is a **real street map** (OpenStreetMap), not the drawn style in the screenshot.
5. A parent's location is **never stored**, only rounded and sent with the search.
6. Pro cards are **always shown locked**, whatever the paid-tools flag says. Billing stays off.

## Left to the builder

Component structure, chart drawing details, the exact copy of the profile-strength nudges, and how the wizard steps keep partial state.
