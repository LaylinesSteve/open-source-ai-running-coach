import { NextRequest, NextResponse } from 'next/server';
import { setPlan } from '@/lib/store';
import { getDefaultWeeksForDistance } from '@/lib/race-distances';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const raceUrl = (body.raceUrl || '').trim();
  const raceName = (body.raceName || 'Marathon').trim();
  const raceDate = (body.raceDate || '').trim(); // YYYY-MM-DD
  const firstName = (body.firstName || '').trim() || undefined;
  const lastName = (body.lastName || '').trim() || undefined;
  const age = typeof body.age === 'number' ? body.age : (body.age ? parseInt(String(body.age), 10) : undefined);
  const gender = (body.gender || '').trim() || undefined;
  const distance = (body.distance || 'Marathon').trim() || 'Marathon';
  const goal = (body.goal || '').trim() || undefined;
  const targetTime = (body.targetTime || '').trim() || undefined;
  const additionalInfo = (body.additionalInfo || '').trim() || undefined;
  const trainingDaysPerWeek = typeof body.trainingDaysPerWeek === 'number' ? body.trainingDaysPerWeek : (body.trainingDaysPerWeek ? parseInt(String(body.trainingDaysPerWeek), 10) : undefined);
  const preferredDays = Array.isArray(body.preferredDays) ? body.preferredDays.filter((d: unknown) => typeof d === 'string') : undefined;
  const crossTraining =
    body.crossTraining === true || body.crossTraining === 'true' ? true
      : body.crossTraining === false || body.crossTraining === 'false' ? false
      : undefined;
  const crossTrainingType = (body.crossTrainingType || '').trim() || undefined;
  const currentWeeklyMiles = (body.currentWeeklyMiles || '').trim() || undefined;
  const longRunDay = (body.longRunDay || '').trim() || undefined;
  const injuriesOrLimitations = (body.injuriesOrLimitations || '').trim() || undefined;
  const preferredTimeOfDay = (body.preferredTimeOfDay || '').trim() || undefined;
  const trailVsRoad = (body.trailVsRoad || '').trim() || undefined;
  const runThisDistanceBefore = body.runThisDistanceBefore === true || body.runThisDistanceBefore === 'true' ? true : body.runThisDistanceBefore === false || body.runThisDistanceBefore === 'false' ? false : undefined;

  if (!raceDate) {
    return NextResponse.json({ error: 'Race date is required' }, { status: 400 });
  }

  const d = new Date(raceDate + 'T12:00:00');
  if (isNaN(d.getTime())) {
    return NextResponse.json({ error: 'Invalid race date' }, { status: 400 });
  }

  const weeks = getDefaultWeeksForDistance(distance);
  const id = randomUUID().slice(0, 8);
  await setPlan({
    id,
    raceUrl: raceUrl || '',
    raceName,
    raceDate,
    weeks,
    firstName,
    lastName,
    age: Number.isFinite(age) ? age : undefined,
    gender,
    distance,
    goal,
    targetTime,
    additionalInfo,
    trainingDaysPerWeek: Number.isFinite(trainingDaysPerWeek) ? trainingDaysPerWeek : undefined,
    preferredDays: preferredDays?.length ? preferredDays : undefined,
    crossTraining,
    crossTrainingType,
    currentWeeklyMiles,
    longRunDay,
    injuriesOrLimitations,
    preferredTimeOfDay,
    trailVsRoad,
    runThisDistanceBefore,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ planId: id });
}
