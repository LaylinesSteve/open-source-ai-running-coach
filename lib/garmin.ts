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
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 14;
const MAX_ARRAY_ITEMS = 31;
const MAX_SECTION_CHARS = 16_000;

/**
 * Older data is pulled in short blocks and reduced to one row per block. Six months of raw records wouldn't fit in a prompt.
 * Garmin doesn't publish a limit on date ranges, so short ranges are the safe choice.
 */
const HISTORY_DAYS = 182;
const HISTORY_BLOCK_DAYS = 28;
const HISTORY_CONCURRENCY = 6;
const HISTORY_ACTIVITY_LIMIT = 100;
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const HISTORY_RETRY_MS = 60 * 60 * 1000;

/**
 * Fields the coach doesn't need: GPS, free text that can name places, and account or device identity.
 * This is a denylist because Garmin doesn't document these response shapes, so an allowlist could silently drop real metrics.
 */
const PRIVATE_FIELD =
  /latitude|longitude|(^|start|end)(lat|lon|lng)$|polyline|geo|location|owner|profile|uuid|name$|description|comment|note|title|image|url$|email|^user|pk$|device|serial/i;

/** Numbers that identify or date a record, so averaging them means nothing. */
const NOT_A_METRIC = /(^|\.)id$|Id$|[Tt]imestamp|GMT|[Ee]poch|[Oo]ffset/;
/** Activity records carry about 100 numbers, so history keeps the ones a coach reads. */
const ACTIVITY_METRIC = /distance|duration|elevation|hr$|speed|cadence|stride|ground|vertical|power|calor|load|effect|vo2/i;
const ACTIVITY_TOTAL = /distance|duration|elevation(gain|loss)|calor/i;

type HistoryRow = {
  from: string;
  to: string;
  type: string;
  records: number;
  metrics: Map<string, number>;
};

let cachedToken: { value: string; expiresAtMs: number; forKey: string } | null = null;
let cachedContext: { text: string; at: number; forKey: string } | null = null;
let cachedHistory: { text: string; expiresAtMs: number; forKey: string } | null = null;

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

function daysAgo(now: Date, days: number): string {
  return isoDate(new Date(now.getTime() - days * DAY_MS));
}

function datedSections(startDate: string, endDate: string, activityLimit: number) {
  const range = { startDate, endDate };
  return [
    {
      label: 'Activities',
      path: '/activitylist-service/activities/search/activities',
      params: { start: '0', limit: String(activityLimit), ...range },
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
  ];
}

/** Everything older than the recent window, newest block first. */
function historyBlocks(now: Date): { from: string; to: string }[] {
  const blocks: { from: string; to: string }[] = [];
  for (let newest = RECENT_DAYS; newest < HISTORY_DAYS; newest += HISTORY_BLOCK_DAYS) {
    const oldest = Math.min(newest + HISTORY_BLOCK_DAYS, HISTORY_DAYS) - 1;
    blocks.push({ from: daysAgo(now, oldest), to: daysAgo(now, newest) });
  }
  return blocks;
}

function recordsIn(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data === null || typeof data !== 'object') return [];
  return Object.values(data).find(Array.isArray) ?? [data];
}

/** Every metric in a record, keyed by its path, because Garmin nests some of them. */
function numbersIn(value: unknown, path = '', found = new Map<string, number>()) {
  if (typeof value === 'number') {
    if (path && Number.isFinite(value) && !NOT_A_METRIC.test(path)) found.set(path, value);
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value)) {
      numbersIn(item, path ? `${path}.${key}` : key, found);
    }
  }
  return found;
}

function activityType(record: unknown): string {
  const type = (record as { activityType?: { typeKey?: unknown } }).activityType?.typeKey;
  return typeof type === 'string' ? type : 'other';
}

/** One row per block, or per activity type in that block. Private fields go first, through compact(). */
function rollUp(label: string, from: string, to: string, data: unknown): HistoryRow[] {
  const isActivities = label === 'Activities';
  const groups = new Map<string, unknown[]>();
  for (const raw of recordsIn(data)) {
    const record = compact(raw);
    if (record === undefined) continue;
    const type = isActivities ? activityType(record) : '';
    groups.set(type, [...(groups.get(type) ?? []), record]);
  }

  return [...groups].map(([type, records]) => {
    const sums = new Map<string, { total: number; count: number }>();
    for (const record of records) {
      for (const [key, value] of numbersIn(record)) {
        if (isActivities && !ACTIVITY_METRIC.test(key)) continue;
        const sum = sums.get(key) ?? { total: 0, count: 0 };
        sums.set(key, { total: sum.total + value, count: sum.count + 1 });
      }
    }
    const metrics = new Map<string, number>();
    for (const [key, { total, count }] of sums) {
      const isTotal = isActivities && ACTIVITY_TOTAL.test(key);
      const value = isTotal ? total : total / count;
      metrics.set(isTotal ? `${key}_total` : key, Math.round(value * 10) / 10);
    }
    return { from, to, type, records: records.length, metrics };
  });
}

