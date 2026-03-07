import { Redis } from '@upstash/redis';

export interface PlanRecord {
  id: string;
  raceUrl: string;
  raceName: string;
  raceDate: string; // YYYY-MM-DD
  weeks: number;
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaExpiresAt?: number;
  createdAt: string;
  generatedHtml?: string;
}

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const PREFIX = 'plan:';

export async function getPlan(id: string): Promise<PlanRecord | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<PlanRecord>(PREFIX + id);
  return raw ?? null;
}

export async function setPlan(plan: PlanRecord): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(PREFIX + plan.id, plan, { ex: 60 * 60 * 24 * 365 }); // 1 year TTL
}

export async function updatePlan(id: string, updates: Partial<PlanRecord>): Promise<void> {
  const existing = await getPlan(id);
  if (!existing) return;
  await setPlan({ ...existing, ...updates });
}
