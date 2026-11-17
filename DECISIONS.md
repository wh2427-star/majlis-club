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
