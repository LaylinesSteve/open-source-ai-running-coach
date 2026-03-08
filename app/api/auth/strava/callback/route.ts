import { NextRequest, NextResponse } from 'next/server';
import { exchangeStravaCode } from '@/lib/strava';
import { getPlan, updatePlan } from '@/lib/store';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state'); // plan id
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    const appUrl = new URL('/app/form', request.url);
    appUrl.searchParams.set('error', 'strava_denied');
    return NextResponse.redirect(appUrl);
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/app/form', request.url));
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/auth/strava/callback`;

  try {
    const tokens = await exchangeStravaCode(code, redirectUri);
    const plan = await getPlan(state);
    if (plan) {
      await updatePlan(state, {
        stravaAccessToken: tokens.access_token,
        stravaRefreshToken: tokens.refresh_token,
        stravaExpiresAt: tokens.expires_at,
      });
    }
  } catch (e) {
    const appUrl = new URL('/app/form', request.url);
    appUrl.searchParams.set('error', 'strava_failed');
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.redirect(new URL(`/app/plan/${state}`, request.url));
}