/** CSV keeps the history short, because column names appear once. Too long, and the oldest rows go first. */
function historyTable(label: string, rows: HistoryRow[]): string {
  const columns = [...new Set(rows.flatMap((row) => [...row.metrics.keys()]))];
  const withType = label === 'Activities';
  const header = ['from', 'to', ...(withType ? ['type'] : []), 'records', ...columns].join(',');
  const lines = [...rows]
    .sort((a, b) => a.from.localeCompare(b.from))
    .map((row) =>
      [
        row.from,
        row.to,
        ...(withType ? [row.type] : []),
        row.records,
        ...columns.map((column) => row.metrics.get(column) ?? ''),
      ].join(',')
    );

  const kept: string[] = [];
  let size = header.length;
  for (const line of lines.reverse()) {
    size += line.length + 1;
    if (size > MAX_SECTION_CHARS) break;
    kept.unshift(line);
  }
  return [`${label}:`, header, ...kept].join('\n');
}

/**
 * Up to six months of older data, in the same prompt-block form as the recent data, or '' if there is none.
 * Runs after the recent calls so a burst of requests can't cost the coach its current data, and stops at the first 429.
 * Cached for a day, because this is about 40 calls and old days don't change.
 */
async function getHistory(
  apiKey: string,
  token: string,
  now: Date,
  signal: AbortSignal
): Promise<string> {
  if (cachedHistory?.forKey === apiKey && Date.now() < cachedHistory.expiresAtMs) {
    return cachedHistory.text;
  }

  const blocks = historyBlocks(now);
  const jobs = blocks.flatMap(({ from, to }) =>
    datedSections(from, to, HISTORY_ACTIVITY_LIMIT).map((section) => ({ from, to, section }))
  );
  const rows = new Map<string, HistoryRow[]>();
  const errors: string[] = [];
  let next = 0;
  let rateLimited = false;

  const worker = async () => {
    while (next < jobs.length && !rateLimited && !signal.aborted) {
      const { from, to, section } = jobs[next++];
      try {
        const data = await garminGet(token, section.path, section.params, signal);
        const sectionRows = rows.get(section.label) ?? [];
        rows.set(section.label, [...sectionRows, ...rollUp(section.label, from, to, data)]);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(message);
        if (message.includes('(429)')) rateLimited = true;
      }
    }
  };
  await Promise.all(Array.from({ length: HISTORY_CONCURRENCY }, worker));

  const incomplete = errors.length > 0 || next < jobs.length;
  if (incomplete) {
    console.error(
      `Garmin history incomplete: ${errors.length} failed, ${jobs.length - next} skipped of ${jobs.length}. First error: ${errors[0] ?? 'none'}`
    );
  }

  const tables = [...rows]
    .filter(([, sectionRows]) => sectionRows.length > 0)
    .map(([label, sectionRows]) => historyTable(label, sectionRows));
  const text = tables.length
    ? [
        `=== GARMIN HISTORY (${blocks[blocks.length - 1].from} to ${blocks[0].to}, blocks of up to ${HISTORY_BLOCK_DAYS} days, oldest first) ===`,
        'Older than the data above. Use it for long-term trends, not for how the athlete is today. Each number is the average per record, except _total columns, which add up the block. Garmin usually reports distance in metres and time in seconds. A missing block means no data, not necessarily no training. Activities overlap the Strava log, so never add them to mileage.',
        incomplete ? 'Some of this history failed to load, so it has gaps.' : '',
        ...tables,
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  cachedHistory = {
    text,
    expiresAtMs: Date.now() + (incomplete ? HISTORY_RETRY_MS : HISTORY_TTL_MS),
    forKey: apiKey,
  };
  return text;
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
    const startDate = daysAgo(now, RECENT_DAYS - 1);
    const sections = [
      ...datedSections(startDate, endDate, 30),
      { label: 'Heart rate zones', path: '/biometric-service/heartRateZones/v2', params: undefined },
    ];
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

    const recent = [
      `=== GARMIN WATCH DATA (${startDate} to ${endDate}, JSON from Garmin Connect) ===`,
      'Use this to judge recovery and intensity: sleep, HRV, Body Battery, stress, resting heart rate and heart rate on runs. Activities here are usually the same sessions as the Strava log, so never add them to mileage. This is training guidance, not medical advice.',
      ...blocks,
      missing.length ? `No Garmin data available for: ${missing.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const history = await getHistory(apiKey, token, now, signal);
    const text = history ? `${recent}\n${history}` : recent;

    // Empty sections are normal (no HRV on this watch, a rest fortnight), so only a failed call skips the cache.
    if (!anyFailed) cachedContext = { text, at: Date.now(), forKey: apiKey };
    return text;
  } catch (e) {
    console.error('Garmin data unavailable:', e instanceof Error ? e.message : 'unknown error');
    return '';
  }
}
