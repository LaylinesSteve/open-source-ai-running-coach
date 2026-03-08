import { Redis } from '@upstash/redis';
import { createClient, type RedisClientType } from 'redis';
import type { PlanWeek } from '@/lib/plan-generator';

export interface PlanRecord {
  id: string;
  raceUrl: string;
  raceName: string;
  raceDate: string; // YYYY-MM-DD
  weeks: number;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  /** Race distance (e.g. "5K", "Marathon", "50K"). */
  distance?: string;
  trainingDaysPerWeek?: number;
  preferredDays?: string[];
  crossTraining?: boolean;
  crossTrainingType?: string;
  currentWeeklyMiles?: string;
  longRunDay?: string;
  injuriesOrLimitations?: string;
  preferredTimeOfDay?: string;
  trailVsRoad?: string;
  runThisDistanceBefore?: boolean;
  /** Why they're running (e.g. "First 50K", "PR / time goal"). */
  goal?: string;
  /** Target time if they have one (e.g. "under 7 hours", "6:30"). */
  targetTime?: string;
  /** Free-text extra context from the user. */
  additionalInfo?: string;
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaExpiresAt?: number;
  createdAt: string;
  generatedHtml?: string;
  /** Strava training summary (last ~90 days) for display. */
  stravaSummaryText?: string;
  /** Coach overview / assessment from AI. */
  coachSummary?: string;
  /** Stored plan weeks for revision flow. */
  weeksData?: PlanWeek[];
  /** Personalized tips (from AI or defaults). */
  tips?: { title: string; description: string; url?: string }[];
  /** Last Strava sync (ISO date). */
  lastSyncAt?: string;
  /** Result of comparing Strava activities to plan. */
  syncResult?: {
    completed: { weekNum: number; dayLabel: string; planned: string; actualMi: number; date: string }[];
    totalPlanned: number;
    totalCompleted: number;
    summary: string;
  };
  /** History of revision requests (what the user asked for). */
  revisionRequests?: { at: string; request: string }[];
  /** History of coach summaries so the AI can maintain context across revisions/sync. */
  coachSummaryHistory?: { at: string; summary: string }[];
}

const PREFIX = 'plan:';
const TTL_SEC = 60 * 60 * 24 * 365; // 1 year

/** Upstash REST API: try KV_* first, then UPSTASH_* (Vercel Marketplace). */
function getUpstashRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let nodeRedisClient: RedisClientType | null = null;

/** Redis via REDIS_URL (e.g. Vercel Redis integration). */
async function getNodeRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (nodeRedisClient?.isOpen) return nodeRedisClient;
  const client = createClient({ url }) as RedisClientType;
  await client.connect();
  nodeRedisClient = client;
  return client;
}

export async function getPlan(id: string): Promise<PlanRecord | null> {
  const upstash = getUpstashRedis();
  if (upstash) {
    const raw = await upstash.get<PlanRecord>(PREFIX + id);
    return raw ?? null;
  }
  const client = await getNodeRedis();
  if (!client) return null;
  const raw = await client.get(PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlanRecord;
  } catch {
    return null;
  }
}

export async function setPlan(plan: PlanRecord): Promise<void> {
  const upstash = getUpstashRedis();
  if (upstash) {
    await upstash.set(PREFIX + plan.id, plan, { ex: TTL_SEC });
    return;
  }
  const client = await getNodeRedis();
  if (!client) return;
  await client.set(PREFIX + plan.id, JSON.stringify(plan), { EX: TTL_SEC });
}

export async function updatePlan(id: string, updates: Partial<PlanRecord>): Promise<void> {
  const existing = await getPlan(id);
  if (!existing) return;
  await setPlan({ ...existing, ...updates });
}
