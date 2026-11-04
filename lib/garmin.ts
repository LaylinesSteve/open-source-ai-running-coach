/**
 * Garmin Connect Personal API: one athlete's own data, read-only.
 * Docs: https://developer.garmin.com/gc-developer-program/personal/personal-api
 * Paths follow Garmin's reference client: https://github.com/garmin/connect-personal-api-python
 */
const DEFAULT_BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const TOKEN_REFRESH_WINDOW_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Garmin doesn't publish a limit on date ranges, so short ranges are the safe choice. */
const LIST_BLOCK_DAYS = 28;
const LIST_LIMIT = 100;

export type RunRef = { id: number; date: string; type: string };

let cachedToken: { value: string; expiresAtMs: number; forKey: string } | null = null;

function baseUrl(): string {
  return (process.env.GARMIN_PERSONAL_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.GARMIN_PERSONAL_API_KEY?.trim();
  if (!key) throw new Error('GARMIN_PERSONAL_API_KEY is not set');
  return key;
}

function jwtExpiryMs(token: string): number {
  const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
  if (typeof payload?.exp !== 'number') throw new Error('Garmin token has no exp claim');
  return payload.exp * 1000;
}

/** Exchange the personal key for a bearer token (24h, no refresh tokens). */
async function getToken(): Promise<string> {
  const key = apiKey();
  if (
    cachedToken?.forKey === key &&
    cachedToken.expiresAtMs - Date.now() > TOKEN_REFRESH_WINDOW_MS
  ) {
    return cachedToken.value;
  }
  const res = await fetch(`${baseUrl()}${TOKEN_PATH}`, {
    method: 'POST',
    headers: { Accept: '*/*', Authorization: `ApiKey ${key}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Garmin token request failed (${res.status})`);
  const value = (await res.text()).trim();
  cachedToken = { value, expiresAtMs: jwtExpiryMs(value), forKey: key };
  return value;
}

async function garminFetch(path: string, accept: string): Promise<Response> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Accept: accept, Authorization: `Bearer ${await getToken()}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (res.status === 401) cachedToken = null;
  if (!res.ok) throw new Error(`Garmin request failed (${res.status}): ${path}`);
  return res;
}

/** YYYY-MM-DD in the athlete's time zone, so "today" matches their watch. */
function isoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.GARMIN_TIME_ZONE || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function daysAgo(days: number): string {
  return isoDate(new Date(Date.now() - days * DAY_MS));
}

function toRunRef(record: unknown): RunRef[] {
  const { activityId, activityType, startTimeLocal, startTimeGMT } = (record ?? {}) as {
    activityId?: unknown;
    activityType?: { typeKey?: unknown };
    startTimeLocal?: unknown;
    startTimeGMT?: unknown;
  };
  const type = activityType?.typeKey;
  const start = startTimeLocal ?? startTimeGMT;
  // Trail, treadmill and track runs all have "run" in their type.
  if (typeof activityId !== 'number' || typeof type !== 'string' || !/run/i.test(type)) return [];
  if (typeof start !== 'string') return [];
  return [{ id: activityId, date: start.slice(0, 10), type }];
}

/** Every run in the last `days` days, newest first. */
export async function listRuns(days: number): Promise<RunRef[]> {
  const runs = new Map<number, RunRef>();
  for (let newest = 0; newest < days; newest += LIST_BLOCK_DAYS) {
    const params = new URLSearchParams({
      start: '0',
      limit: String(LIST_LIMIT),
      startDate: daysAgo(Math.min(newest + LIST_BLOCK_DAYS, days) - 1),
      endDate: daysAgo(newest),
    });
    const res = await garminFetch(
      `/activitylist-service/activities/search/activities?${params}`,
      'application/json'
    );
    const records: unknown = await res.json();
    for (const run of (Array.isArray(records) ? records : []).flatMap(toRunRef)) {
      runs.set(run.id, run);
    }
  }
  return [...runs.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** The original activity file, a ZIP. Garmin's reference client calls this download_activity. */
export async function downloadActivity(activityId: number): Promise<Uint8Array> {
  const res = await garminFetch(
    `/download-service/files/activity/${activityId}`,
    'application/zip, application/x-zip-compressed, application/octet-stream'
  );
  return new Uint8Array(await res.arrayBuffer());
}
