import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlan } from '@/lib/store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  let body: { weekNumbers?: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const weekNumbers = Array.isArray(body.weekNumbers)
    ? body.weekNumbers.filter((n) => typeof n === 'number' && n >= 1)
    : [];
  if (weekNumbers.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const celebrated = [...new Set([...(plan.celebratedWeekNumbers ?? []), ...weekNumbers])].sort((a, b) => a - b);
  await updatePlan(planId, { celebratedWeekNumbers: celebrated });

  return NextResponse.json({ ok: true });
}
