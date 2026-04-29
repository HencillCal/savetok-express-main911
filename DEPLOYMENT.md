# Deployment Guide

This is a Vite + React SPA. Build output: `dist/`. Build command: `npm run build`.

All client routes must fall back to `index.html` (SPA rewrite). Config files for each host are already included in the repo.

## Environment variables

Set these on every host before building:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

For Paystack, keep the secret server-side:

- `PAYSTACK_SECRET_KEY`

Important:
- On any frontend host (Vercel/Netlify/Render/Fly), **do not rely on your website `.env`** for this secret.
- `PAYSTACK_SECRET_KEY` is required by **Supabase Edge Functions** (`paystack-initialize`, `paystack-verify`, `paystack-webhook`), so in **production** you must set it in **Supabase → Settings → Secrets / Environment variables for Edge Functions**.
- Locally, you can put `PAYSTACK_SECRET_KEY` in your local `.env` so that when you run Supabase locally it’s available to the Edge Functions (restart the Supabase dev session after changing `.env`).

---

## Vercel

Config file: `vercel.json` (rewrites all paths to `/index.html`).

1. Import the repo at <https://vercel.com/new>.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Add env vars in **Settings → Environment Variables**.
4. Deploy.

---

## Netlify

Config files: `netlify.toml` + `public/_redirects` (both ensure SPA fallback).

1. New site at <https://app.netlify.com/start>, pick the repo.
2. Build command: `npm run build`. Publish directory: `dist`.
3. Add env vars in **Site settings → Environment variables**.
4. Deploy.

---

## Render

Config files: `render.yaml` (Blueprint) + `static.json` (legacy fallback).

**Option A — Blueprint (recommended):**
1. New → **Blueprint** at <https://dashboard.render.com>.
2. Select the repo. Render reads `render.yaml` and creates a Static Site.
3. Add env vars under the service → **Environment**.
4. Apply.

**Option B — Manual Static Site:**
- Build: `npm install && npm run build`
- Publish dir: `dist`
- Add a rewrite: source `/*` → destination `/index.html` (action: Rewrite).

---

## Fly.io

No config file is included — Fly is container-based, not static. Use one of these:

**Option A — Static via Caddy (simplest):**

Create `Dockerfile`:
```Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
```

Create `Caddyfile`:
```
:8080 {
    root * /usr/share/caddy
    try_files {path} /index.html
    file_server
    encode gzip
}
```

Then:
```bash
fly launch --no-deploy            # generates fly.toml; set internal_port = 8080
fly secrets set VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... VITE_SUPABASE_PROJECT_ID=...
fly deploy --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
           --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
           --build-arg VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
```

> Note: Vite inlines `VITE_*` vars at **build time**, so they must be passed as `--build-arg`, not just runtime secrets.

---

## Config file reference

| File | Used by | Purpose |
|------|---------|---------|
| `vercel.json` | Vercel | SPA rewrite `/(.*) → /index.html` |
| `netlify.toml` | Netlify | Build settings + SPA redirect |
| `public/_redirects` | Netlify | Backup SPA redirect (`/* /index.html 200`) |
| `render.yaml` | Render | Blueprint: static site + rewrite rule |
| `static.json` | Render (legacy) | Routes fallback to `index.html` |

## Backend notes

Supabase Edge Functions (e.g. `tiktok-download`, `paystack-initialize`, `paystack-verify`) and the database are hosted on Supabase and are **not** deployed by these hosts. They remain available regardless of where you host the frontend — the `VITE_SUPABASE_URL` env var points the deployed frontend at them.

### Local Paystack setup

If you want the Pro upgrade flow to work while running the app locally, add this to your `.env` file:

```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key
```

Restart `npm run dev` after changing `.env`. The local Vite dev server loads that secret and the Paystack handler uses it server-side when the upgrade button is clicked. The browser never receives the secret directly.
