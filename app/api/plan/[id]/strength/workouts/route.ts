import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import { requirePlanAccess } from '@/lib/auth';
import { WORKOUT_LIMITS, isBuiltInWorkout, sanitizeWorkout } from '@/lib/strength';

/**
 * Save a workout built in the workout builder. A body whose id matches one of
 * this plan's workouts replaces it; anything else (no id, or a built-in's id)
 * is stored as a new workout, so built-ins are copied rather than changed.
 */
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const workout = sanitizeWorkout(body);
  if (!workout) {
    return NextResponse.json({ error: 'A workout needs a title and at least one named exercise.' }, { status: 400 });
  }

  const existing = plan.strengthWorkouts ?? [];
  const replaces = workout.id !== '' && existing.some((w) => w.id === workout.id);
  if (!replaces) {
    if (existing.length >= WORKOUT_LIMITS.workoutsPerPlan) {
      return NextResponse.json(
        { error: `A plan can hold ${WORKOUT_LIMITS.workoutsPerPlan} workouts. Delete one to add another.` },
        { status: 400 }
      );
    }
    do {
      workout.id = `w-${randomUUID().slice(0, 8)}`;
    } while (isBuiltInWorkout(workout.id) || existing.some((w) => w.id === workout.id));
  }
  const strengthWorkouts = replaces ? existing.map((w) => (w.id === workout.id ? workout : w)) : [...existing, workout];
  await updatePlan(planId, { strengthWorkouts });

  return NextResponse.json({ ok: true, workout });
}

/** Remove one of this plan's workouts. Body: { id }. Sessions already logged against it stay in strengthLog. */
export async function DELETE(
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

  const body: { id?: unknown } = await request.json().catch(() => ({}));
  const existing = plan.strengthWorkouts ?? [];
  if (typeof body.id !== 'string' || !existing.some((w) => w.id === body.id)) {
    return NextResponse.json({ error: 'No workout with that id on this plan' }, { status: 404 });
  }
  await updatePlan(planId, { strengthWorkouts: existing.filter((w) => w.id !== body.id) });

  return NextResponse.json({ ok: true, removed: true });
}
