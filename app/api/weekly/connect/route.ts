import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { setWeeklySession, weeklyOAuthState } from '@/lib/weekly-session';

/** Create a weekly-recap session and return the Strava OAuth start URL. */
export async function POST() {
  const id = randomUUID().slice(0, 12);
  await setWeeklySession({
    id,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    sessionId: id,
    authUrl: `/api/auth/strava?state=${encodeURIComponent(weeklyOAuthState(id))}`,
  });
}
