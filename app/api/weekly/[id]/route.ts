import { NextRequest, NextResponse } from 'next/server';
import { fetchStravaActivities } from '@/lib/strava';
import {
  getAccessTokenForWeeklySession,
  getWeeklySession,
  updateWeeklySession,
} from '@/lib/weekly-session';
import {
  athleteDisplayName,
  athleteInitials,
  buildWeeklyWeeksFromActivities,
} from '@/lib/weekly-data';
import { isSkinId } from '@/lib/weekly-skins';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getWeeklySession(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (!session.stravaRefreshToken) {
    return NextResponse.json({ error: 'Strava not connected', connected: false }, { status: 400 });
  }

  try {
    const accessToken = await getAccessTokenForWeeklySession(session);
    if (!accessToken) {
      return NextResponse.json({ error: 'Could not get Strava access' }, { status: 401 });
    }

    const after = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180;
    const activities = await fetchStravaActivities(accessToken, 200, { after });
    const weeks = buildWeeklyWeeksFromActivities(activities, 12);

    return NextResponse.json({
      connected: true,
      athleteName: athleteDisplayName(session.athlete),
      initials: athleteInitials(session.athlete),
      username: session.athlete?.username || undefined,
      skinId: session.skinId || null,
      weeks,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load Strava data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getWeeklySession(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (!session.stravaRefreshToken) {
    return NextResponse.json({ error: 'Connect Strava before saving a theme' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isSkinId(body.skinId)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }

  await updateWeeklySession(id, { skinId: body.skinId });
  return NextResponse.json({ ok: true, skinId: body.skinId });
}
