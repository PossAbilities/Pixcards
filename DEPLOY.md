# Deploying Pixcards (Ryan's Cloud)

Pixcards runs on the Ryan's Cloud VPS (`178.104.251.61`) as Docker Compose project
`pixcards`, from `/opt/pixcards` on the server:

| Piece | What it is |
| --- | --- |
| `pixcards` | the app container (service `app`), built from `/opt/pixcards/app` |
| `pixcards-db` | PostgreSQL 17; data in the `pixcards_pixcards_db_data` volume |
| `pixcards-backup` | nightly database backup to Cloudflare R2 |
| `/opt/pixcards/.env` | the app's settings and secrets (never in git) |

On start-up the app runs `prisma db push`, so new database columns and tables are
created automatically.

## Normal deploys: push to `main`

Merging a pull request into `main` runs `.github/workflows/deploy.yml`, which uploads
the code to the server and runs `scripts/deploy-vps.sh`. That script:

1. unpacks the code next to the old copy, then swaps it into `/opt/pixcards/app`
   (the old code stays in `/opt/pixcards/app-prev`);
2. rebuilds the image while the current site keeps running;
3. restarts **only** the app container (the database is never restarted);
4. checks the new version answers, and if it doesn't within ~90 seconds, rolls back to
   the previous image automatically.

You can also run it by hand from GitHub → **Actions → Deploy to Ryan's Cloud → Run
workflow**. If a page still looks old afterwards, purge the Cloudflare cache.

### One-time setup (repository secrets)

On the server (`ssh root@178.104.251.61`), create a key just for GitHub:

```bash
ssh-keygen -t ed25519 -N "" -C github-deploy-pixcards -f /root/.ssh/github_deploy_pixcards
cat /root/.ssh/github_deploy_pixcards.pub >> /root/.ssh/authorized_keys
base64 -w0 /root/.ssh/github_deploy_pixcards; echo
```

Then in GitHub → repo **Settings → Secrets and variables → Actions → New repository
secret**, add:

| Name | Value |
| --- | --- |
| `VPS_HOST` | `178.104.251.61` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | the long line printed by the `base64` command |

Until these exist, the workflow skips the deploy with a warning instead of failing.

## Manual deploy (if GitHub Actions is unavailable)

On the server:

```bash
curl -L -o /root/pixcards-release.tar.gz https://github.com/PossAbilities/Pixcards/archive/refs/heads/main.tar.gz
mkdir -p /tmp/pixrel && tar xzf /root/pixcards-release.tar.gz -C /tmp/pixrel --strip-components=1
cd /tmp/pixrel && tar czf /root/pixcards-release.tar.gz . && cd / && rm -rf /tmp/pixrel
bash <(curl -sL https://raw.githubusercontent.com/PossAbilities/Pixcards/main/scripts/deploy-vps.sh)
```

## Rolling back

The previous image is kept as `pixcards:previous`:

```bash
cd /opt/pixcards
docker tag pixcards:previous pixcards:latest
docker compose -p pixcards -f docker-compose.db.yml -f docker-compose.app.yml up -d --no-deps --force-recreate app
```

## Settings

Edit `/opt/pixcards/.env`, then restart the app (no rebuild needed):

```bash
cd /opt/pixcards
docker compose -p pixcards -f docker-compose.db.yml -f docker-compose.app.yml up -d --no-deps --force-recreate app
```

- `APP_URL` — the public address, e.g. `https://pixcards.co.uk`. Used for QR codes,
  share links, emails and Stripe redirects. Read at runtime.
- `DATABASE_URL`, `AUTH_SECRET`, Stripe, Resend and storage keys — see `.env.example`.
  In production, checkout refuses to run without `STRIPE_SECRET_KEY`.

## Backups

`pixcards-backup` uploads a nightly dump to R2 (`ryan-cloud-backups/pixcards/`). For a
one-off copy before risky changes:

```bash
docker exec pixcards-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > /root/pixcards-$(date +%F).sql
```
