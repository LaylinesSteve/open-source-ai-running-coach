import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import type { LoggedRun } from '@/lib/store';
import { adaptPlanWithAI, getAccessTokenForPlan, rebalanceWeekWithAI } from '@/lib/ai-plan';
import { countsTowardRunningVolume, fetchStravaActivities } from '@/lib/strava';
import { generatePlanWeeks, planWeeksToHtml, type PlanWeek } from '@/lib/plan-generator';
import {
  applyRebalancedDays,
  weekAlreadyBalanced,
  weekRebalanceState,
  withWeeksSnapshot,
} from '@/lib/plan-weeks';
import {
  addDaysCalendar,
  formatPlanDayLabel,
  getPlanWeek1Monday,
  plannedDayDate,
  toLocalYmd,
  weekNumberFromPlanStart,
} from '@/lib/training-week-calendar';

const SIX_MONTHS_SEC = 180 * 24 * 60 * 60;

const MILES_PER_METER = 1 / 1609.34;
const FEET_PER_METER = 3.28084;

/** Format date as "Tue 3/17" for display. */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/** Build list of planned runs with date (YYYY-MM-DD). Uses week number to infer year from plan start. */
function getPlannedRuns(weeksData: PlanWeek[], planStart: Date): { date: string; weekNum: number; dayLabel: string; planned: string }[] {
  const out: { date: string; weekNum: number; dayLabel: string; planned: string }[] = [];
  for (const week of weeksData) {
    const weekStart = addDaysCalendar(planStart, (week.num - 1) * 7);
    for (const run of week.runs) {
      if (!run.dist || /rest|optional|\+ ?1 optional/i.test(run.dist)) continue;
      const date = plannedDayDate(run.day, weekStart);
      if (!date || isNaN(date.getTime())) continue;
      out.push({ date: toLocalYmd(date), weekNum: week.num, dayLabel: formatPlanDayLabel(date), planned: run.dist });
    }
  }
  return out;
}

