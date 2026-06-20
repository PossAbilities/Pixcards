# Pixcards — Smart Digital Business Cards

The last business card you'll ever need. Pixcards is a full-stack platform for
**NFC + QR digital business cards**: build a beautiful digital profile, order a
premium physical card pre-linked to your account, and grow your network.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**,
**Prisma + SQLite**, custom JWT-cookie auth, and **Stripe** (with a built-in
demo mode so it runs with zero secrets).

## Features

- **Landing page** — marketing site with features, how-it-works, pricing and CTAs.
- **Auth** — register / login (email + password), session via signed httpOnly cookie.
- **Profile editor** — edit personal details, manage links/socials, upload avatar
  + header images, pick a theme, with a **live phone preview**.
- **Public digital card** — `pixcards.app/u/<username>` with tap/scan sharing,
  **Save Contact (vCard)**, share + **QR code**, and view/click analytics.
- **Analytics** — views, link clicks, contacts saved, CTR, daily charts
  (advanced analytics gated behind Pro).
- **Card designer & orders** — design a physical NFC card (material, finish,
  quantity), checkout, and track production/fulfilment status.
- **Free vs Pro** — Pro unlocks unlimited links, premium themes, advanced
  analytics and metal cards. One-time upgrade via Stripe (or demo mode).
- **Admin dashboard** — `/admin`: platform metrics, user management
  (plan/role/delete), and **order production & fulfilment** management.

## Quick start

```bash
npm install
cp .env.example .env          # set DATABASE_URL / DIRECT_URL to a Postgres (Supabase)
npm run db:push               # sync the schema to the database
npm run db:seed               # demo users + sample orders + analytics
npm run dev                   # http://localhost:3000
```

Any PostgreSQL works; **Supabase** is the intended target.

### Demo accounts

| Role  | Email                 | Password      |
| ----- | --------------------- | ------------- |
| User  | `alex@pixcards.app`   | `password123` |
| Admin | `admin@pixcards.app`  | `password123` |

Visit `/u/alex` to see a live public card.

## Environment

All optional except the database. Without Stripe keys the app runs in **demo
mode** — checkout flows simulate a successful payment so every flow is testable.

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<random-string>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Stripe (optional — leave blank for demo mode)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_PRO_PRICE_ID=""
```

## Scripts

| Script               | Description           |
| -------------------- | --------------------- |
| `npm run dev`        | Start the dev server  |
| `npm run build`      | Production build      |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed`    | Seed demo data        |
| `npm run db:reset`   | Reset DB and re-seed  |
| `npm run db:studio`  | Open Prisma Studio    |

## Structure

```
src/
  app/
    (auth)/            login + register + auth server actions
    dashboard/         profile editor, analytics, orders, card designer, settings
    admin/             overview, orders, users, settings
    u/[username]/      public digital card
    pricing/           pricing + upgrade
    api/               upload, track, qr, stripe checkout success
  components/          Icon, Logo, DigitalCard, CardMockup, ui primitives, ...
  lib/                 db, auth, guards, constants, utils, stripe, actions/
prisma/                schema + seed
```

## Deploying to Netlify + Supabase

1. **Database (Supabase):** Project Settings → Database → Connection string.
   - `DATABASE_URL` → the **Transaction pooler** URL (port `6543`) + `?pgbouncer=true`
   - `DIRECT_URL` → the **direct/session** URL (port `5432`) — used by `prisma db push`
2. **Storage (Supabase, optional):** Project Settings → API. Set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`. A public bucket (`pixcards-media`) is created
   automatically on first upload. Without these, uploads fall back to inline
   data URIs. The **service-role key is secret** — set it in Netlify env, never
   commit it.
3. **Netlify:** connect the repo. `netlify.toml` builds with
   `prisma generate && prisma db push && next build` on Node 22. Set the env
   vars above plus `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL`. Stripe keys optional
   (omit → demo mode).

Image storage is abstracted in `src/lib/storage.ts` (Supabase Storage with an
inline-data-URI fallback).
