# AI Fitness Coach

Trail 50K training plan generator: your plan at `/`, and a passkey-protected flow so others can connect Strava, enter their race, and get a generated plan.

## What’s in the repo

- **`/`** (and **`/training-plan.html`**) — Static training plan (May 23, 2026 example).
- **`/app`** — Passkey gate. Users enter your shared passkey to continue.
- **`/app/form`** — Form: race name, race date, link to race, optional “Connect Strava”. Submit → create plan → redirect to Strava (if checked) or to their plan page.
- **`/app/plan/[id]`** — Generated 11-week plan for that user (shareable link). If they connected Strava, an AI uses their running history to personalize the plan; otherwise it’s generated from race date only.

## Passkey

Set **`PASSKEY`** in your environment (e.g. Vercel env vars). Anyone with that passkey can open `/app`, submit the form, and get a plan. Plan URLs (`/app/plan/xyz`) are public so they can bookmark or share.

## Environment variables

Copy **`.env.example`** to **`.env`** and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `PASSKEY` | Yes | Secret string users enter to access `/app`. |
| `STRAVA_CLIENT_ID` | Yes (for Strava) | From [Strava API](https://www.strava.com/settings/api). |
| `STRAVA_CLIENT_SECRET` | Yes (for Strava) | From Strava API. |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | Your app URL, e.g. `https://ai-fitness-coach.vercel.app` (for OAuth redirect). |
| `KV_REST_API_URL` | Yes | Upstash Redis REST URL ([upstash.com](https://upstash.com)). |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis REST token. |
| `OPENAI_API_KEY` | Yes (for AI plans) | OpenAI API key; used to personalize plans from Strava data. |
| `COOKIE_SECRET` | No | Optional; defaults to `PASSKEY` for the access cookie. |

## Storage (Upstash Redis)

Plans are stored in Redis so they survive serverless restarts.

1. Go to [upstash.com](https://upstash.com) and create a Redis database (free tier).
2. In the dashboard, copy **REST URL** and **REST Token**.
3. Add them in Vercel as **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`**.

## Deploy to Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. **Framework Preset:** Next.js (auto-detected).
3. Add all env vars above in **Settings → Environment Variables**.
4. Deploy. The root URL (`/`) still shows the static training plan (via `vercel.json` rewrite). Use **`/app`** for the passkey flow.

## Local dev

```bash
npm install
cp .env.example .env   # fill in PASSKEY, KV_*, Strava, NEXT_PUBLIC_APP_URL
npm run dev
```

Open [http://localhost:3000/app](http://localhost:3000/app), enter your passkey, then use the form. For Strava OAuth locally, set **`NEXT_PUBLIC_APP_URL=http://localhost:3000`** and add `http://localhost:3000/api/auth/strava/callback` as a redirect URI in your Strava app settings.