/** Build activity log from Strava, deduped by stravaId. Pre-plan activities use weekNum 0 (baseline fitness; not merged into week cards). */
function buildRunLog(
  activities: {
    id: number;
    type: string;
    sport_type?: string;
    name: string;
    start_date: string;
    start_date_local?: string;
    distance?: number;
    moving_time?: number;
    total_elevation_gain?: number;
  }[],
  planStart: Date,
  existingRunLog: LoggedRun[],
  plannedRuns: { date: string; planned: string }[]
): LoggedRun[] {
  const byId = new Map(existingRunLog.map((r) => [r.stravaId, r]));
  const plannedByDate = new Map(plannedRuns.map((p) => [p.date, p.planned]));

  for (const a of activities) {
    if (byId.has(a.id)) continue;

    // UTC start_date puts evening runs west of UTC on the next day.
    const dateStr = (a.start_date_local || a.start_date).slice(0, 10);
    const activityType = (a.sport_type || a.type || 'Activity').trim();
    const distanceMi = Math.round(((a.distance ?? 0) * MILES_PER_METER) * 10) / 10;
    const elevationFt = a.total_elevation_gain != null ? Math.round(a.total_elevation_gain * FEET_PER_METER) : undefined;
    const plannedHint = plannedByDate.get(dateStr);
    const note = plannedHint ? `Planned: ${plannedHint}` : undefined;

    const weekNum = weekNumberFromPlanStart(dateStr, planStart);

    byId.set(a.id, {
      stravaId: a.id,
      date: dateStr,
      weekNum,
      dayLabel: dayLabel(dateStr),
      name: a.name || activityType,
      activityType,
      distanceMi,
      movingTimeSec: a.moving_time,
      elevationFt,
      note,
    });
  }

  return Array.from(byId.values())
    .map((r) => ({ ...r, weekNum: weekNumberFromPlanStart(r.date, planStart) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const denied = await requirePlanAccess(planId);
  if (denied) return denied;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (!plan.stravaRefreshToken) {
    return NextResponse.json({ error: 'Plan has no Strava connected' }, { status: 400 });
  }

  let weeksData = plan.weeksData;
  let weeksPersistPatch: Partial<{ weeksData: PlanWeek[]; weeks: number }> = {};
  if (!weeksData?.length) {
    if (!plan.generatedHtml) {
      return NextResponse.json({ error: 'Plan has no week data yet — open the plan once to generate it' }, { status: 400 });
    }
    weeksData = generatePlanWeeks(
      new Date(plan.raceDate + 'T12:00:00'),
      plan.distance || 'Marathon',
      plan.weeks
    );
    weeksPersistPatch = { weeksData, weeks: weeksData.length };
  }

  const accessToken = await getAccessTokenForPlan(plan);
  if (!accessToken) {
    return NextResponse.json({ error: 'Could not get Strava access' }, { status: 401 });
  }

  const totalWeeks = weeksData.length;
  const planStart = getPlanWeek1Monday(plan.raceDate, totalWeeks);
  const planStartSec = Math.floor(planStart.getTime() / 1000);
  const sixMonthsAgoSec = Math.floor(Date.now() / 1000) - SIX_MONTHS_SEC;
  /** Include at least 6 months of Strava history so logs aren’t empty when plan-window math doesn’t overlap recent training. */
  const after = Math.min(planStartSec, sixMonthsAgoSec);

  const activities = await fetchStravaActivities(accessToken, 200, { after });
  const plannedRuns = getPlannedRuns(weeksData, planStart);
  const existingRunLog = plan.runLog ?? [];
  const runLog = buildRunLog(activities, planStart, existingRunLog, plannedRuns);

  /** Only running-like activities count toward matching planned run mileage on that date. */
  const byDate = new Map<string, number>();
  for (const r of runLog) {
    if (!countsTowardRunningVolume(r.activityType)) continue;
    if (r.weekNum < 1) continue;
    const cur = byDate.get(r.date) ?? 0;
    byDate.set(r.date, cur + r.distanceMi);
  }

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
  const runningSynced = runLog.filter((r) => countsTowardRunningVolume(r.activityType)).length;
  const summary = `${totalCompleted} of ${totalPlanned} planned runs completed · ${runningSynced} runs · ${runLog.length} activities in log`;

  await updatePlan(planId, {
    ...weeksPersistPatch,
    lastSyncAt: new Date().toISOString(),
    runLog,
    syncResult: {
      completed,
      totalPlanned,
      totalCompleted,
      summary,
    },
  });

  const body = (await request.json().catch(() => ({}))) as { today?: string };
  const rebalance = await rebalanceCurrentWeek(planId, today(body.today));

  /** Refresh coach advice from latest activity log (same flow as /adapt). */
  let adaptation: { ok: true } | { ok: false; error?: string; skipped?: string } = { ok: false };
  const refreshed = await getPlan(planId);
  if (refreshed?.weeksData?.length && process.env.GEMINI_API_KEY) {
    try {
      const { coachNote, suggestedWeeks } = await adaptPlanWithAI(
        refreshed,
        refreshed.weeksData,
        refreshed.runLog ?? []
      );
      await updatePlan(planId, {
        adaptationNote: coachNote,
        adaptationAt: new Date().toISOString(),
        adaptationSuggestedWeeks: suggestedWeeks?.length ? suggestedWeeks : undefined,
      });
      adaptation = { ok: true };
    } catch (e) {
      adaptation = {
        ok: false,
        error: e instanceof Error ? e.message : 'Coach advice update failed',
      };
    }
  } else if (!process.env.GEMINI_API_KEY) {
    adaptation = { ok: false, skipped: 'AI not configured' };
  }

  return NextResponse.json({
    ok: true,
    summary,
    totalPlanned,
    totalCompleted,
    runLogCount: runLog.length,
    completed: completed.slice(-30),
    adaptation,
    rebalance,
  });
}

/** The athlete's date (sent by the browser); the server's own date if it's missing or more than a day off. */
function today(clientToday: unknown): string {
  const server = toLocalYmd(new Date());
  if (typeof clientToday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(clientToday)) return server;
  const drift = Math.abs(new Date(clientToday + 'T12:00:00').getTime() - new Date(server + 'T12:00:00').getTime());
  return drift <= 36 * 60 * 60 * 1000 ? clientToday : server;
}

type RebalanceOutcome =
  | { status: 'updated'; weekNum: number; note: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

/**
 * Re-plan the rest of the current week around what's been logged, keeping the week's mileage goal.
 * Skips weeks that already add up, race week, and weeks whose logged activity hasn't changed since last time.
 */
async function rebalanceCurrentWeek(planId: string, todayYmd: string): Promise<RebalanceOutcome> {
  const plan = await getPlan(planId);
  const weeks = plan?.weeksData;
  if (!plan || !weeks?.length) return { status: 'skipped', reason: 'no plan weeks' };
  if (!process.env.GEMINI_API_KEY) return { status: 'skipped', reason: 'AI not configured' };

  const planStart = getPlanWeek1Monday(plan.raceDate, weeks.length);
  const weekNum = weekNumberFromPlanStart(todayYmd, planStart);
  const index = weekNum - 1;
  const week = weeks[index];
  if (!week) return { status: 'skipped', reason: 'today is outside the plan' };

  const state = weekRebalanceState(week, addDaysCalendar(planStart, index * 7), todayYmd, plan.runLog ?? []);
  if (!state) return { status: 'skipped', reason: 'race week or no weekly goal' };
  if (state.open.length === 0) return { status: 'skipped', reason: 'no days left this week' };
  if (plan.weekRebalance?.signature === state.signature) return { status: 'skipped', reason: 'nothing new logged' };

  const now = new Date().toISOString();
  if (weekAlreadyBalanced(state)) {
    await updatePlan(planId, {
      weekRebalance: { weekNum, at: now, signature: state.signature, note: '', changed: false },
    });
    return { status: 'skipped', reason: 'week already adds up to its goal' };
  }

  try {
    const { runs, note } = await rebalanceWeekWithAI(plan, week, weeks[index + 1], state);
    const updatedWeek = applyRebalancedDays(week, state, runs);
    const weeksData = weeks.map((w, i) => (i === index ? updatedWeek : w));
    const distance = plan.distance || 'Marathon';
    await updatePlan(planId, {
      weeksData,
      generatedHtml: planWeeksToHtml(weeksData, plan.raceName, plan.raceDate, plan.raceUrl, distance),
      weeksDataHistory: withWeeksSnapshot(plan.weeksDataHistory, {
        at: now,
        reason: `Before sync rebalanced week ${weekNum}`,
        weeksData: weeks,
        coachSummary: plan.coachSummary,
      }),
      weekRebalance: { weekNum, at: now, signature: state.signature, note, changed: true },
    });
    return { status: 'updated', weekNum, note };
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Week update failed' };
  }
}
