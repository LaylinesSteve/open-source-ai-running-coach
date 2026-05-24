import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import type { CoachChatMessage } from '@/lib/store';
import { chatWithCoach, MAX_CHAT_HISTORY_STORED } from '@/lib/ai-plan';
import { generatePlanWeeks } from '@/lib/plan-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Coach chat is not configured (missing GEMINI_API_KEY)' }, { status: 503 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: 'message is too long' }, { status: 400 });
  }

  let weeksData = plan.weeksData;
  if (!weeksData?.length) {
    if (!plan.generatedHtml) {
      return NextResponse.json({ error: 'Plan has no training weeks yet' }, { status: 400 });
    }
    weeksData = generatePlanWeeks(
      new Date(plan.raceDate + 'T12:00:00'),
      plan.distance || 'Marathon',
      plan.weeks
    );
  }

  const prior = (plan.coachChatHistory ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const reply = await chatWithCoach(plan, weeksData, plan.runLog ?? [], prior, message);
    const at = new Date().toISOString();
    const userEntry: CoachChatMessage = { role: 'user', content: message, at };
    const assistantEntry: CoachChatMessage = { role: 'assistant', content: reply, at };
    const updatedHistory = [...(plan.coachChatHistory ?? []), userEntry, assistantEntry].slice(
      -MAX_CHAT_HISTORY_STORED
    );

    await updatePlan(planId, { coachChatHistory: updatedHistory });

    return NextResponse.json({ ok: true, reply, history: updatedHistory });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Coach chat failed';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
