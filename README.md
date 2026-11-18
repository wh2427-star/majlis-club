# Majlis Club (working title)

Find your child's club, close to home. A directory of kids' sports clubs in Dubai: parents find a club near them with the facts first; clubs list for free.

This is the v1 web app: a working demo on a real foundation (Next.js, Supabase Postgres + Auth + Storage with row-level security), seeded with **fictional demo data**. There is no billing code; the paid layer is a feature-flagged stub.

## Local setup

You need Node 22 (`.nvmrc`) and a Supabase project (hosted, or local via `supabase start` with Docker).

```bash
nvm use
npm install
cp .env.example .env.local        # then fill in the Supabase URL, keys and a demo password
npx supabase db push              # or apply supabase/migrations/*.sql in order (SQL editor works too)
npm run seed                      # 24 fictional clubs, waitlists, demo accounts
npm run dev                       # http://localhost:3000
```

Demo accounts (password = `DEMO_ACCOUNT_PASSWORD` from `.env.local`):

| Role | Email |
| --- | --- |
| Parent | `parent.demo@example.com` |
| Second parent | `parent2.demo@example.com` |
| Club owner (Oryx Owls Football, Camel Cove Cricket) | `club.demo@example.com` |
| Admin | `admin.demo@example.com` |

## Checks

```bash
npm run check        # lint, type-check, unit tests (fair order, contrast, rules, RTL guard)
npm run test:rls     # row-level security against the Supabase project (needs the seed)
npm run test:e2e     # Playwright + axe at 360px and 200% zoom; re-seeds first (SKIP_SEED=1 to skip)
```

First Playwright run: `npx playwright install chromium`.

## Where things live

| Path | What |
| --- | --- |
| `config/app.ts` | Product name (one place), feature flags, thresholds |
| `lib/domain/` | Framework-free business rules: ranking, facts, licence, coverage, upgrade, schedule. Reusable by native apps |
| `lib/services/` | Server-only use cases (validate with Zod, call Supabase) |
| `lib/schemas/` | Zod schemas shared by forms and server |
| `app/actions/` | Thin server actions calling `lib/services` |
| `components/ui/`, `components/brand/` | Design-system components, placeholder logo, motion, `<Illustration>` |
| `lib/illustrations.ts`, `public/illustrations/` | Illustration manifest (alt text, traits, serving rule) and the 36 placeholder SVGs |
| `messages/en.json` | Every UI string (next-intl). Arabic is a second file later |
| `supabase/migrations/` | Schema, RLS, storage, grants |
| `scripts/seed.ts` | Demo data |
| `DECISIONS.md` | Choices made and open `[CONFIRM]` items |

## Product rules enforced in code

1. **Fair order**: organic results by distance then name only (`lib/domain/search.ts`); Featured is a separate labelled slot. Proven in `tests/unit/fair-order.test.ts`.
2. **Promotion is reach, not rank**: promotions are never read by the sort.
3. **Answers first**: sport, ages, days and times, area, price, distance on every card, in that order (asserted in e2e).
4. **No false coverage**: coming-soon areas show a waitlist, never an empty list.
5. **Free listing, no billing**: `PAID_TOOLS_ENABLED=false`; a unit test fails if billing code appears.
6. **Parity**: club type never affects ranking (unit test).
7. **Children's privacy**: photo consent per upload, report hides a photo immediately, caption name hint, children stored as nickname + birth year.
8. **Licences**: badge only for an approved, unexpired licence; authority is free text `[CONFIRM]`.
