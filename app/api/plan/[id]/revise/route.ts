import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { getAccessTokenForPlan } from '@/lib/ai-plan';
import { buildStravaSummary } from '@/lib/ai-plan';
import { fetchStravaActivities } from '@/lib/strava';
import { revisePlanWithAI } from '@/lib/ai-plan';
import { planWeeksToHtml } from '@/lib/plan-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const userRequest = (body.request || '').trim();
  if (!userRequest) {
    return NextResponse.json({ error: 'Request text is required' }, { status: 400 });
  }

  let stravaSummary = plan.stravaSummaryText || '';
  if (plan.stravaRefreshToken && !stravaSummary) {
    try {
      const accessToken = await getAccessTokenForPlan(plan);
      if (accessToken) {
        const activities = await fetchStravaActivities(accessToken);
        stravaSummary = buildStravaSummary(activities);
      }
    } catch {
      // continue with empty Strava summary
    }
  }

  const currentWeeks = plan.weeksData;
  if (!currentWeeks || currentWeeks.length < 1) {
    return NextResponse.json({ error: 'No plan data to revise' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  try {
    const { weeks, coachSummary } = await revisePlanWithAI(
      plan,
      stravaSummary,
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
      weeksData: weeks,
      revisionRequests,
      coachSummaryHistory,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Revision failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
