import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { getAccessTokenForPlan } from '@/lib/ai-plan';
import { fetchStravaActivities } from '@/lib/strava';
import type { PlanWeek } from '@/lib/plan-generator';

/** Parse "Tue 3/17" or "Sat 4/20" to { month, day }. */
function parseRunDay(dayStr: string): { month: number; day: number } | null {
  const match = dayStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/** Get plan start (Monday of week 1). */
function getPlanStartDate(raceDate: string, weeks: number): Date {
  const d = new Date(raceDate + 'T12:00:00');
  d.setDate(d.getDate() - (weeks - 1) * 7 - 6); // back to Monday week 1
  return d;
}

/** Build list of planned runs with date (YYYY-MM-DD). Uses week number to infer year from plan start. */
function getPlannedRuns(weeksData: PlanWeek[], planStart: Date): { date: string; weekNum: number; dayLabel: string; planned: string }[] {
  const out: { date: string; weekNum: number; dayLabel: string; planned: string }[] = [];
  for (const week of weeksData) {
    const weekStart = new Date(planStart);
    weekStart.setDate(weekStart.getDate() + (week.num - 1) * 7);
    const year = weekStart.getFullYear();
    for (const run of week.runs) {
      if (!run.dist || /rest|optional|\+ ?1 optional/i.test(run.dist)) continue;
      const parsed = parseRunDay(run.day);
      if (!parsed) continue;
      const date = new Date(year, parsed.month - 1, parsed.day);
      if (isNaN(date.getTime())) continue;
      const dateStr = date.toISOString().slice(0, 10);
      out.push({ date: dateStr, weekNum: week.num, dayLabel: run.day, planned: run.dist });
    }
  }
  return out;
}

/** Group Strava runs by date (YYYY-MM-DD), only type Run, in meters -> miles. */
function groupActivitiesByDate(activities: { type: string; start_date: string; distance?: number }[]): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const a of activities) {
    if (a.type !== 'Run') continue;
    const dateStr = a.start_date.slice(0, 10);
    const miles = (a.distance ?? 0) / 1609.34;
    const cur = byDate.get(dateStr) ?? 0;
    byDate.set(dateStr, cur + miles);
  }
  return byDate;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (!plan.stravaRefreshToken || !plan.weeksData?.length) {
    return NextResponse.json({ error: 'Plan has no Strava or no plan data' }, { status: 400 });
  }

  const accessToken = await getAccessTokenForPlan(plan);
  if (!accessToken) {
    return NextResponse.json({ error: 'Could not get Strava access' }, { status: 401 });
  }

  const planStart = getPlanStartDate(plan.raceDate, plan.weeks);
  const after = Math.floor(planStart.getTime() / 1000);

  const activities = await fetchStravaActivities(accessToken, 200, { after });
  const byDate = groupActivitiesByDate(activities);
  const plannedRuns = getPlannedRuns(plan.weeksData, planStart);

  const completed: { weekNum: number; dayLabel: string; planned: string; actualMi: number; date: string }[] = [];
  for (const p of plannedRuns) {
    const actualMi = byDate.get(p.date);
    if (actualMi == null) continue;
    completed.push({
      weekNum: p.weekNum,
      dayLabel: p.dayLabel,
      planned: p.planned,
      actualMi: Math.round(actualMi * 10) / 10,
      date: p.date,
    });
  }

  const totalPlanned = plannedRuns.length;
  const totalCompleted = completed.length;
  const summary = `${totalCompleted} of ${totalPlanned} planned runs completed`;

  await updatePlan(planId, {
    lastSyncAt: new Date().toISOString(),
    syncResult: {
      completed,
      totalPlanned,
      totalCompleted,
      summary,
    },
  });

  return NextResponse.json({
    ok: true,
    summary,
    totalPlanned,
    totalCompleted,
    completed: completed.slice(-30),
  });
}
