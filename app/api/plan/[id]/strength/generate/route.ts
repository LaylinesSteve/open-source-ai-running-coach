import { NextRequest, NextResponse } from 'next/server';
import { countAttempt, getPlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import { generateStrengthWorkout } from '@/lib/strength-ai';

/** Each draft is a paid model call and most plans open by link, so drafts are capped per plan. */
const MAX_DRAFTS = 20;
const DRAFT_WINDOW_SEC = 60 * 60;

/** Draft a workout from a plain-language request. Nothing is saved: the builder shows the draft for review. */
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
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'The coach is not configured (missing GEMINI_API_KEY)' }, { status: 503 });
  }

  let body: { request?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const text = typeof body.request === 'string' ? body.request.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Describe the workout you want.' }, { status: 400 });
  }
  if (text.length > 1500) {
    return NextResponse.json({ error: 'That description is too long. Keep it under 1,500 characters.' }, { status: 400 });
  }

  const drafts = await countAttempt(`strength-drafts:${planId}`, DRAFT_WINDOW_SEC);
  if (drafts > MAX_DRAFTS) {
    return NextResponse.json({ error: 'Too many drafts in the last hour. Try again later, or build it by hand below.' }, { status: 429 });
  }

  try {
    const workout = await generateStrengthWorkout(plan, text);
    return NextResponse.json({ ok: true, workout });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'The coach could not draft a workout';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
