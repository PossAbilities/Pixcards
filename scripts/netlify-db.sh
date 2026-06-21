#!/usr/bin/env bash
# Database setup for the Netlify build.
# - Syncs the Prisma schema to the database (creates tables) when DATABASE_URL is set.
# - Optionally seeds demo/test data when SEED_DEMO=true.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set — skipping prisma db push (the app will need it at runtime)."
  exit 0
fi

echo "→ Syncing schema to database (prisma db push)…"
npx prisma db push --skip-generate

echo "→ Ensuring the owner account is admin (and purging demo accounts in prod)…"
npx tsx prisma/ensure-admin.ts

if [ "$SEED_DEMO" = "true" ]; then
  echo "→ SEED_DEMO=true — seeding demo data (auto-skipped in production)…"
  npx tsx prisma/seed.ts
else
  echo "→ SEED_DEMO not 'true' — skipping demo seed."
fi
