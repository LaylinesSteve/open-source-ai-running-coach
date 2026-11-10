import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import {
  baselineFitnessFromRunLog,
  buildStravaContextForPlan,
  getAccessTokenForPlan,
  revisePlanWithAI,
} from '@/lib/ai-plan';
import { fetchStravaActivities } from '@/lib/strava';
import { planWeeksToHtml } from '@/lib/plan-generator';

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

  const body = await request.json().catch(() => ({}));
  const userRequest = (body.request || '').trim();
  if (!userRequest) {
    return NextResponse.json({ error: 'Request text is required' }, { status: 400 });
  }

  const currentWeeks = plan.weeksData;
  if (!currentWeeks || currentWeeks.length < 1) {
    return NextResponse.json({ error: 'No plan data to revise' }, { status: 400 });
  }

  // Rebuild the Strava context on every revision: the stored text was anchored to the plan's length when
  // it was first generated, so after a revision changes the length its "pre-plan baseline" covers the wrong weeks.
  let stravaSummary = plan.stravaSummaryText || '';
  let refreshedStravaSummary: string | undefined;
  if (plan.stravaRefreshToken) {
    try {
      const accessToken = await getAccessTokenForPlan(plan);
      if (accessToken) {
        const activities = await fetchStravaActivities(accessToken);
        refreshedStravaSummary = buildStravaContextForPlan(activities, plan.raceDate, currentWeeks.length);
        stravaSummary = refreshedStravaSummary;
      }
    } catch {
      // keep the stored summary
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  try {
    const baselineBlock = baselineFitnessFromRunLog(plan.runLog ?? []);
    const stravaForRevise = [stravaSummary, baselineBlock].filter(Boolean).join('\n\n');

    const { weeks, coachSummary } = await revisePlanWithAI(
      plan,
      stravaForRevise,
      currentWeeks,
      userRequest
    );
    const distance = plan.distance || 'Marathon';
    const html = planWeeksToHtml(
      weeks,
      plan.raceName,
      plan.raceDate,
      plan.raceUrl,
      distance
    );
    const now = new Date().toISOString();
    const revisionEntry = { at: now, request: userRequest };
    const revisionRequests = [...(plan.revisionRequests || []), revisionEntry].slice(-20);
    const coachEntry = { at: now, summary: coachSummary || plan.coachSummary || '' };
    const coachSummaryHistory = [...(plan.coachSummaryHistory || []), coachEntry].slice(-20);
    await updatePlan(planId, {
      generatedHtml: html,
      coachSummary: coachSummary || plan.coachSummary,
      weeks: weeks.length,
      weeksData: weeks,
      ...(refreshedStravaSummary ? { stravaSummaryText: refreshedStravaSummary } : {}),
      revisionRequests,
      coachSummaryHistory,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Revision failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
