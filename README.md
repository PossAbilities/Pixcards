# Pixcards — Smart Digital Business Cards

The last business card you'll ever need. Pixcards is a full-stack platform for
**NFC + QR digital business cards**: build a beautiful digital profile, order a
premium physical card pre-linked to your account, and grow your network.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**,
**Prisma + PostgreSQL**, custom JWT-cookie auth, and **Stripe** (with a built-in
demo mode so it runs with zero secrets).

## Features

- **Landing page** — marketing site with features, how-it-works, pricing and CTAs.
- **Auth** — register / login (email + password), session via signed httpOnly cookie.
- **Profile editor** — edit personal details, manage links/socials, upload avatar
  + header images, pick a theme, with a **live phone preview**.
- **Public digital card** — `pixcards.co.uk/u/<username>` with tap/scan sharing,
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
mode** during local development — checkout flows simulate a successful payment
so every flow is testable. In production, checkout is refused until Stripe is
configured.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pixcards"
AUTH_SECRET="<random-string>"
# Public site URL, read at runtime (APP_URL also works)
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

## Deploying

Production runs on Ryan's Cloud (Docker on the VPS) and deploys automatically when
`main` changes. See [DEPLOY.md](DEPLOY.md) for the setup, manual deploys, rollback
and settings.

Image storage is abstracted in `src/lib/storage.ts` (Supabase Storage with an
inline-data-URI fallback).

**First admin:** the first account to register becomes the admin automatically
(no seeding needed in production). Set `ADMIN_EMAIL` to pin a specific address.
