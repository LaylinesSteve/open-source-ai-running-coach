import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import { planWeeksToHtml, type PlanWeek } from '@/lib/plan-generator';
import { MAX_PLAN_WEEKS } from '@/lib/race-distances';
import { parseWeeksPayload, withWeeksSnapshot } from '@/lib/plan-weeks';
import { withDatedDayLabels } from '@/lib/training-week-calendar';

/** Saved versions of the plan's weeks (newest last), without the week data itself. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const denied = await requirePlanAccess(planId);
  if (denied) return denied;
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  return NextResponse.json({
    versions: (plan.weeksDataHistory ?? []).map((s) => ({ at: s.at, reason: s.reason, weeks: s.weeksData.length })),
  });
}

/**
 * Replace the plan's weeks, either with a saved version ({ restoreAt }) or with weeks sent in the body
 * ({ weeksData, coachSummary? }). The weeks being replaced are saved first, so this can be undone too.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const denied = await requirePlanAccess(planId);
  if (denied) return denied;
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    restoreAt?: string;
    weeksData?: unknown;
    coachSummary?: unknown;
  };

  let weeks: PlanWeek[];
  let coachSummary = typeof body.coachSummary === 'string' ? body.coachSummary.trim() : '';
  let source: string;
  try {
    if (body.restoreAt) {
      const saved = (plan.weeksDataHistory ?? []).find((s) => s.at === body.restoreAt);
      if (!saved) return NextResponse.json({ error: 'No saved version at that time' }, { status: 404 });
      weeks = parseWeeksPayload(saved.weeksData, MAX_PLAN_WEEKS);
      coachSummary ||= saved.coachSummary ?? '';
      source = `the saved version from ${saved.at}`;
    } else {
      weeks = parseWeeksPayload(body.weeksData, MAX_PLAN_WEEKS);
      source = 'an uploaded copy';
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid weeks' }, { status: 400 });
  }

  weeks = withDatedDayLabels(weeks, plan.raceDate);
  const distance = plan.distance || 'Marathon';
  weeks[weeks.length - 1] = { ...weeks[weeks.length - 1], longRun: distance };
  const now = new Date().toISOString();
  const restoredNote = `Plan restored to ${source} (${weeks.length} weeks); the change before it was undone.`;

  await updatePlan(planId, {
    weeksData: weeks,
    weeks: weeks.length,
    generatedHtml: planWeeksToHtml(weeks, plan.raceName, plan.raceDate, plan.raceUrl, distance),
    ...(coachSummary ? { coachSummary } : {}),
    weeksDataHistory: plan.weeksData?.length
      ? withWeeksSnapshot(plan.weeksDataHistory, {
          at: now,
          reason: `Before restoring ${source}`,
          weeksData: plan.weeksData,
          coachSummary: plan.coachSummary,
        })
      : plan.weeksDataHistory,
    coachSummaryHistory: [...(plan.coachSummaryHistory ?? []), { at: now, summary: restoredNote }].slice(-20),
  });

  return NextResponse.json({ ok: true, weeks: weeks.length });
}
