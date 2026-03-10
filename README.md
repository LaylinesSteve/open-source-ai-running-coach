# Open Source AI Running Coach

A Strava + AI running coach that builds **personalized training plans for any goal and experience level**—whether you’re training for a 5K, marathon, ultra, or something in between.

## What's in the repo

- **`/`** (and **`/training-plan.html`**) — Sample static training plan you can view before signing up.
- **`/app`** — Same landing as `/`.
- **`/app/form`** — Form: your goal (race name or distance), race date, optional link, optional "Connect Strava". Submit → create plan → redirect to Strava (if checked) or to your plan page.
- **`/app/plan/[id]`** — Your generated plan (shareable link). If you connected Strava, the AI uses your running history to personalize the plan for your current fitness; otherwise it’s built from your goal and date. Works for any distance and experience level.

## Environment variables

Copy **`.env.example`** to **`.env`** and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `STRAVA_CLIENT_ID` | Yes (for Strava) | From [Strava API](https://www.strava.com/settings/api). |
| `STRAVA_CLIENT_SECRET` | Yes (for Strava) | From Strava API. |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | Your app URL for OAuth redirect (no trailing slash), e.g. `https://your-app.vercel.app` or `http://localhost:3000`. |
| `PASSKEY` | Yes | Secret used for passkey auth; also used as cookie signing secret if `COOKIE_SECRET` is not set. |
| `KV_REST_API_URL` | Yes | Upstash Redis REST URL ([upstash.com](https://upstash.com)). |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis REST token. |
| `GEMINI_API_KEY` | Yes (for AI plans) | Google Gemini API key ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)); used to personalize plans from Strava data. |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-2.5-flash`). Override if the default is deprecated (e.g. `gemini-3-flash-preview`). |
| `COOKIE_SECRET` | No | Optional; for cookie signing. If unset, `PASSKEY` is used. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | If set, footer shows this contact email. Otherwise shows "Open an issue in the project repository." |
| `NEXT_PUBLIC_COPYRIGHT` | No | If set, footer shows this copyright line (e.g. "© 2026 Your Name. All rights reserved."). |

## What is KV? Storage (Redis)

**KV** = key–value store. The app stores each plan under a key (e.g. `plan:abc123`). We use **Redis** for that (hosted by [Upstash](https://upstash.com)), so plans persist across serverless restarts.

You don't run Redis yourself. Two ways to get the env vars:

1. **From Vercel** – In your Vercel project: **Storage** tab → **Create Database** → choose **Redis** (or **Upstash Redis** in Integrations/Marketplace). Vercel will create the database and add **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`** to your project.
2. **From Upstash** – Go to [upstash.com](https://upstash.com) → create a Redis database (free tier) → copy **REST URL** and **REST Token** → add them in Vercel **Settings → Environment Variables** as **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`**.

Vercel also offers **Vercel Postgres** and **Vercel Blob**; this app is built for Redis (simple get/set by plan id). To use Postgres you'd need to change `lib/store.ts` to use SQL instead.

## Deploy to Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. **Framework Preset:** Next.js (auto-detected).
3. Add all env vars above in **Settings → Environment Variables**.
4. Deploy. The root URL (`/`) is the landing page; **`/app/form`** is the plan form.

### Custom domain

To serve the app at your own domain (e.g. `https://running.example.com`):

**1. Strava app configuration**

- Go to [Strava → My API Application](https://www.strava.com/settings/api).
- Under **Authorization Callback Domain**, enter your domain only (e.g. `running.example.com`). No `https://` or path.
- Save.

**2. Vercel**

- In the Vercel project: **Settings → Domains** → add your domain (Vercel will show the DNS records to add).
- **Settings → Environment Variables**: set **`NEXT_PUBLIC_APP_URL`** to your full app URL with no trailing slash (e.g. `https://running.example.com`) for Production (and Preview if desired).
- Redeploy after adding the domain and env var so the new URL is used for OAuth redirects.

**3. DNS**

- At your DNS provider, add the record Vercel shows (usually a **CNAME** pointing to `cname.vercel-dns.com`).
- Wait for DNS to propagate. Vercel will issue SSL for the custom domain once DNS is correct.

## Local dev

```bash
npm install
cp .env.example .env   # fill in KV_*, Strava, PASSKEY, NEXT_PUBLIC_APP_URL
npm run dev
```

Open [http://localhost:3000/app](http://localhost:3000/app) or [http://localhost:3000/app/form](http://localhost:3000/app/form) to use the form.

### Strava "invalid redirect_uri"

Strava requires the redirect URL to match your app settings. Do both:

1. **NEXT_PUBLIC_APP_URL** — Set to your app's full URL with **no trailing slash**, e.g. `https://your-app.vercel.app` or `http://localhost:3000`.
2. **Strava API app** — [Strava → My API Application](https://www.strava.com/settings/api) → **Authorization Callback Domain**: enter **only the domain** (no `https://`, no path), e.g. `your-app.vercel.app` or `localhost`.

The app uses this callback URL: `{NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`. The domain in that URL must match the Authorization Callback Domain in Strava.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT. See [LICENSE](LICENSE).
