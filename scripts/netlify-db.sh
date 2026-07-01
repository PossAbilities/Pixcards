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
# --accept-data-loss: this runs non-interactively on every deploy, so Prisma
# can never prompt for confirmation on a destructive change (e.g. a dropped
# column) — we accept that here since schema changes are already reviewed
# before they're committed.
#
# Also non-fatal: an unreachable/misconfigured DB string here (e.g. how some
# CLI build environments pass it through) must never block the whole deploy —
# the app doesn't need DB access at build time, only at runtime.
npx prisma db push --skip-generate --accept-data-loss || echo "  (schema push skipped — continuing build)"

# Non-fatal: a hiccup here must never block the deploy.
echo "→ Ensuring the owner account is admin (and purging demo accounts in prod)…"
npx tsx prisma/ensure-admin.ts || echo "  (ensure-admin skipped — continuing build)"

if [ "$SEED_DEMO" = "true" ]; then
  echo "→ SEED_DEMO=true — seeding demo data (auto-skipped in production)…"
  npx tsx prisma/seed.ts || echo "  (seed skipped — continuing build)"
else
  echo "→ SEED_DEMO not 'true' — skipping demo seed."
fi
