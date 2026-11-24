import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import { findWorkout, sanitizeSession } from '@/lib/strength';

/** Sessions kept per plan. Two a week for a 24-week build is under 50. */
const MAX_SESSIONS = 200;

/** Save one strength session. One entry per workout per day, so a later save for the same day replaces it. */
export async function PUT(
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

  let body: { workoutId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const workout = typeof body?.workoutId === 'string' ? findWorkout(plan.strengthWorkouts, body.workoutId) : null;
  if (!workout) {
    return NextResponse.json({ error: 'Unknown workout' }, { status: 400 });
  }
  const session = sanitizeSession(workout, body);
  if (!session) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  session.updatedAt = session.updatedAt ?? new Date().toISOString();

  const others = (plan.strengthLog ?? []).filter(
    (s) => !(s.workoutId === session.workoutId && s.date === session.date)
  );
  const strengthLog = [...others, session]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_SESSIONS);
  await updatePlan(planId, { strengthLog });

  return NextResponse.json({ ok: true, updatedAt: session.updatedAt });
}
