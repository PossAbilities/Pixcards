# syntax=docker/dockerfile:1
# Pixcards on Ryan Cloud — Next.js 16 container.
# Talks to Postgres + MinIO internally; only the app is exposed via the tunnel.
#
# NOTE: full node_modules are copied into the run stage (not Next.js "standalone")
# on purpose — the entrypoint below runs `npx prisma db push` at startup, which
# needs the Prisma CLI + engines present in the final image.

# ---- build stage ----
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# prisma/ is needed here because package.json's postinstall runs `prisma generate`
COPY prisma ./prisma
# package-lock is not yet in sync with the @aws-sdk/client-s3 dep, so use install (not ci)
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate
# Placeholder URLs so `next build` can construct Prisma Client (no real DB at build).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# ---- run stage ----
FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
# Startup entrypoint: sync the Prisma schema to the LIVE database before serving.
# --accept-data-loss lets it run non-interactively (drops obsolete columns/constraints).
# Written inline (LF-safe) so there is no separate .sh file to worry about on Windows.
RUN cat > /usr/local/bin/docker-entrypoint.sh <<'EOF'
#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "→ prisma db push (--accept-data-loss) against live DATABASE_URL…"
  npx prisma db push --skip-generate --accept-data-loss || echo "  (schema push failed — starting app anyway)"
else
  echo "DATABASE_URL not set — skipping prisma db push."
fi
exec "$@"
EOF
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
