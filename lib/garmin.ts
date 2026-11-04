/**
 * Garmin Connect Personal API: one athlete's own data, read-only.
 * Docs: https://developer.garmin.com/gc-developer-program/personal/personal-api
 * Paths follow Garmin's reference client: https://github.com/garmin/connect-personal-api-python
 */
import { hasAccess, isPrivatePlan } from '@/lib/auth';

const DEFAULT_BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const TOKEN_REFRESH_WINDOW_MS = 60 * 60 * 1000;
const DEADLINE_MS = 15_000;
const CONTEXT_TTL_MS = 15 * 60 * 1000;
const LOOKBACK_DAYS = 14;
const MAX_ARRAY_ITEMS = 31;
const MAX_SECTION_CHARS = 16_000;

/**
 * Fields the coach doesn't need: GPS, free text that can name places, and account or device identity.
 * This is a denylist because Garmin doesn't document these response shapes, so an allowlist could silently drop real metrics.
 */
const PRIVATE_FIELD =
  /latitude|longitude|(^|start|end)(lat|lon|lng)$|polyline|geo|location|owner|profile|uuid|name$|description|comment|note|title|image|url$|email|^user|pk$|device|serial/i;

let cachedToken: { value: string; expiresAtMs: number; forKey: string } | null = null;
let cachedContext: { text: string; at: number; forKey: string } | null = null;

function baseUrl(): string {
  return (process.env.GARMIN_PERSONAL_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function jwtExpiryMs(token: string): number {
  const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
  if (typeof payload?.exp !== 'number') throw new Error('Garmin token has no exp claim');
  return payload.exp * 1000;
}

/** Exchange the personal key for a bearer token (24h, no refresh tokens). */
async function getToken(apiKey: string, signal: AbortSignal): Promise<string> {
  if (
    cachedToken?.forKey === apiKey &&
    cachedToken.expiresAtMs - Date.now() > TOKEN_REFRESH_WINDOW_MS
  ) {
    return cachedToken.value;
  }
  const res = await fetch(`${baseUrl()}${TOKEN_PATH}`, {
    method: 'POST',
    headers: { Accept: '*/*', Authorization: `ApiKey ${apiKey}` },
    signal,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Garmin token request failed (${res.status})`);
  const value = (await res.text()).trim();
  cachedToken = { value, expiresAtMs: jwtExpiryMs(value), forKey: apiKey };
  return value;
}

async function garminGet(
  token: string,
  path: string,
  params: Record<string, string> | undefined,
  signal: AbortSignal
): Promise<unknown> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${baseUrl()}${path}${query}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal,
    cache: 'no-store',
  });
  if (res.status === 401) cachedToken = null;
  if (!res.ok) throw new Error(`Garmin request failed (${res.status}): ${path}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Drop empty values, private fields and [timestamp, value] time series so the prompt stays small. */
function compact(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined;
  if (Array.isArray(value)) {
    if (value.some(Array.isArray)) return undefined;
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map(compact)
      .filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PRIVATE_FIELD.test(key))
      .map(([key, item]) => [key, compact(item)] as const)
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}

function recordDate(record: unknown): string {
  const values = record && typeof record === 'object' ? Object.values(record) : [];
  return (
    values.find((v): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) ?? ''
  );
}

/** JSON within the section budget. When too long, whole records go oldest first, because recent days matter most. */
function serialize(data: unknown): string {
  const json = JSON.stringify(data);
  if (json.length <= MAX_SECTION_CHARS) return json;
  const records = Array.isArray(data)
    ? data
    : Object.values(data as Record<string, unknown>).find(Array.isArray);
  if (!records) return `${json.slice(0, MAX_SECTION_CHARS)} [truncated]`;

  const kept: string[] = [];
  let size = 0;
  for (const record of [...records].sort((a, b) => recordDate(b).localeCompare(recordDate(a)))) {
    const recordJson = JSON.stringify(record);
    size += recordJson.length + 1;
    if (size > MAX_SECTION_CHARS) break;
    kept.push(recordJson);
  }
  if (kept.length === 0) return `${json.slice(0, MAX_SECTION_CHARS)} [truncated]`;
  return `[${kept.join(',')}] [older records omitted]`;
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

function sectionsFor(startDate: string, endDate: string) {
  const range = { startDate, endDate };
  return [
    {
      label: 'Activities',
      path: '/activitylist-service/activities/search/activities',
      params: { start: '0', limit: '30', ...range },
    },
    { label: 'Sleep', path: '/sleep-service/sleep/dailySleepSummariesByDate', params: range },
    { label: 'HRV', path: `/hrv-service/hrv/daily/${startDate}/${endDate}` },
    {
      label: 'Body Battery',
      path: '/wellness-service/wellness/bodyBattery/reports/daily',
      params: range,
    },
    { label: 'Stress', path: `/usersummary-service/stats/stress/daily/${startDate}/${endDate}` },
    { label: 'Daily summaries', path: '/usersummary-service/v2/dailysummaries', params: range },
    { label: 'Heart rate zones', path: '/biometric-service/heartRateZones/v2' },
  ];
}

/**
 * Garmin data as a prompt block, or '' when Garmin is off for this plan or unavailable.
 * Never throws: a Garmin outage must not take the coach down with it.
 * The block is built per request and not stored, so raw health data stays out of the plan record.
 */
export async function getGarminContext(planId: string): Promise<string> {
  const apiKey = process.env.GARMIN_PERSONAL_API_KEY?.trim();
  if (!apiKey || !isPrivatePlan(planId) || !(await hasAccess())) return '';
  if (
    cachedContext?.forKey === apiKey &&
    Date.now() - cachedContext.at < CONTEXT_TTL_MS
  ) {
    return cachedContext.text;
  }

  try {
    // One deadline for the token and all data calls, so a stalled Garmin can't hold up the coach for long.
    const signal = AbortSignal.timeout(DEADLINE_MS);
    const token = await getToken(apiKey, signal);
    const now = new Date();
    const endDate = isoDate(now);
    const startDate = isoDate(new Date(now.getTime() - (LOOKBACK_DAYS - 1) * 24 * 60 * 60 * 1000));
    const sections = sectionsFor(startDate, endDate);
    const results = await Promise.allSettled(
      sections.map((section) => garminGet(token, section.path, section.params, signal))
    );

    const blocks: string[] = [];
    const missing: string[] = [];
    let anyFailed = false;
    results.forEach((result, i) => {
      const { label } = sections[i];
      if (result.status === 'rejected') {
        console.error(`Garmin ${label} unavailable:`, String(result.reason?.message ?? result.reason));
        anyFailed = true;
        missing.push(label);
        return;
      }
      const data = compact(result.value);
      if (data === undefined) {
        missing.push(label);
        return;
      }
      blocks.push(`${label}: ${serialize(data)}`);
    });
    if (blocks.length === 0) return '';

    const text = [
      `=== GARMIN WATCH DATA (${startDate} to ${endDate}, JSON from Garmin Connect) ===`,
      'Use this to judge recovery and intensity: sleep, HRV, Body Battery, stress, resting heart rate and heart rate on runs. Activities here are usually the same sessions as the Strava log, so never add them to mileage. This is training guidance, not medical advice.',
      ...blocks,
      missing.length ? `No Garmin data available for: ${missing.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Empty sections are normal (no HRV on this watch, a rest fortnight), so only a failed call skips the cache.
    if (!anyFailed) cachedContext = { text, at: Date.now(), forKey: apiKey };
    return text;
  } catch (e) {
    console.error('Garmin data unavailable:', e instanceof Error ? e.message : 'unknown error');
    return '';
  }
}
