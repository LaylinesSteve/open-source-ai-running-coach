import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';
import type { LoggedRun } from '@/lib/store';
import { getPlanWeek1Monday } from '@/lib/training-week-calendar';

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function weekNumForDate(dateStr: string, planStart: Date): number {
  const d = new Date(dateStr + 'T12:00:00');
  const diffMs = d.getTime() - planStart.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(999, Math.floor(diffDays / 7) + 1));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (!plan.weeksData?.length) {
    return NextResponse.json({ error: 'Plan has no weeks data' }, { status: 400 });
  }

  let body: { date: string; distanceMi: number; movingTimeSec?: number; perceivedIntensity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { date, distanceMi, movingTimeSec, perceivedIntensity } = body;
  if (!date || typeof distanceMi !== 'number' || distanceMi <= 0) {
    return NextResponse.json({ error: 'date and distanceMi required' }, { status: 400 });
  }
  const dateStr = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const rpe =
    perceivedIntensity != null
      ? Math.min(10, Math.max(1, Math.round(Number(perceivedIntensity))))
      : undefined;

  const totalWeeks = plan.weeksData?.length ?? plan.weeks;
  const planStart = getPlanWeek1Monday(plan.raceDate, totalWeeks);
  const entry: LoggedRun = {
    stravaId: 0,
    date: dateStr,
    weekNum: weekNumForDate(dateStr, planStart),
    dayLabel: dayLabel(dateStr),
    name: 'Manual run',
    activityType: 'Run',
    distanceMi: Math.round(distanceMi * 10) / 10,
    movingTimeSec: movingTimeSec != null ? Math.round(movingTimeSec) : undefined,
    perceivedIntensity: rpe,
  };

  const runLog = [...(plan.runLog ?? []), entry].sort((a, b) => a.date.localeCompare(b.date));
  await updatePlan(planId, { runLog });

  return NextResponse.json({ ok: true, run: entry });
}

/** Remove a manually added run (stravaId === 0). Body: { date: "YYYY-MM-DD", distanceMi?: number }. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  let body: { date?: string; distanceMi?: number };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const dateStr = body.date?.slice(0, 10);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) required' }, { status: 400 });
  }

  const existing = plan.runLog ?? [];
  const matches = (r: LoggedRun) =>
    r.stravaId === 0 &&
    r.date === dateStr &&
    (body.distanceMi == null || r.distanceMi === body.distanceMi);
  const firstMatchIndex = existing.findIndex(matches);
  if (firstMatchIndex === -1) {
    return NextResponse.json(
      { error: 'No manual run found for that date' + (body.distanceMi != null ? ' and distance' : '') },
      { status: 404 }
    );
  }
  const runLog = existing.filter((_, i) => i !== firstMatchIndex);

  await updatePlan(planId, { runLog });
  return NextResponse.json({ ok: true, removed: true });
}
