import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import { adaptPlanWithAI } from '@/lib/ai-plan';
import { getGarminContext } from '@/lib/garmin';

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
  if (!plan.weeksData?.length) {
    return NextResponse.json({ error: 'Plan has no weeks data' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  try {
    const runLog = plan.runLog ?? [];
    const garminContext = await getGarminContext(planId);
    const { coachNote, suggestedWeeks } = await adaptPlanWithAI(
      plan,
      plan.weeksData,
      runLog,
      garminContext
    );

    await updatePlan(planId, {
      adaptationNote: coachNote,
      adaptationAt: new Date().toISOString(),
      adaptationSuggestedWeeks: suggestedWeeks?.length ? suggestedWeeks : undefined,
    });

    return NextResponse.json({
      ok: true,
      coachNote,
      suggestedWeeks: suggestedWeeks ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Adaptation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
