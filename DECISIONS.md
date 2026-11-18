# Decisions

Small choices made while building v1, and open items that need a person to resolve.
Items marked **[CONFIRM]** are deliberately not resolved in code.

## Open items [CONFIRM]

- **Name and trade mark.** "Majlis Club" is a working title. No UAE trade mark, company-name or app store check has been run. The name lives only in `config/app.ts` (plus the PWA manifest and favicon comment).
- **Logo artwork and minimum size.** The mark in `components/brand/Logo.tsx` is a coded stand-in. Needs redrawing to a grid, optical correction at small sizes, and a minimum size. Below 24px the doorway closes up.
- **Logo colourway.** The brief says primary = Emerald dots with a Sunshine apex. The brand book's sketch (p.11) also shows Light-sky and Pink shoulder dots ("four accent dots"). Built to the brief; confirm which is right.
- **Type family.** IBM Plex Sans (Regular, SemiBold) via `next/font`. Noto Sans is the alternative. The family is one token (`--font-brand` → `--font-sans` in `app/globals.css`). Both need an Arabic companion.
- **Children's images and personal data.** UAE consent rules for images of children and for personal data need legal review. Current position: club confirms consent per upload, parents can report, reported photos hide immediately, no names in captions, children stored as nickname + birth year only.
- **App store rules** for apps used by or about children (needed before the native apps).
- **Licences.** Which licence types and issuing authorities apply to which clubs (academy vs community). `licences.issuing_authority` is free text; the app does not assert which is correct.
- **Paid-tier pricing.** No prices anywhere in v1. Principle recorded: one published price list, tiered by club size, never by club type or enquiry volume; paid tools manage and promote demand, never buy position.
- **Sport dot shapes.** Only football and basketball are drawn for the dots-divide motion; the rest fall back to the plain doorway. Six to eight sports need drawing properly.
- **Email delivery.** Magic links use Supabase's default mailer, which is rate-limited. Set up a real SMTP sender before launch.
- **Print colour values** (CMYK) not set.
- **View counting.** Demand "profile views" are page views (signed-out visitors included, the club's own members excluded), not unique parents, and are not rate-limited. The copy says "viewed your club N times" so it does not overclaim. Decide whether to deduplicate before showing these numbers in sales conversations.
- **Supabase dashboard settings before launch.** Turn on leaked-password protection (Auth settings); set Site URL and redirect URLs for magic links; set up SMTP; rotate the service-role key (it was shared in a chat during setup).

## Choices made

- **Next.js 16 without Cache Components.** The scaffold enables `cacheComponents`; it is turned off because almost every screen reads the Supabase session. Simpler request-time model; can be revisited.
- **Distance.** Haversine on lat/lng (in SQL and in `lib/domain/distance.ts`), not PostGIS. 24 clubs do not need a spatial index.
- **Distance origin.** The centre point of the parent's chosen area. Club coordinates are fictional points near their area's centre.
- **Backend for development.** A hosted Supabase dev project (no Docker on the build machine). Migrations are SQL files in `supabase/migrations/` and work with a local `supabase start` too.
- **Auth.** Email + password and magic link, both via Supabase Auth.
- **Tailwind palette.** Default Tailwind colours are removed (`--color-*: initial`), so only brand colours can be used.
- **RTL readiness.** A unit test bans physical-direction utilities (`ml-`, `pl-`, `text-left`, `left-`...) in components; use `ms-`, `ps-`, `text-start`, `start-`.
- **Package manager.** npm. Node 22 LTS pinned in `.nvmrc`.
- **Brand book PDF** is kept in the folder but not committed (12 MB).
- **Extra tables.** `club_claims` (claiming an existing listing needs admin approval, so nobody can take over a club's page) and `club_suggestions` (the empty-state "suggest a club" form). `categories` sits above `sports` so hobby and holiday clubs are new rows, not a migration.
- **Enquiries store a snapshot** of what the club received (name, email, phone, child nickname and birth year). Clubs never read parent or child tables.
- **Reporting a photo needs a signed-in parent**, so one anonymous visitor cannot hide every photo. The photo is hidden the moment a report is filed.
- **Featured slot** shows at most one club, only when that club already matches the parent's search, and only in the area it was bought for. The club also keeps its normal organic position.
- **Upgrade prompt threshold** is enquiries in the last rolling 30 days (`UPGRADE_ENQUIRY_THRESHOLD`, default 10).
- **New club location** defaults to its area's centre point until a location editor exists.
- **Grants.** New Supabase projects give API roles no table privileges, so `20261117000006_grants.sql` grants the minimum per table; RLS then limits rows.
- **Security-definer helpers** (`is_admin`, `is_club_member`, `club_is_public`, `club_badges`, `record_club_view`, `cluster_coverage`) stay callable over the API on purpose; each returns only booleans, public data, or nothing to non-admins. Supabase's advisor warns about them; accepted.
- **Seed** is a TypeScript script (`npm run seed`) rather than `seed.sql`, because it also creates auth users and uploads placeholder images. Club "photos" are drawings of pitches and pools, never people.
- **E2E tests reset the demo data** (global setup runs the seed) so runs are repeatable. Point them only at a dev project.
- **Admin access** is a `profiles.role = 'admin'` row, set by the seed or SQL; nobody can promote themselves (trigger + RLS test).
- **Uploads go straight from the browser to Supabase Storage** (photos 5 MB, licences 10 MB), then a server action checks the stored path belongs to the club and records it. Hosts cap request bodies (Netlify ~6 MB, Vercel ~4.5 MB), so files never pass through the app server. Rules live in `lib/domain/uploads.ts`.
- **Hosting.** Netlify, deploying from the private GitHub repo `wh2427-star/majlis-club`.
- **Forms keep typed values** after a validation error (React resets forms after a form action by default).
