import 'server-only';

import { Redis } from '@upstash/redis';
import { createClient, type RedisClientType } from 'redis';
import { refreshStravaToken, type StravaAthleteProfile } from '@/lib/strava';
import type { SkinId } from '@/lib/weekly-skins';

const PREFIX = 'weekly:';
const TTL_SEC = 60 * 60 * 24 * 180; // 180 days

export interface WeeklySession {
  id: string;
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaExpiresAt?: number;
  athlete?: StravaAthleteProfile;
  /** Saved recap theme (set after Strava connect). */
  skinId?: SkinId;
  createdAt: string;
}

function getUpstashRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let nodeRedisClient: RedisClientType | null = null;

async function getNodeRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (nodeRedisClient?.isOpen) return nodeRedisClient;
  const client = createClient({ url }) as RedisClientType;
  await client.connect();
  nodeRedisClient = client;
  return client;
}

export function weeklyOAuthState(id: string): string {
  return `${PREFIX}${id}`;
}

export function parseWeeklyOAuthState(state: string): string | null {
  if (!state.startsWith(PREFIX)) return null;
  const id = state.slice(PREFIX.length);
  return id || null;
}

export async function getWeeklySession(id: string): Promise<WeeklySession | null> {
  const upstash = getUpstashRedis();
  if (upstash) {
    const raw = await upstash.get<WeeklySession>(PREFIX + id);
    return raw ?? null;
  }
  const client = await getNodeRedis();
  if (!client) return null;
  const raw = await client.get(PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeeklySession;
  } catch {
    return null;
  }
}

export async function setWeeklySession(session: WeeklySession): Promise<void> {
  const upstash = getUpstashRedis();
  if (upstash) {
    await upstash.set(PREFIX + session.id, session, { ex: TTL_SEC });
    return;
  }
  const client = await getNodeRedis();
  if (!client) return;
  await client.set(PREFIX + session.id, JSON.stringify(session), { EX: TTL_SEC });
}

export async function updateWeeklySession(id: string, updates: Partial<WeeklySession>): Promise<void> {
  const existing = await getWeeklySession(id);
  if (!existing) return;
  await setWeeklySession({ ...existing, ...updates });
}

export async function getAccessTokenForWeeklySession(session: WeeklySession): Promise<string | null> {
  if (!session.stravaRefreshToken) return null;
  let accessToken = session.stravaAccessToken ?? null;
  const expiresAt = session.stravaExpiresAt ?? 0;
  if (!accessToken || Date.now() / 1000 > expiresAt - 60) {
    const tokens = await refreshStravaToken(session.stravaRefreshToken);
    await updateWeeklySession(session.id, {
      stravaAccessToken: tokens.access_token,
      stravaRefreshToken: tokens.refresh_token,
      stravaExpiresAt: tokens.expires_at,
    });
    accessToken = tokens.access_token;
  }
  return accessToken ?? session.stravaAccessToken ?? null;
}
