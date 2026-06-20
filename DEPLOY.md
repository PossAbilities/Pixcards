# Deploying Pixcards (Netlify + Supabase)

A one-time setup. After this, every push to GitHub auto-publishes via Netlify.

## 1. Connect the repo to Netlify
- Netlify → **Add new site → Import from Git** → pick this repo.
- Build settings are read from `netlify.toml` automatically:
  - Build command: `prisma generate && prisma db push && next build`
  - Node: 22 · Next.js runtime: auto-detected

## 2. Get your Supabase connection strings (IPv4 pooler)
In Supabase → top **Connect** button → **ORMs** tab → **Prisma**. Copy the two
lines it shows:
- `DATABASE_URL` → `...pooler.supabase.com:6543/...?pgbouncer=true`
- `DIRECT_URL` → `...pooler.supabase.com:5432/...`

> Use the **pooler** strings, not `db.<ref>.supabase.co` — that direct host is
> IPv6-only and Netlify is IPv4, so it won't connect.

## 3. Set environment variables (Netlify → Site settings → Environment variables)

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Supabase Connect → ORMs → Prisma (port 6543) |
| `DIRECT_URL` | Supabase Connect → ORMs → Prisma (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret) |
| `SUPABASE_STORAGE_BUCKET` | `pixcards-media` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | your live URL, e.g. `https://your-site.netlify.app` |
| `ADMIN_EMAIL` *(optional)* | email that should always be admin |
| Stripe keys *(optional)* | omit to run payments in demo mode |

## 4. Deploy
Trigger a deploy (or push a commit). On build, Netlify runs `prisma db push`,
which **creates all tables in your Supabase database automatically**.

## 5. First run
1. Visit `/register` and create your account — the **first account becomes the
   admin** (or whichever email matches `ADMIN_EMAIL`).
2. Admin dashboard is at `/admin`; your public card is at `/u/<your-username>`.
3. Profile-image uploads go to the Supabase Storage bucket `pixcards-media`
   (auto-created on first upload).

## Notes
- **Uploads:** abstracted in `src/lib/storage.ts` — Supabase Storage when the
  keys are set, inline data-URI fallback otherwise.
- **Payments:** without `STRIPE_SECRET_KEY`, checkout/upgrade run in demo mode
  (simulate success) so all flows work before you add Stripe.
- **Custom domain:** set it in Netlify, then update `NEXT_PUBLIC_APP_URL` to the
  domain so QR codes / share links use it.
- **Security:** rotate any DB password / service-role key that was shared in
  plaintext. Never commit `.env` (it's gitignored).
