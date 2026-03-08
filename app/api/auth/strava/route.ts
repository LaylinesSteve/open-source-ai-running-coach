import { NextRequest, NextResponse } from 'next/server';
import { getStravaAuthUrl } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  if (!state) {
    return NextResponse.json({ error: 'Missing state (plan id)' }, { status: 400 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/auth/strava/callback`;
  const url = getStravaAuthUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
