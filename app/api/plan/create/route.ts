import { NextRequest, NextResponse } from 'next/server';
import { hasAccess } from '@/lib/auth';
import { setPlan } from '@/lib/store';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const allowed = await hasAccess();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const raceUrl = (body.raceUrl || '').trim();
  const raceName = (body.raceName || 'Trail 50K').trim();
  const raceDate = (body.raceDate || '').trim(); // YYYY-MM-DD
  const goal = (body.goal || '').trim() || undefined;
  const targetTime = (body.targetTime || '').trim() || undefined;
  const additionalInfo = (body.additionalInfo || '').trim() || undefined;

  if (!raceDate) {
    return NextResponse.json({ error: 'Race date is required' }, { status: 400 });
  }

  const d = new Date(raceDate + 'T12:00:00');
  if (isNaN(d.getTime())) {
    return NextResponse.json({ error: 'Invalid race date' }, { status: 400 });
  }

  const id = randomUUID().slice(0, 8);
  await setPlan({
    id,
    raceUrl: raceUrl || '',
    raceName,
    raceDate,
    weeks: 11,
    goal,
    targetTime,
    additionalInfo,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ planId: id });
}
