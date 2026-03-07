const STRAVA_OAUTH = 'https://www.strava.com/oauth';
const STRAVA_API = 'https://www.strava.com/api/v3';

export function getStravaAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || process.env.STRAVA_CLIENT_ID;
  if (!clientId) throw new Error('Strava client ID not configured');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all',
    state,
    approval_prompt: 'force',
  });
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`;
}

export async function exchangeStravaCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Strava credentials not configured');

  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
}

export async function fetchStravaActivities(accessToken: string, perPage = 100): Promise<StravaActivity[]> {
  const activities: StravaActivity[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${STRAVA_API}/athlete/activities?per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    activities.push(...data);
    if (data.length < perPage) break;
    page++;
  }
  return activities;
}

export interface StravaActivity {
  id: number;
  type: string;
  name: string;
  start_date: string;
  distance?: number;
  moving_time?: number;
  total_elevation_gain?: number;
}
