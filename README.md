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
| `GEMINI_API_KEY` | Yes (for AI plans) | Google Gemini API key ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)); used to personalize plans from Strava data. |
| `COOKIE_SECRET` | No | Optional; defaults to `PASSKEY` for the access cookie. |

## What is KV? Storage (Redis)

**KV** = key–value store. The app stores each plan under a key (e.g. `plan:abc123`). We use **Redis** for that (hosted by [Upstash](https://upstash.com)), so plans persist across serverless restarts.

You don’t run Redis yourself. Two ways to get the env vars:

1. **From Vercel** – In your Vercel project: **Storage** tab → **Create Database** → choose **Redis** (or **Upstash Redis** in Integrations/Marketplace). Vercel will create the database and add **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`** to your project.
2. **From Upstash** – Go to [upstash.com](https://upstash.com) → create a Redis database (free tier) → copy **REST URL** and **REST Token** → add them in Vercel **Settings → Environment Variables** as **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`**.

Vercel also offers **Vercel Postgres** and **Vercel Blob**; this app is built for Redis (simple get/set by plan id). To use Postgres you’d need to change `lib/store.ts` to use SQL instead.

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

Open [http://localhost:3000/app](http://localhost:3000/app), enter your passkey, then use the form.

### Strava “invalid redirect_uri”

Strava requires the redirect URL to match your app settings. Do both:

1. **NEXT_PUBLIC_APP_URL** — Set to your app’s full URL with **no trailing slash**, e.g. `https://ai-fitness-coach.vercel.app` or `http://localhost:3000`.
2. **Strava API app** — [Strava → My API Application](https://www.strava.com/settings/api) → **Authorization Callback Domain**: enter **only the domain** (no `https://`, no path), e.g. `ai-fitness-coach.vercel.app` or `localhost`.

The app uses this callback URL: `{NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`. The domain in that URL must match the Authorization Callback Domain in Strava.
