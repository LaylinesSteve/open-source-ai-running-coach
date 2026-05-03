import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { generatePlanWeeks, planWeeksToHtml } from '@/lib/plan-generator';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const planId = body.planId ?? request.nextUrl.searchParams.get('planId');
  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (plan.generatedHtml) {
    return NextResponse.json({ ok: true, planId });
  }

  const distance = plan.distance || 'Marathon';
  const raceDate = new Date(plan.raceDate + 'T12:00:00');
  const weeks = generatePlanWeeks(raceDate, distance, plan.weeks);
  const html = planWeeksToHtml(
    weeks,
    plan.raceName,
    plan.raceDate,
    plan.raceUrl,
    distance
  );

  await updatePlan(planId, { generatedHtml: html });
  return NextResponse.json({ ok: true, planId });
}
